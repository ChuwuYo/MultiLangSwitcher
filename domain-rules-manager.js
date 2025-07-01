// 域名规则管理器
class DomainRulesManager {
  constructor() {
    this.rules = null;
    this.loadPromise = null;
    this.i18n = null;
    this.initI18n();
  }

  async initI18n() {
    if (typeof domainRulesManagerI18n !== 'undefined') {
      this.i18n = domainRulesManagerI18n;
      await this.i18n.loadTranslations();
    }
  }

  t(key, params = {}) {
    return this.i18n ? this.i18n.t(key, params) : key;
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
      console.log(`[DomainRulesManager] ${this.t('loading_rules_file')}`, url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[DomainRulesManager] ${this.t('rules_loaded_successfully')}`, Object.keys(data));
      
      if (data.domainLanguageRules) {
        this.rules = data.domainLanguageRules;
        console.log(`[DomainRulesManager] ${this.t('rules_count_loaded', {count: Object.keys(this.rules).length})}`);
      } else {
        console.warn(`[DomainRulesManager] ${this.t('rules_field_not_found')}`);
        this.rules = {};
      }
      
      return this.rules;
    } catch (error) {
      console.error(`[DomainRulesManager] ${this.t('loading_rules_failed')}`, error);
      this.rules = {};
      return this.rules;
    }
  }

  // 获取规则数据
  getRules() {
    if (!this.rules) {
      console.warn(`[DomainRulesManager] ${this.t('rules_not_loaded')}`);
      return {};
    }
    return this.rules;
  }

  // 根据域名获取语言
  async getLanguageForDomain(domain) {
    console.log(`[DomainRulesManager] ${this.t('searching_domain', {domain})}`);
    
    // 确保规则已加载
    if (!this.rules) {
      console.log(`[DomainRulesManager] ${this.t('rules_not_loaded_loading')}`);
      await this.loadRules();
    }
    
    if (!this.rules) {
      console.warn(`[DomainRulesManager] ${this.t('loading_rules_failed_warn')}`);
      return null;
    }

    console.log(`[DomainRulesManager] ${this.t('loaded_rules_count', {count: Object.keys(this.rules).length})}`);

    // 优先检查自定义规则
    const customRules = await this.getCustomRules();
    if (customRules[domain]) {
      console.log(`[DomainRulesManager] ${this.t('found_in_custom_rules', {domain, language: customRules[domain]})}`);
      return customRules[domain];
    }

    // 检查完整域名
    if (this.rules[domain]) {
      console.log(`[DomainRulesManager] ${this.t('found_in_full_domain', {domain, language: this.rules[domain]})}`);
      return this.rules[domain];
    }

    // 检查二级域名
    const parts = domain.split('.');
    if (parts.length >= 2) {
      const secondLevel = parts.slice(-2).join('.');
      console.log(`[DomainRulesManager] ${this.t('checking_second_level', {domain: secondLevel})}`);
      if (customRules[secondLevel] || this.rules[secondLevel]) {
        const result = customRules[secondLevel] || this.rules[secondLevel];
        console.log(`[DomainRulesManager] ${this.t('found_in_second_level', {domain: secondLevel, language: result})}`);
        return result;
      }
    }

    // 检查顶级域名
    const topLevel = parts[parts.length - 1];
    console.log(`[DomainRulesManager] ${this.t('checking_top_level', {domain: topLevel})}`);
    console.log(`[DomainRulesManager] ${this.t('available_top_level_rules')}`, Object.keys(this.rules).filter(k => !k.includes('.')).slice(0, 10));
    if (customRules[topLevel] || this.rules[topLevel]) {
      const result = customRules[topLevel] || this.rules[topLevel];
      console.log(`[DomainRulesManager] ${this.t('found_in_top_level', {domain: topLevel, language: result})}`);
      return result;
    }

    console.log(`[DomainRulesManager] ${this.t('no_matching_rules', {domain})}`);
    console.log(`[DomainRulesManager] ${this.t('domain_parsing_result', {full: domain, second: parts.length >= 2 ? parts.slice(-2).join('.') : 'N/A', top: topLevel})}`);
    return null;
  }

  // 获取自定义规则
  async getCustomRules() {
    try {
      const result = await chrome.storage.local.get(['customDomainRules']);
      return result.customDomainRules || {};
    } catch (error) {
      console.error(`${this.t('failed_to_get_custom_rules')}`, error);
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