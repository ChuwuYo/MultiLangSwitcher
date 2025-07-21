class PopupI18n {
  constructor() {
    this.currentLang = this.detectLanguage();
    this.translations = {};
    this.isReady = false;
    this.readyCallbacks = [];
  }

  detectLanguage() {
    const saved = localStorage.getItem('app-lang');
    if (saved) return saved;
    return navigator.language.startsWith('zh') ? 'zh' : 'en';
  }

  async loadTranslations() {
    try {
      // 预加载翻译文件，避免动态创建script标签的延迟
      if (this.currentLang === 'zh' && typeof popupZh !== 'undefined') {
        this.translations = popupZh;
      } else if (this.currentLang === 'en' && typeof popupEn !== 'undefined') {
        this.translations = popupEn;
      } else {
        // 回退到动态加载
        const script = document.createElement('script');
        script.src = `i18n/popup-${this.currentLang}.js`;
        document.head.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          // 添加超时处理
          setTimeout(() => reject(new Error('Translation loading timeout')), 3000);
        });

        this.translations = this.currentLang === 'zh' ? popupZh : popupEn;
      }

      this.isReady = true;
      this.applyTranslations();

      // 执行等待的回调
      this.readyCallbacks.forEach(callback => callback());
      this.readyCallbacks = [];

    } catch (error) {
      console.error('Failed to load translations:', error);
      // 使用英文作为回退
      this.translations = typeof popupEn !== 'undefined' ? popupEn : {};
      this.isReady = true;
      this.readyCallbacks.forEach(callback => callback());
      this.readyCallbacks = [];
    }
  }

  // 添加ready方法，确保翻译加载完成后再执行操作
  ready(callback) {
    if (this.isReady) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
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

    // 添加更新按钮的翻译
    const updateCheckText = document.querySelector('#updateCheckText');
    if (updateCheckText) {
      updateCheckText.textContent = this.t('check_for_updates');
    }

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

// 立即初始化并加载翻译
const popupI18n = new PopupI18n();
// 立即开始加载翻译，不等待
popupI18n.loadTranslations();