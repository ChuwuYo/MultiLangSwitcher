// debug-ui.js - 调试页面UI交互脚本

import { populateLanguageSelect } from "../shared/shared-language-options.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import { registerI18nInstance } from "../shared/shared-utils.js";
import { debugI18n } from "../i18n/debug-i18n.js";
import { initAutoSwitch } from "./auto-switch.js";
import { initializeCacheManagement } from "./cache-mgmt.js";
import { initCustomLanguage } from "./custom-language.js";
import { initDiagnostics } from "./diagnostics.js";
import { initDomainRules } from "./domain-rules.js";
import { initHeaderTest } from "./header-test.js";
import { addLogMessage, initLogPanel } from "./log-panel.js";
import { initRulesFix } from "./rules-fix.js";
import { initRulesView } from "./rules-view.js";
import "../shared/toggle.js";
import "./debug-headers.js";

registerI18nInstance("debug", debugI18n);

ResourceManager.addEventListener(document, "DOMContentLoaded", () => {
	// 初始化语言选项
	const testLanguageSelect = /** @type {HTMLSelectElement} */ (document.getElementById("testLanguage"));
	if (testLanguageSelect) {
		populateLanguageSelect(testLanguageSelect);
	}

	initRulesView();

	initLogPanel();

	initAutoSwitch();

	initHeaderTest();

	initRulesFix();

	initCustomLanguage();

	initDiagnostics();

	initDomainRules();

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
			console.error(`[Cache] Failed to initialize cache management: ${error.message}`);
		}
	}, 0);
});
