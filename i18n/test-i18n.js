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
    document.title = this.t('title');
    document.querySelector('h2').textContent = this.t('heading');
    document.querySelector('.lead').textContent = this.t('subtitle');
    document.querySelector('.alert-info').innerHTML = `<strong>${this.currentLang === 'zh' ? '提示' : 'Tip'}：</strong> ${this.t('tip')}`;
    
    const cardHeaders = document.querySelectorAll('.card-header');
    const headerTexts = ['request_header', 'js_language', 'intl_api', 'webrtc_detection', 'browser_fingerprint', 'browser_compatibility', 'hardware_fingerprint', 'canvas_fingerprint', 'webgl_fingerprint', 'audio_fingerprint'];
    cardHeaders.forEach((header, index) => {
      if (headerTexts[index] && !header.dataset.translated) {
        header.textContent = this.t(headerTexts[index]);
        header.dataset.translated = 'true';
      }
    });
    
    // 处理其他固定文本
    const browserInfoLabel = document.querySelector('p strong');
    if (browserInfoLabel && !browserInfoLabel.dataset.translated) {
      browserInfoLabel.textContent = this.t('browser_info');
      browserInfoLabel.dataset.translated = 'true';
    }
    
    const apiSupportH5 = document.querySelector('h5');
    if (apiSupportH5 && !apiSupportH5.dataset.translated) {
      apiSupportH5.textContent = this.t('api_support');
      apiSupportH5.dataset.translated = 'true';
    }
    
    // 处理检测中文本
    document.querySelectorAll('[id$="Info"]:not([data-translated])').forEach(el => {
      if (el.textContent === '检测中...') {
        el.textContent = this.t('detecting');
        el.dataset.translated = 'true';
      }
    });
    
    const detectingItems = document.querySelectorAll('.list-group-item');
    detectingItems.forEach(item => {
      if (item.textContent === '检测中...' && !item.dataset.translated) {
        item.textContent = this.t('detecting');
        item.dataset.translated = 'true';
      }
    });

    const h4Element = document.querySelector('h4');
    if (h4Element && !h4Element.dataset.translated) {
      h4Element.textContent = this.t('complete_headers');
      h4Element.dataset.translated = 'true';
    }
    
    const preElement = document.querySelector('#headerInfo');
    if (preElement && preElement.textContent === '加载中...' && !preElement.dataset.translated) {
      preElement.textContent = this.t('loading');
      preElement.dataset.translated = 'true';
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