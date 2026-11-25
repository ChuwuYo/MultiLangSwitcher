// debug/rules-fix.js - 规则修复与清除重应用

import { MessageTypes } from "../shared/message-types.js";
import { requestBackground } from "../shared/shared-actions.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import { STORAGE_KEYS } from "../shared/storage-keys.js";
import { RULE_ID } from "../shared/dnr-rule-ids.js";
import { debugI18n } from "../i18n/debug-i18n.js";
import { addLogMessage } from "./log-panel.js";
import { setSafeContent, setSafeErrorMessage, setSafeSuccessMessage } from "./safe-dom.js";

/**
 * 初始化规则修复操作：绑定"修复规则优先级"与"清除并重新应用规则"按钮
 */
export const initRulesFix = () => {
	// 修复规则优先级
	const fixPriorityBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById("fixPriorityBtn"));
	const clearAllRulesBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById("clearAllRulesBtn"));

	ResourceManager.addEventListener(fixPriorityBtn, "click", async () => {
		const resultElement = document.getElementById("fixResult");
		if (!resultElement || !fixPriorityBtn) return;
		fixPriorityBtn.disabled = true;
		resultElement.textContent = debugI18n.t("fixing_rule_priority");
		addLogMessage(debugI18n.t("try_fix_priority"), "info");

		try {
			const response = await requestBackground(MessageTypes.GET_DYNAMIC_RULES);
			const existingRules = Array.isArray(response?.rules) ? response.rules : [];
			if (existingRules.length === 0) {
				setSafeContent(resultElement, debugI18n.t("no_rules_warning"), "warning");
				addLogMessage(debugI18n.t("no_rules_warning"), "warning");
				return;
			}
			const existingRuleIds = existingRules.map((rule) => rule.id);
			// 自动切换的按域名规则靠高于 RULE_ID 的分级优先级生效，统一改成 100 会让它们失效
			const updatedRules = existingRules.map((rule) => (rule.id === RULE_ID ? { ...rule, priority: 100 } : rule));

			await requestBackground(MessageTypes.UPDATE_DYNAMIC_RULES, {
				removeRuleIds: existingRuleIds,
				addRules: updatedRules,
			});

			setSafeContent(resultElement, debugI18n.t("priority_updated_success"), "success");
			addLogMessage(debugI18n.t("priority_updated_log"), "success");
		} catch (error) {
			setSafeContent(resultElement, `${debugI18n.t("fix_failed")} ${error.message}`, "error");
			addLogMessage(`${debugI18n.t("fix_priority_failed")} ${error.message}`, "error");
		} finally {
			fixPriorityBtn.disabled = false;
		}
	});

	// 清除并重新应用规则
	ResourceManager.addEventListener(clearAllRulesBtn, "click", async () => {
		const resultElement = document.getElementById("fixResult");
		if (!resultElement || !clearAllRulesBtn) return;
		clearAllRulesBtn.disabled = true;
		resultElement.textContent = debugI18n.t("clearing_rules_reapply");
		addLogMessage(debugI18n.t("try_clear_reapply"), "info");

		try {
			const response = await requestBackground(MessageTypes.GET_DYNAMIC_RULES);
			const existingRules = Array.isArray(response?.rules) ? response.rules : [];
			const existingRuleIds = existingRules.map((rule) => rule.id);

			if (existingRuleIds.length > 0) {
				await requestBackground(MessageTypes.UPDATE_DYNAMIC_RULES, {
					removeRuleIds: existingRuleIds,
				});
			}

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
		} finally {
			clearAllRulesBtn.disabled = false;
		}
	});
};
