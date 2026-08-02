// 消息处理：来自 popup / debug 页面的各类请求处理器与 onMessage 统一分发

import { MessageTypes } from "../shared/message-types.js";
import { STORAGE_KEYS } from "../shared/storage-keys.js";
import { backgroundI18n } from "../i18n/background-i18n.js";
import { domainRulesManager } from "./domain-rules-manager.js";
import {
	DEFAULT_LANG_EN,
	RULE_ID,
	getAutoSwitchEnabled,
	notifyPopupUIUpdate,
	sendBackgroundLog,
	setAutoSwitchEnabled,
} from "./shared.js";
import { applyLanguageRulesBasedOnState, getCurrentAcceptLanguageHeader, updateHeaderRules } from "./rule-engine.js";
import { ensureInitialized } from "./lifecycle.js";

/**
 * 处理更新规则请求
 * @param {Object} request - 请求对象
 */
const handleUpdateRulesRequest = async (request) => {
	try {
		const language = request.language;
		sendBackgroundLog(backgroundI18n.t("trying_update_rules", { language }), "info");

		const result = await updateHeaderRules(language);
		sendBackgroundLog(
			`${backgroundI18n.t("rules_update_completed")}: ${result.changed ? "changed" : "unchanged"}`,
			"info",
		);

		await chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_LANGUAGE]: language });

		// 只在状态发生变化时才通知UI更新
		if (result.changed) {
			notifyPopupUIUpdate(getAutoSwitchEnabled(), result.language);
		}
		return { changed: result.changed, language: result.language };
	} catch (error) {
		// 记录错误日志并重新抛出，让上层统一处理
		const errorMessage = error?.message || String(error);
		sendBackgroundLog(`${backgroundI18n.t("rules_update_failed")}: ${errorMessage}`, "error");
		throw error;
	}
};

/**
 * 处理自动切换开关请求
 * @param {Object} request - 请求对象
 */
const handleAutoSwitchToggleRequest = async (request) => {
	setAutoSwitchEnabled(request.enabled);
	sendBackgroundLog(`${backgroundI18n.t("auto_switch_status_updated")}: ${getAutoSwitchEnabled()}`, "info");

	await chrome.storage.local.set({ [STORAGE_KEYS.AUTO_SWITCH_ENABLED]: getAutoSwitchEnabled() });

	const { currentLanguage: storedLanguage } = /** @type {Record<string, any>} */ (
		await chrome.storage.local.get([STORAGE_KEYS.CURRENT_LANGUAGE])
	);
	await applyLanguageRulesBasedOnState(storedLanguage);

	const currentEffectiveLanguage = getAutoSwitchEnabled() ? DEFAULT_LANG_EN : storedLanguage || DEFAULT_LANG_EN;
	notifyPopupUIUpdate(getAutoSwitchEnabled(), currentEffectiveLanguage);
	return { autoSwitchEnabled: getAutoSwitchEnabled(), currentLanguage: currentEffectiveLanguage };
};

/**
 * 处理获取当前语言请求
 */
const handleGetCurrentLangRequest = async () => {
	// 两个读取无数据依赖，并行执行避免串行等待两次 IPC 往返
	const [actualCurrentLang, result] = await Promise.all([
		getCurrentAcceptLanguageHeader(),
		chrome.storage.local.get([STORAGE_KEYS.CURRENT_LANGUAGE, STORAGE_KEYS.AUTO_SWITCH_ENABLED]),
	]);
	return {
		currentLanguage: actualCurrentLang || result.currentLanguage,
		autoSwitchEnabled: !!result.autoSwitchEnabled,
	};
};

/**
 * 处理重置Accept-Language请求
 */
const handleResetAcceptLanguageRequest = async () => {
	try {
		await chrome.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: [RULE_ID],
		});

		await chrome.storage.local.remove([STORAGE_KEYS.CURRENT_LANGUAGE]);
		sendBackgroundLog(backgroundI18n.t("accept_language_reset_successful"), "success");
		notifyPopupUIUpdate(getAutoSwitchEnabled(), null);
		return {};
	} catch (error) {
		sendBackgroundLog(`${backgroundI18n.t("reset_error")}: ${error.message}`, "error");
		throw error;
	}
};

/**
 * 处理获取域名规则请求
 * @returns {Promise<Object>} 域名规则及统计信息
 */
const handleGetDomainRulesRequest = async () => {
	sendBackgroundLog(backgroundI18n.t("received_domain_rules_request"), "info");

	await domainRulesManager.loadRules();
	const rules = domainRulesManager.getRules();
	const stats = domainRulesManager.getRulesStats();

	sendBackgroundLog(
		backgroundI18n.t("domain_rules_fetch_success", {
			count: Object.keys(rules || {}).length,
		}),
		"success",
	);
	return { domainRules: rules, stats: stats };
};

/**
 * 获取并合并域名规则管理器的缓存统计信息和规则统计信息
 * @returns {Object} 合并后的统计信息
 */
const getCombinedDomainStats = () => {
	const cacheStats = domainRulesManager.getCacheStats();
	const rulesStats = domainRulesManager.getRulesStats();
	return { ...cacheStats, ...rulesStats };
};

/**
 * 处理获取缓存统计请求
 */
const handleGetCacheStatsRequest = async () => {
	try {
		// 确保域名规则管理器已加载
		await domainRulesManager.loadRules();

		// 获取并合并缓存统计信息和规则统计信息
		const combinedStats = getCombinedDomainStats();

		sendBackgroundLog(`${backgroundI18n.t("cache_stats_requested")}: ${JSON.stringify(combinedStats)}`, "info");
		return { stats: combinedStats };
	} catch (error) {
		const errorMessage = `${backgroundI18n.t("get_cache_stats_failed")}: ${error.message}`;
		sendBackgroundLog(errorMessage, "error");
		throw new Error(errorMessage);
	}
};

/**
 * 处理域名缓存测试请求
 * @param {Object} request - 请求对象
 * @param {string} request.domain - 要测试的域名
 */
const handleTestDomainCacheRequest = async (request) => {
	try {
		const domain = request.domain;
		if (!domain) {
			throw new Error(backgroundI18n.t("domain_required_error"));
		}

		sendBackgroundLog(backgroundI18n.t("testing_domain_cache", { domain }), "info");

		// 确保域名规则管理器已加载
		await domainRulesManager.loadRules();

		// 在调用 getLanguageForDomain 之前检查缓存状态，以获得准确的"是否命中缓存"状态
		const parsedDomain = domain.split(".");
		const secondLevelDomain = parsedDomain.length >= 2 ? parsedDomain.slice(-2).join(".") : domain;
		const fromCache =
			domainRulesManager.domainCache.has(domain) ||
			domainRulesManager.domainCache.has(secondLevelDomain) ||
			(domain.startsWith("www.") && domainRulesManager.domainCache.has(domain.substring(4))) ||
			domainRulesManager.domainCache.has("www." + domain);

		// 测试域名查询（这会触发缓存机制，如果是 miss，则会填充缓存）
		let language = await domainRulesManager.getLanguageForDomain(domain);
		let isUsingFallback = false;

		// 如果没有找到匹配规则，使用回退策略
		if (!language) {
			isUsingFallback = true;

			// 策略1: 检查当前活动的规则
			try {
				const currentLang = await getCurrentAcceptLanguageHeader();
				if (currentLang) {
					language = currentLang;
				}
			} catch (error) {
				sendBackgroundLog(`Failed to check active rules: ${error.message}`, "error");
			}

			// 策略2: 如果还没有找到，检查存储的当前语言设置
			if (!language) {
				try {
					const result = /** @type {Record<string, any>} */ (
						await chrome.storage.local.get([STORAGE_KEYS.CURRENT_LANGUAGE])
					);

					if (result.currentLanguage) {
						language = result.currentLanguage;
					}
				} catch (error) {
					sendBackgroundLog(`Failed to check stored language: ${error.message}`, "error");
				}
			}

			// 策略3: 最后的回退，使用默认语言
			if (!language) {
				language = DEFAULT_LANG_EN;
			}
		}

		// 获取更新后的缓存统计
		const combinedStats = getCombinedDomainStats();

		const cacheStatus = fromCache ? backgroundI18n.t("cached") : backgroundI18n.t("new");
		const fallbackStatus = isUsingFallback ? backgroundI18n.t("fallback") : "";
		sendBackgroundLog(
			backgroundI18n.t("domain_test_result", {
				domain,
				language: language || "not found",
				cacheStatus,
				fallbackStatus,
			}),
			"info",
		);
		return {
			language: language,
			fromCache: fromCache,
			isUsingFallback: isUsingFallback,
			cacheStats: combinedStats,
		};
	} catch (error) {
		const errorMessage = backgroundI18n.t("domain_cache_test_failed", {
			error: error.message,
		});
		sendBackgroundLog(errorMessage, "error");
		throw new Error(errorMessage);
	}
};

/**
 * 通用缓存操作处理辅助函数
 * @param {Function} operation - 要执行的操作函数
 * @param {Object} logMessages - 日志消息对象
 */
const handleCacheOperation = async (operation, logMessages) => {
	try {
		sendBackgroundLog(logMessages.start, "info");

		// 执行具体操作
		await operation();

		// 获取更新后的统计信息
		const combinedStats = getCombinedDomainStats();

		sendBackgroundLog(logMessages.success, "success");
		return { stats: combinedStats };
	} catch (error) {
		const errorMessage = `${logMessages.fail}: ${error?.message || String(error)}`;
		sendBackgroundLog(errorMessage, "error");
		throw error;
	}
};

/**
 * 处理清理缓存请求
 */
const handleClearCacheRequest = () =>
	handleCacheOperation(() => domainRulesManager.clearCache(), {
		start: backgroundI18n.t("clearing_cache"),
		success: backgroundI18n.t("cache_cleared_successfully"),
		fail: backgroundI18n.t("clear_cache_failed"),
	});

/**
 * 处理重置缓存统计请求
 */
const handleResetCacheStatsRequest = () =>
	handleCacheOperation(() => domainRulesManager.resetCacheStats(), {
		start: backgroundI18n.t("resetting_cache_stats"),
		success: backgroundI18n.t("cache_stats_reset_successfully"),
		fail: backgroundI18n.t("reset_cache_stats_failed"),
	});

/**
 * 注册 onMessage 监听：统一消息处理入口与分发
 * @param {Object} responders - 入口提供的统一响应辅助函数
 * @param {Function} responders.sendOk - 统一成功响应
 * @param {Function} responders.sendErr - 统一失败响应
 */
export const setupMessageListener = ({ sendOk, sendErr }) => {
	// 监听来自 popup 或 debug 页面的消息
	chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
		(async () => {
			try {
				// 统一消息处理入口：所有分支只返回数据或抛错，最终由 sendOk/sendErr 统一响应
				const type = request?.type;
				if (!type) {
					throw new Error("Invalid message type");
				}

				// 调试日志属于广播消息：后台无需参与业务处理，避免触发 unknown type 报错/噪音
				if (type === MessageTypes.DEBUG_LOG) {
					sendOk(sendResponse, {});
					return;
				}

				await ensureInitialized();

				const handler = MESSAGE_HANDLERS[type];
				if (!handler) {
					throw new Error(`Unknown message type: ${type}`);
				}
				const data = await handler(request);

				sendOk(sendResponse, data || {});
			} catch (error) {
				sendErr(sendResponse, error);
			}
		})();
		return true;
	});
};

/**
 * 处理获取动态规则请求
 */
const handleGetDynamicRulesRequest = async () => {
	try {
		const rules = await chrome.declarativeNetRequest.getDynamicRules();
		return { rules: rules };
	} catch (error) {
		sendBackgroundLog(`${backgroundI18n.t("get_dynamic_rules_failed")}: ${error.message}`, "error");
		throw error;
	}
};

/**
 * 处理获取匹配规则请求
 */
const handleGetMatchedRulesRequest = async () => {
	try {
		const matchedRules = await chrome.declarativeNetRequest.getMatchedRules({});
		return { matchedRules: matchedRules };
	} catch (error) {
		sendBackgroundLog(`${backgroundI18n.t("get_matched_rules_failed")}: ${error.message}`, "error");
		throw error;
	}
};

/**
 * 处理更新动态规则请求
 * @param {Object} request - 请求对象
 */
const handleUpdateDynamicRulesRequest = async (request) => {
	try {
		const { removeRuleIds, addRules } = request;
		await chrome.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: removeRuleIds || [],
			addRules: addRules || [],
		});
		return {};
	} catch (error) {
		sendBackgroundLog(`${backgroundI18n.t("update_dynamic_rules_failed")}: ${error.message}`, "error");
		throw error;
	}
};

/**
 * 消息类型 → 处理器映射表
 */
const MESSAGE_HANDLERS = {
	[MessageTypes.UPDATE_RULES]: handleUpdateRulesRequest,
	[MessageTypes.AUTO_SWITCH_TOGGLED]: handleAutoSwitchToggleRequest,
	[MessageTypes.GET_CURRENT_LANG]: handleGetCurrentLangRequest,
	[MessageTypes.RESET_ACCEPT_LANGUAGE]: handleResetAcceptLanguageRequest,
	[MessageTypes.GET_DOMAIN_RULES]: handleGetDomainRulesRequest,
	[MessageTypes.GET_CACHE_STATS]: handleGetCacheStatsRequest,
	[MessageTypes.TEST_DOMAIN_CACHE]: handleTestDomainCacheRequest,
	[MessageTypes.CLEAR_DOMAIN_CACHE]: handleClearCacheRequest,
	[MessageTypes.RESET_CACHE_STATS]: handleResetCacheStatsRequest,
	[MessageTypes.GET_DYNAMIC_RULES]: handleGetDynamicRulesRequest,
	[MessageTypes.GET_MATCHED_RULES]: handleGetMatchedRulesRequest,
	[MessageTypes.UPDATE_DYNAMIC_RULES]: handleUpdateDynamicRulesRequest,
};
