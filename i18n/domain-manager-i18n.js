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
      // 使用同步方式检测语言
      if (typeof detectBrowserLanguage === 'function') {
        const detectedLang = detectBrowserLanguage();
        console.log('[DomainManagerI18n] Detected browser language:', detectedLang);
        this.currentLang = detectedLang.startsWith('zh') ? 'zh' : 'en';
        console.log('[DomainManagerI18n] Set current language to:', this.currentLang);
      } else {
        console.log('[DomainManagerI18n] detectBrowserLanguage function not available, using en');
        this.currentLang = 'en';
      }
    } catch (error) {
      console.log('[DomainManagerI18n] Error detecting language:', error);
      this.currentLang = 'en';
    }
  }

  loadTranslations() {
    try {
      importScripts(`i18n/domain-manager-${this.currentLang}.js`);
      this.translations = this.currentLang === 'zh' ? domainManagerZh : domainManagerEn;
    } catch (error) {
      console.error('Failed to load domain manager translations:', error);
      this.translations = {};
    }
  }

  t(key, params = {}) {
    let text = this.translations[key] || key;
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    return text;
  }
}

const domainManagerI18n = new DomainManagerI18n();