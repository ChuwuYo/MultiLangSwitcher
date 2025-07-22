class TestI18n {
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
      script.src = `i18n/test-${this.currentLang}.js`;
      document.head.appendChild(script);
      
      await new Promise(resolve => {
        script.onload = resolve;
      });
      
      this.translations = this.currentLang === 'zh' ? testZh : testEn;
      this.applyTranslations();
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }

  t(key) {
    return this.translations[key] || key;
  }

  applyTranslations() {
    // 设置页面标题和基本信息
    document.title = this.t('title');
    
    // 主题切换按钮
    const themeToggleBtn = document.querySelector('#themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.title = this.t('theme_toggle');
    }
    
    // 页面标题和副标题
    const pageHeading = document.querySelector('#pageHeading');
    if (pageHeading) {
      pageHeading.textContent = this.t('heading');
    }
    
    const pageSubtitle = document.querySelector('#pageSubtitle');
    if (pageSubtitle) {
      pageSubtitle.textContent = this.t('subtitle');
    }
    
    // 提示信息
    const tipLabel = document.querySelector('#tipLabel');
    if (tipLabel) {
      tipLabel.textContent = this.currentLang === 'zh' ? '提示' : 'Tip:';
    }
    
    const tipText = document.querySelector('#tipText');
    if (tipText) {
      tipText.innerHTML = this.t('tip');
    }
    
    // 卡片标题
    const requestHeaderTitle = document.querySelector('#requestHeaderTitle');
    if (requestHeaderTitle) {
      requestHeaderTitle.textContent = this.t('request_header');
    }
    
    const jsLanguageTitle = document.querySelector('#jsLanguageTitle');
    if (jsLanguageTitle) {
      jsLanguageTitle.textContent = this.t('js_language');
    }
    
    const intlApiTitle = document.querySelector('#intlApiTitle');
    if (intlApiTitle) {
      intlApiTitle.textContent = this.t('intl_api');
    }
    
    const webRtcTitle = document.querySelector('#webRtcTitle');
    if (webRtcTitle) {
      webRtcTitle.textContent = this.t('webrtc_detection');
    }
    
    const browserFingerprintTitle = document.querySelector('#browserFingerprintTitle');
    if (browserFingerprintTitle) {
      browserFingerprintTitle.textContent = this.t('browser_fingerprint');
    }
    
    const browserCompatibilityTitle = document.querySelector('#browserCompatibilityTitle');
    if (browserCompatibilityTitle) {
      browserCompatibilityTitle.textContent = this.t('browser_compatibility');
    }
    
    const hardwareFingerprintTitle = document.querySelector('#hardwareFingerprintTitle');
    if (hardwareFingerprintTitle) {
      hardwareFingerprintTitle.textContent = this.t('hardware_fingerprint');
    }
    
    const canvasFingerprintTitle = document.querySelector('#canvasFingerprintTitle');
    if (canvasFingerprintTitle) {
      canvasFingerprintTitle.textContent = this.t('canvas_fingerprint');
    }
    
    const webglFingerprintTitle = document.querySelector('#webglFingerprintTitle');
    if (webglFingerprintTitle) {
      webglFingerprintTitle.textContent = this.t('webgl_fingerprint');
    }
    
    const audioFingerprintTitle = document.querySelector('#audioFingerprintTitle');
    if (audioFingerprintTitle) {
      audioFingerprintTitle.textContent = this.t('audio_fingerprint');
    }
    
    // 浏览器信息
    const browserInfoLabel = document.querySelector('#browserInfoLabel');
    if (browserInfoLabel) {
      browserInfoLabel.textContent = this.t('browser_info');
    }
    
    const apiSupportTitle = document.querySelector('#apiSupportTitle');
    if (apiSupportTitle) {
      apiSupportTitle.textContent = this.t('api_support');
    }
    
    // 完整请求头信息
    const completeHeadersTitle = document.querySelector('#completeHeadersTitle');
    if (completeHeadersTitle) {
      completeHeadersTitle.textContent = this.t('complete_headers');
    }
    
    // 处理所有检测中文本
    const infoElements = [
      '#headerLanguageInfo',
      '#jsLanguageInfo',
      '#intlApiInfo',
      '#webRtcInfo',
      '#fingerprintInfo',
      '#browserInfoDisplay',
      '#canvasFingerprintInfo',
      '#webglFingerprintInfo',
      '#audioFingerprintInfo'
    ];
    
    infoElements.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {
        el.textContent = this.t('detecting');
      }
    });
    
    // 处理检测列表项
    const detectingItem = document.querySelector('#detectingItem');
    if (detectingItem) {
      detectingItem.textContent = this.t('detecting');
    }
    
    // 处理加载中文本
    const headerInfo = document.querySelector('#headerInfo');
    if (headerInfo) {
      headerInfo.textContent = this.t('loading');
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

const testI18n = new TestI18n();