// 生命周期：初始化流程、右键菜单与浏览器事件监听（启动/安装/标签页更新/挂起）

import { STORAGE_KEYS } from "../shared/storage-keys.js";
import { backgroundI18n } from "../i18n/background-i18n.js";
import { domainRulesManager } from "./domain-rules-manager.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import {
	DEFAULT_LANG_EN,
	getAutoSwitchEnabled,
	i18nReady,
	notifyPopupUIUpdate,
	sendBackgroundLog,
	setAutoSwitchEnabled,
} from "./shared.js";
import {
	applyLanguageRulesBasedOnState,
	clearAllDynamicRules,
	getCurrentAcceptLanguageHeader,
	updateHeaderRules,
} from "./rule-engine.js";

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

			// 先查询现有菜单（部分浏览器不支持 query）
			let existingMenus = null;
			const contextMenusApi = /** @type {any} */ (chrome.contextMenus);
			if (chrome.contextMenus && typeof contextMenusApi.query === "function") {
				try {
					existingMenus = await contextMenusApi.query({});
				} catch (_error) {
					existingMenus = null;
				}
			}

			if (Array.isArray(existingMenus)) {
				const hasDetectMenu = existingMenus.some((menu) => menu.id === "open-detect-page");
				const hasDebugMenu = existingMenus.some((menu) => menu.id === "open-debug-page");

				// 如果菜单已完整存在，标记为已创建并返回
				if (hasDetectMenu && hasDebugMenu) {
					sendBackgroundLog(backgroundI18n.t("context_menus_already_exists"), "info");
					return;
				}

				// 菜单不完整或不存在，先清理再重新创建
				if (existingMenus.length > 0 && chrome.contextMenus && typeof chrome.contextMenus.removeAll === "function") {
					await chrome.contextMenus.removeAll();
				}
			} else if (chrome.contextMenus && typeof chrome.contextMenus.removeAll === "function") {
				// 无法查询时，直接清理再创建，避免重复菜单
				await chrome.contextMenus.removeAll();
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

// 在浏览器启动时初始化
chrome.runtime.onStartup.addListener(() => {
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

		// 3. 根据状态应用规则
		await applyLanguageRulesBasedOnState(result.currentLanguage);

		// 4. 通知UI更新
		const lang = getAutoSwitchEnabled() ? DEFAULT_LANG_EN : result.currentLanguage || DEFAULT_LANG_EN;
		notifyPopupUIUpdate(getAutoSwitchEnabled(), lang);
		sendBackgroundLog(backgroundI18n.t("initialization_complete"), "success");
	} catch (error) {
		sendBackgroundLog(backgroundI18n.t("initialization_failed", { message: error.message }), "error");
		// 设置一个明确、安全的回退状态
		setAutoSwitchEnabled(false);
		try {
			await clearAllDynamicRules();
			await chrome.storage.local.set({
				[STORAGE_KEYS.AUTO_SWITCH_ENABLED]: false,
				[STORAGE_KEYS.CURRENT_LANGUAGE]: "",
			});
			notifyPopupUIUpdate(false, null);
			sendBackgroundLog(backgroundI18n.t("fallback_state_set"), "warning");
		} catch (cleanupError) {
			sendBackgroundLog(
				backgroundI18n.t("fallback_state_failed", {
					message: cleanupError.message,
				}),
				"error",
			);
		}
		throw error; // 向上抛出错误
	}
};

/**
 * 统一的初始化函数，确保只执行一次
 * @param {string} reason - 初始化的原因
 * @returns {Promise<void>}
 */
const initialize = (reason) => {
	if (initializationPromise) {
		return initializationPromise;
	}

	initializationPromise = (async () => {
		try {
			await performInitialization(reason);
			isInitialized = true;
		} catch (error) {
			sendBackgroundLog(backgroundI18n.t("initialization_failed", { message: error.message }), "error");
			initializationPromise = null;
			isInitialized = false;
			throw error; // 重新抛出错误，让调用者知道初始化失败
		}
	})();

	return initializationPromise;
};

// 监听标签页更新以实现自动切换 (Manifest V3 compatible)
chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
	try {
		await ensureInitialized();
	} catch (error) {
		sendBackgroundLog(`${backgroundI18n.t("tab_update_init_failed")}: ${error.message}`, "error");
		return;
	}

	if (getAutoSwitchEnabled() && changeInfo.status === "complete" && tab?.url?.startsWith("http")) {
		try {
			const url = new URL(tab.url);
			const hostname = url.hostname.toLowerCase();

			const targetLanguage = await domainRulesManager.getLanguageForDomain(hostname);

			if (targetLanguage) {
				// 如果找到特定于域的语言，则应用它
				sendBackgroundLog(
					backgroundI18n.t("auto_switching_hostname", {
						hostname,
						language: targetLanguage,
					}),
					"info",
				);
				const result = await updateHeaderRules(targetLanguage, 0, true);
				if (result.changed) {
					notifyPopupUIUpdate(true, targetLanguage);
				}
			} else {
				// 否则，确保应用了默认的回退语言
				const fallbackLanguage = DEFAULT_LANG_EN;
				const currentLang = await getCurrentAcceptLanguageHeader();

				if (currentLang !== fallbackLanguage) {
					sendBackgroundLog(
						backgroundI18n.t("no_matching_rule", {
							hostname,
							fallback: fallbackLanguage,
						}),
						"info",
					);
					const result = await updateHeaderRules(fallbackLanguage, 0, true);
					if (result.changed) {
						notifyPopupUIUpdate(true, fallbackLanguage);
					}
				}
			}
		} catch (error) {
			sendBackgroundLog(`${backgroundI18n.t("error_processing_url", { url: tab.url })}: ${error.message}`, "error");
		}
	}
});

// 扩展卸载时的清理
chrome.runtime.onSuspend.addListener(() => {
	sendBackgroundLog(backgroundI18n.t("extension_suspending"), "info");

	// 清理需要手动清理的资源
	ResourceManager.cleanup();
});
