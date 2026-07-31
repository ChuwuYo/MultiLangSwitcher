import { BaseI18n } from "../shared/shared-i18n-base.js";
import { AIProviderPresets, AIProviderPresetUtils } from "../shared/ai-provider-presets.js";
import { detectEn, detectZh } from "./detect-dict.js";

/**
 * 检测页面国际化类
 * 继承基础国际化类，专门用于detect页面
 */
class DetectI18n extends BaseI18n {
	constructor() {
		super("detect", false, { en: detectEn, zh: detectZh });
	}

	/**
	 * 初始化并应用翻译到DOM。
	 */
	async applyTranslationsToDOM() {
		await this.init();
		this._applyTranslations();
	}

	/**
	 * 将翻译应用到DOM元素。
	 * @private
	 */
	_applyTranslations() {
		this._applyDataAttributes();

		// 设置页面标题和基本信息
		document.title = this.t("title");

		// 提示信息（条件文本与HTML内容，保留命令式）
		const tipLabel = document.querySelector("#tipLabel");
		if (tipLabel) {
			tipLabel.textContent = this.currentLang === "zh" ? "提示" : "Tip:";
		}

		const tipText = document.querySelector("#tipText");
		if (tipText) {
			tipText.innerHTML = this.t("tip");
		}

		const aiDiagnosisSubtitle = /** @type {HTMLElement} */ (document.querySelector("#aiDiagnosisSubtitle"));
		if (aiDiagnosisSubtitle) {
			aiDiagnosisSubtitle.textContent = "";
			aiDiagnosisSubtitle.style.display = "none";
		}

		const aiProviderSelect = /** @type {HTMLSelectElement} */ (document.querySelector("#aiProviderSelect"));
		if (aiProviderSelect) {
			AIProviderPresetUtils.populateSelectOptions(aiProviderSelect, (key) => this.t(key));
		}

		const aiProviderDescription = /** @type {HTMLElement} */ (document.querySelector("#aiProviderDescription"));
		if (aiProviderDescription && !aiProviderDescription.dataset.initialized) {
			const providerKey = aiProviderSelect?.value || "openrouter";
			const preset = AIProviderPresets?.[providerKey];
			aiProviderDescription.textContent = preset?.descriptionKey ? this.t(preset.descriptionKey) : "";
		}

		const aiUserInput = /** @type {HTMLInputElement} */ (document.querySelector("#aiUserInput"));
		if (aiUserInput) {
			aiUserInput.setAttribute("aria-label", this.t("ai_user_input_label"));
		}

		const aiChatMessages = /** @type {HTMLElement} */ (document.querySelector("#aiChatMessages"));
		if (aiChatMessages && !aiChatMessages.dataset.initialized) {
			aiChatMessages.textContent = this.t("ai_chat_placeholder");
		}

		const aiChatStatus = /** @type {HTMLElement} */ (document.querySelector("#aiChatStatus"));
		if (aiChatStatus && !aiChatStatus.dataset.initialized) {
			aiChatStatus.textContent = "";
		}

		const aiConfigHint = /** @type {HTMLElement} */ (document.querySelector("#aiConfigHint"));
		if (aiConfigHint && !aiConfigHint.dataset.initialized) {
			aiConfigHint.textContent = "";
		}
	}
}

export const detectI18n = new DetectI18n();

// DOM加载完成后，初始化并应用翻译
document.addEventListener("DOMContentLoaded", () => {
	detectI18n.applyTranslationsToDOM();
});
