// debug/cache-mgmt.js - 缓存管理功能

import { MessageTypes } from "../shared/message-types.js";
import { requestBackground } from "../shared/shared-actions.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import { debugI18n } from "../i18n/debug-i18n.js";
import { createSafeMessageElement, setSafeContent, setSafeErrorMessage, setSafeSuccessMessage } from "./safe-dom.js";

/**
 * 初始化缓存管理功能
 */
export const initializeCacheManagement = () => {
	// 初始化翻译文本
	initializeCacheManagementTexts();

	// 刷新缓存统计按钮
	const refreshCacheStatsBtn = document.getElementById("refreshCacheStatsBtn");
	if (refreshCacheStatsBtn) {
		ResourceManager.addEventListener(refreshCacheStatsBtn, "click", refreshCacheStats);
	}

	// 清理域名缓存按钮
	const clearDomainCacheBtn = document.getElementById("clearDomainCacheBtn");
	if (clearDomainCacheBtn) {
		ResourceManager.addEventListener(clearDomainCacheBtn, "click", clearDomainCache);
	}

	// 重置缓存统计按钮
	const resetCacheStatsBtn = document.getElementById("resetCacheStatsBtn");
	if (resetCacheStatsBtn) {
		ResourceManager.addEventListener(resetCacheStatsBtn, "click", resetCacheStats);
	}

	// 域名测试按钮
	const testDomainBtn = document.getElementById("testDomainBtn");
	if (testDomainBtn) {
		ResourceManager.addEventListener(testDomainBtn, "click", testDomainCache);
	}

	// 初始加载缓存统计
	ResourceManager.setTimeout(() => {
		refreshCacheStats();
	}, 100); // 延迟一点确保所有元素都已加载
};

/**
 * 测试域名缓存功能
 */
const testDomainCache = async () => {
	const testDomainInput = /** @type {HTMLInputElement} */ (document.getElementById("testDomainInput"));
	const resultElement = document.getElementById("cacheOperationResult");
	const domain = testDomainInput.value.trim();

	if (!domain) {
		setSafeErrorMessage(resultElement, debugI18n.t("please_enter_domain"));
		return;
	}

	try {
		setSafeContent(resultElement, debugI18n.t("testing_domain", { domain }));

		// 通过消息传递请求后台测试域名：成功返回数据，失败走 catch
		const response = await requestBackground(MessageTypes.TEST_DOMAIN_CACHE, {
			domain: domain,
		});
		const { language, fromCache, isUsingFallback, cacheStats } = response;

		resultElement.innerHTML = ""; // 清空
		const fragment = document.createDocumentFragment();

		const successP = createSafeMessageElement(debugI18n.t("domain_test_success"), "success");
		fragment.appendChild(successP);

		if (language) {
			const resultP = document.createElement("p");
			resultP.textContent = `${debugI18n.t("domain_found")}: `;

			const domainStrong = document.createElement("strong");
			domainStrong.textContent = domain;
			resultP.appendChild(domainStrong);

			resultP.append(" → ");

			const langStrong = document.createElement("strong");
			langStrong.textContent = language;
			resultP.appendChild(langStrong);

			fragment.appendChild(resultP);

			const cacheStatusP = document.createElement("p");
			cacheStatusP.textContent = `${debugI18n.t("cache_status")}: ${fromCache ? debugI18n.t("cache_hit") : debugI18n.t("cache_miss")}`;
			fragment.appendChild(cacheStatusP);

			// 如果使用了回退语言，显示说明
			if (isUsingFallback) {
				const fallbackP = document.createElement("p");
				fallbackP.className = "text-muted mt-2";
				fallbackP.textContent = debugI18n.t("note_using_active_language");
				fragment.appendChild(fallbackP);
			}
		} else {
			const notFoundP = createSafeMessageElement(`${debugI18n.t("domain_not_found")}: ${domain}`, "warning");
			fragment.appendChild(notFoundP);

			// 即使没有找到，也显示一些有用的信息
			const infoP = document.createElement("p");
			infoP.className = "text-muted mt-2";
			infoP.textContent = debugI18n.t("domain_not_in_rules_no_active");
			fragment.appendChild(infoP);
		}

		resultElement.appendChild(fragment);

		// 更新缓存统计显示
		if (cacheStats) {
			updateCacheStatsDisplay(cacheStats);
		}
	} catch (error) {
		setSafeErrorMessage(resultElement, `${debugI18n.t("domain_test_failed")}: ${error.message}`);
		console.error("[Cache] Domain test failed:", error);
	}
};

/**
 * 初始化缓存管理界面的翻译文本
 */
const initializeCacheManagementTexts = () => {
	// 设置标题和描述
	const cacheManagementTitle = document.getElementById("cacheManagementTitle");
	if (cacheManagementTitle) {
		cacheManagementTitle.textContent = debugI18n.t("cache_management_title");
	}

	const cacheManagementDesc = document.getElementById("cacheManagementDesc");
	if (cacheManagementDesc) {
		cacheManagementDesc.textContent = debugI18n.t("cache_management_desc");
	}

	const cacheStatsTitle = document.getElementById("cacheStatsTitle");
	if (cacheStatsTitle) {
		cacheStatsTitle.textContent = debugI18n.t("cache_stats_title");
	}

	// 设置标签
	const domainCacheLabel = document.getElementById("domainCacheLabel");
	if (domainCacheLabel) {
		domainCacheLabel.textContent = debugI18n.t("domain_cache_label");
	}

	// 设置按钮文本
	const refreshCacheStatsBtn = document.getElementById("refreshCacheStatsBtn");
	if (refreshCacheStatsBtn) {
		refreshCacheStatsBtn.textContent = debugI18n.t("refresh_cache_stats");
	}

	const clearDomainCacheBtn = document.getElementById("clearDomainCacheBtn");
	if (clearDomainCacheBtn) {
		clearDomainCacheBtn.textContent = debugI18n.t("clear_domain_cache");
	}

	const resetCacheStatsBtn = document.getElementById("resetCacheStatsBtn");
	if (resetCacheStatsBtn) {
		resetCacheStatsBtn.textContent = debugI18n.t("reset_cache_stats");
	}

	// 设置域名测试相关文本
	const testDomainLabel = document.getElementById("testDomainLabel");
	if (testDomainLabel) {
		testDomainLabel.textContent = debugI18n.t("test_domain_label");
	}

	const testDomainBtn = document.getElementById("testDomainBtn");
	if (testDomainBtn) {
		testDomainBtn.textContent = debugI18n.t("test_domain_btn");
	}
};

/**
 * 通用缓存操作处理函数
 * @param {string} messageType - 消息类型
 * @param {string} successMessageKey - 成功消息的翻译键
 * @param {Function} additionalCallback - 可选的额外回调函数
 */
const handleCacheOperation = async (messageType, successMessageKey, additionalCallback = null) => {
	const resultElement = document.getElementById("cacheOperationResult");

	try {
		// 统一消息调用：避免 response.success/status 的重复判断
		const response = await requestBackground(messageType);

		// 更新缓存统计显示
		if (response.stats) {
			updateCacheStatsDisplay(response.stats);
		}

		// 执行额外的回调函数（如果提供）
		if (additionalCallback && typeof additionalCallback === "function") {
			additionalCallback();
		}

		const successMessage = debugI18n.t(successMessageKey);
		setSafeSuccessMessage(resultElement, successMessage);
	} catch (error) {
		setSafeErrorMessage(resultElement, `${debugI18n.t("cache_operation_failed")}: ${error.message}`);
		console.error(`[Cache] ${debugI18n.t("cache_operation_failed")}: ${error.message}`);
	}
};

/**
 * 刷新缓存统计显示
 */
const refreshCacheStats = async () => {
	return handleCacheOperation(MessageTypes.GET_CACHE_STATS, "cache_stats_refreshed");
};

/**
 * 更新缓存统计显示
 */
const updateCacheStatsDisplay = (stats) => {
	// 更新域名缓存统计
	const domainCacheSize = document.getElementById("domainCacheSize");
	const domainCacheHitRate = document.getElementById("domainCacheHitRate");
	if (domainCacheSize && domainCacheHitRate) {
		domainCacheSize.textContent = `${stats.domainCacheSize}`;
		domainCacheHitRate.textContent = `(${stats.cacheHitRate})`;
	}
};

/**
 * 清理域名缓存
 */
const clearDomainCache = async () => {
	return handleCacheOperation(MessageTypes.CLEAR_DOMAIN_CACHE, "domain_cache_cleared");
};

/**
 * 重置缓存统计
 */
const resetCacheStats = async () => {
	return handleCacheOperation(MessageTypes.RESET_CACHE_STATS, "cache_stats_reset");
};
