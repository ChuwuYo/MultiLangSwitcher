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

  async _loadRulesFromFile() {
    try {
      const url = chrome.runtime.getURL('domain-rules.json');
      const i18n = this.ensureI18n();
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('trying_load_rules_file') : 'Trying to load rules file'}:`, url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('rules_file_loaded_success') : 'Rules file loaded successfully'}:`, Object.keys(data));

      if (data.domainLanguageRules) {
        this.rules = data.domainLanguageRules;
        console.log(`[DomainRulesManager] ${i18n ? i18n.t('domain_rules_loaded_count', { count: Object.keys(this.rules).length }) : `Successfully loaded ${Object.keys(this.rules).length} domain rules`}`);
      } else {
        console.warn(`[DomainRulesManager] ${i18n ? i18n.t('domain_rules_field_not_found') : 'domainLanguageRules field not found in rules file'}`);
        this.rules = {};
      }

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

  // 根据域名获取语言
  async getLanguageForDomain(domain) {
    const i18n = this.ensureI18n();
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('searching_domain') : 'Searching domain'}: ${domain}`);

    // 确保规则已加载
    if (!this.rules) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('rules_not_loaded_loading') : 'Rules not loaded, loading now...'}`);
      await this.loadRules();
    }

    if (!this.rules) {
      console.warn(`[DomainRulesManager] ${i18n ? i18n.t('loading_rules_failed') : 'Loading rules failed'}`);
      return null;
    }

    console.log(`[DomainRulesManager] ${i18n ? i18n.t('loaded_rules_count', { count: Object.keys(this.rules).length }) : `Loaded ${Object.keys(this.rules).length} rules`}`);

    // 优先检查自定义规则
    const customRules = await this.getCustomRules();
    if (customRules[domain]) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_custom_rules') : 'Found in custom rules'}: ${domain} -> ${customRules[domain]}`);
      return customRules[domain];
    }

    // 检查完整域名
    if (this.rules[domain]) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_full_domain') : 'Found in full domain'}: ${domain} -> ${this.rules[domain]}`);
      return this.rules[domain];
    }

    // 检查二级域名
    const parts = domain.split('.');
    if (parts.length >= 2) {
      const secondLevel = parts.slice(-2).join('.');
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('checking_second_level') : 'Checking second-level domain'}: ${secondLevel}`);
      if (customRules[secondLevel] || this.rules[secondLevel]) {
        const result = customRules[secondLevel] || this.rules[secondLevel];
        console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_second_level') : 'Found in second-level domain'}: ${secondLevel} -> ${result}`);
        return result;
      }
    }

    // 检查顶级域名
    const topLevel = parts[parts.length - 1];
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('checking_top_level') : 'Checking top-level domain'}: ${topLevel}`);
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('available_top_level_rules') : 'Available top-level domain rules'}:`, Object.keys(this.rules).filter(k => !k.includes('.')).slice(0, 10));
    if (customRules[topLevel] || this.rules[topLevel]) {
      const result = customRules[topLevel] || this.rules[topLevel];
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_top_level') : 'Found in top-level domain'}: ${topLevel} -> ${result}`);
      return result;
    }

    console.log(`[DomainRulesManager] ${i18n ? i18n.t('no_matching_rule_found') : 'No matching rule found for domain'}: ${domain}`);
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('domain_parse_result') : 'Domain parse result - Full'}: ${domain}, ${i18n ? i18n.t('second_level') : 'Second-level'}: ${parts.length >= 2 ? parts.slice(-2).join('.') : 'N/A'}, ${i18n ? i18n.t('top_level') : 'Top-level'}: ${topLevel}`);
    return null;
  }

  // 获取自定义规则
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

  // 获取规则统计信息（用于调试）
  getRulesStats() {
    const rules = this.getRules();
    const stats = {
      totalRules: Object.keys(rules || {}).length,
      languageDistribution: {}
    };

    if (rules && typeof rules === 'object') {
      Object.values(rules).forEach(lang => {
        if (lang) {
          stats.languageDistribution[lang] = (stats.languageDistribution[lang] || 0) + 1;
        }
      });
    }

    return stats;
  }
}

// 导出单例实例
const domainRulesManager = new DomainRulesManager();