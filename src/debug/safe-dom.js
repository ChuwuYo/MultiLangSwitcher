// debug/safe-dom.js - 安全 DOM 创建与消息设置辅助

import { createLocalizedExternalCheckLinks } from "../shared/header-check-utils.js";
import { debugI18n } from "../i18n/debug-i18n.js";

/**
 * 安全地创建HTML元素并设置属性
 * @param {string} tag - HTML标签名
 * @param {Object} options - 配置选项
 * @param {string} [options.className] - CSS类名
 * @param {string} [options.textContent] - 文本内容
 * @returns {HTMLElement} 创建的元素
 */
export const createSafeElement = (tag, options = {}) => {
	const element = document.createElement(tag);
	if (options.className) element.className = options.className;
	if (options.textContent !== undefined) element.textContent = options.textContent;
	return element;
};

/**
 * 安全地创建带有样式类的消息元素
 * @param {string} message - 消息文本
 * @param {string} className - CSS类名 (success, error, warning, info)
 * @returns {HTMLElement} 创建的段落元素
 */
export const createSafeMessageElement = (message, className = "") => {
	const p = document.createElement("p");
	if (className) {
		p.className = className;
	}
	p.textContent = message;
	return p;
};

/**
 * 安全地设置元素内容，支持单个消息或多个消息
 * 后置条件：写入前会先清空元素现有内容，调用方无需预先清空
 * @param {HTMLElement} element - 目标元素
 * @param {string|Array} content - 消息内容或消息数组
 * @param {string} className - CSS类名
 */
export const setSafeContent = (element, content, className = "") => {
	// 清空现有内容
	element.innerHTML = "";

	if (Array.isArray(content)) {
		// 处理多个消息
		content.forEach((item) => {
			const messageElement = createSafeMessageElement(item.message, item.className || className);
			element.appendChild(messageElement);
		});
	} else {
		// 处理单个消息
		const messageElement = createSafeMessageElement(content, className);
		element.appendChild(messageElement);
	}
};

/**
 * 安全地设置错误消息（常用的错误消息模式）
 * @param {HTMLElement} element - 目标元素
 * @param {string} message - 错误消息
 */
export const setSafeErrorMessage = (element, message) => {
	setSafeContent(element, message, "error");
};

/**
 * 安全地设置成功消息（常用的成功消息模式）
 * @param {HTMLElement} element - 目标元素
 * @param {string} message - 成功消息
 */
export const setSafeSuccessMessage = (element, message) => {
	setSafeContent(element, message, "success");
};

/**
 * 向文档片段追加外部检查链接区块
 * @param {DocumentFragment} fragment - 目标文档片段
 * @param {string} [leadingText] - 链接前的引导文案；提供时用 <p> 包裹并显示文案，否则用 <div> 包裹
 */
export const appendExternalCheckLinks = (fragment, leadingText) => {
	const wrapper = createSafeElement(leadingText ? "p" : "div");
	if (leadingText) {
		wrapper.textContent = leadingText;
	}
	wrapper.appendChild(createLocalizedExternalCheckLinks((key) => debugI18n.t(key)));
	fragment.appendChild(wrapper);
};
