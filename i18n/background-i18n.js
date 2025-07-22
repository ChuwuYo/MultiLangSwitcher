class BackgroundI18n {
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
      // 使用同步方式检测语言
      if (typeof detectBrowserLanguage === 'function') {
        const detectedLang = detectBrowserLanguage();
        this.currentLang = detectedLang.startsWith('zh') ? 'zh' : 'en';
      } else {
        this.currentLang = 'en';
      }
    } catch (error) {
      this.currentLang = 'en';
    }
  }

  loadTranslations() {
    try {
      importScripts(`i18n/background-${this.currentLang}.js`);
      this.translations = this.currentLang === 'zh' ? backgroundZh : backgroundEn;
    } catch (error) {
      console.error('Failed to load background translations:', error);
      this.translations = {};
    }
  }

  t(key, params = {}) {
    let text = this.translations[key] || key;
    
    // 处理参数替换
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(param => {
        const placeholder = `{${param}}`;
        text = text.replace(new RegExp(placeholder, 'g'), params[param]);
      });
    }
    
    return text;
  }
}

const backgroundI18n = new BackgroundI18n();