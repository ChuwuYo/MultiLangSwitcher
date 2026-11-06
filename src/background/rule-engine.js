// 规则引擎：declarativeNetRequest 动态规则的查询、更新、清理与指数退避重试

import { backgroundI18n } from "../i18n/background-i18n.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import { AUTO_SWITCH_RULE_ID_BASE } from "../shared/dnr-rule-ids.js";
import { domainRulesManager } from "./domain-rules-manager.js";
import { DEFAULT_LANG_EN, RULE_ID, getAutoSwitchEnabled, sendBackgroundLog } from "./shared.js";

// 指数退避重试配置
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 500; // 毫秒

// 规则更新锁，确保串行执行
let updateRulesLock = Promise.resolve();

/**
 * 在规则更新锁内执行，避免与其他规则写入交错
 * @template T
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
const withRulesLock = async (task) => {
	let release;
	const prevLock = updateRulesLock;
	updateRulesLock = new Promise((r) => {
		release = r;
	});
	await prevLock;
	try {
		return await task();
	} finally {
		release();
	}
};

const HEADER_RESOURCE_TYPES = /** @type {chrome.declarativeNetRequest.ResourceType[]} */ ([
	"main_frame",
	"sub_frame",
	"xmlhttprequest",
	"script",
]);
const HOSTNAME_PATTERN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/;
const HEADER_VALUE_PATTERN = /^[\x20-\x7e]+$/;

/**
 * 清理所有动态规则
 */
export const clearAllDynamicRules = async () => {
	try {
		const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
		if (existingRules.length > 0) {
			const ruleIds = existingRules.map((rule) => rule.id);
			sendBackgroundLog(backgroundI18n.t("clearing_existing_rules", { count: ruleIds.length }), "info");
			await chrome.declarativeNetRequest.updateDynamicRules({
				removeRuleIds: ruleIds,
			});
			sendBackgroundLog(backgroundI18n.t("rules_cleared_successfully"), "success");
		}
	} catch (error) {
		sendBackgroundLog(`${backgroundI18n.t("clear_rules_failed")}: ${error.message}`, "error");
		throw error;
	}
};

/**
 * 规则更新函数，包含简单的并发控制和直接查询declarativeNetRequest
 * @param {string} language - 要设置的语言代码
 * @param {number} retryCount - 当前重试次数
 * @param {boolean} isAutoSwitch - 是否由自动切换触发
 * @returns {Promise<Object>} 更新结果
 */
export const updateHeaderRules = async (language, retryCount = 0, isAutoSwitch = false) => {
	const normalizedLanguage = language ? language.trim() : DEFAULT_LANG_EN;
	return withRulesLock(() => updateHeaderRulesInternal(normalizedLanguage, retryCount, isAutoSwitch));
};

/**
 * 把域名→语言表编译成按请求目标域名生效的 DNR 规则。
 * 优先级沿用 _findMatchingRule 的顺序：完整域名 > 二级 > 顶级，同级自定义优先于内置；
 * 都高于 RULE_ID（100），未命中的请求落到 RULE_ID 的回退语言。
 * @param {Record<string, unknown>} builtinRules
 * @param {Record<string, unknown>} customRules
 * @returns {chrome.declarativeNetRequest.Rule[]}
 */
const buildAutoSwitchRules = (builtinRules, customRules) => {
	/** @type {Map<string, {priority: number, language: string, domains: string[]}>} */
	const domainGroups = new Map();
	/** @type {chrome.declarativeNetRequest.Rule[]} */
	const exactHostRules = [];

	const addEntry = (domain, language, isCustom) => {
		if (typeof domain !== "string" || typeof language !== "string") return;
		const host = domain.trim().toLowerCase();
		const value = language.trim();
		if (!HOSTNAME_PATTERN.test(host) || !HEADER_VALUE_PATTERN.test(value)) return;
		const labels = host.split(".").length;
		const priority = (labels >= 3 ? 130 : labels === 2 ? 120 : 110) + (isCustom ? 1 : 0);
		const action = /** @type {chrome.declarativeNetRequest.RuleAction} */ ({
			type: "modifyHeaders",
			requestHeaders: [{ header: "Accept-Language", operation: "set", value }],
		});
		if (labels >= 3) {
			// 旧逻辑对三段以上的键只做完整域名匹配；requestDomains 会连带子域名，故用正则精确匹配主机
			exactHostRules.push(
				/** @type {chrome.declarativeNetRequest.Rule} */ ({
					id: 0,
					priority,
					action,
					condition: {
						regexFilter: `^[a-z][a-z0-9+.-]*://${host.replaceAll(".", "\\.")}(?::[0-9]+)?/`,
						resourceTypes: HEADER_RESOURCE_TYPES,
					},
				}),
			);
			return;
		}
		const key = `${priority}|${value}`;
		const group = domainGroups.get(key) ?? { priority, language: value, domains: [] };
		group.domains.push(host);
		domainGroups.set(key, group);
	};

	for (const [domain, language] of Object.entries(builtinRules || {})) addEntry(domain, language, false);
	for (const [domain, language] of Object.entries(customRules || {})) addEntry(domain, language, true);

	const rules = [...domainGroups.values()].map(
		(group) =>
			/** @type {chrome.declarativeNetRequest.Rule} */ ({
				id: 0,
				priority: group.priority,
				action: {
					type: "modifyHeaders",
					requestHeaders: [{ header: "Accept-Language", operation: "set", value: group.language }],
				},
				condition: { requestDomains: group.domains, resourceTypes: HEADER_RESOURCE_TYPES },
			}),
	);
	return [...rules, ...exactHostRules].map((rule, index) => ({ ...rule, id: AUTO_SWITCH_RULE_ID_BASE + index }));
};

/**
 * 同步自动切换的按域名规则：开启时按请求目标域名设置语言，关闭时全部移除。
 * 不能再按"最后加载完成的标签页"改写全局规则，否则任何网站都能从自己的请求头
 * 读出用户在其他标签页（含无痕窗口）访问的站点所属地区。
 * @param {boolean} enabled
 */
export const syncAutoSwitchDomainRules = async (enabled) => {
	const builtinRules = enabled ? await domainRulesManager.loadRules() : {};
	const customRules = enabled ? await domainRulesManager.getCustomRules() : {};

	const apply = (addRules) =>
		withRulesLock(async () => {
			const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
			const removeRuleIds = currentRules.filter((rule) => rule.id >= AUTO_SWITCH_RULE_ID_BASE).map((rule) => rule.id);
			if (removeRuleIds.length === 0 && addRules.length === 0) return;
			await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
		});

	try {
		await apply(buildAutoSwitchRules(builtinRules, customRules));
	} catch (error) {
		if (!enabled) throw error;
		// 手动注入的自定义规则可能被 Chrome 拒绝（如域名或语言值不合法），退回仅内置规则，保证自动切换仍可用
		sendBackgroundLog(`${backgroundI18n.t("update_rules_failed")}: ${error.message}`, "error");
		await apply(buildAutoSwitchRules(builtinRules, {}));
	}
};

const updateHeaderRulesInternal = async (language, retryCount, isAutoSwitch) => {
	try {
		// 直接查询当前规则状态，替代缓存检查
		const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
		const existingRule = currentRules.find(
			(rule) =>
				rule.id === RULE_ID &&
				rule.action.requestHeaders &&
				rule.action.requestHeaders.some((header) => header.header === "Accept-Language" && header.value === language),
		);

		if (existingRule) {
			const logMessage = isAutoSwitch
				? backgroundI18n.t("auto_switch_skip_duplicate", { language })
				: backgroundI18n.t("language_already_set", { language });
			sendBackgroundLog(logMessage, "info");
			return { changed: false, language };
		}

		sendBackgroundLog(
			`${backgroundI18n.t("trying_update_rules", { language })}${retryCount > 0 ? ` (${backgroundI18n.t("retry")} #${retryCount})` : ""}`,
			"info",
		);

		// 性能监控：记录开始时间
		const startTime = performance.now();

		// 批量处理：仅当存在时才移除具有 RULE_ID 的旧规则，然后添加新规则
		const removeRuleIds = currentRules.some((rule) => rule.id === RULE_ID) ? [RULE_ID] : [];
		const newRule = /** @type {chrome.declarativeNetRequest.Rule} */ ({
			id: RULE_ID,
			priority: 100,
			action: {
				type: "modifyHeaders",
				requestHeaders: [
					{
						header: "Accept-Language",
						operation: "set",
						value: language,
					},
				],
			},
			condition: {
				urlFilter: "*",
				resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "script"],
			},
		});

		// 单次批量更新：移除旧规则（如果存在）并添加新规则
		await chrome.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: removeRuleIds,
			addRules: [newRule],
		});

		// 记录批量操作的详细信息
		let logMessage = `${backgroundI18n.t("batch_operation_completed")}: `;
		if (removeRuleIds.length > 0) {
			logMessage += `${backgroundI18n.t("removed")} ${removeRuleIds.length} ${backgroundI18n.t("rules")}, `;
		}
		logMessage += `${backgroundI18n.t("added")} 1 ${backgroundI18n.t("rule")}`;
		sendBackgroundLog(logMessage, "info");

		// 性能监控：记录完成时间
		const endTime = performance.now();
		const duration = Math.round(endTime - startTime);

		sendBackgroundLog(
			`${backgroundI18n.t("rules_updated_successfully", { language })}${isAutoSwitch ? ` (${backgroundI18n.t("auto_switch")})` : ""} (${duration}ms)`,
			"success",
		);
		return { changed: true, language };
	} catch (error) {
		sendBackgroundLog(`${backgroundI18n.t("update_rules_failed")}: ${error.message}`, "error");
		return handleRuleUpdateError(error, language, retryCount);
	}
};

/**
 * 处理规则更新错误，实现指数退避重试
 * @param {Error} error - 错误对象
 * @param {string} language - 要设置的语言代码
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<Object>} 更新结果或抛出错误
 */
const handleRuleUpdateError = async (error, language, retryCount) => {
	// 对不同类型的错误进行分类处理
	let errorType = "unknown";
	let canRetry = true;

	// 分析错误类型
	if (error.message.includes("quota")) {
		errorType = "quota_exceeded";
		canRetry = false;
	} else if (error.message.includes("permission")) {
		errorType = "permission_denied";
		canRetry = false;
	} else if (error.message.includes("network")) {
		errorType = "network_error";
	}

	sendBackgroundLog(
		`${backgroundI18n.t("rule_update_error_type")}: ${errorType}, ${backgroundI18n.t("message")}: ${error.message}`,
		"error",
	);

	// 如果可以重试且未超过最大重试次数
	if (canRetry && retryCount < MAX_RETRY_ATTEMPTS) {
		const nextRetryCount = retryCount + 1;
		const delay = BASE_RETRY_DELAY * 2 ** retryCount;

		sendBackgroundLog(`${backgroundI18n.t("retry_after", { delay, count: nextRetryCount })}`, "warning");

		// 等待后重试 - 直接调用内部函数，因为互斥锁已经在外部 updateHeaderRules 中获取
		await new Promise((resolve) => ResourceManager.setTimeout(resolve, delay));
		try {
			return await updateHeaderRulesInternal(language, nextRetryCount, false);
		} catch (retryError) {
			return handleRuleUpdateError(retryError, language, nextRetryCount);
		}
	} else {
		// 超过重试次数或不可重试的错误
		const finalError = /** @type {Error & { originalError?: any, type?: string, retryCount?: number }} */ (
			new Error(`${backgroundI18n.t("update_rules_failed_with_type", { type: errorType })}: ${error.message}`)
		);
		finalError.originalError = error;
		finalError.type = errorType;
		finalError.retryCount = retryCount;

		sendBackgroundLog(backgroundI18n.t("max_retry_reached"), "error");

		throw finalError;
	}
};

/**
 * 根据当前的自动切换状态应用相应的语言规则
 * @param {string} storedLanguage - 从存储中读取的语言
 */
export const applyLanguageRulesBasedOnState = async (storedLanguage) => {
	let languageToApply;

	if (getAutoSwitchEnabled()) {
		languageToApply = DEFAULT_LANG_EN;
		sendBackgroundLog(
			backgroundI18n.t("auto_switch_enabled_applying_rules", {
				language: languageToApply,
			}),
			"info",
		);
	} else {
		languageToApply = storedLanguage || DEFAULT_LANG_EN;
		sendBackgroundLog(
			backgroundI18n.t("auto_switch_disabled_applying_rules", {
				language: languageToApply,
			}),
			"info",
		);
	}

	await updateHeaderRules(languageToApply, 0, getAutoSwitchEnabled());
	await syncAutoSwitchDomainRules(getAutoSwitchEnabled());
};

/**
 * 获取当前动态规则中实际生效的 Accept-Language 头的值
 * @returns {Promise<string|undefined>} 当前规则中的语言值，无规则时为 undefined
 */
export const getCurrentAcceptLanguageHeader = async () => {
	const rules = await chrome.declarativeNetRequest.getDynamicRules();
	const currentRule = rules.find((rule) => rule.id === RULE_ID);
	return currentRule?.action?.requestHeaders?.find((h) => h.header === "Accept-Language")?.value;
};
