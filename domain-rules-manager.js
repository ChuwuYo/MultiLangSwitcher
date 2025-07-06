// 域名规则管理器
class DomainRulesManager {
  constructor() {
    this.rules = null;
    this.loadPromise = null;
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
      console.log('[DomainRulesManager] 尝试加载规则文件:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[DomainRulesManager] 规则文件加载成功，数据结构:', Object.keys(data));

      if (data.domainLanguageRules) {
        this.rules = data.domainLanguageRules;
        console.log(`[DomainRulesManager] 成功加载 ${Object.keys(this.rules).length} 条域名规则`);
      } else {
        console.warn('[DomainRulesManager] 规则文件中未找到 domainLanguageRules 字段');
        this.rules = {};
      }

      return this.rules;
    } catch (error) {
      console.error('[DomainRulesManager] 加载域名规则失败:', error);
      this.rules = {};
      return this.rules;
    }
  }

  // 获取规则数据
  getRules() {
    if (!this.rules) {
      console.warn('[DomainRulesManager] 规则尚未加载，返回空对象');
      return {};
    }
    return this.rules;
  }

  // 根据域名获取语言
  async getLanguageForDomain(domain) {
    console.log(`[DomainRulesManager] 查找域名: ${domain}`);

    // 确保规则已加载
    if (!this.rules) {
      console.log(`[DomainRulesManager] 规则未加载，正在加载...`);
      await this.loadRules();
    }

    if (!this.rules) {
      console.warn('[DomainRulesManager] 加载规则失败');
      return null;
    }

    console.log(`[DomainRulesManager] 已加载 ${Object.keys(this.rules).length} 条规则`);

    // 优先检查自定义规则
    const customRules = await this.getCustomRules();
    if (customRules[domain]) {
      console.log(`[DomainRulesManager] 在自定义规则中找到: ${domain} -> ${customRules[domain]}`);
      return customRules[domain];
    }

    // 检查完整域名
    if (this.rules[domain]) {
      console.log(`[DomainRulesManager] 在完整域名中找到: ${domain} -> ${this.rules[domain]}`);
      return this.rules[domain];
    }

    // 检查二级域名
    const parts = domain.split('.');
    if (parts.length >= 2) {
      const secondLevel = parts.slice(-2).join('.');
      console.log(`[DomainRulesManager] 检查二级域名: ${secondLevel}`);
      if (customRules[secondLevel] || this.rules[secondLevel]) {
        const result = customRules[secondLevel] || this.rules[secondLevel];
        console.log(`[DomainRulesManager] 在二级域名中找到: ${secondLevel} -> ${result}`);
        return result;
      }
    }

    // 检查顶级域名
    const topLevel = parts[parts.length - 1];
    console.log(`[DomainRulesManager] 检查顶级域名: ${topLevel}`);
    console.log(`[DomainRulesManager] 可用顶级域名规则:`, Object.keys(this.rules).filter(k => !k.includes('.')).slice(0, 10));
    if (customRules[topLevel] || this.rules[topLevel]) {
      const result = customRules[topLevel] || this.rules[topLevel];
      console.log(`[DomainRulesManager] 在顶级域名中找到: ${topLevel} -> ${result}`);
      return result;
    }

    console.log(`[DomainRulesManager] 未找到匹配的规则: ${domain}`);
    console.log(`[DomainRulesManager] 域名解析结果 - 完整: ${domain}, 二级: ${parts.length >= 2 ? parts.slice(-2).join('.') : 'N/A'}, 顶级: ${topLevel}`);
    return null;
  }

  // 获取自定义规则
  async getCustomRules() {
    try {
      const result = await chrome.storage.local.get(['customDomainRules']);
      return result.customDomainRules || {};
    } catch (error) {
      console.error('Failed to get custom rules:', error);
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