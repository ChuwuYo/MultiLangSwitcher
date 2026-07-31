// popup/update-check.js - 更新检查器接线与防抖

import { ResourceManager } from "../shared/shared-resource-manager.js";
import { UpdateChecker } from "../shared/shared-update-checker.js";
import { sendDebugLog } from "../shared/shared-utils.js";
import { popupI18n } from "../i18n/popup-i18n.js";
import { getEl, runDOMUpdate } from "./shared.js";

// --- 全局常量和配置 ---
const UPDATE_CHECK_MIN_INTERVAL = 3000; // 最小检查间隔3秒

// --- 全局变量 ---
let updateChecker = null;
let updateCheckInProgress = false;
let updateCheckController = null;
let updateCheckDebounceTimer = null;
let lastUpdateCheckTime = 0;

/**
 * 初始化更新检查器实例
 */
const initializeUpdateChecker = () => {
	// 强制重新初始化以获取最新的版本号
	const currentVersion = chrome.runtime.getManifest().version;
	updateChecker = new UpdateChecker("ChuwuYo", "MultiLangSwitcher", currentVersion);
	sendDebugLog(popupI18n.t("update_checker_initialized", { version: currentVersion }), "info");
};

/**
 * 显示更新错误消息，具有增强的错误处理
 * @param {string} message - 主要错误消息
 * @param {string} [fallbackMessage] - 可选的回退建议
 * @param {boolean} [showRetryOption] - 是否显示重试选项
 */
const showUpdateError = (message, fallbackMessage = null, showRetryOption = false) => {
	// 直接获取DOM元素
	const updateErrorAlert = getEl("updateErrorAlert");
	const updateErrorMessage = getEl("updateErrorMessage");

	if (!updateErrorAlert || !updateErrorMessage) return;

	// 使用安全的 DOM 操作构建错误消息
	runDOMUpdate(() => {
		updateErrorMessage.innerHTML = "";
		const fragment = document.createDocumentFragment();

		// 添加主要错误消息
		fragment.appendChild(document.createTextNode(message));

		// 如果提供了回退建议，则添加
		if (fallbackMessage) {
			fragment.appendChild(document.createElement("br"));
			const small = document.createElement("small");
			small.className = "text-muted mt-1";
			small.textContent = fallbackMessage;
			fragment.appendChild(small);
		}

		// 如果适用，添加重试选项
		if (showRetryOption) {
			fragment.appendChild(document.createElement("br"));
			const smallContainer = document.createElement("small");
			smallContainer.className = "mt-2";

			const retryLink = document.createElement("a");
			retryLink.href = "#";
			retryLink.className = "text-primary";
			retryLink.textContent = popupI18n.t("retry_update_check");
			ResourceManager.addEventListener(retryLink, "click", (e) => {
				e.preventDefault();
				debouncedUpdateCheck();
			});

			smallContainer.appendChild(retryLink);
			fragment.appendChild(smallContainer);
		}

		updateErrorMessage.appendChild(fragment);
		updateErrorAlert.classList.remove("d-none");
	});

	// 对于复杂错误使用更长的自动隐藏时间
	const hideDelay = fallbackMessage || showRetryOption ? 8000 : 5000;
	ResourceManager.setTimeout(() => {
		updateErrorAlert.classList.add("d-none");
	}, hideDelay);
};

/**
 * 显示更新检查的加载状态
 */
const showUpdateLoadingState = () => {
	const updateNotification = getEl("updateNotification");
	const updateNotificationContent = getEl("updateNotificationContent");

	if (!updateNotification || !updateNotificationContent) return;

	const alertDiv = updateNotification.querySelector(".alert");
	if (!alertDiv) return;

	// 该提示用于反馈「已开始检查」，应立即可见
	runDOMUpdate(() => {
		alertDiv.className = "alert alert-info mb-0 update-notification info";
		updateNotificationContent.innerHTML = "";
		const fragment = document.createDocumentFragment();

		const container = document.createElement("div");
		container.className = "text-center update-version-info";

		const flexBox = document.createElement("div");
		flexBox.className = "d-flex align-items-center justify-content-center";

		const spinner = document.createElement("div");
		spinner.className = "spinner-border spinner-border-sm me-2";
		spinner.setAttribute("role", "status");
		spinner.setAttribute("aria-hidden", "true");

		const strong = document.createElement("strong");
		strong.textContent = popupI18n.t("fetching_version_info");

		flexBox.appendChild(spinner);
		flexBox.appendChild(strong);
		container.appendChild(flexBox);
		fragment.appendChild(container);
		updateNotificationContent.appendChild(fragment);

		updateNotification.classList.remove("d-none");
	});
};

/**
 * 显示更新通知，支持回退模式
 * @param {Object} updateInfo - 更新信息
 */
const showUpdateNotification = (updateInfo) => {
	const updateNotification = getEl("updateNotification");
	const updateNotificationContent = getEl("updateNotificationContent");

	if (!updateNotification || !updateNotificationContent) return;

	const alertDiv = updateNotification.querySelector(".alert");
	if (!alertDiv) return;

	runDOMUpdate(() => {
		// 当GitHub API不可用时处理回退模式
		if (updateInfo.fallbackMode) {
			alertDiv.className = "alert alert-warning mb-0 update-notification warning";
			updateNotificationContent.innerHTML = "";
			const fragment = document.createDocumentFragment();

			const container = document.createElement("div");
			container.className = "text-center update-version-info";

			const strong = document.createElement("strong");
			strong.textContent = popupI18n.t("update_check_fallback_title");
			container.appendChild(strong);

			const comparison = document.createElement("div");
			comparison.className = "version-comparison";
			const versionLine = document.createElement("div");
			versionLine.className = "version-line";
			versionLine.style.justifyContent = "center";
			const badge = document.createElement("span");
			badge.className = "version-badge";
			badge.textContent = `v${updateInfo.currentVersion}`;
			versionLine.appendChild(badge);
			comparison.appendChild(versionLine);
			container.appendChild(comparison);

			const fallbackMsg = document.createElement("div");
			fallbackMsg.className = "fallback-message mt-2";
			const small = document.createElement("small");
			small.className = "text-muted";
			small.textContent = popupI18n.t("update_check_fallback_message");
			fallbackMsg.appendChild(small);
			container.appendChild(fallbackMsg);

			const actions = document.createElement("div");
			actions.className = "update-actions mt-2";
			const link = document.createElement("a");
			link.href = updateInfo.releaseUrl;
			link.target = "_blank";
			link.className = "btn btn-outline-warning btn-sm";
			link.textContent = popupI18n.t("check_manually");
			actions.appendChild(link);
			container.appendChild(actions);

			fragment.appendChild(container);
			updateNotificationContent.appendChild(fragment);

			sendDebugLog(popupI18n.t("showing_fallback_notification"), "warning");

			// 5秒后自动隐藏回退通知
			ResourceManager.setTimeout(() => {
				updateNotification.classList.add("d-none");
			}, 5000);
		} else if (updateInfo.updateAvailable) {
			// 有可用更新
			alertDiv.className = "alert alert-info mb-0 update-notification info";

			updateNotificationContent.innerHTML = "";
			const fragment = document.createDocumentFragment();

			const versionInfo = document.createElement("div");
			versionInfo.className = "update-version-info";

			const strong = document.createElement("strong");
			strong.textContent = popupI18n.t("update_notification_title");
			versionInfo.appendChild(strong);

			const comparison = document.createElement("div");
			comparison.className = "version-comparison";

			// 当前版本行
			const currentLine = document.createElement("div");
			currentLine.className = "version-line";
			const currentLabel = document.createElement("span");
			currentLabel.textContent = popupI18n.t("current_version").replace("v{current}", "").replace("{current}", "");
			const currentBadge = document.createElement("span");
			currentBadge.className = "version-badge";
			currentBadge.textContent = `v${updateInfo.currentVersion}`;
			currentLine.appendChild(currentLabel);
			currentLine.appendChild(currentBadge);
			comparison.appendChild(currentLine);

			// 最新版本行
			const latestLine = document.createElement("div");
			latestLine.className = "version-line";
			const latestLabel = document.createElement("span");
			latestLabel.textContent = popupI18n.t("latest_version").replace("v{latest}", "").replace("{latest}", "");
			const latestBadge = document.createElement("span");
			latestBadge.className = "version-badge";
			latestBadge.textContent = `v${updateInfo.latestVersion}`;
			latestLine.appendChild(latestLabel);
			latestLine.appendChild(latestBadge);
			comparison.appendChild(latestLine);

			versionInfo.appendChild(comparison);
			fragment.appendChild(versionInfo);

			const actions = document.createElement("div");
			actions.className = "update-actions";

			const viewLink = document.createElement("a");
			viewLink.href = updateInfo.releaseUrl;
			viewLink.target = "_blank";
			viewLink.className = "btn btn-outline-primary";
			viewLink.textContent = popupI18n.t("view_release");
			actions.appendChild(viewLink);

			const downloadLink = document.createElement("a");
			downloadLink.href = `https://github.com/ChuwuYo/MultiLangSwitcher/archive/refs/tags/v${updateInfo.latestVersion}.zip`;
			downloadLink.target = "_blank";
			downloadLink.className = "btn btn-primary";
			downloadLink.textContent = popupI18n.t("download_update");
			actions.appendChild(downloadLink);

			fragment.appendChild(actions);
			updateNotificationContent.appendChild(fragment);

			sendDebugLog(popupI18n.t("update_available", { version: updateInfo.latestVersion }), "info");
		} else {
			// 没有可用更新
			alertDiv.className = "alert alert-success mb-0 update-notification success";
			updateNotificationContent.innerHTML = "";
			const fragment = document.createDocumentFragment();

			const container = document.createElement("div");
			container.className = "text-center update-version-info";

			const strong = document.createElement("strong");
			strong.textContent = popupI18n.t("no_updates_available");
			container.appendChild(strong);

			const comparison = document.createElement("div");
			comparison.className = "version-comparison";
			const versionLine = document.createElement("div");
			versionLine.className = "version-line";
			versionLine.style.justifyContent = "center";
			const badge = document.createElement("span");
			badge.className = "version-badge";
			badge.textContent = `v${updateInfo.currentVersion}`;
			versionLine.appendChild(badge);
			comparison.appendChild(versionLine);
			container.appendChild(comparison);

			fragment.appendChild(container);
			updateNotificationContent.appendChild(fragment);

			sendDebugLog(popupI18n.t("extension_is_up_to_date"), "info");

			// 4秒后自动隐藏成功通知
			ResourceManager.setTimeout(() => {
				updateNotification.classList.add("d-none");
			}, 4000);
		}

		updateNotification.classList.remove("d-none");
	});
};

/**
 * 更新检查按钮UI状态
 * @param {boolean} isChecking - 是否正在进行更新检查
 */
const updateCheckButtonState = (isChecking) => {
	// 直接获取DOM元素
	const updateCheckBtn = /** @type {HTMLButtonElement} */ (getEl("updateCheckBtn"));
	const updateCheckText = getEl("updateCheckText");
	const updateCheckSpinner = getEl("updateCheckSpinner");

	// 检查DOM元素
	if (!updateCheckBtn || !updateCheckText || !updateCheckSpinner) return;

	// 该状态直接影响用户对点击的反馈，使用立即模式消除可感知延迟
	runDOMUpdate(() => {
		if (isChecking) {
			updateCheckBtn.disabled = true;
			updateCheckText.textContent = popupI18n.t("checking_updates");
			updateCheckSpinner.classList.remove("d-none");
		} else {
			updateCheckBtn.disabled = false;
			updateCheckText.textContent = popupI18n.t("check_for_updates");
			updateCheckSpinner.classList.add("d-none");
		}
	});
};

/**
 * 取消正在进行的更新检查请求
 */
export const cancelUpdateCheck = () => {
	if (updateCheckController) {
		ResourceManager.abortController(updateCheckController);
		updateCheckController = null;
		sendDebugLog(popupI18n.t("update_check_cancelled"), "info");
	}

	if (updateCheckInProgress) {
		updateCheckInProgress = false;
		updateCheckButtonState(false);
	}
};

/**
 * 重置更新检查相关的全局状态（页面卸载清理用）
 */
export const resetUpdateCheckState = () => {
	// 清除防抖定时器
	if (updateCheckDebounceTimer) {
		ResourceManager.clearTimeout(updateCheckDebounceTimer);
		updateCheckDebounceTimer = null;
	}

	// 清除DOM更新相关的定时器
	// 清理更新检查器实例
	if (updateChecker) {
		updateChecker = null;
	}

	// 清理全局状态
	updateCheckInProgress = false;
	lastUpdateCheckTime = 0;
};

/**
 * 防抖的更新检查函数 - 即时UI响应
 */
export const debouncedUpdateCheck = () => {
	// 清除现有的防抖定时器
	if (updateCheckDebounceTimer) {
		ResourceManager.clearTimeout(updateCheckDebounceTimer);
		updateCheckDebounceTimer = null;
	}

	// 检查请求之间的最小间隔
	const now = Date.now();
	const timeSinceLastCheck = now - lastUpdateCheckTime;

	// 检查频率限制
	if (timeSinceLastCheck < UPDATE_CHECK_MIN_INTERVAL) {
		const remainingTime = UPDATE_CHECK_MIN_INTERVAL - timeSinceLastCheck;
		sendDebugLog(
			popupI18n.t("update_check_rate_limited", {
				seconds: Math.ceil(remainingTime / 1000),
			}),
			"warning",
		);
		return;
	}

	// 立即执行，不使用任何延迟
	sendDebugLog(popupI18n.t("update_check_starting"), "info");

	// 立即执行，不使用setTimeout
	performUpdateCheck();
};

/**
 * 执行更新检查，请求管理（非阻塞操作）
 */
const performUpdateCheck = async () => {
	if (updateCheckInProgress) {
		sendDebugLog(popupI18n.t("update_check_in_progress"), "warning");
		return;
	}

	// 每次检查时都重新初始化，以确保使用最新的版本号
	initializeUpdateChecker();

	// 取消任何已有的请求
	cancelUpdateCheck();

	updateCheckInProgress = true;
	lastUpdateCheckTime = Date.now();

	// 隐藏之前的错误通知
	const updateErrorAlert = getEl("updateErrorAlert");
	if (updateErrorAlert) {
		updateErrorAlert.classList.add("d-none");
	}

	// 立即显示加载状态和更新按钮状态
	showUpdateLoadingState();
	updateCheckButtonState(true);

	// 为此请求创建新的中止控制器
	updateCheckController = ResourceManager.addController(new AbortController());

	try {
		sendDebugLog(popupI18n.t("starting_update_check"), "info");

		// 为更新检查器添加中止信号支持，具有优雅的回退机制
		const updateInfo = await updateChecker.checkForUpdates(updateCheckController.signal);

		// 检查请求是否被取消
		if (updateCheckController?.signal.aborted) {
			sendDebugLog(popupI18n.t("update_check_was_cancelled"), "info");
			return;
		}

		sendDebugLog(popupI18n.t("update_check_success"), "success");
		showUpdateNotification(updateInfo);
	} catch (error) {
		// 检查错误是否由于取消导致
		if (error.name === "AbortError" || updateCheckController?.signal.aborted) {
			sendDebugLog(popupI18n.t("update_check_was_cancelled"), "info");
			return;
		}

		sendDebugLog(
			popupI18n.t("update_check_failed_with_message", {
				message: error.message,
			}),
			"error",
		);

		// 错误处理
		let errorMessage;
		let fallbackMessage;
		const showRetryOption = true; // 对大多数可恢复错误显示重试选项

		switch (error.type) {
			case "NETWORK_ISSUE":
				errorMessage = popupI18n.t("update_check_network_issue");
				fallbackMessage = popupI18n.t("update_check_network_issue_fallback");
				break;
			case "SERVICE_ISSUE":
				errorMessage = popupI18n.t("update_check_service_issue");
				fallbackMessage = popupI18n.t("update_check_service_issue_fallback");
				break;
			default: // UNEXPECTED_ERROR
				errorMessage = popupI18n.t("update_check_unexpected_error");
				fallbackMessage = popupI18n.t("manual_check_fallback");
				break;
		}

		// 显示统一的错误信息
		showUpdateError(errorMessage, fallbackMessage, showRetryOption);
	} finally {
		// 清理更新检查状态
		updateCheckInProgress = false;

		// 使用对外暴露的 abortController 接口清理控制器（避免直接访问内部结构）
		if (updateCheckController) {
			ResourceManager.abortController(updateCheckController);
			updateCheckController = null;
		}

		updateCheckButtonState(false);
	}
};
