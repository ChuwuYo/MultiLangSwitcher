class DebugI18n {
  constructor() {
    this.currentLang = this.detectLanguage();
    this.translations = {};
    this.loadTranslations();
  }

  detectLanguage() {
    const saved = localStorage.getItem('app-lang');
    if (saved) return saved;
    return navigator.language.startsWith('zh') ? 'zh' : 'en';
  }

  async loadTranslations() {
    try {
      const script = document.createElement('script');
      script.src = `i18n/debug-${this.currentLang}.js`;
      document.head.appendChild(script);
      
      await new Promise(resolve => {
        script.onload = resolve;
      });
      
      this.translations = this.currentLang === 'zh' ? debugZh : debugEn;
      this.applyTranslations();
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }

  t(key) {
    return this.translations[key] || key;
  }

  applyTranslations() {
    document.title = this.t('title');
    document.querySelector('h2').textContent = this.t('heading');
    document.querySelector('.lead').textContent = this.t('subtitle');
    document.querySelector('.alert-info').innerHTML = `<strong>${this.currentLang === 'zh' ? '提示' : 'Tip'}：</strong> ${this.t('tip')}`;
    
    const sections = document.querySelectorAll('.debug-section h4');
    const texts = ['current_rules', 'header_test', 'custom_language', 'format_explanation', 'live_logs', 'common_fixes', 'diagnostics', 'auto_switch_feature'];
    sections.forEach((section, index) => {
      if (texts[index]) section.textContent = this.t(texts[index]);
    });

    const buttons = {
      '#showRulesBtn': 'show_rules',
      '#testHeaderBtn': 'test_header', 
      '#applyCustomLangBtn': 'apply_custom',
      '#clearLogsBtn': 'clear_logs',
      '#showDiagnosticsBtn': 'show_diagnostics',
      '#showDomainRulesBtn': 'show_domain_rules'
    };
    
    Object.entries(buttons).forEach(([selector, key]) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = this.t(key);
    });
  }

  switchLanguage(lang) {
    if (lang !== this.currentLang) {
      this.currentLang = lang;
      localStorage.setItem('app-lang', lang);
      location.reload();
    }
  }

  addLanguageSelector() {
    const langBtn = document.createElement('button');
    langBtn.id = 'langToggleBtn';
    langBtn.className = 'theme-toggle';
    langBtn.style.right = '60px';
    langBtn.title = this.currentLang === 'zh' ? '切换到English' : 'Switch to 中文';
    langBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>`;
    
    document.body.appendChild(langBtn);
    
    langBtn.addEventListener('click', () => {
      this.switchLanguage(this.currentLang === 'zh' ? 'en' : 'zh');
    });
  }
}

const debugI18n = new DebugI18n();
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => debugI18n.addLanguageSelector(), 300);
});