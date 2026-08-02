// 域名规则管理器
import { STORAGE_KEYS } from "../shared/storage-keys.js";

export class DomainRulesManager {
	constructor() {
		this.rules = null;
		this.loadPromise = null;

		// 简化的缓存机制
		this.domainCache = new Map(); // 域名查询结果缓存
		this.MAX_CACHE_SIZE = 100; // 缓存大小限制

		// 自定义规则内存缓存：避免每次未命中都读 chrome.storage；
		// 外部（如手动注入 customDomainRules）修改时由 onChanged 失效
		this.customRulesCache = null;
		if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
			chrome.storage.onChanged.addListener((changes, areaName) => {
				if (areaName === "local" && changes.customDomainRules) {
					this.customRulesCache = null;
					// 域名查询结果由自定义规则参与计算，一并失效
					this.domainCache.clear();
				}
			});
		}

		// 简化缓存统计
		this.cacheStats = {
			hits: 0,
			misses: 0,
		};
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
		try {
			const url = chrome.runtime.getURL("src/background/domain-rules.json");
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			this.rules = data.domainLanguageRules || {};
			return this.rules;
		} catch (_error) {
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
		try {
			// 检查缓存（LRU：命中时重插入以刷新热度）
			if (this.domainCache.has(domain)) {
				this.cacheStats.hits++;
				const cachedResult = this.domainCache.get(domain);
				this.domainCache.delete(domain);
				this.domainCache.set(domain, cachedResult);
				return cachedResult ? cachedResult.language : null;
			}

			// 缓存未命中
			this.cacheStats.misses++;

			// 确保规则已加载
			await this._ensureRulesLoaded();
			if (!this.rules) return null;

			// 获取自定义规则并查找匹配
			const customRules = await this.getCustomRules();
			const result = this._findMatchingRule(domain, customRules);
			return result ? result.language : null;
		} catch (error) {
			console.error(`[DomainRulesManager] Error getting language for domain "${domain}":`, error);
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
	 * @returns {Object|null} 匹配结果或null
	 * @private
	 */
	_matchRule(target, customRules, sourceType) {
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
		// LRU缓存：超过限制时淘汰最久未使用的条目（Map 迭代序即插入序）
		if (this.domainCache.size >= this.MAX_CACHE_SIZE) {
			const oldestKey = this.domainCache.keys().next().value;
			this.domainCache.delete(oldestKey);
		}
		this.domainCache.set(domain, result);
		return result;
	}

	/**
	 * 查找匹配的规则
	 * @param {string} domain - 域名
	 * @param {Object} customRules - 自定义规则
	 * @returns {Object|null} 匹配结果 {language, source} 或 null
	 * @private
	 */
	_findMatchingRule(domain, customRules) {
		let result;

		// 1. 检查完整域名匹配
		result = this._matchRule(domain, customRules, "full");
		if (result) return this._cacheAndReturn(domain, result);

		// 解析域名
		const parsed = this._parseDomain(domain);
		if (parsed.parts.length < 2) {
			return this._cacheAndReturn(domain, null);
		}

		// 2. 检查二级域名匹配
		if (parsed.secondLevel) {
			result = this._matchRule(parsed.secondLevel, customRules, "second");
			if (result) return this._cacheAndReturn(domain, result);
		}

		// 3. 检查顶级域名匹配
		result = this._matchRule(parsed.topLevel, customRules, "top");
		return this._cacheAndReturn(domain, result);
	}

	/**
	 * 解析域名
	 * @param {string} domain - 域名
	 * @returns {Object} 解析结果 {parts, secondLevel, topLevel}
	 * @private
	 */
	_parseDomain(domain) {
		const parts = domain.split(".");
		return {
			parts,
			secondLevel: parts.length >= 2 ? parts.slice(-2).join(".") : null,
			topLevel: parts[parts.length - 1],
		};
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
			cacheHitRate: this._calculateHitRate(),
		};
	}

	/**
	 * 计算缓存命中率
	 * @returns {string} 命中率描述
	 * @private
	 */
	_calculateHitRate() {
		const { hits, misses } = this.cacheStats;
		const total = hits + misses;
		if (total === 0) return "0% (0/0)";

		const rate = ((hits / total) * 100).toFixed(1);
		return `${rate}% (${hits}/${total})`;
	}

	/**
	 * 重置缓存统计
	 */
	resetCacheStats() {
		this.cacheStats = {
			hits: 0,
			misses: 0,
		};
	}

	/**
	 * 获取自定义规则（首读后缓存，storage 变化时自动失效）
	 * @returns {Promise<Object>} 自定义规则对象
	 */
	async getCustomRules() {
		if (this.customRulesCache) {
			return this.customRulesCache;
		}
		try {
			const result = await chrome.storage.local.get([STORAGE_KEYS.CUSTOM_DOMAIN_RULES]);
			this.customRulesCache = result.customDomainRules || {};
		} catch (_error) {
			this.customRulesCache = {};
		}
		return this.customRulesCache;
	}

	/**
	 * 获取规则统计信息（用于调试）
	 * @returns {Object} 统计信息对象
	 */
	getRulesStats() {
		const rules = this.getRules();
		const stats = {
			totalRules: Object.keys(rules || {}).length,
			languageDistribution: {},
		};

		if (!rules || typeof rules !== "object") {
			return stats;
		}

		Object.values(rules).forEach((lang) => {
			if (lang) {
				stats.languageDistribution[lang] = (stats.languageDistribution[lang] || 0) + 1;
			}
		});

		return stats;
	}
}

// 导出单例实例
export const domainRulesManager = new DomainRulesManager();
