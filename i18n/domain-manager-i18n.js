class DomainManagerI18n {
  constructor() {
    this.currentLang = 'en';
    this.translations = {};
    this.initialized = false;
    this.init();
  }

  init() {
    // 同步初始化，避免 service worker 注册问题
    this.detectLanguage();
    this.loadTranslations();
    this.initialized = true;
  }

  detectLanguage() {
    try {
      // 使用同步方式检测语言，优先使用 detectBrowserLanguage 函数
      if (typeof detectBrowserLanguage === 'function') {
        const detectedLang = detectBrowserLanguage();
        this.currentLang = detectedLang.startsWith('zh') ? 'zh' : 'en';
      } else {
        // 回退到 Chrome 扩展 API 或浏览器语言检测
        if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
          const browserLang = chrome.i18n.getUILanguage().toLowerCase();
          this.currentLang = browserLang.startsWith('zh') ? 'zh' : 'en';
        } else {
          // 最终回退到英文
          this.currentLang = 'en';
        }
      }
    } catch (error) {
      // 发生错误时默认使用英文
      this.currentLang = 'en';
    }
  }

  loadTranslations() {
    try {
      // 动态加载对应语言的翻译文件
      importScripts(`i18n/domain-manager-${this.currentLang}.js`);
      this.translations = this.currentLang === 'zh' ? domainManagerZh : domainManagerEn;
    } catch (error) {
      console.error('域名管理器翻译文件加载失败:', error);
      // 加载失败时尝试加载英文翻译作为回退
      try {
        if (this.currentLang !== 'en') {
          importScripts('i18n/domain-manager-en.js');
          this.translations = domainManagerEn;
        } else {
          this.translations = {};
        }
      } catch (fallbackError) {
        console.error('回退翻译文件也加载失败:', fallbackError);
        this.translations = {};
      }
    }
  }

  t(key, params = {}) {
    // 获取翻译文本，如果找不到则返回键名
    let text = this.translations[key] || key;

    // 处理参数替换，支持多种占位符格式
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(param => {
        const placeholder = `{${param}}`;
        // 使用全局替换，确保所有占位符都被替换
        text = text.replace(new RegExp(placeholder, 'g'), params[param]);
      });
    }

    return text;
  }


}

// 创建全局实例
const domainManagerI18n = new DomainManagerI18n();