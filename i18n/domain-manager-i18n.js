import { BaseI18n } from "../shared/shared-i18n-base.js";
import { domainManagerEn } from "./domain-manager-en.js";
import { domainManagerZh } from "./domain-manager-zh.js";

/**
 * 域名管理器国际化类
 * 继承基础国际化类，专门用于Service Worker环境中的域名管理
 */
class DomainManagerI18n extends BaseI18n {
	constructor() {
		super("domain-manager", true, { en: domainManagerEn, zh: domainManagerZh }); // 标记为Service Worker环境
	}
}

// 创建实例，但不立即初始化
export const domainManagerI18n = new DomainManagerI18n();
// 调用init()并将其返回的Promise暴露出去，以便其他脚本可以等待它完成
export const domainManagerI18nReady = domainManagerI18n.init();
