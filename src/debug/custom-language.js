// debug/custom-language.js - 自定义 Accept-Language 应用与重置

import { MessageTypes } from "../shared/message-types.js";
import { requestBackground, resetAcceptLanguage } from "../shared/shared-actions.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import { debugI18n } from "../i18n/debug-i18n.js";
import { addLogMessage } from "./log-panel.js";
import { setSafeContent, setSafeErrorMessage, setSafeSuccessMessage } from "./safe-dom.js";

/**
 * 验证 Accept-Language 格式是否可能有问题
 * @param {string} languageString - 要验证的语言字符串
 * @returns {boolean} - 如果格式可能有问题返回 true
 */
const validateAcceptLanguageFormat = (languageString) => {
	// 基本格式检查
	const trimmed = languageString.trim();

	// 空字符串检查
	if (!trimmed) {
		return true;
	}

	// 检查是否包含不合法字符（支持 RFC 9110 通配符 * 与标准 Accept-Language 字符集）
	const invalidChars = /[^a-zA-Z0-9\-*,;=.\s]/;
	if (invalidChars.test(trimmed)) {
		return true; // 包含不合法字符
	}

	// 检查是否有连续的逗号或以逗号开头/结尾
	if (/,,|^,|,$/.test(trimmed)) {
		return true;
	}

	// 检查基本结构：应该是逗号分隔的语言标签列表
	const parts = trimmed.split(",");
	for (const part of parts) {
		const cleanPart = part.trim();
		if (!cleanPart) {
			return true; // 空的部分
		}

		// 支持分号前后可选空白（如 en-US; q=0.8）
		const qMatch = /^([^;]+?)(?:\s*;\s*q\s*=\s*([^;]+))?$/i.exec(cleanPart);
		if (!qMatch) {
			return true;
		}
		const languageTag = qMatch[1].trim();
		const qValue = qMatch[2]?.trim();

		// 支持通配符 * 及 BCP 47 单字母扩展子标签（如 en-US-u-ca-gregory）
		const languageTagPattern = /^(\*|[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*)$/;
		if (!languageTagPattern.test(languageTag)) {
			return true; // 语言标签格式不正确
		}

		// 如果有质量值，检查其格式
		if (qValue !== undefined) {
			const qValuePattern = /^(0(\.\d{1,3})?|1(\.0{1,3})?)$/;
			if (!qValuePattern.test(qValue)) {
				return true; // 质量值格式不正确
			}
		}
	}

	return false; // 格式看起来正常
};

/**
 * 初始化自定义语言设置：绑定应用与重置按钮
 */
export const initCustomLanguage = () => {
	// 应用自定义语言设置
	const customLanguageForm = document.getElementById("customLanguageForm");
	ResourceManager.addEventListener(
		customLanguageForm || document.getElementById("applyCustomLangBtn"),
		customLanguageForm ? "submit" : "click",
		(event) => {
			event.preventDefault();
			const customLangInput = /** @type {HTMLInputElement} */ (document.getElementById("customLanguageInput"));
			const customLangResult = document.getElementById("customLangResult");
			const languageString = customLangInput.value.trim();

			// 无需预先清空：后续两条路径均通过 setSafeContent 清空并写入新内容

			if (!languageString) {
				setSafeErrorMessage(customLangResult, debugI18n.t("enter_valid_language"));
				addLogMessage(debugI18n.t("try_apply_custom_empty"), "warning");
				customLangInput.classList.add("is-invalid");
				customLangInput.setAttribute("aria-invalid", "true");
				return;
			}

			customLangInput.classList.remove("is-invalid");
			customLangInput.removeAttribute("aria-invalid");

			// 检查格式是否可能有问题
			const hasFormatIssues = validateAcceptLanguageFormat(languageString);

			setSafeContent(customLangResult, `${debugI18n.t("applying_custom_language")} ${languageString}...`);
			addLogMessage(`${debugI18n.t("try_apply_custom")} ${languageString}`, "info");

			// 发送消息到 background.js 请求更新规则
			(async () => {
				try {
					await requestBackground(MessageTypes.UPDATE_RULES, { language: languageString });

					// 使用安全的DOM操作
					const messages = [
						{
							message: `${debugI18n.t("custom_language_applied")} ${languageString}`,
							className: "success",
						},
					];

					if (hasFormatIssues) {
						messages.push({
							message: debugI18n.t("accept_language_format_warning"),
							className: "warning",
						});
					}

					setSafeContent(customLangResult, messages);
					addLogMessage(`${debugI18n.t("custom_language_applied_log")} ${languageString}`, "success");

					if (hasFormatIssues) {
						addLogMessage(debugI18n.t("accept_language_format_warning"), "warning");
					}
				} catch (error) {
					setSafeContent(customLangResult, `${debugI18n.t("apply_custom_failed")} ${error.message}`, "error");
					addLogMessage(`${debugI18n.t("apply_custom_failed")} ${error.message}`, "error");
				}
			})();
		},
	);

	// 重置自定义语言设置
	ResourceManager.addEventListener(document.getElementById("resetCustomLangBtn"), "click", async () => {
		const customLangResult = document.getElementById("customLangResult");
		const customLangInput = /** @type {HTMLInputElement} */ (document.getElementById("customLanguageInput"));

		addLogMessage(debugI18n.t("attempt_reset_accept_language"), "info");

		try {
			await resetAcceptLanguage();
			setSafeSuccessMessage(customLangResult, debugI18n.t("reset_accept_language_success"));
			addLogMessage(debugI18n.t("reset_accept_language_success"), "success");
			if (customLangInput) customLangInput.value = ""; // 清空输入框
		} catch (error) {
			const errorMessage = debugI18n.t("reset_accept_language_failed", {
				message: error.message,
			});
			setSafeContent(customLangResult, errorMessage, "error");
			addLogMessage(errorMessage, "error");
		}
	});
};
