/**
 * 域名管理器国际化类
 * 继承基础国际化类，专门用于Service Worker环境中的域名管理
 * 注意：BaseI18n类应该在background.js中已经通过importScripts加载
 */
class DomainManagerI18n extends BaseI18n {
  constructor() {
    super('domain-manager', true); // 标记为Service Worker环境
    this.init();
  }
}

// 创建全局实例
const domainManagerI18n = new DomainManagerI18n();