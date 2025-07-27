/**
 * 后台脚本国际化类
 * 继承基础国际化类，专门用于Service Worker环境
 * 注意：BaseI18n类应该在background.js中已经通过importScripts加载
 */
class BackgroundI18n extends BaseI18n {
  constructor() {
    super('background', true); // 标记为Service Worker环境
    this.init();
  }
}

// 创建全局实例
const backgroundI18n = new BackgroundI18n();