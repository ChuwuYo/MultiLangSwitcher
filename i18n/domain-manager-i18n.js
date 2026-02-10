/**
 * 域名管理器国际化类
 * 继承基础国际化类，专门用于Service Worker环境中的域名管理
 * 注意：BaseI18n类应该在background.js中已经通过importScripts加载
 */
class DomainManagerI18n extends BaseI18n {
	constructor() {
		super("domain-manager", true); // 标记为Service Worker环境
	}
}

// 创建实例，但不立即初始化
const domainManagerI18n = new DomainManagerI18n();
// 调用init()并将其返回的Promise暴露出去，以便其他脚本可以等待它完成
// biome-ignore lint/correctness/noUnusedVariables: 该变量用于外部脚本等待初始化完成
const domainManagerI18nReady = domainManagerI18n.init();
