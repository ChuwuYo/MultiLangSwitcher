/**
 * 基础国际化类
 * 提供通用的翻译功能和语言检测，统一了浏览器和Service Worker环境的加载逻辑。
 */
class BaseI18n {
	/**
	 * 构造函数
	 * @param {string} componentName - 组件名称，用于加载对应的翻译文件。
	 * @param {boolean} [isServiceWorker=false] - 是否在Service Worker环境中运行。
	 */
	constructor(componentName, isServiceWorker = false) {
		if (!componentName || typeof componentName !== "string") {
			const error = new Error(
				"Component name is required and must be a string.",
			);
			console.error("BaseI18n constructor error:", error.message);
			throw error;
		}

		this.componentName = componentName;
		this.isServiceWorker = isServiceWorker;
		this.currentLang = "en";
		this.translations = {};
		this.isReady = false;
		this._initPromise = null;
	}

	/**
	 * 初始化翻译系统，返回一个在准备就绪时解析的Promise。
	 * @returns {Promise<void>}
	 */
	init() {
		if (this._initPromise) {
			return this._initPromise;
		}

		this._initPromise = (async () => {
			this._detectLanguage();
			try {
				await this._loadLanguageFile(this.currentLang);
			} catch (error) {
				console.error(
					`Failed to load '${this.currentLang}' translation for ${this.componentName}. Falling back to 'en'.`,
					error,
				);
				if (this.currentLang !== "en") {
					try {
						await this._loadLanguageFile("en");
						this.currentLang = "en"; // 更新当前语言为回退语言
					} catch (fallbackError) {
						console.error(
							`Failed to load fallback 'en' translation for ${this.componentName}.`,
							fallbackError,
						);
						this.translations = {}; // 最终回退为空对象
					}
				} else {
					this.translations = {};
				}
			} finally {
				this.isReady = true;
			}
		})();

		return this._initPromise;
	}

	/**
	 * 检测并设置当前语言。
	 * @private
	 */
	_detectLanguage() {
		// 优先从localStorage获取（仅浏览器环境）
		if (!this.isServiceWorker && typeof localStorage !== "undefined") {
			const savedLang = localStorage.getItem("app-lang");
			if (savedLang) {
				this.currentLang = savedLang;
				return;
			}
		}

		// 其次使用Chrome扩展API或浏览器API
		const langSource =
			(typeof chrome?.i18n?.getUILanguage === "function" &&
				chrome.i18n.getUILanguage()) ||
			(typeof navigator?.language === "string" && navigator.language) ||
			"en";

		this.currentLang = langSource.toLowerCase().startsWith("zh") ? "zh" : "en";
	}

	/**
	 * 统一的语言文件加载器。
	 * @param {string} lang - 要加载的语言代码 ('en', 'zh')。
	 * @returns {Promise<void>}
	 * @private
	 */
	async _loadLanguageFile(lang) {
		const translationVarName = this.componentName.replace(
			/-([a-z])/g,
			(_, letter) => letter.toUpperCase(),
		);
		const langSuffix = lang === "zh" ? "Zh" : "En";
		const expectedVar = `${translationVarName}${langSuffix}`;
		const globalScope = globalThis;

		// 如果翻译已存在于全局作用域，则直接使用
		if (globalScope[expectedVar]) {
			this.translations = globalScope[expectedVar];
			return;
		}

		// 根据环境加载脚本
		const scriptPath = `i18n/${this.componentName}-${lang}.js`;
		if (this.isServiceWorker) {
			importScripts(scriptPath);
		} else {
			await this._loadScriptForBrowser(scriptPath);
		}

		// 从全局作用域获取翻译
		if (globalScope[expectedVar]) {
			this.translations = globalScope[expectedVar];
		} else {
			throw new Error(
				`Translation variable '${expectedVar}' not found after loading script.`,
			);
		}
	}

	/**
	 * 在浏览器环境中通过动态添加<script>标签加载脚本。
	 * @param {string} src - 脚本路径。
	 * @returns {Promise<void>}
	 * @private
	 */
	_loadScriptForBrowser(src) {
		return new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src = src;

			const timeoutId = setTimeout(() => {
				script.remove();
				reject(new Error(`Script loading timed out: ${src}`));
			}, 5000);

			script.onload = () => {
				clearTimeout(timeoutId);
				resolve();
			};

			script.onerror = () => {
				clearTimeout(timeoutId);
				reject(new Error(`Failed to load script: ${src}`));
			};

			document.head.appendChild(script);
		});
	}

	/**
	 * 获取翻译文本。
	 * @param {string} key - 翻译键。
	 * @param {Object} [params={}] - 用于替换占位符的参数。
	 * @returns {string} 翻译后的文本。
	 */
	t(key, params = {}) {
		if (!this.isReady || !this.translations) {
			// 在翻译未就绪时，返回key或尝试用参数格式化key
			return this._formatString(key, params);
		}

		const text = this.translations[key] || key;
		return this._formatString(text, params);
	}

	/**
	 * 格式化字符串，替换占位符。
	 * @param {string} str - 包含占位符的字符串。
	 * @param {Object} params - 参数对象。
	 * @returns {string} 格式化后的字符串。
	 * @private
	 */
	_formatString(str, params) {
		if (
			!params ||
			typeof params !== "object" ||
			Object.keys(params).length === 0
		) {
			return str;
		}

		let result = str;
		for (const [param, value] of Object.entries(params)) {
			// 使用全局替换，以处理同一个占位符多次出现的情况
			result = result.split(`{${param}}`).join(String(value));
		}
		return result;
	}

	/**
	 * 允许外部代码等待翻译系统准备就绪。
	 * @param {Function} [callback] - (可选) 准备就绪后执行的回调函数。
	 * @returns {Promise<void>}
	 */
	ready(callback) {
		const promise = this._initPromise || this.init();
		if (typeof callback === "function") {
			promise.then(callback);
		}
		return promise;
	}

	/**
	 * 切换语言并重新加载页面（仅限浏览器环境）。
	 * @param {string} lang - 目标语言代码。
	 */
	switchLanguage(lang) {
		if (lang === this.currentLang || this.isServiceWorker) {
			return;
		}

		if (typeof localStorage !== "undefined") {
			localStorage.setItem("app-lang", lang);
		}
		if (typeof location !== "undefined") {
			location.reload();
		}
	}
}
