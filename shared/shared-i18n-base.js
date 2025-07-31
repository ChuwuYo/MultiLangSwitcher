/**
 * 基础国际化类
 * 提供通用的翻译功能和语言检测
 */
class BaseI18n {
    /**
     * 构造函数
     * @param {string} componentName - 组件名称，用于加载对应的翻译文件
     * @param {boolean} isServiceWorker - 是否在service worker环境中运行
     */
    constructor(componentName, isServiceWorker = false) {
        // 早期返回模式 - 验证必需参数
        if (!componentName || typeof componentName !== 'string') {
            const error = new Error('Component name is required and must be a string');
            console.error('BaseI18n constructor error:', error.message);
            throw error;
        }

        this.componentName = componentName;
        this.isServiceWorker = Boolean(isServiceWorker);
        this.currentLang = 'en';
        this.translations = {};
        this.initialized = false;
        this.isReady = false;
        this.readyCallbacks = [];
    }

    /**
     * 初始化翻译系统
     */
    init() {
        this.detectLanguage();
        if (this.isServiceWorker) {
            // Service Worker环境中同步加载翻译
            this.loadTranslationsSync();
        } else {
            // 浏览器环境中异步加载翻译
            this.loadTranslations();
        }
        this.initialized = true;
    }

    /**
     * 检测浏览器语言
     */
    detectLanguage() {
        try {
            // 优先使用保存的语言设置（仅在浏览器环境中）
            const savedLang = this.getSavedLanguage();
            if (savedLang) {
                this.currentLang = savedLang;
                return;
            }

            // 使用共享的语言检测函数
            if (typeof detectBrowserLanguage === 'function') {
                const detectedLang = detectBrowserLanguage();
                this.currentLang = detectedLang.startsWith('zh') ? 'zh' : 'en';
                return;
            }

            // 回退到系统语言检测
            this.currentLang = this.detectSystemLanguage();
        } catch (error) {
            // 发生错误时默认使用英文
            this.currentLang = 'en';
        }
    }

    /**
     * 获取保存的语言设置
     * @returns {string|null} 保存的语言代码或null
     */
    getSavedLanguage() {
        if (this.isServiceWorker || typeof localStorage === 'undefined') {
            return null;
        }
        return localStorage.getItem('app-lang');
    }

    /**
     * 检测系统语言
     * @returns {string} 语言代码
     */
    detectSystemLanguage() {
        // Chrome扩展API
        if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
            const browserLang = chrome.i18n.getUILanguage().toLowerCase();
            return browserLang.startsWith('zh') ? 'zh' : 'en';
        }

        // 浏览器navigator API
        if (typeof navigator !== 'undefined' && navigator.language) {
            return navigator.language.startsWith('zh') ? 'zh' : 'en';
        }

        // 默认英文
        return 'en';
    }

    /**
     * 同步加载翻译文件（仅用于Service Worker环境）
     */
    loadTranslationsSync() {
        try {
            this.loadCurrentLanguageSync();
            this.markAsReady();
        } catch (error) {
            console.error(`${this.componentName} translation file loading failed:`, error);
            this.loadFallbackTranslationsSync();
        }
    }

    /**
     * 同步加载当前语言的翻译文件
     */
    loadCurrentLanguageSync() {
        importScripts(`i18n/${this.componentName}-${this.currentLang}.js`);

        const translationVarName = this.getTranslationVariableName();
        const globalScope = this.getGlobalScope();
        const langSuffix = this.currentLang === 'zh' ? 'Zh' : 'En';

        this.translations = globalScope[`${translationVarName}${langSuffix}`];
    }

    /**
     * 获取全局作用域对象
     * @returns {Object} 全局作用域对象
     */
    getGlobalScope() {
        return globalThis;
    }

    /**
     * 标记翻译系统为就绪状态并执行回调
     */
    markAsReady() {
        this.isReady = true;
        this.executeReadyCallbacks();
    }

    /**
     * 执行所有等待的回调函数
     */
    executeReadyCallbacks() {
        this.readyCallbacks.forEach(callback => callback());
        this.readyCallbacks = [];
    }

    /**
     * 同步加载回退翻译文件（仅用于Service Worker环境）
     */
    loadFallbackTranslationsSync() {
        try {
            this.loadEnglishTranslationsSync();
            this.markAsReady();
        } catch (fallbackError) {
            console.error('Fallback translation file loading also failed:', fallbackError);
            this.translations = {};
            this.markAsReady();
        }
    }

    /**
     * 同步加载英文翻译文件
     */
    loadEnglishTranslationsSync() {
        if (this.currentLang === 'en') {
            this.translations = {};
            return;
        }

        importScripts(`i18n/${this.componentName}-en.js`);
        const translationVarName = this.getTranslationVariableName();
        const globalScope = this.getGlobalScope();
        this.translations = globalScope[`${translationVarName}En`];
    }

    /**
     * 加载翻译文件
     * 子类可以重写此方法以实现特定的加载逻辑
     */
    async loadTranslations() {
        try {
            await this.loadTranslationsByEnvironment();
            this.markAsReady();
        } catch (error) {
            console.error(`${this.componentName} translation file loading failed:`, error);
            await this.loadFallbackTranslations();
            this.markAsReady();
        }
    }

    /**
     * 根据环境加载翻译文件
     */
    async loadTranslationsByEnvironment() {
        if (this.isServiceWorker) {
            await this.loadTranslationsForServiceWorker();
        } else {
            await this.loadTranslationsForBrowser();
        }
    }

    /**
     * 在Service Worker环境中加载翻译文件
     */
    async loadTranslationsForServiceWorker() {
        importScripts(`i18n/${this.componentName}-${this.currentLang}.js`);
        this.setTranslationsFromGlobalScope();
    }

    /**
     * 从全局作用域设置翻译对象
     */
    setTranslationsFromGlobalScope() {
        const translationVarName = this.getTranslationVariableName();
        const globalScope = this.getGlobalScope();
        const langSuffix = this.currentLang === 'zh' ? 'Zh' : 'En';

        this.translations = globalScope[`${translationVarName}${langSuffix}`];
    }

    /**
     * 在浏览器环境中加载翻译文件
     */
    async loadTranslationsForBrowser() {
        const expectedVar = this.getExpectedTranslationVariable();

        // 检查是否已经预加载了翻译文件
        if (typeof window[expectedVar] !== 'undefined') {
            this.translations = window[expectedVar];
            return;
        }

        // 动态加载翻译文件
        await this.loadScriptDynamically();
        this.translations = window[expectedVar];
    }

    /**
     * 获取期望的翻译变量名
     * @returns {string} 翻译变量名
     */
    getExpectedTranslationVariable() {
        const translationVarName = this.getTranslationVariableName();
        const langSuffix = this.currentLang === 'zh' ? 'Zh' : 'En';
        return `${translationVarName}${langSuffix}`;
    }

    /**
     * 动态加载脚本文件
     * @returns {Promise<void>}
     */
    async loadScriptDynamically() {
        const script = document.createElement('script');
        script.src = `i18n/${this.componentName}-${this.currentLang}.js`;
        document.head.appendChild(script);

        return new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            // 添加超时处理
            setTimeout(() => reject(new Error('Translation loading timeout')), 3000);
        });
    }

    /**
     * 加载回退翻译文件（英文）
     */
    async loadFallbackTranslations() {
        try {
            await this.loadEnglishTranslations();
        } catch (fallbackError) {
            console.error('Fallback translation file loading also failed:', fallbackError);
            this.translations = {};
        }
    }

    /**
     * 加载英文翻译文件
     */
    async loadEnglishTranslations() {
        if (this.currentLang === 'en') {
            this.translations = {};
            return;
        }

        await this.loadEnglishTranslationsByEnvironment();
        this.setEnglishTranslationsFromGlobalScope();
    }

    /**
     * 根据环境加载英文翻译文件
     */
    async loadEnglishTranslationsByEnvironment() {
        if (this.isServiceWorker) {
            importScripts(`i18n/${this.componentName}-en.js`);
            return;
        }

        const fallbackScript = document.createElement('script');
        fallbackScript.src = `i18n/${this.componentName}-en.js`;
        document.head.appendChild(fallbackScript);

        await new Promise(resolve => {
            fallbackScript.onload = resolve;
        });
    }

    /**
     * 从全局作用域设置英文翻译对象
     */
    setEnglishTranslationsFromGlobalScope() {
        const translationVarName = this.getTranslationVariableName();
        const globalScope = this.getGlobalScope();
        this.translations = globalScope[`${translationVarName}En`];
    }

    /**
     * 获取翻译变量名称
     * @returns {string} 翻译变量的基础名称
     */
    getTranslationVariableName() {
        // 将组件名称转换为驼峰命名
        return this.componentName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * 获取回退翻译
     * @param {string} key - 翻译键
     * @returns {string|null} 回退翻译文本或null
     */
    getFallbackTranslation(key) {
        // 如果当前是英文或已有翻译，不需要回退
        if (this.currentLang === 'en' || this.translations[key]) {
            return null;
        }

        try {
            const enTranslations = this.getEnglishTranslationsFromGlobal();
            return enTranslations && enTranslations[key] ? enTranslations[key] : null;
        } catch (error) {
            // 忽略错误，继续使用键名作为最后回退
            return null;
        }
    }

    /**
     * 从全局作用域获取英文翻译对象
     * @returns {Object|null} 英文翻译对象或null
     */
    getEnglishTranslationsFromGlobal() {
        const translationVarName = this.getTranslationVariableName();
        const globalScope = this.getGlobalScope();
        const enTranslations = globalScope[`${translationVarName}En`];

        return typeof enTranslations !== 'undefined' ? enTranslations : null;
    }

    /**
     * 翻译文本
     * @param {string} key - 翻译键
     * @param {Object} params - 参数对象，用于替换占位符
     * @returns {string} 翻译后的文本
     */
    t(key, params = {}) {
        // 如果翻译对象还没有初始化，直接返回键名
        if (!this.translations || typeof this.translations !== 'object') {
            return key;
        }

        // 获取翻译文本，优先使用当前语言，然后回退到英文，最后使用键名
        let text = this.translations[key] || this.getFallbackTranslation(key) || key;

        // 处理参数替换，支持多种占位符格式
        if (params && typeof params === 'object' && Object.keys(params).length > 0) {
            try {
                Object.keys(params).forEach(param => {
                    const placeholder = `{${param}}`;
                    const value = String(params[param]); // 确保参数值为字符串
                    // 使用全局替换，确保所有占位符都被替换
                    text = text.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
                });
            } catch (error) {
                // 忽略参数替换错误，返回原始文本
            }
        }

        return text;
    }

    /**
     * 等待翻译系统准备就绪
     * @param {Function} callback - 准备就绪后执行的回调函数
     */
    ready(callback) {
        if (!callback || typeof callback !== 'function') {
            return;
        }

        if (this.isReady) {
            callback();
        } else {
            this.readyCallbacks.push(callback);
        }
    }

    /**
     * 切换语言
     * @param {string} lang - 目标语言代码
     */
    switchLanguage(lang) {
        if (lang !== this.currentLang) {
            this.currentLang = lang;

            // 只在浏览器环境中使用localStorage和location.reload
            if (!this.isServiceWorker) {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('app-lang', lang);
                }
                if (typeof location !== 'undefined') {
                    location.reload();
                }
            }
        }
    }
}