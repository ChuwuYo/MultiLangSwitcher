// debug/diagnostics.js - 诊断信息展示

import { ResourceManager } from "../shared/shared-resource-manager.js";
import { STORAGE_KEYS } from "../shared/storage-keys.js";
import { debugI18n } from "../i18n/debug-i18n.js";
import { addLogMessage } from "./log-panel.js";
import { setSafeErrorMessage } from "./safe-dom.js";

/**
 * 初始化诊断信息：绑定"显示诊断信息"按钮
 */
export const initDiagnostics = () => {
	// 显示诊断信息
	ResourceManager.addEventListener(document.getElementById("showDiagnosticsBtn"), "click", () => {
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

			const hasDeclarativePermission = manifest.permissions?.includes("declarativeNetRequest");
			const hasFeedbackPermission = manifest.permissions?.includes("declarativeNetRequestFeedback");

			if (hasDeclarativePermission) {
				const p1 = document.createElement("p");
				p1.className = "success";
				p1.textContent = debugI18n.t("declarative_permission_found");
				fragment.appendChild(p1);

				if (hasFeedbackPermission) {
					const p2 = document.createElement("p");
					p2.className = "success";
					p2.textContent = debugI18n.t("declarative_feedback_permission_found");
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
					const result = await chrome.storage.local.get([
						STORAGE_KEYS.CURRENT_LANGUAGE,
						STORAGE_KEYS.AUTO_SWITCH_ENABLED,
					]);

					const storedTitle = document.createElement("h5");
					storedTitle.textContent = debugI18n.t("stored_language_settings");
					fragment.appendChild(storedTitle);

					if (result[STORAGE_KEYS.CURRENT_LANGUAGE]) {
						const p = document.createElement("p");
						p.textContent = `${debugI18n.t("current_language")} ${result[STORAGE_KEYS.CURRENT_LANGUAGE]}`;
						fragment.appendChild(p);
						addLogMessage(
							`${debugI18n.t("diagnostics_stored_language")} ${result[STORAGE_KEYS.CURRENT_LANGUAGE]}.`,
							"info",
						);
					} else {
						const p = document.createElement("p");
						p.className = "warning";
						p.textContent = debugI18n.t("no_stored_language_found");
						fragment.appendChild(p);
						addLogMessage(debugI18n.t("diagnostics_no_stored_language"), "warning");
					}

					// 添加自动切换状态信息
					const autoSwitchTitle = document.createElement("h5");
					autoSwitchTitle.textContent = debugI18n.t("auto_switch_function");
					fragment.appendChild(autoSwitchTitle);

					const statusP = document.createElement("p");
					statusP.textContent = `${debugI18n.t("status")} `;
					const statusSpan = document.createElement("span");
					statusSpan.className = result[STORAGE_KEYS.AUTO_SWITCH_ENABLED] ? "success" : "error";
					statusSpan.textContent = result[STORAGE_KEYS.AUTO_SWITCH_ENABLED]
						? debugI18n.t("enabled")
						: debugI18n.t("disabled");
					statusP.appendChild(statusSpan);
					fragment.appendChild(statusP);

					// 添加到DOM
					resultElement.innerHTML = "";
					resultElement.appendChild(fragment);
					addLogMessage(debugI18n.t("diagnostics_complete"), "info");

					// 同步更新自动切换开关状态
					const autoSwitchToggle = /** @type {HTMLInputElement} */ (document.getElementById("autoSwitchToggle"));
					if (autoSwitchToggle) {
						autoSwitchToggle.checked = !!result[STORAGE_KEYS.AUTO_SWITCH_ENABLED];
					}
				} catch (storageError) {
					console.error("Error collecting diagnostic information (storage):", storageError);
					addLogMessage(`${debugI18n.t("collect_diagnostics_storage_error")} ${storageError.message}`, "error");
					setSafeErrorMessage(resultElement, `${debugI18n.t("collect_storage_info_error")} ${storageError.message}`);
				}
			})();
		} catch (error) {
			console.error("Error collecting diagnostic information (manifest/id):", error);
			addLogMessage(`${debugI18n.t("collect_diagnostics_manifest_error")} ${error.message}`, "error");
			setSafeErrorMessage(resultElement, `${debugI18n.t("collect_basic_info_error")} ${error.message}`);
		}
	});
};
