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
      
      // 确保 DOM 完全加载后再应用翻译
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.applyTranslations());
      } else {
        this.applyTranslations();
      }
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
    document.querySelector('.alert-info').innerHTML = `<strong>${this.t('tip_label')}</strong> ${this.t('tip')}`;
    
    // 处理所有section标题和描述
    const sections = [
      { h4: 'Current Rules Information', p: 'Shows the dynamic rules currently in effect by the extension and details of recently matched rules.', keys: ['current_rules', 'current_rules_desc'] },
      { h4: 'Request Header Test', p: 'Send a request to the test address to check if the Accept-Language header is set as expected.', keys: ['header_test', 'header_test_desc'] },
      { h4: 'Custom Language Preference', p: 'Enter a complete Accept-Language string, such as "en-US,en;q=0.9,fr;q=0.8".', keys: ['custom_language', 'custom_language_desc'] },
      { h4: 'Accept-Language Format Explanation', p: 'Understand the structure of the Accept-Language request header.', keys: ['format_explanation', 'format_explanation_desc'] },
      { h4: 'Live Logs', p: 'Shows log messages sent by the extension at runtime to help track issues.', keys: ['live_logs', 'live_logs_desc'] },
      { h4: 'Common Problem Fixes', p: 'Try to automatically fix some common configuration issues.', keys: ['common_fixes', 'common_fixes_desc'] },
      { h4: 'Extension Diagnostic Information', p: 'Shows basic information, permissions, and configuration of the extension.', keys: ['diagnostics', 'diagnostics_desc'] },
      { h4: 'Auto Switch Feature', p: 'Control the feature to automatically switch language by domain. (May detect incorrectly)', keys: ['auto_switch_feature', 'auto_switch_desc'] }
    ];
    
    const sectionElements = document.querySelectorAll('.debug-section');
    sectionElements.forEach((section, index) => {
      if (sections[index]) {
        const h4 = section.querySelector('h4');
        const p = section.querySelector('p.text-muted');
        if (h4) h4.textContent = this.t(sections[index].keys[0]);
        if (p) p.textContent = this.t(sections[index].keys[1]);
      }
    });

    // 处理按钮文本
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
    
    // 处理标签文本
    const labels = {
      'label[for="testLanguage"]': 'test_language_label',
      'label[for="customLanguageInput"]': 'custom_language_label',
      'label[for="filterInfo"]': 'info',
      'label[for="filterWarning"]': 'warning', 
      'label[for="filterError"]': 'error',
      'label[for="filterSuccess"]': 'success',
      'label[for="autoSwitchToggle"]': 'enable_auto_switch'
    };
    
    Object.entries(labels).forEach(([selector, key]) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = this.t(key);
    });
    
    // 处理占位符文本
    const placeholder = document.querySelector('#customLanguageInput');
    if (placeholder) placeholder.placeholder = this.t('custom_language_placeholder');
    
    // 处理初始显示文本
    const initialTexts = {
      '#rulesResult': 'click_view_rules',
      '#headerTestResult': 'click_test_header',
      '#fixResult': 'select_fix_option',
      '#diagnosticsResult': 'click_view_diagnostics',
      '#domainRulesResult': 'click_view_domain_rules'
    };
    
    Object.entries(initialTexts).forEach(([selector, key]) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = this.t(key);
    });
    
    // 处理修复选项按钮
    const fixButtons = document.querySelectorAll('.list-group-item');
    if (fixButtons.length >= 2) {
      fixButtons[0].innerHTML = `<strong>${this.t('fix_priority')}</strong> - ${this.t('fix_priority_desc')}`;
      fixButtons[1].innerHTML = `<strong>${this.t('clear_reapply')}</strong> - ${this.t('clear_reapply_desc')}`;
    }
    
    // 延迟处理Accept-Language格式说明，确保 DOM 完全加载
    setTimeout(() => {
      const formatSections = document.querySelectorAll('.debug-section');
      let formatSection = null;
      formatSections.forEach(section => {
        const h4 = section.querySelector('h4');
        if (h4 && (h4.textContent.includes('Accept-Language Format') || h4.textContent.includes('Accept-Language 格式'))) {
          formatSection = section;
        }
      });
      
      if (formatSection) {
        // 处理所有段落
        const paragraphs = formatSection.querySelectorAll('p');
        paragraphs.forEach(p => {
          const text = p.textContent || p.innerHTML;
          if (text.includes('Basic Format') || text.includes('基本格式')) {
            p.innerHTML = `<strong>${this.t('basic_format')}</strong>`;
          } else if (text.includes('Examples') || text.includes('示例')) {
            p.innerHTML = `<strong>${this.t('examples')}</strong>`;
          } else if (p.classList.contains('small') || text.includes('Please follow this format') || text.includes('请按照此格式')) {
            p.textContent = this.t('format_note');
          }
        });
        
        // 处理列表
        const allLists = formatSection.querySelectorAll('ul');
        if (allLists.length >= 2) {
          // 第一个列表：格式说明
          const formatList = allLists[0].querySelectorAll('li');
          if (formatList.length >= 3) {
            formatList[0].innerHTML = `<code>${this.t('language_code')}</code> (${this.t('required')}): ${this.t('language_code_required')}`;
            formatList[1].innerHTML = `<code>-${this.t('region_code')}</code> (${this.t('optional')}): ${this.t('region_code_optional')}`;
            formatList[2].innerHTML = `<code>;q=${this.t('quality_value')}</code> (${this.t('optional')}): ${this.t('quality_value_optional')}`;
          }
          
          // 第二个列表：示例
          const exampleList = allLists[1].querySelectorAll('li');
          if (exampleList.length >= 4) {
            exampleList[0].innerHTML = `<code>en-US</code>: ${this.t('example_en_us')}`;
            exampleList[1].innerHTML = `<code>zh-CN</code>: ${this.t('example_zh_cn')}`;
            exampleList[2].innerHTML = `<code>fr</code>: ${this.t('example_fr')}`;
            exampleList[3].innerHTML = `<code>en-US,en;q=0.9,zh-CN;q=0.8</code>: ${this.t('example_complex')}`;
          }
        }
      }
    }, 200);
  }

  switchLanguage(lang) {
    if (lang !== this.currentLang) {
      this.currentLang = lang;
      localStorage.setItem('app-lang', lang);
      location.reload();
    }
  }


}

const debugI18n = new DebugI18n();

// 确保在 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 如果翻译已经加载但未应用，再次应用
  if (debugI18n.translations && Object.keys(debugI18n.translations).length > 0) {
    debugI18n.applyTranslations();
  }
});