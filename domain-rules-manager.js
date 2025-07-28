// 域名规则管理器
class DomainRulesManager {
  constructor() {
    this.rules = null;
    this.loadPromise = null;
    this.i18n = null; // 延迟初始化
  }

  // 确保 i18n 已初始化
  ensureI18n() {
    if (!this.i18n && typeof domainManagerI18n !== 'undefined') {
      this.i18n = domainManagerI18n;
    }
    return this.i18n;
  }

  // 加载规则数据
  async loadRules() {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._loadRulesFromFile();
    return this.loadPromise;
  }

  /**
   * 从文件加载规则数据
   * @returns {Promise<Object>} 规则数据
   * @private
   */
  async _loadRulesFromFile() {
    const i18n = this.ensureI18n();

    try {
      const url = chrome.runtime.getURL('domain-rules.json');
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('trying_load_rules_file') : 'Trying to load rules file'}:`, url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('rules_file_loaded_success') : 'Rules file loaded successfully'}:`, Object.keys(data));

      if (!data.domainLanguageRules) {
        console.warn(`[DomainRulesManager] ${i18n ? i18n.t('domain_rules_field_not_found') : 'domainLanguageRules field not found in rules file'}`);
        this.rules = {};
        return this.rules;
      }

      this.rules = data.domainLanguageRules;
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('domain_rules_loaded_count', { count: Object.keys(this.rules).length }) : `Successfully loaded ${Object.keys(this.rules).length} domain rules`}`);
      return this.rules;

    } catch (error) {
      console.error(`[DomainRulesManager] ${i18n ? i18n.t('domain_rules_load_failed') : 'Failed to load domain rules'}:`, error);
      this.rules = {};
      return this.rules;
    }
  }

  // 获取规则数据
  getRules() {
    if (!this.rules) {
      const i18n = this.ensureI18n();
      console.warn(`[DomainRulesManager] ${i18n ? i18n.t('rules_not_loaded_empty_object') : 'Rules not loaded yet, returning empty object'}`);
      return {};
    }
    return this.rules;
  }

  /**
   * 根据域名获取对应的语言
   * @param {string} domain - 域名
   * @returns {Promise<string|null>} 语言代码或null
   */
  async getLanguageForDomain(domain) {
    const i18n = this.ensureI18n();
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('searching_domain') : 'Searching domain'}: ${domain}`);

    // 确保规则已加载
    await this._ensureRulesLoaded();
    if (!this.rules) {
      console.warn(`[DomainRulesManager] ${i18n ? i18n.t('loading_rules_failed') : 'Loading rules failed'}`);
      return null;
    }

    console.log(`[DomainRulesManager] ${i18n ? i18n.t('loaded_rules_count', { count: Object.keys(this.rules).length }) : `Loaded ${Object.keys(this.rules).length} rules`}`);

    // 获取自定义规则
    const customRules = await this.getCustomRules();

    // 按优先级检查规则：自定义完整域名 > 内置完整域名 > 自定义二级域名 > 内置二级域名 > 自定义顶级域名 > 内置顶级域名
    const result = this._findMatchingRule(domain, customRules, this.rules);

    if (result) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_matching_rule') : 'Found matching rule'}: ${domain} -> ${result.language} (${result.source})`);
      return result.language;
    }

    this._logNoMatchFound(domain, i18n);
    return null;
  }

  /**
   * 确保规则已加载
   * @private
   */
  async _ensureRulesLoaded() {
    if (!this.rules) {
      const i18n = this.ensureI18n();
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('rules_not_loaded_loading') : 'Rules not loaded, loading now...'}`);
      await this.loadRules();
    }
  }

  /**
   * 查找匹配的规则
   * @param {string} domain - 域名
   * @param {Object} customRules - 自定义规则
   * @param {Object} defaultRules - 默认规则
   * @returns {Object|null} 匹配结果 {language, source} 或 null
   * @private
   */
  _findMatchingRule(domain, customRules, defaultRules) {
    const i18n = this.ensureI18n();

    // 检查完整域名
    if (customRules[domain]) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_custom_rules') : 'Found in custom rules'}: ${domain}`);
      return { language: customRules[domain], source: 'custom-full' };
    }

    if (defaultRules[domain]) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_full_domain') : 'Found in full domain'}: ${domain}`);
      return { language: defaultRules[domain], source: 'default-full' };
    }

    // 解析域名部分
    const parts = domain.split('.');
    if (parts.length < 2) {
      return null; // 无效域名
    }

    // 检查二级域名
    const secondLevel = parts.slice(-2).join('.');
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('checking_second_level') : 'Checking second-level domain'}: ${secondLevel}`);

    if (customRules[secondLevel]) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_second_level') : 'Found in second-level domain'}: ${secondLevel}`);
      return { language: customRules[secondLevel], source: 'custom-second' };
    }

    if (defaultRules[secondLevel]) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_second_level') : 'Found in second-level domain'}: ${secondLevel}`);
      return { language: defaultRules[secondLevel], source: 'default-second' };
    }

    // 检查顶级域名
    const topLevel = parts[parts.length - 1];
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('checking_top_level') : 'Checking top-level domain'}: ${topLevel}`);
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('available_top_level_rules') : 'Available top-level domain rules'}:`, Object.keys(defaultRules).filter(k => !k.includes('.')).slice(0, 10));

    if (customRules[topLevel]) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_top_level') : 'Found in top-level domain'}: ${topLevel}`);
      return { language: customRules[topLevel], source: 'custom-top' };
    }

    if (defaultRules[topLevel]) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_top_level') : 'Found in top-level domain'}: ${topLevel}`);
      return { language: defaultRules[topLevel], source: 'default-top' };
    }

    return null;
  }

  /**
   * 记录未找到匹配规则的日志
   * @param {string} domain - 域名
   * @param {Object} i18n - 国际化实例
   * @private
   */
  _logNoMatchFound(domain, i18n) {
    const parts = domain.split('.');
    const secondLevel = parts.length >= 2 ? parts.slice(-2).join('.') : 'N/A';
    const topLevel = parts[parts.length - 1];

    console.log(`[DomainRulesManager] ${i18n ? i18n.t('no_matching_rule_found') : 'No matching rule found for domain'}: ${domain}`);
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('domain_parse_result') : 'Domain parse result - Full'}: ${domain}, ${i18n ? i18n.t('second_level') : 'Second-level'}: ${secondLevel}, ${i18n ? i18n.t('top_level') : 'Top-level'}: ${topLevel}`);
  }

  /**
   * 获取自定义规则
   * @returns {Promise<Object>} 自定义规则对象
   */
  async getCustomRules() {
    try {
      const result = await chrome.storage.local.get(['customDomainRules']);
      return result.customDomainRules || {};
    } catch (error) {
      const i18n = this.ensureI18n();
      console.error(`${i18n ? i18n.t('failed_get_custom_rules') : 'Failed to get custom rules'}:`, error);
      return {};
    }
  }

  /**
   * 获取规则统计信息（用于调试）
   * @returns {Object} 统计信息对象
   */
  getRulesStats() {
    const rules = this.getRules();
    const stats = {
      totalRules: Object.keys(rules || {}).length,
      languageDistribution: {}
    };

    if (!rules || typeof rules !== 'object') {
      return stats;
    }

    Object.values(rules).forEach(lang => {
      if (lang) {
        stats.languageDistribution[lang] = (stats.languageDistribution[lang] || 0) + 1;
      }
    });

    return stats;
  }
}

// 导出单例实例
const domainRulesManager = new DomainRulesManager();