// debug/rules-view.js - 动态规则视图与匹配规则测试

import { MessageTypes } from "../shared/message-types.js";
import { requestBackground } from "../shared/shared-actions.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import { debugI18n } from "../i18n/debug-i18n.js";
import { setSafeErrorMessage } from "./safe-dom.js";

/**
 * 初始化动态规则视图：绑定"显示规则"按钮
 */
export const initRulesView = () => {
	// 显示当前规则和匹配的规则详情
	ResourceManager.addEventListener(document.getElementById("showRulesBtn"), "click", () => {
		const resultElement = document.getElementById("rulesResult");
		resultElement.textContent = debugI18n.t("getting_rule_info");

		// 通过消息传递获取动态规则
		(async () => {
			try {
				// 统一消息调用：成功直接返回数据，失败走 catch
				const response = await requestBackground(MessageTypes.GET_DYNAMIC_RULES);
				const rules = response.rules;

				resultElement.innerHTML = "";
				const fragment = document.createDocumentFragment();

				const title = document.createElement("h5");
				title.textContent = debugI18n.t("dynamic_rules");
				fragment.appendChild(title);

				if (rules.length === 0) {
					const p = document.createElement("p");
					p.className = "error";
					p.textContent = debugI18n.t("no_dynamic_rules");
					fragment.appendChild(p);
				} else {
					const ul = document.createElement("ul");
					rules.forEach((rule) => {
						const liId = document.createElement("li");
						const prioritySpan = document.createElement("span");
						prioritySpan.className = rule.priority < 100 ? "error" : "success";
						prioritySpan.textContent = rule.priority;
						liId.append(`${debugI18n.t("rule_id")} ${rule.id}, ${debugI18n.t("priority")} `, prioritySpan);
						ul.appendChild(liId);

						const liAction = document.createElement("li");
						liAction.textContent = `${debugI18n.t("action")} ${rule.action.type}`;
						ul.appendChild(liAction);

						if (rule.action.requestHeaders) {
							const liModify = document.createElement("li");
							liModify.textContent = debugI18n.t("modify_headers");
							const subUl = document.createElement("ul");
							rule.action.requestHeaders.forEach((header) => {
								const subLi = document.createElement("li");
								subLi.textContent = `${header.header}: ${header.value} (${debugI18n.t("operation")} ${header.operation})`;
								subUl.appendChild(subLi);
							});
							liModify.appendChild(subUl);
							ul.appendChild(liModify);
						}

						if (rule.condition) {
							const liCond = document.createElement("li");
							liCond.textContent = debugI18n.t("conditions");
							const subUl = document.createElement("ul");
							if (rule.condition.urlFilter) {
								const subLi = document.createElement("li");
								subLi.textContent = `${debugI18n.t("url_filter")} `;
								const code = document.createElement("code");
								code.textContent = rule.condition.urlFilter;
								subLi.appendChild(code);
								subUl.appendChild(subLi);
							}
							if (rule.condition.resourceTypes && rule.condition.resourceTypes.length > 0) {
								const subLi = document.createElement("li");
								subLi.textContent = `${debugI18n.t("resource_types")} ${rule.condition.resourceTypes.join(", ")}`;
								subUl.appendChild(subLi);
							}
							liCond.appendChild(subUl);
							ul.appendChild(liCond);
						}
						const separatorLi = document.createElement("li");
						separatorLi.className = "rule-separator";
						ul.appendChild(separatorLi);
					});
					fragment.appendChild(ul);
				}

				// 通过消息传递获取最近匹配的规则信息
				const matchedResponse = await requestBackground(MessageTypes.GET_MATCHED_RULES);
				const matchedRules = matchedResponse.matchedRules;

				const matchedTitle = document.createElement("h5");
				matchedTitle.textContent = debugI18n.t("recent_matched_rules");
				fragment.appendChild(matchedTitle);

				if (matchedRules?.rulesMatchedInfo?.length > 0) {
					const ul = document.createElement("ul");
					// 去重处理，避免显示重复的规则
					const uniqueRules = new Map();
					matchedRules.rulesMatchedInfo.forEach((info) => {
						const key = `${info.rule.rulesetId || "_dynamic"}_${info.rule.ruleId}`;
						if (!uniqueRules.has(key)) {
							uniqueRules.set(key, info);
						}
					});

					uniqueRules.forEach((info) => {
						const li = document.createElement("li");
						li.textContent = `${debugI18n.t("ruleset_id")} ${info.rule.rulesetId || "_dynamic"}, ${debugI18n.t("rule_id")} ${info.rule.ruleId}`;
						if (info.request) {
							const detailDiv = document.createElement("div");
							detailDiv.className = "matched-rule-detail";

							const code = document.createElement("code");
							code.textContent = info.request.url;
							detailDiv.append(
								`${debugI18n.t("matched_url")} `,
								code,
								document.createElement("br"),
								`${debugI18n.t("resource_type")} ${info.request.resourceType}`,
							);

							li.appendChild(detailDiv);
						}
						ul.appendChild(li);
					});
					fragment.appendChild(ul);

					const note = document.createElement("p");
					note.className = "text-muted";
					note.textContent = debugI18n.t("recent_match_note");
					fragment.appendChild(note);
				} else {
					const p = document.createElement("p");
					p.textContent = debugI18n.t("no_recent_matches");
					fragment.appendChild(p);
				}
				resultElement.appendChild(fragment);
			} catch (error) {
				setSafeErrorMessage(resultElement, `获取规则失败: ${error.message}`);
			}
		})();
	});
};
