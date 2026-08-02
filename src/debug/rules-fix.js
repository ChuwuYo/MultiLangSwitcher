// debug/rules-fix.js - 规则修复与清除重应用

import { MessageTypes } from "../shared/message-types.js";
import { requestBackground } from "../shared/shared-actions.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import { STORAGE_KEYS } from "../shared/storage-keys.js";
import { debugI18n } from "../i18n/debug-i18n.js";
import { addLogMessage } from "./log-panel.js";
import { setSafeContent, setSafeErrorMessage, setSafeSuccessMessage } from "./safe-dom.js";

/**
 * 初始化规则修复操作：绑定"修复规则优先级"与"清除并重新应用规则"按钮
 */
export const initRulesFix = () => {
	// 修复规则优先级
	ResourceManager.addEventListener(document.getElementById("fixPriorityBtn"), "click", () => {
		const resultElement = document.getElementById("fixResult");
		resultElement.textContent = debugI18n.t("fixing_rule_priority");
		addLogMessage(debugI18n.t("try_fix_priority"), "info");

		// 通过消息传递获取和更新动态规则
		(async () => {
			try {
				// 统一消息调用：避免重复的 response.success 校验
				const response = await requestBackground(MessageTypes.GET_DYNAMIC_RULES);

				const existingRules = response.rules;
				const existingRuleIds = existingRules.map((rule) => rule.id);
				const updatedRules = existingRules.map((rule) => {
					return {
						...rule,
						priority: 100, // 设置更高优先级
					};
				});

				await requestBackground(MessageTypes.UPDATE_DYNAMIC_RULES, {
					removeRuleIds: existingRuleIds,
					addRules: updatedRules,
				});

				setSafeContent(resultElement, debugI18n.t("priority_updated_success"), "success");
				addLogMessage(debugI18n.t("priority_updated_log"), "success");
			} catch (error) {
				setSafeContent(resultElement, `${debugI18n.t("fix_failed")} ${error.message}`, "error");
				addLogMessage(`${debugI18n.t("fix_priority_failed")} ${error.message}`, "error");
			}
		})();
	});

	// 清除并重新应用规则
	ResourceManager.addEventListener(document.getElementById("clearAllRulesBtn"), "click", () => {
		const resultElement = document.getElementById("fixResult");
		resultElement.textContent = debugI18n.t("clearing_rules_reapply");
		addLogMessage(debugI18n.t("try_clear_reapply"), "info");

		// 通过消息传递获取和清除动态规则
		(async () => {
			try {
				const response = await requestBackground(MessageTypes.GET_DYNAMIC_RULES);

				const existingRules = response.rules;
				const existingRuleIds = existingRules.map((rule) => rule.id);

				await requestBackground(MessageTypes.UPDATE_DYNAMIC_RULES, {
					removeRuleIds: existingRuleIds,
				});

				// 清除成功后，重新应用默认或存储的规则
				const storageResponse = await chrome.storage.local.get([STORAGE_KEYS.CURRENT_LANGUAGE]);
				const languageToApply = storageResponse[STORAGE_KEYS.CURRENT_LANGUAGE] || "zh-CN";

				await requestBackground(MessageTypes.UPDATE_RULES, {
					language: languageToApply,
				});
				setSafeSuccessMessage(resultElement, `${debugI18n.t("rules_cleared_reapplied")} ${languageToApply}`);
				addLogMessage(`${debugI18n.t("rules_cleared_reapplied_log")} ${languageToApply}`, "success");
			} catch (error) {
				setSafeErrorMessage(resultElement, `${debugI18n.t("clear_failed")} ${error.message}`);
				addLogMessage(`${debugI18n.t("clear_rules_failed")} ${error.message}`, "error");
			}
		})();
	});
};
