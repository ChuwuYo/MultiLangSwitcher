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

	// 检查是否包含不合法字符（Accept-Language 应该只包含字母、数字、连字符、逗号、分号、等号、点和空格）
	const invalidChars = /[^a-zA-Z0-9\-,;=.\s]/;
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

		// 检查每个部分的格式：language-tag 或 language-tag;q=value
		const qIndex = cleanPart.indexOf(";q=");
		const languageTag = qIndex === -1 ? cleanPart : cleanPart.substring(0, qIndex);

		// 更宽松的语言标签验证：支持更复杂的格式如 zh-Hans-CN
		// 基本格式：2-3个字母，可选地跟多个连字符分隔的2-8个字母/数字的子标签
		const languageTagPattern = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;
		if (!languageTagPattern.test(languageTag)) {
			return true; // 语言标签格式不正确
		}

		// 如果有质量值，检查其格式
		if (qIndex !== -1) {
			const qValue = cleanPart.substring(qIndex + 3);

			// 检查质量值格式：应该是0到1之间的数字，最多3位小数
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
	ResourceManager.addEventListener(document.getElementById("applyCustomLangBtn"), "click", () => {
		const customLangInput = /** @type {HTMLInputElement} */ (document.getElementById("customLanguageInput"));
		const customLangResult = document.getElementById("customLangResult");
		const languageString = customLangInput.value.trim();

		// 无需预先清空：后续两条路径均通过 setSafeContent 清空并写入新内容

		if (!languageString) {
			setSafeErrorMessage(customLangResult, debugI18n.t("enter_valid_language"));
			addLogMessage(debugI18n.t("try_apply_custom_empty"), "warning");
			customLangInput.classList.add("is-invalid");
			return;
		}

		customLangInput.classList.remove("is-invalid");

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
	});

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
