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

  applyTranslations() {
    // 设置页面标题
    document.title = this.t('extension_name');

    // 主题按钮和重置按钮
    const themeToggleBtn = document.querySelector('#themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.title = this.t('theme_toggle');
    }

    const resetBtn = document.querySelector('#resetBtn');
    if (resetBtn) {
      resetBtn.title = this.t('reset_accept_language_tooltip');
    }

    const resetBtnImg = document.querySelector('#resetBtnImg');
    if (resetBtnImg) {
      resetBtnImg.alt = this.t('reset_accept_language_tooltip');
    }

    // 请求头设置
    const extensionName = document.querySelector('#extensionName');
    if (extensionName) {
      extensionName.textContent = this.t('extension_name');
    }

    const extensionSubtitle = document.querySelector('#extensionSubtitle');
    if (extensionSubtitle) {
      extensionSubtitle.textContent = this.t('subtitle');
    }

    // 语言选择
    const languageSelectLabel = document.querySelector('#languageSelectLabel');
    if (languageSelectLabel) {
      languageSelectLabel.textContent = this.t('select_language');
    }

    const applyButton = document.querySelector('#applyButton');
    if (applyButton) {
      applyButton.textContent = this.t('apply_changes');
    }

    // 状态
    const currentLangSpan = document.querySelector('#currentLanguage');
    const currentLangText = currentLangSpan ? currentLangSpan.textContent : '';
    const shouldKeepCurrent = currentLangText && currentLangText !== '未设置' && currentLangText !== 'Not Set';

    const statusText = document.querySelector('#statusText');
    if (statusText) {
      statusText.innerHTML = `${this.t('current_language')} <span id="currentLanguage">${shouldKeepCurrent ? currentLangText : this.t('not_set')}</span>`;
    }

    // Auto switch section
    const autoSwitchLabel = document.querySelector('#autoSwitchLabel');
    if (autoSwitchLabel) {
      autoSwitchLabel.textContent = this.t('auto_switch');
    }

    // Function buttons section
    const detectionPageLink = document.querySelector('#detectionPageLink');
    if (detectionPageLink) {
      detectionPageLink.textContent = this.t('detection_page');
    }

    const debugPageLink = document.querySelector('#debugPageLink');
    if (debugPageLink) {
      debugPageLink.textContent = this.t('debug_tools');
    }

    const checkHeaderBtn = document.querySelector('#checkHeaderBtn');
    if (checkHeaderBtn) {
      checkHeaderBtn.textContent = this.t('quick_check');
    }

    // Header check result section
    const headerCheckResultTitle = document.querySelector('#headerCheckResultTitle');
    if (headerCheckResultTitle) {
      headerCheckResultTitle.textContent = this.t('header_check_result');
    }

    const headerCheckContent = document.querySelector('#headerCheckContent');
    if (headerCheckContent) {
      headerCheckContent.textContent = this.t('click_quick_check');
    }

    // 添加更新按钮的翻译
    const updateCheckText = document.querySelector('#updateCheckText');
    if (updateCheckText) {
      updateCheckText.textContent = this.t('check_for_updates');
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