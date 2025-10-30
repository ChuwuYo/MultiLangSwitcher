/**
 * 后台脚本国际化类
 * 继承基础国际化类，专门用于Service Worker环境
 * 注意：BaseI18n类应该在background.js中已经通过importScripts加载
 */
class BackgroundI18n extends BaseI18n {
  constructor() {
    super('background', true); // 标记为Service Worker环境
  }
}

// 创建实例，但不立即初始化
const backgroundI18n = new BackgroundI18n();
// 调用init()并将其返回的Promise暴露出去，以便其他脚本可以等待它完成
const backgroundI18nReady = backgroundI18n.init();