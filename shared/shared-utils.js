/**
 * 共享工具函数模块
 * 提供调试日志、语言检测、本地化翻译等通用功能
 */

/**
 * 检测当前语言设置
 * @returns {string} 语言代码 ('zh' 或 'en')
 */
const detectCurrentLanguage = () => {
	// 优先从 localStorage 获取
	if (typeof localStorage !== "undefined") {
		const saved = localStorage.getItem("app-lang");
		if (saved) return saved;
	}
	// 其次使用浏览器语言
	if (typeof navigator !== "undefined") {
		return navigator.language.startsWith("zh") ? "zh" : "en";
	}
	// 默认返回英文
	return "en";
};

/**
 * 切换语言设置（浏览器环境专用）
 * 保存语言设置到 localStorage 并刷新页面
 * @param {string} lang - 目标语言代码
 * @returns {boolean} 是否成功切换
 */
const switchLanguageAndReload = (lang) => {
	try {
		if (
			typeof localStorage === "undefined" ||
			typeof location === "undefined"
		) {
			console.warn("Language switch not supported in this environment");
			return false;
		}

		const currentLang = detectCurrentLanguage();
		if (lang === currentLang) return false;

		localStorage.setItem("app-lang", lang);
		location.reload();
		return true;
	} catch (error) {
		console.error("Error switching language:", error);
		return false;
	}
};

// 导出为全局函数（供 toggle.js 等 module 脚本使用）
if (typeof window !== "undefined") {
	window.detectCurrentLanguage = detectCurrentLanguage;
	window.switchLanguageAndReload = switchLanguageAndReload;
}

/**
 * 发送调试日志消息到后台脚本
 * @param {string} message - 日志消息内容
 * @param {string} logType - 日志类型 (info, warning, error, success)
 */
const sendDebugLog = (message, logType = "info") => {
	// 验证输入
	if (!message) return;

	try {
		if (chrome?.runtime?.sendMessage) {
			chrome.runtime
				.sendMessage({
					type: "DEBUG_LOG",
					message: String(message),
					logType,
				})
				.catch(() => {
					// 静默处理消息发送失败，避免控制台噪音
				});
		}
	} catch (error) {
		// Chrome API不可用时的降级处理
		console.warn("Debug log failed:", error);
	}
};

/**
 * 获取更新相关的本地化翻译
 * @param {string} key - 翻译键
 * @param {Object} params - 参数对象，用于替换翻译文本中的占位符
 * @param {string} context - 上下文 ('popup' 或 'background')
 * @returns {string} 本地化的文本
 */
const getUpdateTranslation = (key, params = {}, context = "popup") => {
	try {
		// 统一的i18n实例查找逻辑
		const availableI18nInstances = [];

		// 根据上下文优先级添加实例
		if (
			context === "background" &&
			typeof backgroundI18n !== "undefined" &&
			backgroundI18n.isReady
		) {
			availableI18nInstances.push(backgroundI18n);
		}
		if (
			context === "popup" &&
			typeof popupI18n !== "undefined" &&
			popupI18n.isReady
		) {
			availableI18nInstances.push(popupI18n);
		}

		// 添加其他可能的实例作为备用
		const otherInstances = [
			typeof backgroundI18n !== "undefined" ? backgroundI18n : undefined,
			typeof popupI18n !== "undefined" ? popupI18n : undefined,
			typeof debugI18n !== "undefined" ? debugI18n : undefined,
			typeof detectI18n !== "undefined" ? detectI18n : undefined,
		].filter(
			(instance) =>
				instance?.isReady && !availableI18nInstances.includes(instance),
		);

		availableI18nInstances.push(...otherInstances);

		// 尝试从找到的i18n实例获取翻译
		for (const i18nInstance of availableI18nInstances) {
			try {
				const translation = i18nInstance.t(key, params);
				if (translation && translation !== key) {
					return translation;
				}
			} catch (_error) {}
		}

		// 所有i18n实例都失败，使用简化的fallback
		return getFallbackTranslation(key, params);
	} catch (error) {
		console.warn("Failed to get update translation:", error);
		return getFallbackTranslation(key, params);
	}
};

/**
 * 获取简化的通用fallback翻译
 * @param {string} key - 翻译键
 * @param {Object} params - 参数对象
 * @returns {string} fallback翻译文本
 */
const getFallbackTranslation = (key, params = {}) => {
	// 从主i18n实例获取当前语言，确保实时同步
	const mainI18n =
		typeof debugI18n !== "undefined"
			? debugI18n
			: typeof popupI18n !== "undefined"
				? popupI18n
				: typeof detectI18n !== "undefined"
					? detectI18n
					: typeof backgroundI18n !== "undefined"
						? backgroundI18n
						: null;

	const currentLang = mainI18n?.currentLang || "en";

	// 统一的fallback翻译库
	const fallbackTranslations = {
		en: {
			// General UI
			check_for_updates: "Check for updates",
			checking_updates: "Checking for updates...",
			update_available: "Update available: v{version}",
			no_updates_available: "You're using the latest version",
			current_version: "Current: v{current}",
			latest_version: "Latest: v{latest}",
			view_release: "View Release",
			download_update: "Download Update",
			no_release_notes: "No release notes provided.",

			// Status Messages
			update_check_success: "Update check completed successfully",
			update_check_failed: "Update check failed: {error}",
			update_check_cancelled: "Update check was cancelled",
			update_notification_title: "Extension Update Available",

			// Log & Debug Messages
			update_check_attempt: "Update check attempt {attempt}/{maxAttempts}",
			version_comparison_failed: "Version comparison failed: {error}",
			failed_load_persistent_cache: "Failed to load persistent cache: {error}",
			failed_cache_update_info:
				"Failed to cache update info persistently: {error}",
			failed_clear_persistent_cache:
				"Failed to clear persistent cache: {error}",
			github_api_failed_trying_fallback:
				"GitHub API failed ({error}), trying jsDelivr fallback...",
			jsdelivr_fallback_failed: "jsDelivr fallback also failed: {error}",

			// Simplified Error Messages
			update_check_network_issue: "Network Issue",
			update_check_service_issue: "Service Issue",
			update_check_unexpected_error: "An unexpected error occurred.",

			// Debug Messages
			debug_log_started: "Debug log started",
		},
		zh: {
			// General UI
			check_for_updates: "检查更新",
			checking_updates: "正在检查更新...",
			update_available: "发现新版本: v{version}",
			no_updates_available: "您正在使用最新版本",
			current_version: "当前版本: v{current}",
			latest_version: "最新版本: v{latest}",
			view_release: "查看发布页面",
			download_update: "下载更新",
			no_release_notes: "未提供版本说明。",

			// Status Messages
			update_check_success: "更新检查完成",
			update_check_failed: "检查更新失败: {error}",
			update_check_cancelled: "更新检查已取消",
			update_notification_title: "扩展更新可用",

			// Log & Debug Messages
			update_check_attempt: "更新检查尝试 {attempt}/{maxAttempts}",
			version_comparison_failed: "版本比较失败: {error}",
			failed_load_persistent_cache: "加载持久化缓存失败: {error}",
			failed_cache_update_info: "持久化缓存更新信息失败: {error}",
			failed_clear_persistent_cache: "清除持久化缓存失败: {error}",
			github_api_failed_trying_fallback:
				"GitHub API 失败（{error}），正在尝试 jsDelivr 备用源...",
			jsdelivr_fallback_failed: "jsDelivr 备用源也失败了：{error}",

			// 简化后的错误信息
			update_check_network_issue: "网络问题",
			update_check_service_issue: "服务问题",
			update_check_unexpected_error: "发生意外错误。",

			// 调试信息
			debug_log_started: "调试日志已启动",
		},
	};

	// 简化的翻译查找和格式化
	const translations =
		fallbackTranslations[currentLang] || fallbackTranslations.en;
	let text = translations[key] || key;

	// 参数替换 - 与BaseI18n._formatString保持一致
	if (params && typeof params === "object" && Object.keys(params).length > 0) {
		for (const [param, value] of Object.entries(params)) {
			text = text.split(`{${param}}`).join(String(value));
		}
	}

	return text;
};

/**
 * 发送本地化的更新相关调试日志
 * @param {string} key - 翻译键
 * @param {Object} params - 参数对象
 * @param {string} logType - 日志类型 (info, warning, error, success)
 */
// biome-ignore lint/correctness/noUnusedVariables: 该函数用于外部调用
const sendLocalizedUpdateLog = (key, params = {}, logType = "info") => {
	try {
		const message = getUpdateTranslation(key, params, "background");
		sendDebugLog(message, logType);
	} catch (error) {
		console.error("Error in sendLocalizedUpdateLog:", error);
		// 如果翻译失败，直接使用fallback
		const fallbackMessage = getFallbackTranslation(key, params);
		sendDebugLog(fallbackMessage, logType);
	}
};
