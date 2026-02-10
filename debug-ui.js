// debug-ui.js - 调试页面UI交互脚本

/**
 * 安全地创建HTML元素并设置属性
 * @param {string} tag - HTML标签名
 * @param {Object} options - 配置选项
 * @param {string} options.className - CSS类名
 * @param {string} options.textContent - 文本内容
 * @returns {HTMLElement} 创建的元素
 */
const createSafeElement = (tag, options = {}) => {
	const element = document.createElement(tag);
	if (options.className) element.className = options.className;
	if (options.textContent !== undefined)
		element.textContent = options.textContent;
	return element;
};

/**
 * 安全地创建带有样式类的消息元素
 * @param {string} message - 消息文本
 * @param {string} className - CSS类名 (success, error, warning, info)
 * @returns {HTMLElement} 创建的段落元素
 */
const createSafeMessageElement = (message, className = "") => {
	const p = document.createElement("p");
	if (className) {
		p.className = className;
	}
	p.textContent = message;
	return p;
};

/**
 * 安全地设置元素内容，支持单个消息或多个消息
 * @param {HTMLElement} element - 目标元素
 * @param {string|Array} content - 消息内容或消息数组
 * @param {string} className - CSS类名
 */
const setSafeContent = (element, content, className = "") => {
	// 清空现有内容
	element.innerHTML = "";

	if (Array.isArray(content)) {
		// 处理多个消息
		content.forEach((item) => {
			const messageElement = createSafeMessageElement(
				item.message,
				item.className || className,
			);
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
const setSafeErrorMessage = (element, message) => {
	setSafeContent(element, message, "error");
};

/**
 * 安全地设置成功消息（常用的成功消息模式）
 * @param {HTMLElement} element - 目标元素
 * @param {string} message - 成功消息
 */
const setSafeSuccessMessage = (element, message) => {
	setSafeContent(element, message, "success");
};

ResourceManager.addEventListener(document, "DOMContentLoaded", () => {
	// 初始化语言选项
	const testLanguageSelect = document.getElementById("testLanguage");
	if (testLanguageSelect) {
		populateLanguageSelect(testLanguageSelect);
	}

	// 显示当前规则和匹配的规则详情
	ResourceManager.addEventListener(
		document.getElementById("showRulesBtn"),
		"click",
		() => {
			const resultElement = document.getElementById("rulesResult");
			resultElement.textContent = debugI18n.t("getting_rule_info");

			// 通过消息传递获取动态规则
			(async () => {
				try {
					// 统一消息调用：成功直接返回数据，失败走 catch
					const response = await requestBackground("GET_DYNAMIC_RULES");
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
							prioritySpan.className =
								rule.priority < 100 ? "error" : "success";
							prioritySpan.textContent = rule.priority;
							liId.append(
								`${debugI18n.t("rule_id")} ${rule.id}, ${debugI18n.t("priority")} `,
								prioritySpan,
							);
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
								if (
									rule.condition.resourceTypes &&
									rule.condition.resourceTypes.length > 0
								) {
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
					const matchedResponse = await requestBackground("GET_MATCHED_RULES");
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
		},
	);

	// 日志功能
	const logOutput = document.getElementById("logOutput");
	const clearLogsBtn = document.getElementById("clearLogsBtn");

	// 存储所有日志消息
	let allLogMessages = [];

	/**
	 * 添加日志消息到UI并存储
	 * @param {string} message - 日志消息内容
	 * @param {string} logType - 日志类型 (info, warning, error, success)
	 */
	const addLogMessage = (message, logType = "info") => {
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

	/**
	 * 获取当前选中的日志类型过滤器
	 * @returns {string[]} - 激活的日志类型数组
	 */
	const getActiveFilters = () => {
		const filters = [];
		if (document.getElementById("filterInfo").checked) filters.push("info");
		if (document.getElementById("filterWarning").checked)
			filters.push("warning");
		if (document.getElementById("filterError").checked) filters.push("error");
		if (document.getElementById("filterSuccess").checked)
			filters.push("success");
		return filters;
	};

	// 监听来自扩展其他部分的日志消息
	ResourceManager.addMessageListener((request) => {
		if (request.type !== "DEBUG_LOG") return;

		// 过滤掉后台脚本的日志消息
		if (
			!request.message.startsWith("[后台]") &&
			!request.message.startsWith("[Background]")
		) {
			addLogMessage(request.message, request.logType);
		}
	});

	// 清除日志按钮功能
	ResourceManager.addEventListener(clearLogsBtn, "click", () => {
		allLogMessages = []; // 清空存储的日志
		renderLogs(); // 渲染空日志列表
	});

	// 监听过滤器变化
	document
		.querySelectorAll('.form-check-input[id^="filter"]')
		.forEach((checkbox) => {
			ResourceManager.addEventListener(checkbox, "change", renderLogs);
		});

	// 使用通用 fallback 翻译系统，避免依赖异步加载的 debugI18n
	addLogMessage(getFallbackTranslation("debug_log_started"), "info");
	// 初始渲染日志 (虽然此时allLogMessages是空的)
	renderLogs();

	// 页面加载时同步自动切换状态
	(async () => {
		try {
			// 统一消息调用：避免到处写 response.success 检查
			const result = await requestBackground("GET_STORAGE_DATA", {
				keys: ["autoSwitchEnabled"],
			});

			const autoSwitchToggle = document.getElementById("autoSwitchToggle");
			if (!autoSwitchToggle) return;

			autoSwitchToggle.checked = !!result.data?.autoSwitchEnabled;

			// 等待i18n系统初始化完成后再输出日志
			const checkI18nAndLog = () => {
				if (
					debugI18n.translations &&
					Object.keys(debugI18n.translations).length > 0
				) {
					addLogMessage(
						`${result.data?.autoSwitchEnabled ? debugI18n.t("auto_switch_enabled") : debugI18n.t("auto_switch_disabled")}`,
						"info",
					);
				} else {
					ResourceManager.setTimeout(checkI18nAndLog, 100);
				}
			};

			checkI18nAndLog();
		} catch (error) {
			console.error("Failed to get auto switch status:", error.message);
		}
	})();

	// 测试请求头
	ResourceManager.addEventListener(
		document.getElementById("testHeaderBtn"),
		"click",
		async () => {
			const language = document.getElementById("testLanguage").value;
			const resultElement = document.getElementById("headerTestResult");
			setSafeContent(
				resultElement,
				`${debugI18n.t("testing_language_header")} "${language}" ${debugI18n.t("header_test_multiple")}`,
			);
			addLogMessage(`${debugI18n.t("start_header_test")} ${language}`, "info");

			try {
				// 使用共享模块获取请求头
				const result =
					await window.HeaderCheckUtils.fetchHeadersFromEndpoints();

				// 清空现有内容
				resultElement.innerHTML = "";
				const fragment = document.createDocumentFragment();

				if (result.success) {
					// 添加标题
					fragment.appendChild(
						createSafeElement("h5", {
							textContent: debugI18n.t("recent_successful_headers"),
						}),
					);

					// 添加headers
					fragment.appendChild(
						createSafeElement("pre", {
							textContent: JSON.stringify(result.headers, null, 2),
						}),
					);

					if (result.acceptLanguage) {
						const acceptLanguageValue = result.acceptLanguage.toLowerCase();
						const expectedLanguage = language.toLowerCase();

						if (acceptLanguageValue.includes(expectedLanguage)) {
							fragment.appendChild(
								createSafeElement("p", {
									className: "success",
									textContent: `${debugI18n.t("header_changed_success")} ${result.acceptLanguage}`,
								}),
							);
							addLogMessage(
								`${debugI18n.t("header_test_success")} ${result.acceptLanguage}`,
								"success",
							);
						} else {
							fragment.appendChild(
								createSafeElement("p", {
									className: "error",
									textContent: debugI18n.t("header_not_changed"),
								}),
							);

							fragment.appendChild(
								createSafeElement("p", {
									textContent: `${debugI18n.t("expected_contains")} ${expectedLanguage}, ${debugI18n.t("actually_detected")} ${acceptLanguageValue}`,
								}),
							);

							const linksDiv = createSafeElement("div");
							linksDiv.appendChild(
								window.HeaderCheckUtils.createExternalCheckLinks({
									prefix: debugI18n.t("external_check_prefix"),
									or: debugI18n.t("external_check_or"),
									suffix: debugI18n.t("external_check_suffix"),
								}),
							);
							fragment.appendChild(linksDiv);

							addLogMessage(
								`${debugI18n.t("header_test_failed_not_expected")} ${expectedLanguage}, ${debugI18n.t("actual")} ${acceptLanguageValue}`,
								"error",
							);
						}
					} else {
						fragment.appendChild(
							createSafeElement("p", {
								className: "error",
								textContent: debugI18n.t("no_accept_language_any_endpoint"),
							}),
						);

						const linksDiv = createSafeElement("div");
						linksDiv.appendChild(
							window.HeaderCheckUtils.createExternalCheckLinks({
								prefix: debugI18n.t("external_check_prefix"),
								or: debugI18n.t("external_check_or"),
								suffix: debugI18n.t("external_check_suffix"),
							}),
						);
						fragment.appendChild(linksDiv);

						addLogMessage(debugI18n.t("header_test_failed_no_header"), "error");
					}
				} else {
					fragment.appendChild(
						createSafeElement("p", {
							className: "error",
							textContent: debugI18n.t("all_test_requests_failed"),
						}),
					);

					fragment.appendChild(
						createSafeElement("p", {
							className: "error",
							textContent: `${debugI18n.t("last_error")} ${result.error}`,
						}),
					);

					const linkP = createSafeElement("p");
					linkP.textContent = debugI18n.t("check_network_connection") + " ";
					linkP.appendChild(
						window.HeaderCheckUtils.createExternalCheckLinks({
							prefix: debugI18n.t("external_check_prefix"),
							or: debugI18n.t("external_check_or"),
							suffix: debugI18n.t("external_check_suffix"),
						}),
					);
					fragment.appendChild(linkP);

					addLogMessage(
						debugI18n.t("header_test_failed_all_endpoints"),
						"error",
					);
				}
				resultElement.appendChild(fragment);
			} catch (error) {
				resultElement.innerHTML = "";
				const fragment = document.createDocumentFragment();

				fragment.appendChild(
					createSafeElement("p", {
						className: "error",
						textContent: debugI18n.t("all_test_requests_failed"),
					}),
				);

				fragment.appendChild(
					createSafeElement("p", {
						className: "error",
						textContent: error.message,
					}),
				);

				const linkP = createSafeElement("p");
				linkP.textContent = debugI18n.t("check_network_connection") + " ";
				linkP.appendChild(
					window.HeaderCheckUtils.createExternalCheckLinks({
						prefix: debugI18n.t("external_check_prefix"),
						or: debugI18n.t("external_check_or"),
						suffix: debugI18n.t("external_check_suffix"),
					}),
				);
				fragment.appendChild(linkP);

				resultElement.appendChild(fragment);

				addLogMessage(
					`${debugI18n.t("header_test_failed_all_endpoints")}: ${error.message}`,
					"error",
				);
			}
		},
	);

	// 修复规则优先级
	ResourceManager.addEventListener(
		document.getElementById("fixPriorityBtn"),
		"click",
		() => {
			const resultElement = document.getElementById("fixResult");
			resultElement.textContent = debugI18n.t("fixing_rule_priority");
			addLogMessage(debugI18n.t("try_fix_priority"), "info");

			// 通过消息传递获取和更新动态规则
			(async () => {
				try {
					// 统一消息调用：避免重复的 response.success 校验
					const response = await requestBackground("GET_DYNAMIC_RULES");

					const existingRules = response.rules;
					const existingRuleIds = existingRules.map((rule) => rule.id);
					const updatedRules = existingRules.map((rule) => {
						return {
							...rule,
							priority: 100, // 设置更高优先级
						};
					});

					await requestBackground("UPDATE_DYNAMIC_RULES", {
						removeRuleIds: existingRuleIds,
						addRules: updatedRules,
					});

					setSafeContent(
						resultElement,
						debugI18n.t("priority_updated_success"),
						"success",
					);
					addLogMessage(debugI18n.t("priority_updated_log"), "success");
				} catch (error) {
					setSafeContent(
						resultElement,
						`${debugI18n.t("fix_failed")} ${error.message}`,
						"error",
					);
					addLogMessage(
						`${debugI18n.t("fix_priority_failed")} ${error.message}`,
						"error",
					);
				}
			})();
		},
	);

	// 清除并重新应用规则
	ResourceManager.addEventListener(
		document.getElementById("clearAllRulesBtn"),
		"click",
		() => {
			const resultElement = document.getElementById("fixResult");
			resultElement.textContent = debugI18n.t("clearing_rules_reapply");
			addLogMessage(debugI18n.t("try_clear_reapply"), "info");

			// 通过消息传递获取和清除动态规则
			(async () => {
				try {
					const response = await requestBackground("GET_DYNAMIC_RULES");

					const existingRules = response.rules;
					const existingRuleIds = existingRules.map((rule) => rule.id);

					await requestBackground("UPDATE_DYNAMIC_RULES", {
						removeRuleIds: existingRuleIds,
					});

					// 清除成功后，重新应用默认或存储的规则
					const storageResponse = await requestBackground("GET_STORAGE_DATA", {
						keys: ["currentLanguage"],
					});
					const languageToApply =
						storageResponse.data?.currentLanguage || "zh-CN";

					await requestBackground("UPDATE_RULES", {
						language: languageToApply,
					});
					setSafeSuccessMessage(
						resultElement,
						`${debugI18n.t("rules_cleared_reapplied")} ${languageToApply}`,
					);
					addLogMessage(
						`${debugI18n.t("rules_cleared_reapplied_log")} ${languageToApply}`,
						"success",
					);
				} catch (error) {
					setSafeErrorMessage(
						resultElement,
						`${debugI18n.t("clear_failed")} ${error.message}`,
					);
					addLogMessage(
						`${debugI18n.t("clear_rules_failed")} ${error.message}`,
						"error",
					);
				}
			})();
		},
	);

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
			const languageTag =
				qIndex === -1 ? cleanPart : cleanPart.substring(0, qIndex);

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

	// 应用自定义语言设置
	ResourceManager.addEventListener(
		document.getElementById("applyCustomLangBtn"),
		"click",
		() => {
			const customLangInput = document.getElementById("customLanguageInput");
			const customLangResult = document.getElementById("customLangResult");
			const languageString = customLangInput.value.trim();

			customLangResult.innerHTML = ""; // 清除旧结果

			if (!languageString) {
				setSafeErrorMessage(
					customLangResult,
					debugI18n.t("enter_valid_language"),
				);
				addLogMessage(debugI18n.t("try_apply_custom_empty"), "warning");
				customLangInput.classList.add("is-invalid");
				return;
			}

			customLangInput.classList.remove("is-invalid");

			// 检查格式是否可能有问题
			const hasFormatIssues = validateAcceptLanguageFormat(languageString);

			setSafeContent(
				customLangResult,
				`${debugI18n.t("applying_custom_language")} ${languageString}...`,
			);
			addLogMessage(
				`${debugI18n.t("try_apply_custom")} ${languageString}`,
				"info",
			);

			// 发送消息到 background.js 请求更新规则
			(async () => {
				try {
					await requestBackground("UPDATE_RULES", { language: languageString });

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
					addLogMessage(
						`${debugI18n.t("custom_language_applied_log")} ${languageString}`,
						"success",
					);

					if (hasFormatIssues) {
						addLogMessage(
							debugI18n.t("accept_language_format_warning"),
							"warning",
						);
					}
				} catch (error) {
					setSafeContent(
						customLangResult,
						`${debugI18n.t("apply_custom_failed")} ${error.message}`,
						"error",
					);
					addLogMessage(
						`${debugI18n.t("apply_custom_failed")} ${error.message}`,
						"error",
					);
				}
			})();
		},
	);

	// 重置自定义语言设置
	ResourceManager.addEventListener(
		document.getElementById("resetCustomLangBtn"),
		"click",
		async () => {
			const customLangResult = document.getElementById("customLangResult");
			const customLangInput = document.getElementById("customLanguageInput");

			addLogMessage(debugI18n.t("attempt_reset_accept_language"), "info");

			try {
				await resetAcceptLanguage();
				setSafeSuccessMessage(
					customLangResult,
					debugI18n.t("reset_accept_language_success"),
				);
				addLogMessage(debugI18n.t("reset_accept_language_success"), "success");
				if (customLangInput) customLangInput.value = ""; // 清空输入框
			} catch (error) {
				const errorMessage = debugI18n.t("reset_accept_language_failed", {
					message: error.message,
				});
				setSafeContent(customLangResult, errorMessage, "error");
				addLogMessage(errorMessage, "error");
			}
		},
	);

	// 显示诊断信息
	ResourceManager.addEventListener(
		document.getElementById("showDiagnosticsBtn"),
		"click",
		() => {
			const resultElement = document.getElementById("diagnosticsResult");
			resultElement.textContent = debugI18n.t("collecting_diagnostics");
			addLogMessage(debugI18n.t("try_show_diagnostics"), "info");

			const fragment = document.createDocumentFragment();
			try {
				const infoTitle = document.createElement("h5");
				infoTitle.textContent = debugI18n.t("extension_info");
				fragment.appendChild(infoTitle);

				const extensionIdP = document.createElement("p");
				extensionIdP.textContent = `${debugI18n.t("extension_id")} ${chrome.runtime.id}`;
				fragment.appendChild(extensionIdP);

				// 获取清单文件信息
				const manifest = chrome.runtime.getManifest();
				const manifestTitle = document.createElement("h5");
				manifestTitle.textContent = debugI18n.t("manifest_info");
				fragment.appendChild(manifestTitle);

				const nameP = document.createElement("p");
				nameP.textContent = `${debugI18n.t("name")} ${manifest.name}`;
				fragment.appendChild(nameP);

				const versionP = document.createElement("p");
				versionP.textContent = `${debugI18n.t("version")} ${manifest.version}`;
				fragment.appendChild(versionP);

				if (manifest.permissions) {
					const permissionsP = document.createElement("p");
					permissionsP.textContent = debugI18n.t("permissions");
					fragment.appendChild(permissionsP);

					const permissionsUl = document.createElement("ul");
					manifest.permissions.forEach((permission) => {
						const li = document.createElement("li");
						li.textContent = permission;
						permissionsUl.appendChild(li);
					});
					fragment.appendChild(permissionsUl);
				} else {
					const noPermissionsP = document.createElement("p");
					noPermissionsP.textContent = debugI18n.t("no_permissions");
					fragment.appendChild(noPermissionsP);
				}

				// 检查declarativeNetRequest权限
				const declarativeTitle = document.createElement("h5");
				declarativeTitle.textContent = debugI18n.t("declarative_config");
				fragment.appendChild(declarativeTitle);

				const hasDeclarativePermission = manifest.permissions?.includes(
					"declarativeNetRequest",
				);
				const hasFeedbackPermission = manifest.permissions?.includes(
					"declarativeNetRequestFeedback",
				);

				if (hasDeclarativePermission) {
					const p1 = document.createElement("p");
					p1.className = "success";
					p1.textContent = debugI18n.t("declarative_permission_found");
					fragment.appendChild(p1);

					if (hasFeedbackPermission) {
						const p2 = document.createElement("p");
						p2.className = "success";
						p2.textContent = debugI18n.t(
							"declarative_feedback_permission_found",
						);
						fragment.appendChild(p2);
					}
					const p3 = document.createElement("p");
					p3.className = "info";
					p3.textContent = debugI18n.t("using_dynamic_rules");
					fragment.appendChild(p3);
				} else {
					const p1 = document.createElement("p");
					p1.className = "error";
					p1.textContent = debugI18n.t("declarative_permission_missing");
					fragment.appendChild(p1);
				}

				// 获取存储的语言设置和自动切换状态 (移入 try 块，确保在 manifest 读取成功后执行)
				(async () => {
					try {
						const result = await requestBackground("GET_STORAGE_DATA", {
							keys: ["currentLanguage", "autoSwitchEnabled"],
						});

						const storedTitle = document.createElement("h5");
						storedTitle.textContent = debugI18n.t("stored_language_settings");
						fragment.appendChild(storedTitle);

						if (result.data?.currentLanguage) {
							const p = document.createElement("p");
							p.textContent = `${debugI18n.t("current_language")} ${result.data.currentLanguage}`;
							fragment.appendChild(p);
							addLogMessage(
								`${debugI18n.t("diagnostics_stored_language")} ${result.data.currentLanguage}.`,
								"info",
							);
						} else {
							const p = document.createElement("p");
							p.className = "warning";
							p.textContent = debugI18n.t("no_stored_language_found");
							fragment.appendChild(p);
							addLogMessage(
								debugI18n.t("diagnostics_no_stored_language"),
								"warning",
							);
						}

						// 添加自动切换状态信息
						const autoSwitchTitle = document.createElement("h5");
						autoSwitchTitle.textContent = debugI18n.t("auto_switch_function");
						fragment.appendChild(autoSwitchTitle);

						const statusP = document.createElement("p");
						statusP.textContent = `${debugI18n.t("status")} `;
						const statusSpan = document.createElement("span");
						statusSpan.className = result.data?.autoSwitchEnabled
							? "success"
							: "error";
						statusSpan.textContent = result.data?.autoSwitchEnabled
							? debugI18n.t("enabled")
							: debugI18n.t("disabled");
						statusP.appendChild(statusSpan);
						fragment.appendChild(statusP);

						// 添加到DOM
						resultElement.innerHTML = "";
						resultElement.appendChild(fragment);
						addLogMessage(debugI18n.t("diagnostics_complete"), "info");

						// 同步更新自动切换开关状态
						const autoSwitchToggle =
							document.getElementById("autoSwitchToggle");
						if (autoSwitchToggle) {
							autoSwitchToggle.checked = !!result.data?.autoSwitchEnabled;
						}
					} catch (storageError) {
						console.error(
							"Error collecting diagnostic information (storage):",
							storageError,
						);
						addLogMessage(
							`${debugI18n.t("collect_diagnostics_storage_error")} ${storageError.message}`,
							"error",
						);
						setSafeErrorMessage(
							resultElement,
							`${debugI18n.t("collect_storage_info_error")} ${storageError.message}`,
						);
					}
				})();
			} catch (error) {
				console.error(
					"Error collecting diagnostic information (manifest/id):",
					error,
				);
				addLogMessage(
					`${debugI18n.t("collect_diagnostics_manifest_error")} ${error.message}`,
					"error",
				);
				setSafeErrorMessage(
					resultElement,
					`${debugI18n.t("collect_basic_info_error")} ${error.message}`,
				);
			}
		},
	);

	// 自动切换功能控制
	ResourceManager.addEventListener(
		document.getElementById("autoSwitchToggle"),
		"change",
		function () {
			const isEnabled = this.checked;
			addLogMessage(
				`${debugI18n.t("try_enable_disable_auto")}${isEnabled ? debugI18n.t("enable") : debugI18n.t("disable")}${debugI18n.t("auto_switch_function_ellipsis")}`,
				"info",
			);

			// 发送消息到 background.js 更新自动切换状态
			(async () => {
				try {
					// 后台统一响应格式，失败会抛错
					await requestBackground("AUTO_SWITCH_TOGGLED", {
						enabled: isEnabled,
					});
					addLogMessage(
						isEnabled
							? debugI18n.t("auto_switch_enabled")
							: debugI18n.t("auto_switch_disabled"),
						"success",
					);
					// 更新存储中的状态
					await requestBackground("SET_STORAGE_DATA", {
						data: { autoSwitchEnabled: isEnabled },
					});
				} catch (error) {
					addLogMessage(
						`${debugI18n.t("update_auto_switch_failed")} ${error.message}`,
						"error",
					);
				}
			})();
		},
	);

	// 显示域名映射规则
	ResourceManager.addEventListener(
		document.getElementById("showDomainRulesBtn"),
		"click",
		() => {
			const resultElement = document.getElementById("domainRulesResult");
			resultElement.textContent = debugI18n.t("getting_domain_rules");
			addLogMessage(debugI18n.t("try_get_domain_rules"), "info");

			// 从 background.js 获取域名映射规则
			(async () => {
				try {
					const response = await requestBackground("GET_DOMAIN_RULES");

					// 响应检查
					console.log(debugI18n.t("received_domain_response"), response);
					addLogMessage(
						`${debugI18n.t("received_response")} ${JSON.stringify(response)}`,
						"info",
					);

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
						console.log(
							debugI18n.t("start_classify_domain_rules"),
							Object.keys(rules).length,
						);
						Object.keys(rules).forEach((domain) => {
							const language = rules[domain];

							if (domain.includes(".")) {
								categories[debugI18n.t("second_level_domain")][domain] =
									language;
							} else if (
								[
									"cn",
									"tw",
									"hk",
									"jp",
									"kr",
									"in",
									"id",
									"my",
									"sg",
									"th",
									"vn",
									"ph",
									"kz",
									"uz",
									"mn",
								].includes(domain)
							) {
								categories[debugI18n.t("asia")][domain] = language;
							} else if (
								[
									"us",
									"ca",
									"mx",
									"gt",
									"cr",
									"pa",
									"cu",
									"ht",
									"jm",
									"gov",
								].includes(domain)
							) {
								categories[debugI18n.t("north_america")][domain] = language;
							} else if (
								[
									"ar",
									"br",
									"cl",
									"co",
									"ec",
									"pe",
									"bo",
									"py",
									"uy",
									"ve",
								].includes(domain)
							) {
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
								[
									"bh",
									"ir",
									"iq",
									"il",
									"jo",
									"kw",
									"lb",
									"om",
									"ps",
									"qa",
									"sa",
									"sy",
									"ae",
									"ye",
								].includes(domain)
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
								categoryDiv.append(
									` (${ruleCount}${debugI18n.t("rules_count")}):`,
								);
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
						setSafeErrorMessage(
							resultElement,
							debugI18n.t("failed_get_domain_rules_empty"),
						);
						addLogMessage(
							`${debugI18n.t("failed_get_domain_rules_response")} ${JSON.stringify(response)}`,
							"warning",
						);
					}
				} catch (error) {
					setSafeErrorMessage(
						resultElement,
						`${debugI18n.t("get_domain_rules_failed")} ${error.message}`,
					);
					addLogMessage(
						`${debugI18n.t("get_domain_rules_failed")} ${error.message}`,
						"error",
					);
				}
			})();
		},
	);

	// 监听来自 background.js 的消息
	ResourceManager.addMessageListener((request, _sender, sendResponse) => {
		if (request.type === "AUTO_SWITCH_UI_UPDATE") {
			const autoSwitchToggle = document.getElementById("autoSwitchToggle");
			if (autoSwitchToggle) {
				autoSwitchToggle.checked = !!request.autoSwitchEnabled;
				(async () => {
					try {
						// 同步到存储：统一消息调用，失败直接抛错
						await requestBackground("SET_STORAGE_DATA", {
							data: { autoSwitchEnabled: !!request.autoSwitchEnabled },
						});
					} catch (notifyError) {
						addLogMessage(
							`${debugI18n.t("failed_update_storage")}: ${notifyError.message}`,
							"warning",
						);
					}
				})();
			}
			addLogMessage(
				`${debugI18n.t("received_auto_switch_update")} ${request.autoSwitchEnabled ? debugI18n.t("enabled") : debugI18n.t("disabled")}, ${debugI18n.t("current_language_colon")} ${request.currentLanguage}`,
				"info",
			);

			if (sendResponse) {
				sendResponse({ status: "Debug UI updated" });
			}
		} else if (request.type === "AUTO_SWITCH_STATE_CHANGED") {
			// 同步自动切换状态
			const autoSwitchToggle = document.getElementById("autoSwitchToggle");
			if (autoSwitchToggle) {
				autoSwitchToggle.checked = request.enabled;
				addLogMessage(
					`${request.enabled ? debugI18n.t("auto_switch_enabled") : debugI18n.t("auto_switch_disabled")}`,
					"info",
				);
			}
		}
		return true;
	});

	// 页面卸载时的清理
	const cleanupResources = () => {
		// 清理 ResourceManager 中跟踪的资源
		ResourceManager.cleanup();

		// 页面卸载阶段可能早于日志模块初始化完成，避免引用未定义函数导致额外报错
		if (typeof addLogMessage === "function") {
			addLogMessage(debugI18n.t("debug_ui_cleanup_completed"), "info");
		}
	};

	// 注册清理事件
	ResourceManager.addEventListener(window, "beforeunload", cleanupResources);

	// 缓存管理功能
	// 避免在同一作用域内触发 TDZ（const 初始化前调用）
	ResourceManager.setTimeout(() => {
		try {
			initializeCacheManagement();
		} catch (error) {
			console.error(
				`[Cache] Failed to initialize cache management: ${error.message}`,
			);
		}
	}, 0);
});

/**
 * 初始化缓存管理功能
 */
const initializeCacheManagement = () => {
	// 初始化翻译文本
	initializeCacheManagementTexts();

	// 刷新缓存统计按钮
	const refreshCacheStatsBtn = document.getElementById("refreshCacheStatsBtn");
	if (refreshCacheStatsBtn) {
		ResourceManager.addEventListener(
			refreshCacheStatsBtn,
			"click",
			refreshCacheStats,
		);
	}

	// 清理域名缓存按钮
	const clearDomainCacheBtn = document.getElementById("clearDomainCacheBtn");
	if (clearDomainCacheBtn) {
		ResourceManager.addEventListener(
			clearDomainCacheBtn,
			"click",
			clearDomainCache,
		);
	}

	// 重置缓存统计按钮
	const resetCacheStatsBtn = document.getElementById("resetCacheStatsBtn");
	if (resetCacheStatsBtn) {
		ResourceManager.addEventListener(
			resetCacheStatsBtn,
			"click",
			resetCacheStats,
		);
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
	const testDomainInput = document.getElementById("testDomainInput");
	const resultElement = document.getElementById("cacheOperationResult");
	const domain = testDomainInput.value.trim();

	if (!domain) {
		setSafeErrorMessage(resultElement, debugI18n.t("please_enter_domain"));
		return;
	}

	try {
		setSafeContent(resultElement, debugI18n.t("testing_domain", { domain }));

		// 通过消息传递请求后台测试域名：成功返回数据，失败走 catch
		const response = await requestBackground("TEST_DOMAIN_CACHE", {
			domain: domain,
		});
		const { language, fromCache, isUsingFallback, cacheStats } = response;

		resultElement.innerHTML = ""; // 清空
		const fragment = document.createDocumentFragment();

		const successP = createSafeMessageElement(
			debugI18n.t("domain_test_success"),
			"success",
		);
		fragment.appendChild(successP);

		// 添加调试信息
		console.log(`[Debug] Domain test response:`, {
			language,
			fromCache,
			isUsingFallback,
			cacheStats,
		});

		if (language) {
			const resultP = document.createElement("p");
			resultP.textContent = `${debugI18n.t("domain_found")}: `;

			const domainStrong = document.createElement("strong");
			domainStrong.textContent = domain;
			resultP.appendChild(domainStrong);

			resultP.append(` → `);

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
			const notFoundP = createSafeMessageElement(
				`${debugI18n.t("domain_not_found")}: ${domain}`,
				"warning",
			);
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

		console.log(
			`[Cache] Domain test: ${domain} → ${language || "not found"} (${fromCache ? "cached" : "new"})`,
		);
	} catch (error) {
		setSafeErrorMessage(
			resultElement,
			`${debugI18n.t("domain_test_failed")}: ${error.message}`,
		);
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
const handleCacheOperation = async (
	messageType,
	successMessageKey,
	additionalCallback = null,
) => {
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
		console.log(`[Cache] ${successMessage}`);
	} catch (error) {
		setSafeErrorMessage(
			resultElement,
			`${debugI18n.t("cache_operation_failed")}: ${error.message}`,
		);
		console.error(
			`[Cache] ${debugI18n.t("cache_operation_failed")}: ${error.message}`,
		);
	}
};

/**
 * 刷新缓存统计显示
 */
const refreshCacheStats = async () => {
	return handleCacheOperation("GET_CACHE_STATS", "cache_stats_refreshed");
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
	return handleCacheOperation("CLEAR_DOMAIN_CACHE", "domain_cache_cleared");
};

/**
 * 重置缓存统计
 */
const resetCacheStats = async () => {
	return handleCacheOperation("RESET_CACHE_STATS", "cache_stats_reset");
};
