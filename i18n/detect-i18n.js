// 引入基础国际化类
// 注意：在HTML中需要先加载 shared/shared-i18n-base.js

/**
 * 检测页面国际化类
 * 继承基础国际化类，专门用于detect页面
 */
class DetectI18n extends BaseI18n {
	constructor() {
		super("detect", false); // 标记为浏览器环境
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
		// 设置页面标题和基本信息
		document.title = this.t("title");

		// 主题切换按钮
		const themeToggleBtn = document.querySelector("#themeToggleBtn");
		if (themeToggleBtn) {
			themeToggleBtn.title = this.t("theme_toggle");
		}

		// 页面标题和副标题
		const pageHeading = document.querySelector("#pageHeading");
		if (pageHeading) {
			pageHeading.textContent = this.t("heading");
		}

		const pageSubtitle = document.querySelector("#pageSubtitle");
		if (pageSubtitle) {
			pageSubtitle.textContent = this.t("subtitle");
		}

		// 提示信息
		const tipLabel = document.querySelector("#tipLabel");
		if (tipLabel) {
			tipLabel.textContent = this.currentLang === "zh" ? "提示" : "Tip:";
		}

		const tipText = document.querySelector("#tipText");
		if (tipText) {
			tipText.innerHTML = this.t("tip");
		}

		// 卡片标题
		const requestHeaderTitle = document.querySelector("#requestHeaderTitle");
		if (requestHeaderTitle) {
			requestHeaderTitle.textContent = this.t("request_header");
		}

		const jsLanguageTitle = document.querySelector("#jsLanguageTitle");
		if (jsLanguageTitle) {
			jsLanguageTitle.textContent = this.t("js_language");
		}

		const intlApiTitle = document.querySelector("#intlApiTitle");
		if (intlApiTitle) {
			intlApiTitle.textContent = this.t("intl_api");
		}

		const webRtcTitle = document.querySelector("#webRtcTitle");
		if (webRtcTitle) {
			webRtcTitle.textContent = this.t("webrtc_detection");
		}

		const browserFingerprintTitle = document.querySelector(
			"#browserFingerprintTitle",
		);
		if (browserFingerprintTitle) {
			browserFingerprintTitle.textContent = this.t("browser_fingerprint");
		}

		const browserCompatibilityTitle = document.querySelector(
			"#browserCompatibilityTitle",
		);
		if (browserCompatibilityTitle) {
			browserCompatibilityTitle.textContent = this.t("browser_compatibility");
		}

		const hardwareFingerprintTitle = document.querySelector(
			"#hardwareFingerprintTitle",
		);
		if (hardwareFingerprintTitle) {
			hardwareFingerprintTitle.textContent = this.t("hardware_fingerprint");
		}

		const canvasFingerprintTitle = document.querySelector(
			"#canvasFingerprintTitle",
		);
		if (canvasFingerprintTitle) {
			canvasFingerprintTitle.textContent = this.t("canvas_fingerprint");
		}

		const webglFingerprintTitle = document.querySelector(
			"#webglFingerprintTitle",
		);
		if (webglFingerprintTitle) {
			webglFingerprintTitle.textContent = this.t("webgl_fingerprint");
		}

		const audioFingerprintTitle = document.querySelector(
			"#audioFingerprintTitle",
		);
		if (audioFingerprintTitle) {
			audioFingerprintTitle.textContent = this.t("audio_fingerprint");
		}

		// 浏览器信息
		const browserInfoLabel = document.querySelector("#browserInfoLabel");
		if (browserInfoLabel) {
			browserInfoLabel.textContent = this.t("browser_info");
		}

		const apiSupportTitle = document.querySelector("#apiSupportTitle");
		if (apiSupportTitle) {
			apiSupportTitle.textContent = this.t("api_support");
		}

		// 完整请求头信息
		const completeHeadersTitle = document.querySelector(
			"#completeHeadersTitle",
		);
		if (completeHeadersTitle) {
			completeHeadersTitle.textContent = this.t("complete_headers");
		}

		const aiDiagnosisTitle = document.querySelector("#aiDiagnosisTitle");
		if (aiDiagnosisTitle) {
			aiDiagnosisTitle.textContent = this.t("ai_diagnosis_title");
		}

		const aiDiagnosisSubtitle = document.querySelector("#aiDiagnosisSubtitle");
		if (aiDiagnosisSubtitle) {
			aiDiagnosisSubtitle.textContent = "";
			aiDiagnosisSubtitle.style.display = "none";
		}

		const aiConfigSummary = document.querySelector("#aiConfigSummary");
		if (aiConfigSummary) {
			aiConfigSummary.textContent = this.t("ai_config_summary");
		}

		const aiProviderLabel = document.querySelector("#aiProviderLabel");
		if (aiProviderLabel) {
			aiProviderLabel.textContent = this.t("ai_provider_label");
		}

		const aiProviderSelect = document.querySelector("#aiProviderSelect");
		if (aiProviderSelect) {
			window.AIProviderPresetUtils?.populateSelectOptions?.(
				aiProviderSelect,
				(key) => this.t(key),
			);
		}

		const aiProviderDescription = document.querySelector(
			"#aiProviderDescription",
		);
		if (aiProviderDescription && !aiProviderDescription.dataset.initialized) {
			const providerKey = aiProviderSelect?.value || "openrouter";
			const preset = window.AIProviderPresets?.[providerKey];
			aiProviderDescription.textContent = preset?.descriptionKey
				? this.t(preset.descriptionKey)
				: "";
		}

		const aiBaseUrlLabel = document.querySelector("#aiBaseUrlLabel");
		if (aiBaseUrlLabel) {
			aiBaseUrlLabel.textContent = this.t("ai_base_url_label");
		}

		const aiApiKeyLabel = document.querySelector("#aiApiKeyLabel");
		if (aiApiKeyLabel) {
			aiApiKeyLabel.textContent = this.t("ai_api_key_label");
		}

		const aiModelLabel = document.querySelector("#aiModelLabel");
		if (aiModelLabel) {
			aiModelLabel.textContent = this.t("ai_model_label");
		}

		const aiApiKeyToggle = document.querySelector("#aiApiKeyToggle");
		if (aiApiKeyToggle) {
			aiApiKeyToggle.textContent = this.t("ai_api_key_toggle_show");
		}

		const aiPrivacyHint = document.querySelector("#aiPrivacyHint");
		if (aiPrivacyHint) {
			aiPrivacyHint.textContent = this.t("ai_privacy_hint");
		}

		const aiStartButton = document.querySelector("#aiStartButton");
		if (aiStartButton) {
			aiStartButton.textContent = this.t("ai_start");
		}

		const aiStopButton = document.querySelector("#aiStopButton");
		if (aiStopButton) {
			aiStopButton.textContent = this.t("ai_stop");
		}

		const aiClearButton = document.querySelector("#aiClearButton");
		if (aiClearButton) {
			aiClearButton.textContent = this.t("ai_clear");
		}

		const aiSendButton = document.querySelector("#aiSendButton");
		if (aiSendButton) {
			aiSendButton.textContent = this.t("ai_send");
		}

		const aiExportButton = document.querySelector("#aiExportButton");
		if (aiExportButton) {
			aiExportButton.textContent = this.t("ai_export");
		}

		const aiUserInput = document.querySelector("#aiUserInput");
		const aiUserInputLabel = document.querySelector("#aiUserInputLabel");
		if (aiUserInputLabel) {
			aiUserInputLabel.textContent = this.t("ai_user_input_label");
		}
		if (aiUserInput) {
			aiUserInput.placeholder = this.t("ai_user_input_placeholder");
			aiUserInput.setAttribute("aria-label", this.t("ai_user_input_label"));
		}

		// 处理所有检测中文本
		const infoElements = [
			"#headerLanguageInfo",
			"#jsLanguageInfo",
			"#intlApiInfo",
			"#webRtcInfo",
			"#fingerprintInfo",
			"#browserInfoDisplay",
			"#canvasFingerprintInfo",
			"#webglFingerprintInfo",
			"#audioFingerprintInfo",
		];

		infoElements.forEach((selector) => {
			const el = document.querySelector(selector);
			if (el) {
				el.textContent = this.t("detecting");
			}
		});

		// 处理检测列表项
		const detectingItem = document.querySelector("#detectingItem");
		if (detectingItem) {
			detectingItem.textContent = this.t("detecting");
		}

		// 处理加载中文本
		const headerInfo = document.querySelector("#headerInfo");
		if (headerInfo) {
			headerInfo.textContent = this.t("loading");
		}

		const aiChatMessages = document.querySelector("#aiChatMessages");
		if (aiChatMessages && !aiChatMessages.dataset.initialized) {
			aiChatMessages.textContent = this.t("ai_chat_placeholder");
		}

		const aiChatStatus = document.querySelector("#aiChatStatus");
		if (aiChatStatus && !aiChatStatus.dataset.initialized) {
			aiChatStatus.textContent = "";
		}

		const aiConfigHint = document.querySelector("#aiConfigHint");
		if (aiConfigHint && !aiConfigHint.dataset.initialized) {
			aiConfigHint.textContent = "";
		}
	}
}

const detectI18n = new DetectI18n();

// DOM加载完成后，初始化并应用翻译
document.addEventListener("DOMContentLoaded", () => {
	detectI18n.applyTranslationsToDOM();
});
