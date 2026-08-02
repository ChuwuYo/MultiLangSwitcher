/**
 * 存储键常量
 * STORAGE_KEYS: chrome.storage.local 键（UI_STATE 例外，位于 chrome.storage.session）
 * LOCAL_STORAGE_KEYS: window.localStorage 键（仅页面环境可用）
 */
// biome-ignore lint/correctness/noUnusedVariables: 常量对象供各页面与后台脚本引用
export const STORAGE_KEYS = Object.freeze({
	CURRENT_LANGUAGE: "currentLanguage",
	AUTO_SWITCH_ENABLED: "autoSwitchEnabled",
	CUSTOM_DOMAIN_RULES: "customDomainRules",
	AI_DIAGNOSIS_CONFIG: "aiDiagnosisConfig",
	// 更新检查缓存键前缀（实际键为 `${UPDATE_CHECKER_CACHE_PREFIX}${owner}_${repo}`）
	UPDATE_CHECKER_CACHE_PREFIX: "updateChecker_",
	// 会话级 UI 状态，位于 chrome.storage.session（background 单写者，页面只读）
	UI_STATE: "uiState",
});

// biome-ignore lint/correctness/noUnusedVariables: 常量对象供页面脚本引用
export const LOCAL_STORAGE_KEYS = Object.freeze({
	APP_LANG: "app-lang",
	THEME: "theme",
});
