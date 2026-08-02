import { BaseI18n } from "../shared/shared-i18n-base.js";
import { backgroundEn, backgroundZh } from "./background-dict.js";

/**
 * 后台脚本国际化类
 * 继承基础国际化类，专门用于Service Worker环境
 */
class BackgroundI18n extends BaseI18n {
	constructor() {
		super("background", true, { en: backgroundEn, zh: backgroundZh }); // 标记为Service Worker环境
	}
}

// 创建实例，但不立即初始化
export const backgroundI18n = new BackgroundI18n();
// 调用init()并将其返回的Promise暴露出去，以便其他脚本可以等待它完成
export const backgroundI18nReady = backgroundI18n.init();
