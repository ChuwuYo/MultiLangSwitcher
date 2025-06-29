class PopupI18n {
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
      const script1 = document.createElement('script');
      script1.src = `i18n/popup-${this.currentLang}.js`;
      document.head.appendChild(script1);
      
      await new Promise(resolve => {
        script1.onload = resolve;
      });
      
      this.translations = this.currentLang === 'zh' ? popupZh : popupEn;
      this.applyTranslations();
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }

  t(key) {
    return this.translations[key] || key;
  }

  applyTranslations() {
    document.title = this.t('extension_name');
    document.querySelector('#themeToggleBtn').title = this.t('theme_toggle');
    document.querySelector('h4').textContent = this.t('extension_name');
    document.querySelector('.text-muted').textContent = this.t('subtitle');
    document.querySelector('label[for="languageSelect"]').textContent = this.t('select_language');
    document.querySelector('#applyButton').textContent = this.t('apply_changes');
    
    const currentLangSpan = document.querySelector('#currentLanguage');
    const currentLangText = currentLangSpan ? currentLangSpan.textContent : '';
    const shouldKeepCurrent = currentLangText && currentLangText !== '未设置' && currentLangText !== 'Not Set';
    
    document.querySelector('#statusText').innerHTML = `${this.t('current_language')} <span id="currentLanguage">${shouldKeepCurrent ? currentLangText : this.t('not_set')}</span>`;
    
    document.querySelector('label[for="autoSwitchToggle"]').textContent = this.t('auto_switch');
    document.querySelector('a[href="test-headers.html"]').textContent = this.t('detection_page');
    document.querySelector('a[href="debug.html"]').textContent = this.t('debug_tools');
    document.querySelector('#checkHeaderBtn').textContent = this.t('quick_check');
    document.querySelector('.card-header').textContent = this.t('header_check_result');
    document.querySelector('#headerCheckContent').textContent = this.t('click_quick_check');
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
    langBtn.className = 'toggle';
    langBtn.style.left = '10px';
    langBtn.title = this.currentLang === 'zh' ? '切换到English' : 'Switch to 中文';
    langBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>`;
    
    document.body.appendChild(langBtn);
    
    langBtn.addEventListener('click', () => {
      this.switchLanguage(this.currentLang === 'zh' ? 'en' : 'zh');
    });
  }
}

const popupI18n = new PopupI18n();
document.addEventListener('DOMContentLoaded', () => {
  popupI18n.addLanguageSelector();
});