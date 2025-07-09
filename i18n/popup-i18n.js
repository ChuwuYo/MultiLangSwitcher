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
    
    const resetBtn = document.querySelector('#resetBtn');
    if (resetBtn) {
      resetBtn.title = this.t('reset_accept_language_tooltip');
    }
  }

  switchLanguage(lang) {
    if (lang !== this.currentLang) {
      this.currentLang = lang;
      localStorage.setItem('app-lang', lang);
      location.reload();
    }
  }


}

const popupI18n = new PopupI18n();