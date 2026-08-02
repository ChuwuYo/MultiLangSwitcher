// debug/log-panel.js - 日志面板渲染与过滤器

import { MessageTypes } from "../shared/message-types.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import { getFallbackTranslation } from "../shared/shared-utils.js";

// 日志功能
let logOutput = null;

// 存储所有日志消息
let allLogMessages = [];

/**
 * 添加日志消息到UI并存储
 * @param {string} message - 日志消息内容
 * @param {string} logType - 日志类型 (info, warning, error, success)
 */
export const addLogMessage = (message, logType = "info") => {
	const timestamp = new Date().toLocaleTimeString();
	const logEntry = { timestamp, message, logType };
	allLogMessages.push(logEntry);
	renderLogs(); // 重新渲染日志以应用过滤
	// 自动滚动到底部
	logOutput.scrollTop = logOutput.scrollHeight;
};

// 根据当前过滤器渲染日志
const renderLogs = () => {
	logOutput.innerHTML = ""; // 清空当前显示
	const activeFilters = getActiveFilters();

	allLogMessages.forEach((logEntry) => {
		if (activeFilters.includes(logEntry.logType)) {
			const logElement = document.createElement("div");
			logElement.classList.add(`log-${logEntry.logType}`);
			logElement.textContent = `[${logEntry.timestamp}] ${logEntry.message}`;
			logOutput.appendChild(logElement);
		}
	});
};

// 过滤器复选框为静态元素，缓存引用避免每次渲染日志时重复查询 DOM
let logFilterCheckboxes = null;

/**
 * 获取当前选中的日志类型过滤器
 * @returns {string[]} - 激活的日志类型数组
 */
const getActiveFilters = () => {
	const filters = [];
	if (logFilterCheckboxes.info.checked) filters.push("info");
	if (logFilterCheckboxes.warning.checked) filters.push("warning");
	if (logFilterCheckboxes.error.checked) filters.push("error");
	if (logFilterCheckboxes.success.checked) filters.push("success");
	return filters;
};

/**
 * 初始化日志面板：缓存 DOM 引用并绑定消息监听、清除按钮与过滤器事件
 */
export const initLogPanel = () => {
	logOutput = document.getElementById("logOutput");
	const clearLogsBtn = document.getElementById("clearLogsBtn");

	logFilterCheckboxes = {
		info: /** @type {HTMLInputElement} */ (document.getElementById("filterInfo")),
		warning: /** @type {HTMLInputElement} */ (document.getElementById("filterWarning")),
		error: /** @type {HTMLInputElement} */ (document.getElementById("filterError")),
		success: /** @type {HTMLInputElement} */ (document.getElementById("filterSuccess")),
	};

	// 监听来自扩展其他部分的日志消息
	ResourceManager.addMessageListener((request) => {
		if (request.type !== MessageTypes.DEBUG_LOG) return;

		// 过滤掉后台脚本的日志消息
		if (!request.message.startsWith("[后台]") && !request.message.startsWith("[Background]")) {
			addLogMessage(request.message, request.logType);
		}
	});

	// 清除日志按钮功能
	ResourceManager.addEventListener(clearLogsBtn, "click", () => {
		allLogMessages = []; // 清空存储的日志
		renderLogs(); // 渲染空日志列表
	});

	// 监听过滤器变化（与 getActiveFilters 共用同一组缓存引用，保证两处覆盖的复选框一致）
	Object.values(logFilterCheckboxes).forEach((checkbox) => {
		ResourceManager.addEventListener(checkbox, "change", renderLogs);
	});

	// 使用通用 fallback 翻译系统，避免依赖异步加载的 debugI18n
	addLogMessage(getFallbackTranslation("debug_log_started"), "info");
	// 初始渲染日志 (虽然此时allLogMessages是空的)
	renderLogs();
};
