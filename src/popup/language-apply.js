// popup/language-apply.js - 语言应用流程与存储读取

import { MessageTypes } from "../shared/message-types.js";
import { STORAGE_KEYS } from "../shared/storage-keys.js";
import { sendDebugLog } from "../shared/shared-utils.js";
import { requestBackground } from "../shared/shared-actions.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import { popupI18n } from "../i18n/popup-i18n.js";
import { getEl } from "./shared.js";
import { showError, updateLanguageDisplay } from "./ui-sync.js";

/**
 * 更新请求头规则，通过background脚本
 * @param {string} language - 语言代码
 * @param {boolean} autoCheck - 是否自动检查
 * @returns {Promise<void>}
 */
export const updateHeaderRules = async (language, autoCheck = false) => {
	// 验证输入
	if (!language) {
		throw new Error("Language parameter is required");
	}

	// 清理语言代码
	const cleanLanguage = language.trim();
	sendDebugLog(
		`${popupI18n.t("trying_to_update_rules")} ${cleanLanguage}. ${popupI18n.t("auto_check")} ${autoCheck}.`,
		"info",
	);

	// 统一消息调用：成功返回 data，失败直接抛错
	const response = await requestBackground(MessageTypes.UPDATE_RULES, {
		language: cleanLanguage,
	});

	// 成功处理
	sendDebugLog(`${popupI18n.t("rules_updated_successfully")} ${response.language}.`, "success");
	updateLanguageDisplay(response.language, true);

	// 如果启用自动检查，触发快速检查
	if (autoCheck) {
		const checkHeaderBtn = getEl("checkHeaderBtn");
		if (checkHeaderBtn && getEl("headerCheckResult")) {
			sendDebugLog(popupI18n.t("auto_trigger_quick_check"), "info");
			ResourceManager.setTimeout(() => checkHeaderBtn.click(), 500);
		}
	}
};

/**
 * 获取当前语言设置
 * @returns {Promise<string>} 当前语言设置
 */
export const getCurrentLanguage = async () => {
	// 尝试从background脚本获取当前语言
	const backgroundLanguage = await getLanguageFromBackground();
	if (backgroundLanguage) return backgroundLanguage;

	// 回退到本地存储
	const storageLanguage = await getLanguageFromStorage();
	if (storageLanguage) return storageLanguage;

	// 使用默认语言作为最后的回退
	return getDefaultLanguage();
};

/**
 * 从background脚本获取语言设置
 * @returns {Promise<string|null>} 语言代码或null
 */
const getLanguageFromBackground = async () => {
	try {
		// 从后台获取：{ currentLanguage, autoSwitchEnabled }
		const response = await requestBackground(MessageTypes.GET_CURRENT_LANG);

		if (response?.currentLanguage) {
			sendDebugLog(
				popupI18n.t("get_current_language_from_background", {
					language: response.currentLanguage,
				}),
				"info",
			);
			return response.currentLanguage;
		}

		return null;
	} catch (error) {
		sendDebugLog(popupI18n.t("get_background_status_failed", { message: error.message }), "error");
		return null;
	}
};

/**
 * 从本地存储获取语言设置
 * @returns {Promise<string|null>} 语言代码或null
 */
const getLanguageFromStorage = async () => {
	try {
		const result = /** @type {Record<string, string>} */ (
			await chrome.storage.local.get([STORAGE_KEYS.CURRENT_LANGUAGE])
		);

		if (result?.[STORAGE_KEYS.CURRENT_LANGUAGE]) {
			sendDebugLog(`${popupI18n.t("loaded_stored_language")} ${result[STORAGE_KEYS.CURRENT_LANGUAGE]}.`, "info");
			return result[STORAGE_KEYS.CURRENT_LANGUAGE];
		}

		return null;
	} catch (error) {
		sendDebugLog(popupI18n.t("error_accessing_storage", { message: error.message }), "error");
		return null;
	}
};

/**
 * 获取默认语言设置
 * @returns {string} 默认语言代码
 */
const getDefaultLanguage = () => {
	const languageSelect = /** @type {HTMLSelectElement} */ (getEl("languageSelect"));
	const defaultLanguage = languageSelect ? languageSelect.value : popupI18n.t("not_set");
	sendDebugLog(`${popupI18n.t("no_stored_language")} ${defaultLanguage}.`, "warning");
	return defaultLanguage;
};

/**
 * 获取自动切换状态
 * @returns {Promise<boolean>} 自动切换是否启用
 */
export const getAutoSwitchStatus = async () => {
	try {
		const result = await chrome.storage.local.get([STORAGE_KEYS.AUTO_SWITCH_ENABLED]);
		return !!result[STORAGE_KEYS.AUTO_SWITCH_ENABLED];
	} catch (error) {
		sendDebugLog(
			popupI18n.t("error_getting_auto_switch_status", {
				message: error.message,
			}),
			"error",
		);
		return false; // 默认返回false
	}
};

/**
 * 设置自动切换状态
 * 持久化由 background 的 AUTO_SWITCH_TOGGLED 处理器单点完成（写存储 + 应用规则 + 发布 UI 状态），
 * 本页不直接写存储，避免双写竞态；返回值反映后台实际处理结果
 * @param {boolean} enabled - 是否启用
 * @returns {Promise<boolean>} 操作是否成功
 */
export const setAutoSwitchStatus = async (enabled) => {
	try {
		await requestBackground(MessageTypes.AUTO_SWITCH_TOGGLED, { enabled });

		// 记录状态变更日志
		sendDebugLog(
			`${popupI18n.t("auto_switch_status_saved")} ${enabled ? popupI18n.t("enabled") : popupI18n.t("disabled")}.`,
			"info",
		);

		return true;
	} catch (error) {
		const message = error.message;
		const localized = popupI18n.t("update_storage_status_failed", { message });

		// 避免重复字符串插值逻辑，统一使用 localized
		showError(localized);
		sendDebugLog(localized, "error");
		return false;
	}
};
