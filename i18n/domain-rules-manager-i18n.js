class DomainRulesManagerI18n {
  constructor() {
    this.currentLang = this.detectLanguage();
    this.translations = {};
    this.loadTranslations();
  }

  detectLanguage() {
    if (typeof chrome !== 'undefined' && chrome.i18n) {
      const browserLang = chrome.i18n.getUILanguage().toLowerCase();
      return browserLang.startsWith('zh') ? 'zh' : 'en';
    }
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('app-lang');
      if (saved) return saved;
    }
    if (typeof navigator !== 'undefined') {
      return navigator.language.startsWith('zh') ? 'zh' : 'en';
    }
    return 'en';
  }

  async loadTranslations() {
    try {
      if (typeof importScripts !== 'undefined') {
        importScripts(`i18n/domain-rules-manager-${this.currentLang}.js`);
        this.translations = this.currentLang === 'zh' ? domainRulesManagerZh : domainRulesManagerEn;
      } else {
        const script = document.createElement('script');
        script.src = `i18n/domain-rules-manager-${this.currentLang}.js`;
        document.head.appendChild(script);
        
        await new Promise(resolve => {
          script.onload = resolve;
        });
        
        this.translations = this.currentLang === 'zh' ? domainRulesManagerZh : domainRulesManagerEn;
      }
    } catch (error) {
      console.error('Failed to load domain rules manager translations:', error);
    }
  }

  t(key, params = {}) {
    let text = this.translations[key] || key;
    
    Object.keys(params).forEach(param => {
      text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
    });
    
    return text;
  }
}

const domainRulesManagerI18n = new DomainRulesManagerI18n();