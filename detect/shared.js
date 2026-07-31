import { detectI18n } from "../i18n/detect-i18n.js";

export const getUiLanguage = () => (detectI18n?.currentLang === "zh" ? "zh" : "en");

export const translateDetect = (key, params = {}) => (detectI18n?.t ? detectI18n.t(key, params) : key);

export const createMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
