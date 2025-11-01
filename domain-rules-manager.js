// 域名规则管理器

class DomainRulesManager {
  constructor() {
    this.rules = null;
    this.loadPromise = null;
    this.i18n = null; // 延迟初始化

    // 简化的缓存机制
    this.domainCache = new Map(); // 域名查询结果缓存

    // 简化缓存统计
    this.cacheStats = {
      hits: 0,
      misses: 0
    };
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

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.domainLanguageRules) {
        this.rules = {};
        return this.rules;
      }

      this.rules = data.domainLanguageRules;

      return this.rules;

    } catch (error) {
      this.rules = {};
      return this.rules;
    }
  }

  // 获取规则数据
  getRules() {
    if (!this.rules) {
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

    try {

      // 检查域名缓存
      if (this.domainCache.has(domain)) {
        const cachedResult = this.domainCache.get(domain);
        if (cachedResult) {
          return cachedResult.language;
        } else {
          return null;
        }
      }


      // 确保规则已加载
      await this._ensureRulesLoaded();
      if (!this.rules) {
        return null;
      }


      // 获取自定义规则
      const customRules = await this.getCustomRules();

      // 按优先级检查规则：自定义完整域名 > 内置完整域名 > 自定义二级域名 > 内置二级域名 > 自定义顶级域名 > 内置顶级域名
      const result = this._findMatchingRule(domain, customRules);

      if (result) {
        return result.language;
      }

      return null;

    } catch (error) {

      // 记录错误但不抛出，返回null表示未找到匹配
      // 继续使用默认语言或其他回退机制
      return null;
    }
  }

  /**
   * 确保规则已加载
   * @private
   */
  async _ensureRulesLoaded() {
    if (!this.rules) {
      await this.loadRules();
    }
  }

  /**
   * 通用的规则匹配方法
   * @param {string} target - 要匹配的目标（域名）
   * @param {Object} customRules - 自定义规则
   * @param {string} sourceType - 匹配来源类型
   * @param {string} matchType - 匹配类型标识
   * @returns {Object|null} 匹配结果或null
   * @private
   */
  _matchRule(target, customRules, sourceType, logKey) {
   const i18n = this.ensureI18n();

   // 检查自定义规则
   if (customRules[target]) {
     return { language: customRules[target], source: `custom-${sourceType}` };
   }

   // 直接检查内置规则
   if (this.rules[target]) {
     return { language: this.rules[target], source: `default-${sourceType}` };
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
   // 简化缓存逻辑：直接设置，无需LRU
   this.domainCache.set(domain, result);
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
      // 基础域名完整匹配
      result = this._matchRule(parsed.baseDomain, customRules, 'base', 'found_in_base_domain');
      if (result) return this._cacheAndReturn(domain, result);

      // 基础域名的二级域名匹配
      const baseParts = parsed.baseDomain.split('.');
      if (baseParts.length >= 2) {
        const baseSecondLevel = baseParts.slice(-2).join('.');
        result = this._matchRule(baseSecondLevel, customRules, 'second', 'found_in_second_level');
        if (result) return this._cacheAndReturn(domain, result);
      }

      // 基础域名的顶级域名匹配
      const baseTopLevel = baseParts[baseParts.length - 1];
      result = this._matchRule(baseTopLevel, customRules, 'top', 'found_in_top_level');
      if (result) return this._cacheAndReturn(domain, result);

    }

    // 3. 检查原域名的二级域名匹配
    if (parsed.secondLevel) {
      result = this._matchRule(parsed.secondLevel, customRules, 'second', 'found_in_second_level');
      if (result) return this._cacheAndReturn(domain, result);
    }

    // 4. 检查原域名的顶级域名匹配
    result = this._matchRule(parsed.topLevel, customRules, 'top', 'found_in_top_level');

    return this._cacheAndReturn(domain, result);
  }

  /**
   * 解析域名并缓存结果
   * @param {string} domain - 域名
   * @returns {Object} 解析结果 {parts, secondLevel, topLevel, baseDomain}
   * @private
   */
  _parseDomain(domain) {
   // 解析域名
   const parts = domain.split('.');
   const result = {
     parts,
     secondLevel: parts.length >= 2 ? parts.slice(-2).join('.') : null,
     topLevel: parts[parts.length - 1],
     baseDomain: null // 去除语言子域名后的基础域名
   };


   return result;
 }




  /**
   * 清理缓存
   */
  clearCache() {
    this.domainCache.clear();
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计
   */
  getCacheStats() {
   return {
     domainCacheSize: this.domainCache.size,
     cacheHitRate: this._calculateHitRate()
   };
 }

  /**
   * 计算缓存命中率
   * @param {string} cacheType - 缓存类型
   * @returns {string} 命中率描述
   * @private
   */
  _calculateHitRate() {
   const { hits, misses } = this.cacheStats;
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
      hits: 0,
      misses: 0
    };
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