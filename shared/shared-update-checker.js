/**
 * GitHub 更新检查器
 * 提供扩展版本更新检查功能
 */

/**
 * 获取本地化翻译的辅助函数。
 * @param {string} key - 翻译键
 * @param {Object} [params={}] - 参数对象
 * @returns {string} 本地化的文本
 */
const getLocalizedText = (key, params = {}) => {
	// 依赖于 shared-utils.js 中的 getFallbackTranslation
	if (typeof getFallbackTranslation === "function") {
		return getFallbackTranslation(key, params);
	}
	// 最终回退
	return key;
};

/**
 * GitHub 发布版本更新检查器类
 */
class UpdateChecker {
	/**
	 * 构造函数
	 * @param {string} repoOwner - GitHub 仓库所有者
	 * @param {string} repoName - GitHub 仓库名称
	 * @param {string} currentVersion - 当前扩展版本
	 */
	constructor(repoOwner, repoName, currentVersion) {
		this.repoOwner = repoOwner;
		this.repoName = repoName;
		this.currentVersion = currentVersion;
		this.apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;
		this.cacheKey = `updateChecker_${repoOwner}_${repoName}`;
		this.cacheTimeout = 1 * 60 * 60 * 1000; // 1小时缓存
	}

	/**
	 * 检查更新，包含缓存逻辑
	 * @param {AbortSignal} [signal] - 用于中止请求的可选 AbortSignal
	 * @returns {Promise<Object>} 更新信息对象
	 */
	async checkForUpdates(signal) {
		const cached = await this.loadCache();
		if (cached) {
			return cached;
		}

		try {
			const releaseData = await this.fetchLatestRelease(signal);
			const updateInfo = this.formatUpdateInfo(releaseData);
			await this.saveCache(updateInfo);
			return updateInfo;
		} catch (error) {
			// 如果是中止错误，直接重新抛出，由调用方（如 popup.js）处理
			if (error.name === "AbortError") {
				throw error;
			}
			// 对于其他错误，进行轻量级分类和记录
			const message = String(error?.message || "").toLowerCase();
			let errorType = "UNEXPECTED_ERROR";

			if (error?.status >= 400) {
				errorType = "SERVICE_ISSUE";
			} else if (
				message.includes("failed to fetch") ||
				message.includes("network") ||
				message.includes("timeout")
			) {
				errorType = "NETWORK_ISSUE";
			}

			error.type = errorType;
			sendLocalizedUpdateLog(
				"update_check_failed",
				{ error: error.message },
				"error",
			);
			throw error;
		}
	}

	/**
	 * 从 jsDelivr CDN API 获取最新版本号（作为 GitHub API 的 Fallback）
	 * @returns {Promise<Object>} 兼容 GitHub API 的发布对象（含 tag_name）
	 */
	async fetchLatestVersionFromJsDelivr() {
		const jsDelivrUrl = `https://data.jsdelivr.com/v1/packages/gh/${this.repoOwner}/${this.repoName}`;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

		try {
			const response = await fetch(jsDelivrUrl, {
				signal: controller.signal,
				headers: { Accept: "application/json" },
			});

			if (!response.ok) {
				throw new Error(`jsDelivr API error: ${response.status}`);
			}

			const data = await response.json();
			if (
				!data ||
				!Array.isArray(data.versions) ||
				data.versions.length === 0
			) {
				throw new Error("No versions found in jsDelivr response");
			}

			// 过滤出稳定版本（排除预发布版本）
			const stableVersions = data.versions.filter(
				(v) => !/-beta|-rc|-alpha|-dev|-pre|-snapshot/i.test(v.version),
			);

			if (stableVersions.length === 0) {
				throw new Error("No stable versions found in jsDelivr response");
			}

			const latestVersion = stableVersions[0].version;

			// 构造一个兼容 GitHub API 格式的简化对象
			return {
				tag_name: latestVersion,
				html_url: `https://github.com/${this.repoOwner}/${this.repoName}/releases/tag/${latestVersion}`,
				body: null,
				published_at: null,
			};
		} catch (error) {
			if (error.name === "AbortError") {
				throw new Error("jsDelivr request timeout");
			}
			throw new Error(`jsDelivr fallback failed: ${error.message}`);
		} finally {
			clearTimeout(timeoutId);
		}
	}

	/**
	 * 改进后的 fetchLatestRelease，优先使用 GitHub API，失败时回退到 jsDelivr
	 * @param {AbortSignal} [signal] - 用于中止请求的可选 AbortSignal
	 * @returns {Promise<Object>} 发布数据（兼容 GitHub API）
	 */
	async fetchLatestRelease(signal = null) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

		// 如果外部提供了 signal，监听它的 abort 事件
		if (signal) {
			if (signal.aborted) {
				clearTimeout(timeoutId);
				// 使用 DOMException 以符合 fetch 的行为
				throw new DOMException("Request aborted", "AbortError");
			}
			signal.addEventListener("abort", () => controller.abort(), {
				once: true,
			});
		}

		try {
			// 先尝试官方 GitHub API
			const response = await fetch(this.apiUrl, {
				signal: controller.signal,
				headers: {
					Accept: "application/vnd.github.v3+json",
					"User-Agent": `MultiLangSwitcher/${this.currentVersion}`,
				},
			});

			if (!response.ok) {
				const error = new Error(`GitHub API error: ${response.status}`);
				error.status = response.status;
				throw error;
			}

			const data = await response.json();
			if (!data || !data.tag_name) {
				throw new Error("Invalid API response: missing tag_name");
			}

			return data;
		} catch (error) {
			// 如果是外部取消，直接抛出
			if (signal?.aborted) {
				throw new DOMException("Request aborted", "AbortError");
			}

			// GitHub API 失败，尝试 jsDelivr 作为回退
			sendLocalizedUpdateLog(
				"github_api_failed_trying_fallback",
				{ error: error.message },
				"warning",
			);

			try {
				return await this.fetchLatestVersionFromJsDelivr();
			} catch (fallbackError) {
				// 回退也失败了，记录后抛出原始错误以保留根因
				sendLocalizedUpdateLog(
					"jsdelivr_fallback_failed",
					{ error: fallbackError.message },
					"error",
				);
				throw error;
			}
		} finally {
			clearTimeout(timeoutId); // 统一在这里清理
		}
	}

	/**
	 * 格式化从 API 获取的更新信息
	 * @param {Object} releaseData - GitHub 发布 API 响应
	 * @returns {Object} 格式化的更新信息
	 */
	formatUpdateInfo(releaseData) {
		const latestVersion = releaseData.tag_name.replace(/^v/, "");
		const isNewer = this.isNewerVersion(this.currentVersion, latestVersion);

		return {
			updateAvailable: isNewer,
			currentVersion: this.currentVersion,
			latestVersion: latestVersion,
			releaseUrl: releaseData.html_url,
			releaseNotes: releaseData.body
				? releaseData.body.substring(0, 200)
				: getLocalizedText("no_release_notes"),
			publishedAt: releaseData.published_at,
		};
	}

	/**
	 * 比较版本号，判断最新版本是否大于当前版本
	 * @param {string} current - 当前版本
	 * @param {string} latest - 最新版本
	 * @returns {boolean} 如果有新版本则返回 true
	 */
	isNewerVersion(current, latest) {
		try {
			// 清理版本号：移除 'v' 前缀、预发布标签和构建元数据
			const cleanVersion = (ver) =>
				(ver || "").trim().replace(/^v/, "").split(/[-+]/)[0];

			const currentClean = cleanVersion(current);
			const latestClean = cleanVersion(latest);

			const currentParts = currentClean.split(".").map(Number);
			const latestParts = latestClean.split(".").map(Number);

			const maxLength = Math.max(currentParts.length, latestParts.length);

			for (let i = 0; i < maxLength; i++) {
				const curr = currentParts[i] || 0; // 补 0 处理 1.2 vs 1.2.3
				const lat = latestParts[i] || 0;

				if (Number.isNaN(curr) || Number.isNaN(lat)) {
					return false;
				}
				if (lat > curr) {
					return true;
				}
				if (lat < curr) {
					return false;
				}
			}
			return false; // 版本相同
		} catch (error) {
			sendLocalizedUpdateLog(
				"version_comparison_failed",
				{ error: error.message },
				"warning",
			);
			return false;
		}
	}

	/**
	 * 从 chrome.storage.local 加载缓存
	 * @returns {Promise<Object|null>} 缓存数据或 null
	 */
	async loadCache() {
		try {
			const result = await chrome.storage.local.get([this.cacheKey]);
			const cache = result[this.cacheKey];

			if (cache?.expiry && Date.now() < cache.expiry) {
				// 增加版本号校验：如果缓存中的版本与当前扩展版本不符，则缓存无效
				if (cache.data?.currentVersion === this.currentVersion) {
					return cache.data;
				}
			}
			return null;
		} catch (error) {
			sendLocalizedUpdateLog(
				"failed_load_persistent_cache",
				{ error: error.message },
				"warning",
			);
			return null;
		}
	}

	/**
	 * 保存更新信息到 chrome.storage.local
	 * @param {Object} updateInfo - 要缓存的更新信息
	 */
	async saveCache(updateInfo) {
		try {
			const cacheData = {
				data: updateInfo,
				expiry: Date.now() + this.cacheTimeout,
			};
			await chrome.storage.local.set({ [this.cacheKey]: cacheData });
		} catch (error) {
			sendLocalizedUpdateLog(
				"failed_cache_update_info",
				{ error: error.message },
				"warning",
			);
		}
	}

	/**
	 * 清理缓存
	 */
	async clearCache() {
		try {
			await chrome.storage.local.remove([this.cacheKey]);
		} catch (error) {
			sendLocalizedUpdateLog(
				"failed_clear_persistent_cache",
				{ error: error.message },
				"warning",
			);
		}
	}
}

// 导出以供其他模块使用
if (typeof module !== "undefined" && module.exports) {
	module.exports = UpdateChecker;
}
