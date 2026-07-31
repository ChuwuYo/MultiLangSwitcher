import { BaseI18n } from "../shared/shared-i18n-base.js";
import { popupEn, popupZh } from "./popup-dict.js";

/**
 * 弹窗页面国际化类
 * 继承基础国际化类，专门用于popup页面
 */
class PopupI18n extends BaseI18n {
	constructor() {
		super("popup", false, { en: popupEn, zh: popupZh });
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

		// 设置页面标题
		document.title = this.t("extension_name");

		// 状态
		const currentLangSpan = document.querySelector("#currentLanguage");
		const currentLangText = currentLangSpan ? currentLangSpan.textContent : "";
		const shouldKeepCurrent = currentLangText && currentLangText !== "未设置" && currentLangText !== "Not Set";

		const statusText = document.querySelector("#statusText");
		if (statusText) {
			// 使用安全的DOM操作替代innerHTML
			statusText.textContent = this.t("current_language");
			const span = document.createElement("span");
			span.id = "currentLanguage";
			span.textContent = shouldKeepCurrent ? currentLangText : this.t("not_set");
			statusText.appendChild(span);
		}
	}
}

// 创建全局实例
export const popupI18n = new PopupI18n();

// DOM加载完成后，初始化并应用翻译
document.addEventListener("DOMContentLoaded", () => {
	popupI18n.applyTranslationsToDOM();
});
