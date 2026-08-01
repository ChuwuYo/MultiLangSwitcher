// debug/auto-switch.js - 自动切换开关控制与状态同步

import { MessageTypes } from "../shared/message-types.js";
import { requestBackground } from "../shared/shared-actions.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import { STORAGE_KEYS } from "../shared/storage-keys.js";
import { debugI18n } from "../i18n/debug-i18n.js";
import { addLogMessage } from "./log-panel.js";

/**
 * 初始化自动切换控制：页面加载状态同步、开关变更处理与后台 UI 状态监听
 */
export const initAutoSwitch = () => {
	// 页面加载时同步自动切换状态
	(async () => {
		try {
			const result = await chrome.storage.local.get([STORAGE_KEYS.AUTO_SWITCH_ENABLED]);

			const autoSwitchToggle = /** @type {HTMLInputElement} */ (document.getElementById("autoSwitchToggle"));
			if (!autoSwitchToggle) return;

			autoSwitchToggle.checked = !!result[STORAGE_KEYS.AUTO_SWITCH_ENABLED];

			// 等待i18n系统初始化完成后再输出日志（以 isReady 为终止条件，
			// 字典加载失败时 translations 恒为空对象，轮询它会永不终止）
			const checkI18nAndLog = () => {
				if (debugI18n.isReady) {
					addLogMessage(
						`${result[STORAGE_KEYS.AUTO_SWITCH_ENABLED] ? debugI18n.t("auto_switch_enabled") : debugI18n.t("auto_switch_disabled")}`,
						"info",
					);
				} else {
					ResourceManager.setTimeout(checkI18nAndLog, 100);
				}
			};

			checkI18nAndLog();
		} catch (error) {
			console.error("Failed to get auto switch status:", error.message);
		}
	})();

	// 自动切换功能控制
	ResourceManager.addEventListener(document.getElementById("autoSwitchToggle"), "change", function () {
		const isEnabled = this.checked;
		addLogMessage(
			`${debugI18n.t("try_enable_disable_auto")}${isEnabled ? debugI18n.t("enable") : debugI18n.t("disable")}${debugI18n.t("auto_switch_function_ellipsis")}`,
			"info",
		);

		// 发送消息到 background.js 更新自动切换状态
		(async () => {
			try {
				// 后台统一响应格式，失败会抛错
				await requestBackground(MessageTypes.AUTO_SWITCH_TOGGLED, {
					enabled: isEnabled,
				});
				addLogMessage(isEnabled ? debugI18n.t("auto_switch_enabled") : debugI18n.t("auto_switch_disabled"), "success");
				// 存储持久化由 background 的 AUTO_SWITCH_TOGGLED 处理器单点完成，此处无需回写
			} catch (error) {
				addLogMessage(`${debugI18n.t("update_auto_switch_failed")} ${error.message}`, "error");
			}
		})();
	});

	// 监听 background 发布的会话级 UI 状态（storage.onChanged 即天然广播，取代自定义消息；
	// 状态持久化由 background 单点负责，本页只更新展示，不回写存储）
	chrome.storage.onChanged.addListener((changes, areaName) => {
		if (areaName !== "session" || !changes[STORAGE_KEYS.UI_STATE]?.newValue) {
			return;
		}
		const { autoSwitchEnabled, currentLanguage } =
			/** @type {{ autoSwitchEnabled: boolean, currentLanguage: string }} */ (changes[STORAGE_KEYS.UI_STATE].newValue);
		const autoSwitchToggle = /** @type {HTMLInputElement} */ (document.getElementById("autoSwitchToggle"));
		if (autoSwitchToggle) {
			autoSwitchToggle.checked = !!autoSwitchEnabled;
		}
		addLogMessage(
			`${debugI18n.t("received_auto_switch_update")} ${autoSwitchEnabled ? debugI18n.t("enabled") : debugI18n.t("disabled")}, ${debugI18n.t("current_language_colon")} ${currentLanguage}`,
			"info",
		);
	});
};
