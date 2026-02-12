// --- 导入共享模块 ---
// 注意：这些脚本已在 popup.html 中通过 <script> 标签加载

// --- 全局常量和配置 ---
const UPDATE_CHECK_MIN_INTERVAL = 3000; // 最小检查间隔3秒

// --- 全局变量 ---
let updateChecker = null;
let updateCheckInProgress = false;
let updateCheckController = null;
let updateCheckDebounceTimer = null;
let lastUpdateCheckTime = 0;

// 使用统一的资源管理器

const getEl = (id) => document.getElementById(id);

/**
 * 更新自动切换UI状态
 * @param {boolean} enabled - 是否启用自动切换
 * @param {HTMLElement} autoSwitchToggle - 自动切换开关元素
 * @param {HTMLElement} languageSelect - 语言选择元素
 * @param {HTMLElement} applyButton - 应用按钮元素
 */
const updateAutoSwitchUI = (
	enabled,
	autoSwitchToggle,
	languageSelect,
	applyButton,
) => {
	// 检查必要元素
	if (!autoSwitchToggle) return;

	// 更新开关状态
	autoSwitchToggle.checked = !!enabled;

	// 根据自动切换状态禁用/启用手动选择控件
	if (languageSelect) languageSelect.disabled = !!enabled;
	if (applyButton) applyButton.disabled = !!enabled;

	// 记录状态变更日志
	const statusMsg = enabled ? popupI18n.t("enabled") : popupI18n.t("disabled");
	const actionMsg = enabled
		? popupI18n.t("disable_manual_selection")
		: popupI18n.t("enable_manual_selection");

	sendDebugLog(
		`${popupI18n.t("auto_switch_function")}${statusMsg}, ${actionMsg}.`,
		"info",
	);
};

/**
 * 更新请求头规则，通过background脚本
 * @param {string} language - 语言代码
 * @param {boolean} autoCheck - 是否自动检查
 * @returns {Promise<void>}
 */
const updateHeaderRules = async (language, autoCheck = false) => {
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
	const response = await requestBackground("UPDATE_RULES", {
		language: cleanLanguage,
	});

	// 成功处理
	sendDebugLog(
		`${popupI18n.t("rules_updated_successfully")} ${response.language}.`,
		"success",
	);
	updateLanguageDisplay(response.language, true);

	// 如果启用自动检查，触发快速检查
	if (autoCheck) {
		const checkHeaderBtn = document.getElementById("checkHeaderBtn");
		if (checkHeaderBtn && document.getElementById("headerCheckResult")) {
			sendDebugLog(popupI18n.t("auto_trigger_quick_check"), "info");
			ResourceManager.setTimeout(() => checkHeaderBtn.click(), 500);
		}
	}
};

/**
 * 显示错误消息
 * @param {string} message - 错误消息
 */
const showError = (message) => {
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
	fragment.appendChild(
		window.HeaderCheckUtils.createExternalCheckLinks({
			prefix: popupI18n.t("external_check_prefix"),
			or: popupI18n.t("external_check_or"),
			suffix: popupI18n.t("external_check_suffix"),
		}),
	);
	element.appendChild(fragment);
};

/**
 * 更新语言显示
 * @param {string} language - 语言代码
 * @param {boolean} showSuccess - 是否显示成功提示
 */
const updateLanguageDisplay = (language, showSuccess = false) => {
	// 验证输入
	if (!language) return;

	// 直接获取DOM元素
	const currentLanguageSpan = getEl("currentLanguage");
	const languageSelect = getEl("languageSelect");

	// 如果当前值与目标语言一致，避免不必要的 DOM 写入
	if (
		currentLanguageSpan &&
		currentLanguageSpan.textContent === language &&
		!showSuccess
	) {
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
 * 执行头部快速检查
 * @param {HTMLElement} headerCheckContentPre - 用于显示结果的 <pre> 元素
 */
const performHeaderCheck = async (headerCheckContentPre) => {
	// 显示初始加载状态
	headerCheckContentPre.textContent = popupI18n.t("fetching_headers") + "...";
	sendDebugLog(popupI18n.t("start_quick_check"), "info");

	try {
		// 使用共享模块获取请求头
		const result = await window.HeaderCheckUtils.fetchHeadersFromEndpoints();

		if (result.success) {
			sendDebugLog(
				`${popupI18n.t("successfully_got_headers_from")} ${result.endpoint}`,
				"success",
			);

			if (result.acceptLanguage) {
				sendDebugLog(
					`${popupI18n.t("quick_check_detected_accept_language")} ${result.acceptLanguage}.`,
					"success",
				);
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
				headerCheckContentPre.textContent = popupI18n.t(
					"no_accept_language_header",
				);
			}
		} else {
			// 所有尝试均失败
			sendDebugLog(
				`${popupI18n.t("quick_check_failed_all_points")}: ${result.error}`,
				"error",
			);
			displayHeaderCheckError(
				headerCheckContentPre,
				"all_detection_points_failed_info",
			);
		}
	} catch (error) {
		// 捕获意外错误
		sendDebugLog(
			`${popupI18n.t("quick_check_unexpected_error")}: ${error.message}`,
			"error",
		);
		displayHeaderCheckError(headerCheckContentPre, "detection_error");
	}
};

/**
 * 获取当前语言设置
 * @returns {Promise<string>} 当前语言设置
 */
const getCurrentLanguage = async () => {
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
		const response = await requestBackground("GET_CURRENT_LANG");

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
		sendDebugLog(
			popupI18n.t("get_background_status_failed", { message: error.message }),
			"error",
		);
		return null;
	}
};

/**
 * 从本地存储获取语言设置
 * @returns {Promise<string|null>} 语言代码或null
 */
const getLanguageFromStorage = async () => {
	try {
		// 从存储获取：{ data: { currentLanguage } }
		const result = await requestBackground("GET_STORAGE_DATA", {
			keys: ["currentLanguage"],
		});

		if (result?.data?.currentLanguage) {
			sendDebugLog(
				`${popupI18n.t("loaded_stored_language")} ${result.data.currentLanguage}.`,
				"info",
			);
			return result.data.currentLanguage;
		}

		return null;
	} catch (error) {
		sendDebugLog(
			popupI18n.t("error_accessing_storage", { message: error.message }),
			"error",
		);
		return null;
	}
};

/**
 * 获取默认语言设置
 * @returns {string} 默认语言代码
 */
const getDefaultLanguage = () => {
	const languageSelect = document.getElementById("languageSelect");
	const defaultLanguage = languageSelect
		? languageSelect.value
		: popupI18n.t("not_set");
	sendDebugLog(
		`${popupI18n.t("no_stored_language")} ${defaultLanguage}.`,
		"warning",
	);
	return defaultLanguage;
};

/**
 * 获取自动切换状态
 * @returns {Promise<boolean>} 自动切换是否启用
 */
const getAutoSwitchStatus = async () => {
	try {
		// 从本地存储获取自动切换状态
		const result = await requestBackground("GET_STORAGE_DATA", {
			keys: ["autoSwitchEnabled"],
		});
		return !!result.data?.autoSwitchEnabled;
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
 * @param {boolean} enabled - 是否启用
 * @returns {Promise<boolean>} 操作是否成功
 */
const setAutoSwitchStatus = async (enabled) => {
	try {
		// 保存自动切换状态到本地存储
		await requestBackground("SET_STORAGE_DATA", {
			data: { autoSwitchEnabled: enabled },
		});

		// 记录状态变更日志
		sendDebugLog(
			`${popupI18n.t("auto_switch_status_saved")} ${enabled ? popupI18n.t("enabled") : popupI18n.t("disabled")}.`,
			"info",
		);

		// 通知 background 脚本状态变更（即发即弃，不影响当前流程；仅在失败时记录日志）
		requestBackground("AUTO_SWITCH_TOGGLED", { enabled }).catch(
			(notifyError) => {
				sendDebugLog(
					`${popupI18n.t("failed_notify_background")}: ${notifyError.message}`,
					"warning",
				);
			},
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

/**
 * 保存当前语言设置
 * @param {string} language - 语言代码
 * @returns {Promise<void>}
 */
const saveLanguageSetting = async (language) => {
	// 验证输入
	if (!language) {
		throw new Error("Language parameter is required");
	}

	// 保存语言设置到本地存储
	await requestBackground("SET_STORAGE_DATA", {
		data: { currentLanguage: language },
	});

	sendDebugLog(
		`${popupI18n.t("language_settings_saved")} ${language}.`,
		"info",
	);
};

/**
 * 安全执行DOM更新操作，捕获并记录错误
 * @param {Function} updateFn - 要执行的DOM更新函数
 */
const runDOMUpdate = (updateFn) => {
	if (typeof updateFn !== "function") return;
	try {
		updateFn();
	} catch (error) {
		sendDebugLog(
			popupI18n.t("dom_update_error", { message: error.message }),
			"error",
		);
	}
};

/**
 * 初始化更新检查器实例
 */
const initializeUpdateChecker = () => {
	// 强制重新初始化以获取最新的版本号
	const currentVersion = chrome.runtime.getManifest().version;
	updateChecker = new UpdateChecker(
		"ChuwuYo",
		"MultiLangSwitcher",
		currentVersion,
	);
	sendDebugLog(
		popupI18n.t("update_checker_initialized", { version: currentVersion }),
		"info",
	);
};

/**
 * 显示更新错误消息，具有增强的错误处理
 * @param {string} message - 主要错误消息
 * @param {string} [fallbackMessage] - 可选的回退建议
 * @param {boolean} [showRetryOption] - 是否显示重试选项
 */
const showUpdateError = (
	message,
	fallbackMessage = null,
	showRetryOption = false,
) => {
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
			retryLink.addEventListener("click", (e) => {
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
			alertDiv.className =
				"alert alert-warning mb-0 update-notification warning";
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
			currentLabel.textContent = popupI18n
				.t("current_version")
				.replace("v{current}", "")
				.replace("{current}", "");
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
			latestLabel.textContent = popupI18n
				.t("latest_version")
				.replace("v{latest}", "")
				.replace("{latest}", "");
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

			sendDebugLog(
				popupI18n.t("update_available", { version: updateInfo.latestVersion }),
				"info",
			);
		} else {
			// 没有可用更新
			alertDiv.className =
				"alert alert-success mb-0 update-notification success";
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
	const updateCheckBtn = getEl("updateCheckBtn");
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
const cancelUpdateCheck = () => {
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
 * 防抖的更新检查函数 - 即时UI响应
 */
const debouncedUpdateCheck = () => {
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
		const updateInfo = await updateChecker.checkForUpdates(
			updateCheckController.signal,
		);

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

// 防抖的UI更新函数
let lastUIUpdate = 0;
let uiUpdateTimer = null;
/**
 * 轻量级 UI 更新节流防抖：
 * - 仅用于被动同步（如 background 推送的状态），避免打断用户主动交互的即时反馈。
 * - 超出时间窗口时立即执行，否则合并为最后一次调用，始终只保留一个等待中的定时器。
 */
const debouncedUIUpdate = (updateFn, delay = 16) => {
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

// --- 扩展初始化 ---
document.addEventListener("DOMContentLoaded", async () => {
	// 等待翻译系统加载完成
	await new Promise((resolve) => {
		if (popupI18n.isReady) {
			resolve();
		} else {
			popupI18n.ready(resolve);
		}
	});

	// 获取DOM元素
	const languageSelect = getEl("languageSelect");
	const applyButton = getEl("applyButton");
	const checkHeaderBtn = getEl("checkHeaderBtn");
	const autoSwitchToggle = getEl("autoSwitchToggle");
	const resetBtn = getEl("resetBtn");

	// 初始化语言选项下拉列表
	populateLanguageSelect(languageSelect);
	sendDebugLog(popupI18n.t("popup_script_loaded"));

	// 加载并应用自动切换状态
	const autoSwitchEnabled = await getAutoSwitchStatus();
	updateAutoSwitchUI(
		autoSwitchEnabled,
		autoSwitchToggle,
		languageSelect,
		applyButton,
	);

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
			updateAutoSwitchUI(
				enabled,
				autoSwitchToggle,
				languageSelect,
				applyButton,
			);

			const success = await setAutoSwitchStatus(enabled);
			if (!success) {
				// 回滚 UI 状态，使用立即模式
				updateAutoSwitchUI(
					!enabled,
					autoSwitchToggle,
					languageSelect,
					applyButton,
				);
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
			if (
				eventHandlers.lastApplyTime &&
				now - eventHandlers.lastApplyTime < 600
			) {
				sendDebugLog(popupI18n.t("apply_debounced"), "info");
				return;
			}
			eventHandlers.lastApplyTime = now;

			sendDebugLog(
				`${popupI18n.t("clicked_apply_button")} ${selectedLanguage}.`,
				"info",
			);

			try {
				// 保存语言设置并更新显示
				await saveLanguageSetting(selectedLanguage);
				updateLanguageDisplay(selectedLanguage);

				// 更新请求头规则并触发自动检查
				await updateHeaderRules(selectedLanguage, true);

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
			const userMessage =
				popupI18n.t("reset_failed_alert") + ": " + errorDetails;
			sendDebugLog(
				popupI18n.t("reset_request_failed", { message: errorDetails }),
				"error",
			);
			showError(userMessage);
		},

		// 快速检查按钮点击处理
		checkHeaderBtnClick: () => {
			sendDebugLog(popupI18n.t("clicked_quick_check"), "info");
			const headerCheckResultDiv = document.getElementById("headerCheckResult");
			const headerCheckContentPre =
				document.getElementById("headerCheckContent");

			// 检查必要元素
			if (!headerCheckContentPre) return;

			// 显示检查结果区域并开始检查
			if (headerCheckResultDiv) headerCheckResultDiv.classList.remove("d-none");
			headerCheckContentPre.textContent = popupI18n.t("fetching_headers");
			performHeaderCheck(headerCheckContentPre);
		},

		// 更新检查按钮点击处理
		updateCheckBtnClick: () => {
			sendDebugLog(popupI18n.t("clicked_update_check_button"), "info");
			debouncedUpdateCheck();
		},
	};

	// 绑定事件监听器
	if (autoSwitchToggle) {
		ResourceManager.addEventListener(
			autoSwitchToggle,
			"change",
			eventHandlers.autoSwitchChange,
		);
	}

	if (languageSelect) {
		ResourceManager.addEventListener(
			languageSelect,
			"focus",
			eventHandlers.languageSelectFocus,
		);
	}

	if (applyButton) {
		ResourceManager.addEventListener(
			applyButton,
			"click",
			eventHandlers.applyButtonClick,
		);
	}

	if (resetBtn) {
		ResourceManager.addEventListener(
			resetBtn,
			"click",
			eventHandlers.resetButtonClick,
		);
	}

	if (checkHeaderBtn) {
		ResourceManager.addEventListener(
			checkHeaderBtn,
			"click",
			eventHandlers.checkHeaderBtnClick,
		);
	}

	// 添加更新检查按钮事件监听器
	const updateCheckBtn = getEl("updateCheckBtn");
	if (updateCheckBtn) {
		ResourceManager.addEventListener(
			updateCheckBtn,
			"click",
			eventHandlers.updateCheckBtnClick,
		);
	}

	// 全局资源清理函数
	const cleanupResources = () => {
		// 取消正在进行的更新检查
		cancelUpdateCheck();

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

		// 清理 ResourceManager 中跟踪的资源
		ResourceManager.cleanup();

		sendDebugLog(popupI18n.t("popup_cleanup_completed"), "info");
	};

	// 页面卸载时清理事件和请求
	window.addEventListener("beforeunload", cleanupResources, { once: true });

	// 页面隐藏时也进行清理（处理弹窗关闭的情况）
	window.addEventListener("pagehide", cleanupResources, { once: true });

	// 通过可见性变化处理弹窗关闭
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			// 当弹窗变为隐藏时取消正在进行的更新检查
			cancelUpdateCheck();
			sendDebugLog(popupI18n.t("popup_hidden_cancelled_update"), "info");
		}
	});

	/**
	 * 处理自动切换UI更新消息
	 * @param {Object} request - 消息请求对象
	 * @param {HTMLElement} autoSwitchToggle - 自动切换开关元素
	 * @param {HTMLElement} languageSelect - 语言选择元素
	 * @param {HTMLElement} applyButton - 应用按钮元素
	 */
	const handleAutoSwitchUIUpdate = (
		request,
		autoSwitchToggle,
		languageSelect,
		applyButton,
	) => {
		// 来自 background 的状态同步可能在短时间内多次触发，使用 debouncedUIUpdate 合并
		debouncedUIUpdate(() => {
			const autoSwitchEnabled = request.autoSwitchEnabled;

			if (typeof autoSwitchEnabled === "boolean") {
				if (autoSwitchToggle) {
					autoSwitchToggle.checked = autoSwitchEnabled;
				}
				updateAutoSwitchUI(
					autoSwitchEnabled,
					autoSwitchToggle,
					languageSelect,
					applyButton,
				);
				syncAutoSwitchStatusToStorage(autoSwitchEnabled);
			}

			// 按需更新当前语言，避免多余写入
			if (request.currentLanguage) {
				updateCurrentLanguageInfo(request.currentLanguage, languageSelect);
			}
		});
	};

	/**
	 * 同步自动切换状态到本地存储
	 * @param {boolean} autoSwitchEnabled - 自动切换是否启用
	 */
	const syncAutoSwitchStatusToStorage = async (autoSwitchEnabled) => {
		try {
			// 后台统一响应格式，直接 await 即可
			await requestBackground("SET_STORAGE_DATA", {
				data: { autoSwitchEnabled },
			});
			sendDebugLog(
				popupI18n.t("synced_auto_switch_status_to_storage", {
					status: autoSwitchEnabled,
				}),
				"info",
			);
		} catch (error) {
			sendDebugLog(
				popupI18n.t("update_storage_status_failed", { message: error.message }),
				"error",
			);
		}
	};

	/**
	 * 更新当前语言信息显示
	 * @param {string} currentLanguage - 当前语言
	 * @param {HTMLElement} languageSelect - 语言选择元素
	 */
	const updateCurrentLanguageInfo = (currentLanguage, languageSelect) => {
		updateLanguageDisplay(currentLanguage);

		// 同步更新语言选择器
		if (languageSelect) {
			languageSelect.value = currentLanguage;
		}

		sendDebugLog(
			`${popupI18n.t("received_background_message")} ${currentLanguage}${popupI18n.t("update_ui")}`,
			"info",
		);
	};

	/**
	 * 处理自动切换状态变更消息
	 * @param {Object} request - 消息请求对象
	 * @param {HTMLElement} autoSwitchToggle - 自动切换开关元素
	 * @param {HTMLElement} languageSelect - 语言选择元素
	 * @param {HTMLElement} applyButton - 应用按钮元素
	 */
	const handleAutoSwitchStateChanged = (
		request,
		autoSwitchToggle,
		languageSelect,
		applyButton,
	) => {
		// 检查必要元素
		if (!autoSwitchToggle) return;

		const enabled = !!request.enabled;

		// 若状态未变化则跳过，避免冗余 DOM 更新
		if (autoSwitchToggle.checked === enabled) {
			const statusTextSkipped = enabled
				? popupI18n.t("enabled")
				: popupI18n.t("disabled");
			sendDebugLog(
				popupI18n.t("received_status_sync", { status: statusTextSkipped }),
				"info",
			);
			return;
		}

		autoSwitchToggle.checked = enabled;
		updateAutoSwitchUI(enabled, autoSwitchToggle, languageSelect, applyButton);

		const statusText = enabled
			? popupI18n.t("enabled")
			: popupI18n.t("disabled");
		sendDebugLog(
			popupI18n.t("received_status_sync", { status: statusText }),
			"info",
		);
	};

	// 监听来自 background.js 的消息
	chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
		// 处理 AUTO_SWITCH_UI_UPDATE
		if (request.type === "AUTO_SWITCH_UI_UPDATE") {
			handleAutoSwitchUIUpdate(
				request,
				autoSwitchToggle,
				languageSelect,
				applyButton,
			);
			sendResponse({ status: "UI updated" });
			return true;
		}

		// 处理 AUTO_SWITCH_STATE_CHANGED
		if (request.type === "AUTO_SWITCH_STATE_CHANGED") {
			handleAutoSwitchStateChanged(
				request,
				autoSwitchToggle,
				languageSelect,
				applyButton,
			);
			return true;
		}

		return true;
	});
});
