// popup/ui-sync.js - 弹窗页面 DOM 同步与显示辅助

import { fetchHeadersFromEndpoints, createLocalizedExternalCheckLinks } from "../shared/header-check-utils.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import { sendDebugLog } from "../shared/shared-utils.js";
import { popupI18n } from "../i18n/popup-i18n.js";
import { getEl, runDOMUpdate } from "./shared.js";

/**
 * 更新自动切换UI状态
 * 后置条件：会将 autoSwitchToggle.checked 同步为 enabled，调用方无需预先设置
 * @param {boolean} enabled - 是否启用自动切换
 * @param {HTMLInputElement} autoSwitchToggle - 自动切换开关元素
 * @param {HTMLSelectElement} languageSelect - 语言选择元素
 * @param {HTMLButtonElement} applyButton - 应用按钮元素
 */
export const updateAutoSwitchUI = (enabled, autoSwitchToggle, languageSelect, applyButton) => {
	// 检查必要元素
	if (!autoSwitchToggle) return;

	// 更新开关状态
	autoSwitchToggle.checked = !!enabled;

	// 根据自动切换状态禁用/启用手动选择控件
	if (languageSelect) languageSelect.disabled = !!enabled;
	if (applyButton) applyButton.disabled = !!enabled;

	// 记录状态变更日志
	const statusMsg = enabled ? popupI18n.t("enabled") : popupI18n.t("disabled");
	const actionMsg = enabled ? popupI18n.t("disable_manual_selection") : popupI18n.t("enable_manual_selection");

	sendDebugLog(`${popupI18n.t("auto_switch_function")}${statusMsg}, ${actionMsg}.`, "info");
};

/**
 * 显示错误消息
 * @param {string} message - 错误消息
 */
export const showError = (message) => {
	// 验证输入
	if (!message) return;

	// 直接获取DOM元素
	const errorAlert = getEl("errorAlert");
	const errorMessage = getEl("errorMessage");

	// 检查DOM元素
	if (!errorAlert || !errorMessage) return;

	// 错误反馈需即时可见，避免排队到后续帧
	errorMessage.textContent = message;
	errorAlert.classList.remove("d-none");

	// 5秒后自动隐藏错误消息（可延后合并）
	ResourceManager.setTimeout(() => {
		errorAlert.classList.add("d-none");
	}, 5000);
};

/**
 * 显示头部检查错误信息
 * @param {HTMLElement} element - 用于显示结果的元素
 * @param {string} messageKey - 国际化消息键
 */
const displayHeaderCheckError = (element, messageKey) => {
	element.innerHTML = "";
	const fragment = document.createDocumentFragment();
	fragment.appendChild(document.createTextNode(popupI18n.t(messageKey)));
	fragment.appendChild(document.createElement("br"));
	fragment.appendChild(createLocalizedExternalCheckLinks((key) => popupI18n.t(key)));
	element.appendChild(fragment);
};

/**
 * 更新语言显示
 * @param {string} language - 语言代码
 * @param {boolean} showSuccess - 是否显示成功提示
 */
export const updateLanguageDisplay = (language, showSuccess = false) => {
	// 验证输入
	if (!language) return;

	// 直接获取DOM元素
	const currentLanguageSpan = getEl("currentLanguage");
	const languageSelect = /** @type {HTMLSelectElement} */ (getEl("languageSelect"));

	// 如果当前值与目标语言一致，避免不必要的 DOM 写入
	if (currentLanguageSpan && currentLanguageSpan.textContent === language && !showSuccess) {
		if (languageSelect && languageSelect.value !== language) {
			// 仅在下拉值不一致时同步一次
			languageSelect.value = language;
		}
		return;
	}

	// 使用批量DOM更新提高性能；语言切换属于关键可见状态，使用立即模式
	// 更新当前语言显示
	if (currentLanguageSpan) currentLanguageSpan.textContent = language;
	// 同步语言选择框的值
	if (languageSelect) languageSelect.value = language;

	// 如果需要显示成功提示
	if (showSuccess) {
		const statusTextElement = getEl("statusText");
		if (!statusTextElement) return;

		// 移除之前的成功提示
		const oldSuccessSpan = statusTextElement.querySelector(".text-success");
		if (oldSuccessSpan) oldSuccessSpan.remove();

		// 创建新的成功提示
		const successSpan = document.createElement("span");
		successSpan.className = "text-success ms-1";
		successSpan.textContent = popupI18n.t("applied");

		// 安全地插入成功提示
		if (currentLanguageSpan) {
			currentLanguageSpan.insertAdjacentElement("afterend", successSpan);
		} else {
			statusTextElement.appendChild(successSpan);
		}

		// 2秒后移除成功提示
		ResourceManager.setTimeout(() => {
			if (successSpan.parentNode) {
				successSpan.remove();
			}
		}, 2000);
	}
};

/**
 * 快速检查防重入控制器：请求未返回期间禁止重复触发
 * （手动点击与程序性 .click() 均经此唯一入口拦截），并同步按钮禁用态
 * @param {HTMLElement} headerCheckContentPre - 用于显示结果的 <pre> 元素
 */
let headerCheckInFlight = false;
export const performHeaderCheckGuarded = async (headerCheckContentPre) => {
	if (headerCheckInFlight) {
		return;
	}
	headerCheckInFlight = true;
	const checkHeaderBtn = /** @type {HTMLButtonElement|null} */ (getEl("checkHeaderBtn"));
	if (checkHeaderBtn) {
		checkHeaderBtn.disabled = true;
	}
	try {
		await performHeaderCheck(headerCheckContentPre);
	} finally {
		headerCheckInFlight = false;
		if (checkHeaderBtn) {
			checkHeaderBtn.disabled = false;
		}
	}
};

/**
 * 执行头部快速检查（纯逻辑，不含重入控制）
 * @param {HTMLElement} headerCheckContentPre - 用于显示结果的 <pre> 元素
 */
export const performHeaderCheck = async (headerCheckContentPre) => {
	try {
		// 显示初始加载状态
		headerCheckContentPre.textContent = popupI18n.t("fetching_headers") + "...";
		sendDebugLog(popupI18n.t("start_quick_check"), "info");

		// 使用共享模块获取请求头
		const result = await fetchHeadersFromEndpoints();

		if (result.success) {
			sendDebugLog(`${popupI18n.t("successfully_got_headers_from")} ${result.endpoint}`, "success");

			if (result.acceptLanguage) {
				sendDebugLog(`${popupI18n.t("quick_check_detected_accept_language")} ${result.acceptLanguage}.`, "success");
				headerCheckContentPre.innerHTML = "";
				const fragment = document.createDocumentFragment();
				fragment.appendChild(document.createTextNode("Accept-Language: "));
				const span = document.createElement("span");
				span.className = "text-success fw-bold";
				span.textContent = result.acceptLanguage;
				fragment.appendChild(span);
				headerCheckContentPre.appendChild(fragment);
			} else {
				// 未找到Accept-Language头部
				sendDebugLog(popupI18n.t("quick_check_no_accept_language"), "warning");
				headerCheckContentPre.textContent = popupI18n.t("no_accept_language_header");
			}
		} else {
			// 所有尝试均失败
			sendDebugLog(`${popupI18n.t("quick_check_failed_all_points")}: ${result.error}`, "error");
			displayHeaderCheckError(headerCheckContentPre, "all_detection_points_failed_info");
		}
	} catch (error) {
		// 捕获意外错误
		sendDebugLog(`${popupI18n.t("quick_check_unexpected_error")}: ${error.message}`, "error");
		displayHeaderCheckError(headerCheckContentPre, "detection_error");
	}
};

// 防抖的UI更新函数
let lastUIUpdate = 0;
let uiUpdateTimer = null;
/**
 * 轻量级 UI 更新节流防抖：
 * - 仅用于被动同步（如 background 推送的状态），避免打断用户主动交互的即时反馈。
 * - 超出时间窗口时立即执行，否则合并为最后一次调用，始终只保留一个等待中的定时器。
 */
export const debouncedUIUpdate = (updateFn, delay = 16) => {
	if (typeof updateFn !== "function") return;

	// 清除之前的等待定时器，避免累积（防抖）
	if (uiUpdateTimer) {
		ResourceManager.clearTimeout(uiUpdateTimer);
		uiUpdateTimer = null;
	}

	const now = Date.now();

	// 若距离上次执行已超过窗口，直接执行
	if (now - lastUIUpdate > delay) {
		lastUIUpdate = now;
		runDOMUpdate(updateFn);
		return;
	}

	// 否则推迟到窗口结束时执行最后一次调用
	uiUpdateTimer = ResourceManager.setTimeout(() => {
		lastUIUpdate = Date.now();
		runDOMUpdate(updateFn);
		uiUpdateTimer = null;
	}, delay);
};
