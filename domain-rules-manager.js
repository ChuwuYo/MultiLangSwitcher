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
    this.topLevelRules = null; // 顶级域名规则（不包含点）
    this.domainRules = null; // 域名规则（包含点）
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
    const result = this._findMatchingRule(domain, customRules);

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
   * 通用的规则匹配方法
   * @param {string} target - 要匹配的目标（域名）
   * @param {Object} customRules - 自定义规则
   * @param {string} sourceType - 匹配来源类型
   * @param {string} logKey - 日志翻译键
   * @returns {Object|null} 匹配结果或null
   * @private
   */
  _matchRule(target, customRules, sourceType, logKey) {
    const i18n = this.ensureI18n();

    // 检查自定义规则
    if (customRules[target]) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_custom_rules') : 'Found in custom rules'}: ${target}`);
      return { language: customRules[target], source: `custom-${sourceType}` };
    }

    // 检查预处理的规则
    if (this.domainRules[target]) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t(logKey) : logKey}: ${target}`);
      return { language: this.domainRules[target], source: `default-${sourceType}` };
    }

    // 检查顶级域名规则
    if (this.topLevelRules[target]) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_top_level') : 'Found in top-level domain'}: ${target}`);
      return { language: this.topLevelRules[target], source: `default-${sourceType}` };
    }

    return null;
  }

  /**
   * 缓存结果并返回
   * @param {string} domain - 原始域名
   * @param {Object|null} result - 匹配结果
   * @returns {Object|null} 匹配结果
   * @private
   */
  _cacheAndReturn(domain, result) {
    this._addToCache(this.domainCache, domain, result);
    return result;
  }

  /**
   * 查找匹配的规则（优化版本）
   * @param {string} domain - 域名
   * @param {Object} customRules - 自定义规则
   * @returns {Object|null} 匹配结果 {language, source} 或 null
   * @private
   */
  _findMatchingRule(domain, customRules) {
    const i18n = this.ensureI18n();
    let result = null;

    // 1. 检查完整域名匹配
    result = this._matchRule(domain, customRules, 'full', 'found_in_full_domain');
    if (result) return this._cacheAndReturn(domain, result);

    // 解析域名
    const parsed = this._parseDomain(domain);
    if (parsed.parts.length < 2) {
      return this._cacheAndReturn(domain, null); // 无效域名
    }

    // 2. 检查基础域名匹配（去除语言子域名后）
    if (parsed.baseDomain) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('checking_base_domain') : 'Checking base domain'}: ${parsed.baseDomain}`);

      // 基础域名完整匹配
      result = this._matchRule(parsed.baseDomain, customRules, 'base', 'found_in_base_domain');
      if (result) return this._cacheAndReturn(domain, result);

      // 基础域名的二级域名匹配
      const baseParts = parsed.baseDomain.split('.');
      if (baseParts.length >= 2) {
        const baseSecondLevel = baseParts.slice(-2).join('.');
        console.log(`[DomainRulesManager] ${i18n ? i18n.t('checking_second_level') : 'Checking second-level domain'}: ${baseSecondLevel}`);

        result = this._matchRule(baseSecondLevel, customRules, 'second', 'found_in_second_level');
        if (result) return this._cacheAndReturn(domain, result);
      }

      // 基础域名的顶级域名匹配
      const baseTopLevel = baseParts[baseParts.length - 1];
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('checking_top_level') : 'Checking top-level domain'}: ${baseTopLevel}`);

      result = this._matchRule(baseTopLevel, customRules, 'top', 'found_in_top_level');
      if (result) return this._cacheAndReturn(domain, result);

      // 智能推断
      const languageFromSubdomain = this._inferLanguageFromSubdomain(parsed.parts[0]);
      if (languageFromSubdomain) {
        console.log(`[DomainRulesManager] ${i18n ? i18n.t('inferred_from_subdomain') : 'Inferred language from subdomain'}: ${parsed.parts[0]} → ${languageFromSubdomain}`);
        result = { language: languageFromSubdomain, source: 'inferred-subdomain' };
        return this._cacheAndReturn(domain, result);
      }
    }

    // 3. 检查原域名的二级域名匹配
    if (parsed.secondLevel) {
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('checking_second_level') : 'Checking second-level domain'}: ${parsed.secondLevel}`);
      result = this._matchRule(parsed.secondLevel, customRules, 'second', 'found_in_second_level');
      if (result) return this._cacheAndReturn(domain, result);
    }

    // 4. 检查原域名的顶级域名匹配
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('checking_top_level') : 'Checking top-level domain'}: ${parsed.topLevel}`);
    result = this._matchRule(parsed.topLevel, customRules, 'top', 'found_in_top_level');

    return this._cacheAndReturn(domain, result);
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

    // 重置预处理规则
    this.rulesByLanguage = {};
    this.topLevelRules = {};
    this.domainRules = {};

    Object.entries(this.rules).forEach(([domain, language]) => {
      // 按语言分组
      if (!this.rulesByLanguage[language]) {
        this.rulesByLanguage[language] = [];
      }
      this.rulesByLanguage[language].push(domain);

      // 按域名是否包含点来分组
      if (domain.includes('.')) {
        this.domainRules[domain] = language;
      } else {
        this.topLevelRules[domain] = language;
      }
    });

    console.log(`[DomainRulesManager] ${i18n ? i18n.t('rules_preprocessed') : 'Rules preprocessed'}: ${Object.keys(this.topLevelRules).length} TLD rules, ${Object.keys(this.domainRules).length} domain rules`);
  }

  /**
   * 解析域名并缓存结果
   * @param {string} domain - 域名
   * @returns {Object} 解析结果 {parts, secondLevel, topLevel, baseDomain}
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
      topLevel: parts[parts.length - 1],
      baseDomain: null // 去除语言子域名后的基础域名
    };

    // 如果有3个或更多部分，尝试识别语言子域名
    if (parts.length >= 3) {
      const firstPart = parts[0].toLowerCase();

      // 检查第一个部分是否是语言代码
      if (this._isLanguageSubdomain(firstPart)) {
        // 去除语言子域名，获取基础域名
        result.baseDomain = parts.slice(1).join('.');
      }
    }

    // 缓存结果（LRU策略）
    this._addToCache(this.parsedDomainCache, domain, result);

    return result;
  }

  /**
   * 获取语言子域名映射表
   * @returns {Object} 语言子域名到标准语言代码的映射
   * @private
   */
  _getLanguageSubdomainMap() {
    // 如果已经缓存，直接返回
    if (this._languageSubdomainMap) {
      return this._languageSubdomainMap;
    }

    // 语言子域名到标准语言代码的映射（仅包含实际网站会使用的子域名）
    this._languageSubdomainMap = {
      // 中文圈（常见）
      'zh': 'zh-CN',
      'zh-cn': 'zh-CN',
      'zh-hans': 'zh-CN',
      'zh-tw': 'zh-TW',
      'zh-hk': 'zh-HK',
      'zh-hant': 'zh-TW',
      'cn': 'zh-CN',
      'tw': 'zh-TW',
      'hk': 'zh-HK',

      // 英语（常见）
      'en': 'en-US',
      'en-us': 'en-US',
      'en-gb': 'en-GB',
      'en-au': 'en-AU',
      'en-ca': 'en-CA',
      'us': 'en-US',
      'au': 'en-AU',

      // 主要欧洲语言（实际使用）
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it',
      'pt': 'pt-PT',
      'pt-br': 'pt-BR',
      'br': 'pt-BR',
      'ru': 'ru',
      'nl': 'nl',

      // 亚洲主要语言（实际使用）
      'ja': 'ja',
      'jp': 'ja',
      'ko': 'ko',
      'kr': 'ko',
      'th': 'th',
      'vi': 'vi',
      'id': 'id',
      'ms': 'ms',

      // 其他常见的语言代码
      'ar': 'ar', // 阿拉伯语
      'tr': 'tr', // 土耳其语
      'pl': 'pl', // 波兰语
      'sv': 'sv', // 瑞典语
      'da': 'da', // 丹麦语
      'no': 'no', // 挪威语
      'fi': 'fi', // 芬兰语
      'he': 'he', // 希伯来语
      'hi': 'hi', // 印地语
      'cs': 'cs', // 捷克语
      'hu': 'hu', // 匈牙利语
      'el': 'el', // 希腊语
      'bg': 'bg', // 保加利亚语
      'ro': 'ro', // 罗马尼亚语
      'hr': 'hr', // 克罗地亚语
      'sr': 'sr', // 塞尔维亚语
      'sk': 'sk', // 斯洛伐克语
      'sl': 'sl', // 斯洛文尼亚语
      'lt': 'lt', // 立陶宛语
      'lv': 'lv', // 拉脱维亚语
      'et': 'et', // 爱沙尼亚语
      'ca': 'ca', // 加泰罗尼亚语
      'bn': 'bn', // 孟加拉语
      'ur': 'ur', // 乌尔都语
      'fa': 'fa', // 波斯语
      'uk': 'uk'  // 乌克兰语
    };

    return this._languageSubdomainMap;
  }

  /**
   * 检查子域名是否是语言代码
   * @param {string} subdomain - 子域名
   * @returns {boolean} 是否是语言代码
   * @private
   */
  _isLanguageSubdomain(subdomain) {
    const languageMap = this._getLanguageSubdomainMap();
    return languageMap.hasOwnProperty(subdomain.toLowerCase());
  }

  /**
   * 从语言子域名推断语言代码
   * @param {string} subdomain - 语言子域名
   * @returns {string|null} 推断的语言代码或null
   * @private
   */
  _inferLanguageFromSubdomain(subdomain) {
    const languageMap = this._getLanguageSubdomainMap();
    return languageMap[subdomain.toLowerCase()] || null;
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
    let hits, misses;
    if (cacheType === 'domain') {
      ({ domainHits: hits, domainMisses: misses } = this.cacheStats);
    } else if (cacheType === 'parsed') {
      ({ parsedHits: hits, parsedMisses: misses } = this.cacheStats);
    } else {
      return '未知';
    }

    const total = hits + misses;
    if (total === 0) return '0% (0/0)';

    const rate = ((hits / total) * 100).toFixed(1);
    return `${rate}% (${hits}/${total})`;
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
   * 预加载域名规则文件
   * 在扩展启动时调用，避免首次查询时的延迟
   */
  async preloadRules() {
    const i18n = this.ensureI18n();
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('preloading_rules') : 'Preloading domain rules file'}...`);

    try {
      await this.loadRules();
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('rules_preloaded') : 'Domain rules preloaded successfully'}`);
    } catch (error) {
      console.error(`[DomainRulesManager] ${i18n ? i18n.t('rules_preload_failed') : 'Failed to preload domain rules'}:`, error);
    }
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