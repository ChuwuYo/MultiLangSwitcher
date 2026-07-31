import { BaseI18n } from "../shared/shared-i18n-base.js";
import { debugEn, debugZh } from "./debug-dict.js";

/**
 * 调试页面国际化类
 * 继承基础国际化类，专门用于debug页面
 */
class DebugI18n extends BaseI18n {
	constructor() {
		super("debug", false, { en: debugEn, zh: debugZh });
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
		// 声明式翻译：处理所有 data-i18n* 属性
		this._applyDataAttributes();

		// 设置页面标题（不在 body 内，无法用 data 属性）
		document.title = this.t("title");

		// 处理 Accept-Language 格式说明（含 <code> 嵌套结构与多 key 组合，保持命令式）
		const languageCodeItem = document.querySelector("#languageCodeItem");
		if (languageCodeItem) {
			languageCodeItem.innerHTML = `<code>${this.t("language_code")}</code> (${this.t("required")}): ${this.t("language_code_required")}`;
		}

		const regionCodeItem = document.querySelector("#regionCodeItem");
		if (regionCodeItem) {
			regionCodeItem.innerHTML = `<code>-${this.t("region_code")}</code> (${this.t("optional")}): ${this.t("region_code_optional")}`;
		}

		const qualityValueItem = document.querySelector("#qualityValueItem");
		if (qualityValueItem) {
			qualityValueItem.innerHTML = `<code>;q=${this.t("quality_value")}</code> (${this.t("optional")}): ${this.t("quality_value_optional")}`;
		}

		const exampleComplex = document.querySelector("#exampleComplex");
		if (exampleComplex) {
			exampleComplex.innerHTML = `<code>en-US,en;q=0.9,zh-CN;q=0.8</code>: ${this.t("example_complex")}`;
		}
	}
}

export const debugI18n = new DebugI18n();

// DOM加载完成后，初始化并应用翻译
document.addEventListener("DOMContentLoaded", () => {
	debugI18n.applyTranslationsToDOM();
});
