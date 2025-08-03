// 域名规则管理器
class DomainRulesManager {
  constructor() {
    this.rules = null;
    this.loadPromise = null;
    this.i18n = null; // 延迟初始化

    // 缓存机制
    this.domainCache = new Map(); // 域名查询结果缓存
    this.parsedDomainCache = new Map(); // 域名解析结果缓存
    this.maxCacheSize = 100; // 最大缓存条目数

    // 缓存统计
    this.cacheStats = {
      domainHits: 0,
      domainMisses: 0,
      parsedHits: 0,
      parsedMisses: 0
    };

    // 预处理的规则索引
    this.rulesByLanguage = null; // 按语言分组的规则
    this.topLevelRules = null; // 顶级域名规则
    this.secondLevelRules = null; // 二级域名规则
    this.fullDomainRules = null; // 完整域名规则
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

      // 性能优化：预处理规则索引
      this._preprocessRules();

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

    // 检查域名缓存
    if (this.domainCache.has(domain)) {
      this.cacheStats.domainHits++; // 更新缓存命中统计
      const cachedResult = this.domainCache.get(domain);
      if (cachedResult) {
        console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_cache') : 'Found in cache'}: ${domain} -> ${cachedResult.language} (${cachedResult.source})`);
        return cachedResult.language;
      } else {
        console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_cache') : 'Found in cache'}: ${domain} -> null (no match)`);
        return null;
      }
    }

    this.cacheStats.domainMisses++; // 更新缓存未命中统计

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

    // 注意：缓存检查已经在 getLanguageForDomain 中完成，这里不需要重复检查

    let result = null;

    // 检查完整域名（自定义规则优先）
    if (customRules[domain]) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_custom_rules') : 'Found in custom rules'}: ${domain}`);
      result = { language: customRules[domain], source: 'custom-full' };
    } else if (this.fullDomainRules && this.fullDomainRules[domain]) {
      // 使用预处理的完整域名规则
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_full_domain') : 'Found in full domain'}: ${domain}`);
      result = { language: this.fullDomainRules[domain], source: 'default-full' };
    } else if (defaultRules[domain]) {
      // 兼容性：如果预处理规则不可用，使用原始规则
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_full_domain') : 'Found in full domain'}: ${domain}`);
      result = { language: defaultRules[domain], source: 'default-full' };
    }

    // 如果找到完整域名匹配，缓存并返回
    if (result) {
      this._addToCache(this.domainCache, domain, result);
      return result;
    }

    // 使用缓存的域名解析结果
    const parsed = this._parseDomain(domain);
    if (parsed.parts.length < 2) {
      return null; // 无效域名
    }

    // 检查二级域名
    if (parsed.secondLevel) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('checking_second_level') : 'Checking second-level domain'}: ${parsed.secondLevel}`);

      if (customRules[parsed.secondLevel]) {
        console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_second_level') : 'Found in second-level domain'}: ${parsed.secondLevel}`);
        result = { language: customRules[parsed.secondLevel], source: 'custom-second' };
      } else if (this.secondLevelRules && this.secondLevelRules[parsed.secondLevel]) {
        // 性能优化：使用预处理的二级域名规则
        console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_second_level') : 'Found in second-level domain'}: ${parsed.secondLevel}`);
        result = { language: this.secondLevelRules[parsed.secondLevel], source: 'default-second' };
      } else if (defaultRules[parsed.secondLevel]) {
        // 兼容性：如果预处理规则不可用，使用原始规则
        console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_second_level') : 'Found in second-level domain'}: ${parsed.secondLevel}`);
        result = { language: defaultRules[parsed.secondLevel], source: 'default-second' };
      }

      // 如果找到二级域名匹配，缓存并返回
      if (result) {
        this._addToCache(this.domainCache, domain, result);
        return result;
      }
    }

    // 检查顶级域名
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('checking_top_level') : 'Checking top-level domain'}: ${parsed.topLevel}`);
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('available_top_level_rules') : 'Available top-level domain rules'}:`, Object.keys(defaultRules).filter(k => !k.includes('.')).slice(0, 10));

    if (customRules[parsed.topLevel]) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_top_level') : 'Found in top-level domain'}: ${parsed.topLevel}`);
      result = { language: customRules[parsed.topLevel], source: 'custom-top' };
    } else if (this.topLevelRules && this.topLevelRules[parsed.topLevel]) {
      // 使用预处理的顶级域名规则
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_top_level') : 'Found in top-level domain'}: ${parsed.topLevel}`);
      result = { language: this.topLevelRules[parsed.topLevel], source: 'default-top' };
    } else if (defaultRules[parsed.topLevel]) {
      // 兼容性：如果预处理规则不可用，使用原始规则
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_top_level') : 'Found in top-level domain'}: ${parsed.topLevel}`);
      result = { language: defaultRules[parsed.topLevel], source: 'default-top' };
    }

    // 缓存结果（包括null结果，避免重复计算）
    this._addToCache(this.domainCache, domain, result);

    return result;
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
   * 预处理规则索引，提高查找效率
   * @private
   */
  _preprocessRules() {
    if (!this.rules) return;

    const i18n = this.ensureI18n();
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('preprocessing_rules') : 'Preprocessing rules for better performance'}...`);

    // 按语言分组规则
    this.rulesByLanguage = {};

    // 按域名类型分组规则
    this.topLevelRules = {}; // 顶级域名（不包含点）
    this.secondLevelRules = {}; // 二级域名（包含一个点）
    this.fullDomainRules = {}; // 完整域名（包含多个点）

    Object.entries(this.rules).forEach(([domain, language]) => {
      // 按语言分组
      if (!this.rulesByLanguage[language]) {
        this.rulesByLanguage[language] = [];
      }
      this.rulesByLanguage[language].push(domain);

      // 按域名类型分组
      const dotCount = (domain.match(/\./g) || []).length;
      if (dotCount === 0) {
        // 顶级域名
        this.topLevelRules[domain] = language;
      } else if (dotCount === 1) {
        // 二级域名
        this.secondLevelRules[domain] = language;
      } else {
        // 完整域名
        this.fullDomainRules[domain] = language;
      }
    });

    console.log(`[DomainRulesManager] ${i18n ? i18n.t('rules_preprocessed') : 'Rules preprocessed'}: ${Object.keys(this.topLevelRules).length} 顶级域名, ${Object.keys(this.secondLevelRules).length} 二级域名, ${Object.keys(this.fullDomainRules).length} 完整域名`);
  }

  /**
   * 解析域名并缓存结果
   * @param {string} domain - 域名
   * @returns {Object} 解析结果 {parts, secondLevel, topLevel}
   * @private
   */
  _parseDomain(domain) {
    // 检查缓存
    if (this.parsedDomainCache.has(domain)) {
      this.cacheStats.parsedHits++;
      return this.parsedDomainCache.get(domain);
    }

    this.cacheStats.parsedMisses++;

    // 解析域名
    const parts = domain.split('.');
    const result = {
      parts,
      secondLevel: parts.length >= 2 ? parts.slice(-2).join('.') : null,
      topLevel: parts[parts.length - 1]
    };

    // 缓存结果（LRU策略）
    this._addToCache(this.parsedDomainCache, domain, result);

    return result;
  }

  /**
   * LRU缓存管理
   * @param {Map} cache - 缓存对象
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @private
   */
  _addToCache(cache, key, value) {
    // 如果已存在，先删除（实现LRU）
    if (cache.has(key)) {
      cache.delete(key);
    }

    // 如果缓存已满，删除最旧的条目
    if (cache.size >= this.maxCacheSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    // 添加新条目
    cache.set(key, value);
  }

  /**
   * 清理缓存
   * @param {boolean} clearAll - 是否清理所有缓存
   */
  clearCache(clearAll = false) {
    const i18n = this.ensureI18n();

    if (clearAll) {
      this.domainCache.clear();
      this.parsedDomainCache.clear();
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('all_cache_cleared') : 'All caches cleared'}`);
    } else {
      // 只清理域名查询缓存，保留解析缓存
      this.domainCache.clear();
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('domain_cache_cleared') : 'Domain query cache cleared'}`);
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计
   */
  getCacheStats() {
    return {
      domainCacheSize: this.domainCache.size,
      parsedDomainCacheSize: this.parsedDomainCache.size,
      maxCacheSize: this.maxCacheSize,
      domainCacheHitRate: this._calculateHitRate('domain'),
      parsedCacheHitRate: this._calculateHitRate('parsed')
    };
  }

  /**
   * 计算缓存命中率
   * @param {string} cacheType - 缓存类型
   * @returns {string} 命中率描述
   * @private
   */
  _calculateHitRate(cacheType) {
    if (cacheType === 'domain') {
      const total = this.cacheStats.domainHits + this.cacheStats.domainMisses;
      if (total === 0) return '0% (0/0)';
      const rate = ((this.cacheStats.domainHits / total) * 100).toFixed(1);
      return `${rate}% (${this.cacheStats.domainHits}/${total})`;
    } else if (cacheType === 'parsed') {
      const total = this.cacheStats.parsedHits + this.cacheStats.parsedMisses;
      if (total === 0) return '0% (0/0)';
      const rate = ((this.cacheStats.parsedHits / total) * 100).toFixed(1);
      return `${rate}% (${this.cacheStats.parsedHits}/${total})`;
    }
    return '未知';
  }

  /**
   * 重置缓存统计
   */
  resetCacheStats() {
    this.cacheStats = {
      domainHits: 0,
      domainMisses: 0,
      parsedHits: 0,
      parsedMisses: 0
    };
    const i18n = this.ensureI18n();
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('cache_stats_reset') : 'Cache statistics reset'}`);
  }

  /**
   * 预热缓存 - 预加载常用域名的解析结果
   * @param {Array<string>} commonDomains - 常用域名列表
   */
  preloadCache(commonDomains = []) {
    const i18n = this.ensureI18n();

    // 默认的常用域名
    const defaultCommonDomains = [
      'google.com', 'github.com', 'baidu.com', 'qq.com'
    ];

    const domainsToPreload = commonDomains.length > 0 ? commonDomains : defaultCommonDomains;

    console.log(`[DomainRulesManager] ${i18n ? i18n.t('preloading_cache') : 'Preloading cache for common domains'}:`, domainsToPreload.length);

    domainsToPreload.forEach(domain => {
      this._parseDomain(domain);
    });

    console.log(`[DomainRulesManager] ${i18n ? i18n.t('cache_preloaded') : 'Cache preloaded'}: ${domainsToPreload.length} 个域名`);
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