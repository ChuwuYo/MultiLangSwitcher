// debug/domain-rules.js - 域名映射规则展示

import { MessageTypes } from "../shared/message-types.js";
import { requestBackground } from "../shared/shared-actions.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import { debugI18n } from "../i18n/debug-i18n.js";
import { addLogMessage } from "./log-panel.js";
import { setSafeErrorMessage } from "./safe-dom.js";

/**
 * 初始化域名映射规则视图：绑定"显示域名规则"按钮
 */
export const initDomainRules = () => {
	// 显示域名映射规则
	ResourceManager.addEventListener(document.getElementById("showDomainRulesBtn"), "click", () => {
		const resultElement = document.getElementById("domainRulesResult");
		resultElement.textContent = debugI18n.t("getting_domain_rules");
		addLogMessage(debugI18n.t("try_get_domain_rules"), "info");

		// 从 background.js 获取域名映射规则
		(async () => {
			try {
				const response = await requestBackground(MessageTypes.GET_DOMAIN_RULES);

				addLogMessage(`${debugI18n.t("received_response")} ${JSON.stringify(response)}`, "info");

				if (response?.domainRules) {
					const rules = response.domainRules;
					resultElement.innerHTML = "";
					const fragment = document.createDocumentFragment();

					const title = document.createElement("h5");
					title.textContent = debugI18n.t("domain_language_mapping");
					fragment.appendChild(title);

					// 按类别组织规则
					const categories = {
						[debugI18n.t("second_level_domain")]: {},
						[debugI18n.t("asia")]: {},
						[debugI18n.t("north_america")]: {},
						[debugI18n.t("south_america")]: {},
						[debugI18n.t("europe")]: {},
						[debugI18n.t("oceania")]: {},
						[debugI18n.t("middle_east")]: {},
						[debugI18n.t("other")]: {},
					};

					// 对规则进行分类（基于domain-rules.json中实际存在的域名）
					Object.keys(rules).forEach((domain) => {
						const language = rules[domain];

						if (domain.includes(".")) {
							categories[debugI18n.t("second_level_domain")][domain] = language;
						} else if (
							["cn", "tw", "hk", "jp", "kr", "in", "id", "my", "sg", "th", "vn", "ph", "kz", "uz", "mn"].includes(
								domain,
							)
						) {
							categories[debugI18n.t("asia")][domain] = language;
						} else if (["us", "ca", "mx", "gt", "cr", "pa", "cu", "ht", "jm", "gov"].includes(domain)) {
							categories[debugI18n.t("north_america")][domain] = language;
						} else if (["ar", "br", "cl", "co", "ec", "pe", "bo", "py", "uy", "ve"].includes(domain)) {
							categories[debugI18n.t("south_america")][domain] = language;
						} else if (
							[
								"at",
								"be",
								"ch",
								"cz",
								"de",
								"dk",
								"es",
								"eu",
								"fi",
								"fr",
								"gr",
								"hu",
								"ie",
								"it",
								"nl",
								"no",
								"pl",
								"pt",
								"se",
								"uk",
								"tr",
								"cy",
								"by",
								"bg",
								"hr",
								"rs",
								"si",
								"ee",
								"lv",
								"lt",
								"md",
								"mk",
								"al",
								"ba",
								"me",
								"xk",
							].includes(domain)
						) {
							categories[debugI18n.t("europe")][domain] = language;
						} else if (
							["bh", "ir", "iq", "il", "jo", "kw", "lb", "om", "ps", "qa", "sa", "sy", "ae", "ye"].includes(domain)
						) {
							categories[debugI18n.t("middle_east")][domain] = language;
						} else if (["au", "nz", "fj"].includes(domain)) {
							categories[debugI18n.t("oceania")][domain] = language;
						} else {
							categories[debugI18n.t("other")][domain] = language;
						}
					});

					// 生成DOM（只显示有规则的分类）
					Object.keys(categories).forEach((category) => {
						const categoryRules = categories[category];
						const sortedDomains = Object.keys(categoryRules).sort();
						const ruleCount = sortedDomains.length;

						if (ruleCount > 0) {
							const categoryDiv = document.createElement("div");
							categoryDiv.className = "mt-3";
							const strong = document.createElement("strong");
							strong.textContent = category;
							categoryDiv.appendChild(strong);
							categoryDiv.append(` (${ruleCount}${debugI18n.t("rules_count")}):`);
							fragment.appendChild(categoryDiv);

							const detailDiv = document.createElement("div");
							detailDiv.className = "matched-rule-detail";

							const table = document.createElement("table");
							table.className = "table table-sm table-striped";
							table.style.tableLayout = "fixed";

							const thead = document.createElement("thead");
							const trHead = document.createElement("tr");
							const thDomain = document.createElement("th");
							thDomain.style.width = "50%";
							thDomain.textContent = debugI18n.t("domain");
							const thLang = document.createElement("th");
							thLang.style.width = "50%";
							thLang.textContent = debugI18n.t("language");
							trHead.appendChild(thDomain);
							trHead.appendChild(thLang);
							thead.appendChild(trHead);
							table.appendChild(thead);

							const tbody = document.createElement("tbody");
							sortedDomains.forEach((domain) => {
								const tr = document.createElement("tr");
								const tdDomain = document.createElement("td");
								tdDomain.textContent = domain;
								const tdLang = document.createElement("td");
								tdLang.textContent = categoryRules[domain];
								tr.appendChild(tdDomain);
								tr.appendChild(tdLang);
								tbody.appendChild(tr);
							});
							table.appendChild(tbody);

							detailDiv.appendChild(table);
							fragment.appendChild(detailDiv);
						}
					});

					resultElement.appendChild(fragment);
					addLogMessage(
						`${debugI18n.t("successfully_got_displayed_rules")}${Object.keys(rules).length}${debugI18n.t("domain_mapping_rules")}`,
						"success",
					);
				} else {
					setSafeErrorMessage(resultElement, debugI18n.t("failed_get_domain_rules_empty"));
					addLogMessage(`${debugI18n.t("failed_get_domain_rules_response")} ${JSON.stringify(response)}`, "warning");
				}
			} catch (error) {
				setSafeErrorMessage(resultElement, `${debugI18n.t("get_domain_rules_failed")} ${error.message}`);
				addLogMessage(`${debugI18n.t("get_domain_rules_failed")} ${error.message}`, "error");
			}
		})();
	});
};
