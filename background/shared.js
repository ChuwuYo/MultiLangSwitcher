// 后台各模块共享的常量、日志、UI 通知与跨模块状态

import { sendDebugLog } from "../shared/shared-utils.js";
import { STORAGE_KEYS } from "../shared/storage-keys.js";
import { backgroundI18n, backgroundI18nReady } from "../i18n/background-i18n.js";
import { domainManagerI18nReady } from "../i18n/domain-manager-i18n.js";

// 将所有i18n模块的初始化Promise聚合到一个地方
export const i18nReady = Promise.all([backgroundI18nReady, domainManagerI18nReady]);

// 常量定义
export const RULE_ID = 1;
export const DEFAULT_LANG_EN = "en-US"; // 为英文用户设置的默认语言，也用作自动切换的回退语言

// 使用共享的sendDebugLog函数，但保留后台特定的日志前缀
export const sendBackgroundLog = (message, logType = "info") => {
	// 假设i18n已经准备好，因为调用此函数前会确保初始化完成
	const backgroundLabel = backgroundI18n.t("background") || "Background";

	// 确保同样的消息被用于控制台日志和调试日志
	console.log(`[${backgroundLabel} ${logType.toUpperCase()}] ${message}`);
	sendDebugLog(`[${backgroundLabel}] ${message}`, logType);
};

// 全局状态变量
let autoSwitchEnabled = false; // 自动切换状态

/**
 * 读取自动切换状态
 * @returns {boolean} 当前自动切换是否启用
 */
export const getAutoSwitchEnabled = () => autoSwitchEnabled;

/**
 * 更新自动切换状态
 * @param {boolean} value - 新的自动切换状态
 */
export const setAutoSwitchEnabled = (value) => {
	autoSwitchEnabled = value;
};

/**
 * 发布生效 UI 状态到会话存储
 * 页面通过 chrome.storage.onChanged 感知变化（取代自定义消息广播，
 * popup 未打开时不再产生"无接收方"告警）。注意 currentLanguage 是
 * 当前生效语言（自动模式下为规则实际应用值），与 storage.local 中
 * 保存的"最后一次手动选择"语义不同，故写入 session 而非 local。
 * @param {boolean} autoSwitchEnabled - 自动切换是否启用
 * @param {string} currentLanguage - 当前生效的语言代码
 */
export const notifyPopupUIUpdate = (autoSwitchEnabled, currentLanguage) => {
	chrome.storage.session
		.set({
			[STORAGE_KEYS.UI_STATE]: {
				autoSwitchEnabled: autoSwitchEnabled,
				currentLanguage: currentLanguage,
			},
		})
		.catch((notifyError) => {
			sendBackgroundLog(`${backgroundI18n.t("failed_notify_ui_update")}: ${notifyError.message}`, "warning");
		});
	sendBackgroundLog(
		`${backgroundI18n.t("ui_update")}: ${backgroundI18n.t("auto_switch")}=${autoSwitchEnabled}, ${backgroundI18n.t("language")}=${currentLanguage}`,
		"info",
	);
};
