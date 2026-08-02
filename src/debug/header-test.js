// debug/header-test.js - 请求头测试

import { fetchHeadersFromEndpoints } from "../shared/header-check-utils.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import { debugI18n } from "../i18n/debug-i18n.js";
import { addLogMessage } from "./log-panel.js";
import { appendExternalCheckLinks, createSafeElement, setSafeContent } from "./safe-dom.js";

/**
 * 初始化请求头测试：绑定"测试请求头"按钮
 */
export const initHeaderTest = () => {
	// 测试请求头
	ResourceManager.addEventListener(document.getElementById("testHeaderBtn"), "click", async () => {
		const language = /** @type {HTMLSelectElement} */ (document.getElementById("testLanguage")).value;
		const resultElement = document.getElementById("headerTestResult");
		setSafeContent(
			resultElement,
			`${debugI18n.t("testing_language_header")} "${language}" ${debugI18n.t("header_test_multiple")}`,
		);
		addLogMessage(`${debugI18n.t("start_header_test")} ${language}`, "info");

		try {
			// 使用共享模块获取请求头
			const result = await fetchHeadersFromEndpoints();

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
						addLogMessage(`${debugI18n.t("header_test_success")} ${result.acceptLanguage}`, "success");
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

						appendExternalCheckLinks(fragment);

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

					appendExternalCheckLinks(fragment);

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

				appendExternalCheckLinks(fragment, debugI18n.t("check_network_connection") + " ");

				addLogMessage(debugI18n.t("header_test_failed_all_endpoints"), "error");
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

			appendExternalCheckLinks(fragment, debugI18n.t("check_network_connection") + " ");

			resultElement.appendChild(fragment);

			addLogMessage(`${debugI18n.t("header_test_failed_all_endpoints")}: ${error.message}`, "error");
		}
	});
};
