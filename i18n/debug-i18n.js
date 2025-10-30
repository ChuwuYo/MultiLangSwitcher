// 引入基础国际化类
// 注意：在HTML中需要先加载 shared/shared-i18n-base.js

/**
 * 调试页面国际化类
 * 继承基础国际化类，专门用于debug页面
 */
class DebugI18n extends BaseI18n {
  constructor() {
    super('debug', false); // 标记为浏览器环境
  }

  /**
   * 初始化并应用翻译到DOM。
   */
  async applyTranslationsToDOM() {
    await this.init();
    this._applyTranslations();
  }

  /**
   * 将翻译应用到DOM元素。
   * @private
   */
  _applyTranslations() {
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
      tipLabel.textContent = this.t('tip_label');
    }
    
    const tipText = document.querySelector('#tipText');
    if (tipText) {
      tipText.textContent = this.t('tip');
    }
    
    // 当前规则信息部分
    const currentRulesTitle = document.querySelector('#currentRulesTitle');
    if (currentRulesTitle) {
      currentRulesTitle.textContent = this.t('current_rules');
    }
    
    const currentRulesDesc = document.querySelector('#currentRulesDesc');
    if (currentRulesDesc) {
      currentRulesDesc.textContent = this.t('current_rules_desc');
    }
    
    // 请求头测试部分
    const headerTestTitle = document.querySelector('#headerTestTitle');
    if (headerTestTitle) {
      headerTestTitle.textContent = this.t('header_test');
    }
    
    const headerTestDesc = document.querySelector('#headerTestDesc');
    if (headerTestDesc) {
      headerTestDesc.textContent = this.t('header_test_desc');
    }
    
    // 自定义语言部分
    const customLangTitle = document.querySelector('#customLangTitle');
    if (customLangTitle) {
      customLangTitle.textContent = this.t('custom_language');
    }
    
    const customLangDesc = document.querySelector('#customLangDesc');
    if (customLangDesc) {
      customLangDesc.textContent = this.t('custom_language_desc');
    }
    
    // Accept-Language 格式说明部分
    const formatExplanationTitle = document.querySelector('#formatExplanationTitle');
    if (formatExplanationTitle) {
      formatExplanationTitle.textContent = this.t('format_explanation');
    }
    
    const formatExplanationDesc = document.querySelector('#formatExplanationDesc');
    if (formatExplanationDesc) {
      formatExplanationDesc.textContent = this.t('format_explanation_desc');
    }
    
    // 实时日志部分
    const liveLogsTitle = document.querySelector('#liveLogsTitle');
    if (liveLogsTitle) {
      liveLogsTitle.textContent = this.t('live_logs');
    }
    
    const liveLogsDesc = document.querySelector('#liveLogsDesc');
    if (liveLogsDesc) {
      liveLogsDesc.textContent = this.t('live_logs_desc');
    }
    
    // 常见问题修复部分
    const commonFixesTitle = document.querySelector('#commonFixesTitle');
    if (commonFixesTitle) {
      commonFixesTitle.textContent = this.t('common_fixes');
    }
    
    const commonFixesDesc = document.querySelector('#commonFixesDesc');
    if (commonFixesDesc) {
      commonFixesDesc.textContent = this.t('common_fixes_desc');
    }
    
    // 扩展诊断信息部分
    const diagnosticsTitle = document.querySelector('#diagnosticsTitle');
    if (diagnosticsTitle) {
      diagnosticsTitle.textContent = this.t('diagnostics');
    }
    
    const diagnosticsDesc = document.querySelector('#diagnosticsDesc');
    if (diagnosticsDesc) {
      diagnosticsDesc.textContent = this.t('diagnostics_desc');
    }
    
    // 自动切换功能部分
    const autoSwitchTitle = document.querySelector('#autoSwitchTitle');
    if (autoSwitchTitle) {
      autoSwitchTitle.textContent = this.t('auto_switch_feature');
    }
    
    const autoSwitchDesc = document.querySelector('#autoSwitchDesc');
    if (autoSwitchDesc) {
      autoSwitchDesc.textContent = this.t('auto_switch_desc');
    }
    
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
    const testLanguageLabel = document.querySelector('#testLanguageLabel');
    if (testLanguageLabel) {
      testLanguageLabel.textContent = this.t('test_language_label');
    }
    
    const customLangInputLabel = document.querySelector('#customLangInputLabel');
    if (customLangInputLabel) {
      customLangInputLabel.textContent = this.t('custom_language_label');
    }
    
    const infoLabel = document.querySelector('#infoLabel');
    if (infoLabel) {
      infoLabel.textContent = this.t('info');
    }
    
    const warningLabel = document.querySelector('#warningLabel');
    if (warningLabel) {
      warningLabel.textContent = this.t('warning');
    }
    
    const errorLabel = document.querySelector('#errorLabel');
    if (errorLabel) {
      errorLabel.textContent = this.t('error');
    }
    
    const successLabel = document.querySelector('#successLabel');
    if (successLabel) {
      successLabel.textContent = this.t('success');
    }
    
    const enableAutoSwitchLabel = document.querySelector('#enableAutoSwitchLabel');
    if (enableAutoSwitchLabel) {
      enableAutoSwitchLabel.textContent = this.t('enable_auto_switch');
    }
    
    // 处理占位符文本
    const customLanguageInput = document.querySelector('#customLanguageInput');
    if (customLanguageInput) {
      customLanguageInput.placeholder = this.t('custom_language_placeholder');
    }
    
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
    const fixPriorityTitle = document.querySelector('#fixPriorityTitle');
    if (fixPriorityTitle) {
      fixPriorityTitle.textContent = this.t('fix_priority');
    }
    
    const fixPriorityDesc = document.querySelector('#fixPriorityDesc');
    if (fixPriorityDesc) {
      fixPriorityDesc.textContent = this.t('fix_priority_desc');
    }
    
    const clearReapplyTitle = document.querySelector('#clearReapplyTitle');
    if (clearReapplyTitle) {
      clearReapplyTitle.textContent = this.t('clear_reapply');
    }
    
    const clearReapplyDesc = document.querySelector('#clearReapplyDesc');
    if (clearReapplyDesc) {
      clearReapplyDesc.textContent = this.t('clear_reapply_desc');
    }
    
    // 处理 Accept-Language 格式说明
    const basicFormatTitle = document.querySelector('#basicFormatTitle');
    if (basicFormatTitle) {
      basicFormatTitle.textContent = this.t('basic_format');
    }
    
    const languageCodeItem = document.querySelector('#languageCodeItem');
    if (languageCodeItem) {
      languageCodeItem.innerHTML = `<code>${this.t('language_code')}</code> (${this.t('required')}): ${this.t('language_code_required')}`;
    }
    
    const regionCodeItem = document.querySelector('#regionCodeItem');
    if (regionCodeItem) {
      regionCodeItem.innerHTML = `<code>-${this.t('region_code')}</code> (${this.t('optional')}): ${this.t('region_code_optional')}`;
    }
    
    const qualityValueItem = document.querySelector('#qualityValueItem');
    if (qualityValueItem) {
      qualityValueItem.innerHTML = `<code>;q=${this.t('quality_value')}</code> (${this.t('optional')}): ${this.t('quality_value_optional')}`;
    }
    
    const examplesTitle = document.querySelector('#examplesTitle');
    if (examplesTitle) {
      examplesTitle.textContent = this.t('examples');
    }
    
    const exampleComplex = document.querySelector('#exampleComplex');
    if (exampleComplex) {
      exampleComplex.innerHTML = `<code>en-US,en;q=0.9,zh-CN;q=0.8</code>: ${this.t('example_complex')}`;
    }
    
    const formatNote = document.querySelector('#formatNote');
    if (formatNote) {
      formatNote.textContent = this.t('format_note');
    }
    
    // 重置按钮
    const resetCustomLangBtn = document.querySelector('#resetCustomLangBtn');
    if (resetCustomLangBtn) {
      resetCustomLangBtn.title = this.t('reset_accept_language_tooltip');
    }
    
    const resetBtnImg = document.querySelector('#resetBtnImg');
    if (resetBtnImg) {
      resetBtnImg.alt = this.t('reset_accept_language_tooltip');
    }
  }
}

const debugI18n = new DebugI18n();

// DOM加载完成后，初始化并应用翻译
document.addEventListener('DOMContentLoaded', () => {
  debugI18n.applyTranslationsToDOM();
});