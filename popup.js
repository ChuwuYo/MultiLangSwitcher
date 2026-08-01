// --- 导入共享模块 ---
import { STORAGE_KEYS } from "./shared/storage-keys.js";
import { registerI18nInstance, sendDebugLog } from "./shared/shared-utils.js";
import { resetAcceptLanguage } from "./shared/shared-actions.js";
import { populateLanguageSelect } from "./shared/shared-language-options.js";
import { ResourceManager } from "./shared/shared-resource-manager.js";
import { popupI18n } from "./i18n/popup-i18n.js";
import { getEl } from "./popup/shared.js";
import {
	debouncedUIUpdate,
	performHeaderCheckGuarded,
	showError,
	updateAutoSwitchUI,
	updateLanguageDisplay,
} from "./popup/ui-sync.js";
import {
	getAutoSwitchStatus,
	getCurrentLanguage,
	setAutoSwitchStatus,
	updateHeaderRules,
} from "./popup/language-apply.js";
import { cancelUpdateCheck, debouncedUpdateCheck, resetUpdateCheckState } from "./popup/update-check.js";
import "./toggle.js";

registerI18nInstance("popup", popupI18n);

// --- 扩展初始化 ---
ResourceManager.addEventListener(document, "DOMContentLoaded", async () => {
	// 等待翻译系统加载完成
	if (!popupI18n.isReady) {
		await popupI18n.ready();
	}

	// 获取DOM元素
	const languageSelect = /** @type {HTMLSelectElement} */ (getEl("languageSelect"));
	const applyButton = /** @type {HTMLButtonElement} */ (getEl("applyButton"));
	const checkHeaderBtn = getEl("checkHeaderBtn");
	const autoSwitchToggle = /** @type {HTMLInputElement} */ (getEl("autoSwitchToggle"));
	const resetBtn = getEl("resetBtn");

	// 初始化语言选项下拉列表
	populateLanguageSelect(languageSelect);
	sendDebugLog(popupI18n.t("popup_script_loaded"));

	// 加载并应用自动切换状态
	const autoSwitchEnabled = await getAutoSwitchStatus();
	updateAutoSwitchUI(autoSwitchEnabled, autoSwitchToggle, languageSelect, applyButton);

	// 加载并显示当前语言设置
	const currentLanguage = await getCurrentLanguage();
	updateLanguageDisplay(currentLanguage);

	// 事件处理函数定义
	const eventHandlers = {
		// 防抖相关状态
		lastApplyTime: 0,

		// 自动切换开关变更处理
		autoSwitchChange: async (event) => {
			const enabled = event.target.checked;

			// 先本地即时反馈，再异步持久化，提升交互流畅度
			updateAutoSwitchUI(enabled, autoSwitchToggle, languageSelect, applyButton);

			const success = await setAutoSwitchStatus(enabled);
			if (!success) {
				// 回滚 UI 状态，使用立即模式
				updateAutoSwitchUI(!enabled, autoSwitchToggle, languageSelect, applyButton);
			}
		},

		// 语言选择框获得焦点处理
		languageSelectFocus: (event) => {
			event.target.size = 6;
			sendDebugLog(popupI18n.t("language_select_focus"), "info");
		},

		// 应用按钮点击处理
		applyButtonClick: async () => {
			if (!languageSelect) return;

			const selectedLanguage = languageSelect.value;

			// 防抖处理 - 0.6秒内的重复点击会被忽略
			const now = Date.now();
			if (eventHandlers.lastApplyTime && now - eventHandlers.lastApplyTime < 600) {
				sendDebugLog(popupI18n.t("apply_debounced"), "info");
				return;
			}
			eventHandlers.lastApplyTime = now;

			sendDebugLog(`${popupI18n.t("clicked_apply_button")} ${selectedLanguage}.`, "info");

			try {
				// 更新请求头规则并触发自动检查
				// currentLanguage 由 background 的 UPDATE_RULES 处理器在规则应用成功后持久化（单写者原则）
				await updateHeaderRules(selectedLanguage, true);
				updateLanguageDisplay(selectedLanguage);

				// 折叠下拉框，直接同步
				languageSelect.size = 1;
				sendDebugLog(popupI18n.t("collapse_language_select"), "info");
			} catch (error) {
				// 简化的错误处理
				const errorMsg = error.message || popupI18n.t("unknown_error");
				sendDebugLog(
					popupI18n.t("apply_language_failed", {
						language: selectedLanguage,
						error: errorMsg,
					}),
					"error",
				);
				showError(
					popupI18n.t("apply_language_failed_user", {
						language: selectedLanguage,
					}),
				);
			}
		},

		// 重置按钮点击处理
		resetButtonClick: async () => {
			sendDebugLog(popupI18n.t("clicked_reset_button"), "info");

			try {
				await resetAcceptLanguage();

				// 重置成功后更新UI
				sendDebugLog(popupI18n.t("reset_successful"), "success");
				updateLanguageDisplay(popupI18n.t("not_set"));
				if (languageSelect) languageSelect.value = "";
			} catch (error) {
				// 重置失败处理
				eventHandlers.handleResetError(error);
			}
		},

		// 重置操作错误处理函数
		handleResetError(error) {
			const errorDetails = error?.message || popupI18n.t("unknown_error");
			const userMessage = popupI18n.t("reset_failed_alert") + ": " + errorDetails;
			sendDebugLog(popupI18n.t("reset_request_failed", { message: errorDetails }), "error");
			showError(userMessage);
		},

		// 快速检查按钮点击处理
		checkHeaderBtnClick: () => {
			sendDebugLog(popupI18n.t("clicked_quick_check"), "info");
			const headerCheckResultDiv = document.getElementById("headerCheckResult");
			const headerCheckContentPre = document.getElementById("headerCheckContent");

			// 检查必要元素
			if (!headerCheckContentPre) return;

			// 显示检查结果区域并开始检查
			if (headerCheckResultDiv) headerCheckResultDiv.classList.remove("d-none");
			headerCheckContentPre.textContent = popupI18n.t("fetching_headers");
			performHeaderCheckGuarded(headerCheckContentPre);
		},

		// 更新检查按钮点击处理
		updateCheckBtnClick: () => {
			sendDebugLog(popupI18n.t("clicked_update_check_button"), "info");
			debouncedUpdateCheck();
		},
	};

	// 绑定事件监听器
	if (autoSwitchToggle) {
		ResourceManager.addEventListener(autoSwitchToggle, "change", eventHandlers.autoSwitchChange);
	}

	if (languageSelect) {
		ResourceManager.addEventListener(languageSelect, "focus", eventHandlers.languageSelectFocus);
	}

	if (applyButton) {
		ResourceManager.addEventListener(applyButton, "click", eventHandlers.applyButtonClick);
	}

	if (resetBtn) {
		ResourceManager.addEventListener(resetBtn, "click", eventHandlers.resetButtonClick);
	}

	if (checkHeaderBtn) {
		ResourceManager.addEventListener(checkHeaderBtn, "click", eventHandlers.checkHeaderBtnClick);
	}

	// 添加更新检查按钮事件监听器
	const updateCheckBtn = getEl("updateCheckBtn");
	if (updateCheckBtn) {
		ResourceManager.addEventListener(updateCheckBtn, "click", eventHandlers.updateCheckBtnClick);
	}

	// 全局资源清理函数
	const cleanupResources = () => {
		// 取消正在进行的更新检查
		cancelUpdateCheck();

		resetUpdateCheckState();

		// 清理 ResourceManager 中跟踪的资源
		ResourceManager.cleanup();

		sendDebugLog(popupI18n.t("popup_cleanup_completed"), "info");
	};

	// 页面卸载时清理事件和请求
	ResourceManager.addEventListener(window, "beforeunload", cleanupResources, {
		once: true,
	});

	// 页面隐藏时也进行清理（处理弹窗关闭的情况）
	ResourceManager.addEventListener(window, "pagehide", cleanupResources, {
		once: true,
	});

	// 通过可见性变化处理弹窗关闭
	ResourceManager.addEventListener(document, "visibilitychange", () => {
		if (document.hidden) {
			// 当弹窗变为隐藏时取消正在进行的更新检查
			cancelUpdateCheck();
			sendDebugLog(popupI18n.t("popup_hidden_cancelled_update"), "info");
		}
	});

	/**
	 * 处理 background 发布的 UI 状态变化
	 * 状态持久化由 background 单点负责，本页只更新展示，不回写存储
	 * @param {Object} uiState - UI 状态对象 { autoSwitchEnabled, currentLanguage }
	 * @param {HTMLInputElement} autoSwitchToggle - 自动切换开关元素
	 * @param {HTMLSelectElement} languageSelect - 语言选择元素
	 * @param {HTMLButtonElement} applyButton - 应用按钮元素
	 */
	const handleAutoSwitchUIUpdate = (uiState, autoSwitchToggle, languageSelect, applyButton) => {
		// 来自 background 的状态同步可能在短时间内多次触发，使用 debouncedUIUpdate 合并
		debouncedUIUpdate(() => {
			const autoSwitchEnabled = uiState.autoSwitchEnabled;

			if (typeof autoSwitchEnabled === "boolean") {
				updateAutoSwitchUI(autoSwitchEnabled, autoSwitchToggle, languageSelect, applyButton);
			}

			if (uiState.currentLanguage) {
				updateCurrentLanguageInfo(uiState.currentLanguage, languageSelect);
			}
		});
	};

	/**
	 * 更新当前语言信息显示
	 * @param {string} currentLanguage - 当前语言
	 * @param {HTMLSelectElement} languageSelect - 语言选择元素
	 */
	const updateCurrentLanguageInfo = (currentLanguage, languageSelect) => {
		updateLanguageDisplay(currentLanguage);

		// 同步更新语言选择器
		if (languageSelect) {
			languageSelect.value = currentLanguage;
		}

		sendDebugLog(`${popupI18n.t("received_background_message")} ${currentLanguage}${popupI18n.t("update_ui")}`, "info");
	};

	// 监听 background 发布的会话级 UI 状态（storage.onChanged 即天然广播，取代自定义消息）
	chrome.storage.onChanged.addListener((changes, areaName) => {
		if (areaName !== "session" || !changes[STORAGE_KEYS.UI_STATE]?.newValue) {
			return;
		}
		handleAutoSwitchUIUpdate(changes[STORAGE_KEYS.UI_STATE].newValue, autoSwitchToggle, languageSelect, applyButton);
	});
});
