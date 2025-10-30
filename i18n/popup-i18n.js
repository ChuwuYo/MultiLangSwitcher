// 引入基础国际化类
// 注意：在HTML中需要先加载 shared/shared-i18n-base.js

/**
 * 弹窗页面国际化类
 * 继承基础国际化类，专门用于popup页面
 */
class PopupI18n extends BaseI18n {
  constructor() {
    super('popup', false); // 标记为浏览器环境
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
      // 使用安全的DOM操作替代innerHTML
      statusText.textContent = this.t('current_language');
      const span = document.createElement('span');
      span.id = 'currentLanguage';
      span.textContent = shouldKeepCurrent ? currentLangText : this.t('not_set');
      statusText.appendChild(span);
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
}

// 创建全局实例
const popupI18n = new PopupI18n();

// DOM加载完成后，初始化并应用翻译
document.addEventListener('DOMContentLoaded', () => {
  popupI18n.applyTranslationsToDOM();
});