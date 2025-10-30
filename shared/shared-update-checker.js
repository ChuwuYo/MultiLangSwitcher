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
  if (typeof getFallbackTranslation === 'function') {
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
    this.cacheTimeout = 4 * 60 * 60 * 1000; // 4小时缓存
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
      if (error.name === 'AbortError') {
        throw error;
      }
      // 对于其他错误，进行分类和记录
      const classifiedError = this.classifyError(error);
      sendLocalizedUpdateLog('update_check_failed', { error: classifiedError.message }, 'error');
      throw classifiedError;
    }
  }

  /**
   * 从 GitHub API 获取最新发布信息，带超时处理
   * @param {AbortSignal} [signal] - 用于中止请求的可选 AbortSignal
   * @returns {Promise<Object>} GitHub 发布数据
   */
  async fetchLatestRelease(signal = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

    // 如果外部提供了 signal，监听它的 abort 事件
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timeoutId);
        // 使用 DOMException 以符合 fetch 的行为
        throw new DOMException('Request aborted', 'AbortError');
      }
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await fetch(this.apiUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': `MultiLangSwitcher/${this.currentVersion}`
        }
      });

      if (!response.ok) {
        // 直接抛出包含状态的错误，以便后续分类
        const error = new Error(`GitHub API error: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      if (!data || !data.tag_name) {
        throw new Error('Invalid API response: missing tag_name');
      }
      return data;
    } catch (error) {
      // 如果是中止错误，但不是由外部信号触发的，那么它就是超时
      if (error.name === 'AbortError' && !signal?.aborted) {
        throw new Error('Request timeout');
      }
      throw error; // 重新抛出外部取消错误或其他网络错误
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 格式化从 API 获取的更新信息
   * @param {Object} releaseData - GitHub 发布 API 响应
   * @returns {Object} 格式化的更新信息
   */
  formatUpdateInfo(releaseData) {
    const latestVersion = releaseData.tag_name.replace(/^v/, '');
    const isNewer = this.isNewerVersion(this.currentVersion, latestVersion);

    return {
      updateAvailable: isNewer,
      currentVersion: this.currentVersion,
      latestVersion: latestVersion,
      releaseUrl: releaseData.html_url,
      releaseNotes: releaseData.body ? releaseData.body.substring(0, 200) : getLocalizedText('no_release_notes'),
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
      const currentParts = current.split('.').map(Number);
      const latestParts = latest.split('.').map(Number);

      for (let i = 0; i < 3; i++) {
        if (isNaN(currentParts[i]) || isNaN(latestParts[i])) {
          return false; // 版本号格式错误
        }
        if (latestParts[i] > currentParts[i]) {
          return true;
        }
        if (latestParts[i] < currentParts[i]) {
          return false;
        }
      }
      return false; // 版本相同
    } catch (error) {
      sendLocalizedUpdateLog('version_comparison_failed', { error: error.message }, 'warning');
      return false;
    }
  }

  /**
   * 分类 API 错误，并附加一个明确的类型
   * @param {Error} error - 原始错误
   * @returns {Error} 带有 `type` 属性的错误对象
   */
  classifyError(error) {
    const message = error.message.toLowerCase();
    let errorType = 'UNEXPECTED_ERROR'; // 默认类型

    // 1. 网络问题
    if (message.includes('failed to fetch') || message.includes('network') || message.includes('timeout') || message.includes('dns') || message.includes('ssl') || message.includes('cors')) {
      errorType = 'NETWORK_ISSUE';
    }
    // 2. 服务问题 (API)
    else if (error.status >= 400 || message.includes('api') || message.includes('rate limit') || message.includes('invalid') || message.includes('unexpected token')) {
      errorType = 'SERVICE_ISSUE';
    }

    // 附加类型并返回
    error.type = errorType;
    return error;
  }

  /**
   * 从 chrome.storage.local 加载缓存
   * @returns {Promise<Object|null>} 缓存数据或 null
   */
  async loadCache() {
    try {
      const result = await chrome.storage.local.get([this.cacheKey]);
      const cache = result[this.cacheKey];

      if (cache && cache.expiry && Date.now() < cache.expiry) {
        // 增加版本号校验：如果缓存中的版本与当前扩展版本不符，则缓存无效
        if (cache.data && cache.data.currentVersion === this.currentVersion) {
          return cache.data;
        }
      }
      return null;
    } catch (error) {
      sendLocalizedUpdateLog('failed_load_persistent_cache', { error: error.message }, 'warning');
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
      sendLocalizedUpdateLog('failed_cache_update_info', { error: error.message }, 'warning');
    }
  }

  /**
   * 清理缓存
   */
  async clearCache() {
    try {
      await chrome.storage.local.remove([this.cacheKey]);
    } catch (error) {
      sendLocalizedUpdateLog('failed_clear_persistent_cache', { error: error.message }, 'warning');
    }
  }
}

// 导出以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UpdateChecker;
}