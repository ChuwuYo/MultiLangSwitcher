// 生命周期：初始化流程、右键菜单与浏览器事件监听（启动/安装/标签页更新/挂起）

import { AUTO_SWITCH_RULE_ID_BASE } from "../shared/dnr-rule-ids.js";
import { STORAGE_KEYS } from "../shared/storage-keys.js";
import { backgroundI18n } from "../i18n/background-i18n.js";
import { domainRulesManager } from "./domain-rules-manager.js";
import {
	DEFAULT_LANG_EN,
	RULE_ID,
	getAutoSwitchEnabled,
	getLastNotifiedLanguage,
	i18nReady,
	notifyPopupUIUpdate,
	sendBackgroundLog,
	setAutoSwitchEnabled,
} from "./shared.js";
import { applyLanguageRulesBasedOnState, syncAutoSwitchDomainRules } from "./rule-engine.js";

// 全局状态变量
let isInitialized = false; // 初始化完成标志
let initializationPromise = null; // 初始化Promise，防止重复执行

// 右键菜单初始化标志
let contextMenuPromise = null;

/**
 * 确保初始化已完成的守卫函数
 * @returns {Promise}
 */
export const ensureInitialized = async () => {
	// 如果已经初始化完成，直接返回
	if (isInitialized) {
		return;
	}

	// 如果初始化正在进行，等待完成
	if (initializationPromise) {
		await initializationPromise;
	} else {
		// 如果尚未开始初始化，则启动初始化
		await initialize("lazy");
	}
};

const createContextMenusOnce = async () => {
	// 如果已经有初始化操作在进行，等待其完成
	if (contextMenuPromise) {
		return contextMenuPromise;
	}

	contextMenuPromise = (async () => {
		try {
			// 确保 i18n 初始化完成
			await i18nReady;

			if (chrome.contextMenus && typeof chrome.contextMenus.removeAll === "function") {
				await /** @type {Promise<void>} */ (
					new Promise((resolve, reject) => {
						try {
							chrome.contextMenus.removeAll(() => {
								if (chrome.runtime?.lastError) {
									reject(new Error(chrome.runtime.lastError.message));
								} else {
									resolve();
								}
							});
						} catch (error) {
							reject(error);
						}
					})
				);
			}

			// 创建菜单项 - 使用国际化标题
			const createContextMenu = (options) => {
				return /** @type {Promise<void>} */ (
					new Promise((resolve, reject) => {
						try {
							chrome.contextMenus.create(options, () => {
								if (chrome.runtime.lastError) {
									reject(new Error(chrome.runtime.lastError.message));
								} else {
									resolve();
								}
							});
						} catch (error) {
							reject(error);
						}
					})
				);
			};

			await createContextMenu({
				id: "open-detect-page",
				title: backgroundI18n.t("menu_detection_page") || "Detection Page",
				contexts: ["action"],
			});
			await createContextMenu({
				id: "open-debug-page",
				title: backgroundI18n.t("menu_debug_page") || "Debug Page",
				contexts: ["action"],
			});

			sendBackgroundLog(backgroundI18n.t("context_menus_created"), "info");
		} catch (error) {
			// 记录错误
			sendBackgroundLog(`${backgroundI18n.t("create_context_menus_failed")}: ${error.message}`, "error");
			contextMenuPromise = null; // 失败时允许重试
			throw error;
		}
	})();

	return contextMenuPromise;
};

chrome.contextMenus.onClicked.addListener((info, _tab) => {
	if (info.menuItemId === "open-detect-page") {
		chrome.tabs.create({ url: chrome.runtime.getURL("src/detect/detect.html") });
	} else if (info.menuItemId === "open-debug-page") {
		chrome.tabs.create({ url: chrome.runtime.getURL("src/debug/debug.html") });
	}
});

// 在浏览器启动时初始化并刷新多语言右键菜单
chrome.runtime.onStartup.addListener(() => {
	createContextMenusOnce().catch(() => {});
	initialize("startup").catch((error) => {
		sendBackgroundLog(`${backgroundI18n.t("on_startup_init_failed")}: ${error.message}`, "error");
	});
});

// 在扩展安装或更新时初始化
chrome.runtime.onInstalled.addListener(async (details) => {
	try {
		// 安装时的所有初始化操作集中在一起，未来如果有其他安装时操作，直接加在这里
		await createContextMenusOnce();
		await initialize(details.reason);
	} catch (error) {
		sendBackgroundLog(`${backgroundI18n.t("on_install_init_failed")}: ${error.message}`, "error");
	}
});

/**
 * 执行核心初始化逻辑
 * @param {string} reason - 初始化的原因 (e.g., 'install', 'update', 'startup')
 */
const performInitialization = async (reason) => {
	try {
		// 0. 等待所有i18n模块准备就绪
		await i18nReady;
		sendBackgroundLog(backgroundI18n.t("initializing_state", { reason }), "info");

		// 1. 初始化域名规则管理器 (现在直接加载)
		await domainRulesManager.loadRules();
		sendBackgroundLog(backgroundI18n.t("domain_rules_loaded"), "info");

		// 2. 从存储中获取设置
		const result = /** @type {Record<string, any>} */ (
			await chrome.storage.local.get([STORAGE_KEYS.CURRENT_LANGUAGE, STORAGE_KEYS.AUTO_SWITCH_ENABLED])
		);
		setAutoSwitchEnabled(result.autoSwitchEnabled === true); // 未显式开启过则默认为 false
		sendBackgroundLog(`${backgroundI18n.t("loaded_auto_switch_status")}: ${getAutoSwitchEnabled()}`, "info");

		// 3. 区分 Service Worker 懒唤醒与正式启动/安装：动态规则在 SW 休眠期间持久化，
		//    懒唤醒时仅在规则缺失时重建，且不覆写已有的会话 UI 状态
		if (reason === "lazy") {
			const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
			const hasFallbackRule = existingRules.some((rule) => rule.id === RULE_ID);
			const hasAutoSwitchRules = existingRules.some((rule) => rule.id >= AUTO_SWITCH_RULE_ID_BASE);
			const needsRebuild = getAutoSwitchEnabled()
				? !hasFallbackRule || !hasAutoSwitchRules
				: !hasFallbackRule || hasAutoSwitchRules;
			if (needsRebuild) {
				await applyLanguageRulesBasedOnState(result.currentLanguage);
			}
			const sessionData = /** @type {Record<string, any>} */ (
				await chrome.storage.session.get([STORAGE_KEYS.UI_STATE])
			);
			if (!sessionData[STORAGE_KEYS.UI_STATE]) {
				const lang = getAutoSwitchEnabled() ? DEFAULT_LANG_EN : result.currentLanguage || DEFAULT_LANG_EN;
				notifyPopupUIUpdate(getAutoSwitchEnabled(), lang);
			}
		} else {
			await applyLanguageRulesBasedOnState(result.currentLanguage);
			const lang = getAutoSwitchEnabled() ? DEFAULT_LANG_EN : result.currentLanguage || DEFAULT_LANG_EN;
			notifyPopupUIUpdate(getAutoSwitchEnabled(), lang);
		}
		sendBackgroundLog(backgroundI18n.t("initialization_complete"), "success");
	} catch (error) {
		// 瞬时异常时绝不抹除用户在 chrome.storage.local 中的配置，仅向上抛错由调用方重试
		sendBackgroundLog(backgroundI18n.t("initialization_failed", { message: error?.message || String(error) }), "error");
		throw error;
	}
};

/**
 * 统一的初始化函数，确保只执行一次
 * @param {string} reason - 初始化的原因
 * @returns {Promise<void>}
 */
let fullReconcileDone = false;

const initialize = (reason) => {
	if (initializationPromise) {
		// 若先前只是 lazy 唤醒，install/startup 仍需在之后执行一次全量规则对账
		if (reason !== "lazy" && !fullReconcileDone) {
			const prevPromise = initializationPromise;
			initializationPromise = (async () => {
				await prevPromise.catch(() => {});
				await performInitialization(reason);
				isInitialized = true;
				fullReconcileDone = true;
			})();
			initializationPromise.catch(() => {
				initializationPromise = null;
			});
		}
		return initializationPromise;
	}

	initializationPromise = (async () => {
		try {
			await performInitialization(reason);
			isInitialized = true;
			if (reason !== "lazy") {
				fullReconcileDone = true;
			}
		} catch (error) {
			initializationPromise = null;
			isInitialized = false;
			throw error; // 重新抛出错误，让调用者知道初始化失败
		}
	})();

	return initializationPromise;
};

let activeTabSyncSeq = 0;

const syncActiveTabDisplayLanguage = async (tab) => {
	if (!getAutoSwitchEnabled() || !tab?.active || !tab?.url?.startsWith("http") || tab.incognito) {
		return;
	}

	const seq = ++activeTabSyncSeq;
	try {
		const hostname = new URL(tab.url).hostname.toLowerCase();
		const matchedLanguage = await domainRulesManager.getLanguageForDomain(hostname);
		if (seq !== activeTabSyncSeq || !getAutoSwitchEnabled()) {
			return;
		}
		const displayLanguage = typeof matchedLanguage === "string" && matchedLanguage ? matchedLanguage : DEFAULT_LANG_EN;

		if (displayLanguage === getLastNotifiedLanguage()) {
			return;
		}
		sendBackgroundLog(
			matchedLanguage
				? backgroundI18n.t("auto_switching_hostname", { hostname, language: displayLanguage })
				: backgroundI18n.t("no_matching_rule", { hostname, fallback: displayLanguage }),
			"info",
		);
		notifyPopupUIUpdate(true, displayLanguage);
	} catch (error) {
		sendBackgroundLog(`${backgroundI18n.t("error_processing_url", { url: tab.url })}: ${error.message}`, "error");
	}
};

// 自动切换的请求头由按域名规则直接生效（见 syncAutoSwitchDomainRules），这里只更新活动标签页的 popup 显示语言
chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
	if (changeInfo.status !== "complete" || !tab?.active) {
		return;
	}
	try {
		await ensureInitialized();
	} catch (error) {
		sendBackgroundLog(`${backgroundI18n.t("tab_update_init_failed")}: ${error.message}`, "error");
		return;
	}
	await syncActiveTabDisplayLanguage(tab);
});

// 切换活动标签页时同步 popup 显示语言
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
	try {
		await ensureInitialized();
		if (!getAutoSwitchEnabled()) return;
		const tab = await chrome.tabs.get(tabId);
		await syncActiveTabDisplayLanguage(tab);
	} catch (_error) {
		// 标签页可能在查询前关闭，忽略
	}
});

// 手动注入的自定义域名规则变化时，确保已初始化后再重建自动切换规则
chrome.storage.onChanged.addListener(async (changes, areaName) => {
	if (areaName !== "local" || !changes[STORAGE_KEYS.CUSTOM_DOMAIN_RULES]) {
		return;
	}
	try {
		await ensureInitialized();
		if (!getAutoSwitchEnabled()) return;
		await syncAutoSwitchDomainRules(true);
	} catch (error) {
		sendBackgroundLog(`${backgroundI18n.t("update_rules_failed")}: ${error.message}`, "error");
	}
});
