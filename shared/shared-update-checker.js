// GitHub 更新检查器工具模块

/**
 * GitHub 发布版本更新检查器类
 * 集成 GitHub Releases API 来检查扩展更新
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
    this.timeout = 10000; // 10秒超时
    this.cache = null;
    this.cacheExpiry = null;
    this.cacheTimeout = 60 * 60 * 1000; // 1小时缓存
    this.cacheKey = `updateChecker_${repoOwner}_${repoName}`;
    this.persistentCacheEnabled = true;

    // 重试配置
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,        // 1秒基础延迟
      backoffMultiplier: 2,   // 指数退避倍数
      retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'API_ERROR', 'RATE_LIMIT']
    };
  }

  /**
   * 从 GitHub Releases API 检查更新，带重试机制
   * @param {AbortSignal} [signal] - 可选的中止信号用于取消请求
   * @returns {Promise<Object>} 更新信息对象
   */
  async checkForUpdates(signal = null) {
    try {
      // 内部调试信息，不输出到用户日志

      // 在开始前检查请求是否已被取消
      if (signal?.aborted) {
        throw new Error('Request was cancelled');
      }

      // 首先检查内存缓存
      if (this.cache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
        // 使用缓存信息，不需要用户日志
        return this.cache;
      }

      // 如果内存缓存过期/为空，检查持久化缓存
      const persistentCache = await this.loadPersistentCache();
      if (persistentCache && persistentCache.expiry && Date.now() < persistentCache.expiry) {
        sendLocalizedUpdateLog('using_persistent_cached_update_info', {}, 'info');
        // 恢复到内存缓存
        this.cache = persistentCache.data;
        this.cacheExpiry = persistentCache.expiry;
        return persistentCache.data;
      }

      // 获取最新发布信息
      const releaseData = await this.fetchLatestReleaseWithRetry(signal);

      // 获取后检查请求是否已被取消
      if (signal?.aborted) {
        throw new Error('Request was cancelled');
      }

      // 格式化更新信息
      const updateInfo = this.formatUpdateInfo(releaseData);

      // 将结果缓存到内存和持久化存储
      await this.cacheUpdateInfo(updateInfo);

      sendLocalizedUpdateLog('update_check_completed', { updateAvailable: updateInfo.updateAvailable }, 'success');
      return updateInfo;

    } catch (error) {
      if (error.message === 'Request was cancelled' || error.name === 'AbortError') {
        sendLocalizedUpdateLog('update_check_cancelled', {}, 'info');
        throw error;
      }

      const errorInfo = this.handleApiError(error);
      sendLocalizedUpdateLog('update_check_failed', { error: errorInfo.message }, 'error');
      throw errorInfo;
    }
  }

  /**
   * 使用重试机制和指数退避获取最新发布信息
   * @param {AbortSignal} [signal] - 可选的中止信号用于取消请求
   * @returns {Promise<Object>} GitHub 发布数据
   */
  async fetchLatestReleaseWithRetry(signal = null) {
    let lastError = null;

    // 执行重试循环
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        // 在尝试前检查请求是否已被取消
        if (signal?.aborted) {
          throw new Error('Request was cancelled');
        }

        sendLocalizedUpdateLog('update_check_attempt', { attempt: attempt, maxAttempts: this.retryConfig.maxAttempts }, 'info');

        // 尝试获取发布数据
        const releaseData = await this.fetchLatestRelease(signal);

        // 成功 - 返回数据
        if (attempt > 1) {
          sendLocalizedUpdateLog('update_check_succeeded_on_attempt', { attempt: attempt }, 'success');
        }
        return releaseData;

      } catch (error) {
        lastError = error;

        // 如果请求被取消，不要重试
        if (error.message === 'Request was cancelled' || error.name === 'AbortError') {
          throw error;
        }

        // 检查错误是否可重试
        const errorInfo = this.handleApiError(error);
        const isRetryable = this.retryConfig.retryableErrors.includes(errorInfo.type);

        // 如果这是最后一次尝试或错误不可重试，则不重试
        if (attempt === this.retryConfig.maxAttempts || !isRetryable) {
          sendLocalizedUpdateLog('update_check_failed_after_attempts', { attempt: attempt, error: errorInfo.type }, 'error');
          // 在抛出前增强错误信息
          const enhancedError = new Error(errorInfo.message);
          enhancedError.type = errorInfo.type;
          enhancedError.originalError = error.message;
          enhancedError.retryable = errorInfo.retryable;
          enhancedError.canRetry = errorInfo.canRetry;
          enhancedError.fallbackSuggestion = errorInfo.fallbackSuggestion;
          enhancedError.attempts = attempt;
          enhancedError.maxAttempts = this.retryConfig.maxAttempts;
          throw enhancedError;
        }

        // 使用指数退避计算延迟
        const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
        sendLocalizedUpdateLog('update_check_retry_delay', { attempt: attempt, error: errorInfo.type, delay: delay }, 'warning');

        // 重试前等待，但检查取消状态
        await this.delay(delay, signal);
      }
    }

    throw lastError || new Error('Update check failed after all retry attempts');
  }

  /**
   * 支持中止信号的延迟函数
   * @param {number} ms - 延迟毫秒数
   * @param {AbortSignal} [signal] - 可选的中止信号
   * @returns {Promise<void>}
   */
  async delay(ms, signal = null) {
    return new Promise((resolve, reject) => {
      // 检查是否已经被中止
      if (signal?.aborted) {
        reject(new Error('Request was cancelled'));
        return;
      }

      // 设置延迟定时器
      const timeoutId = setTimeout(() => {
        resolve();
      }, ms);

      // 监听中止信号
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Request was cancelled'));
        }, { once: true });
      }
    });
  }

  /**
   * 从 GitHub API 获取最新发布信息，支持超时和取消
   * @param {AbortSignal} [externalSignal] - 外部中止信号用于取消请求
   * @returns {Promise<Object>} GitHub 发布数据
   */
  async fetchLatestRelease(externalSignal = null) {
    // 创建内部控制器用于超时处理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // 合并外部信号和内部超时信号
    let combinedSignal = controller.signal;
    if (externalSignal) {
      // 如果外部信号已经被中止，立即中止
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        throw new Error('Request was cancelled');
      }

      // 监听外部中止信号
      externalSignal.addEventListener('abort', () => {
        controller.abort();
      }, { once: true });
    }

    try {
      // 发送 API 请求
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': `MultiLangSwitcher/${this.currentVersion}`
        },
        signal: combinedSignal
      });

      clearTimeout(timeoutId);

      // 检查响应状态
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      // 解析响应数据
      const data = await response.json();

      // 验证响应数据
      if (!data.tag_name) {
        throw new Error('Invalid API response: missing tag_name');
      }

      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      // 处理中止错误
      if (error.name === 'AbortError') {
        // 检查是外部取消还是超时
        if (externalSignal?.aborted) {
          throw new Error('Request was cancelled');
        } else {
          throw new Error('Request timeout');
        }
      }

      throw error;
    }
  }

  /**
   * 比较两个语义化版本
   * @param {string} current - 当前版本 (例如 "1.8.17")
   * @param {string} latest - 最新版本 (例如 "v1.9.0" 或 "1.9.0")
   * @returns {Object} 比较结果
   */
  compareVersions(current, latest) {
    try {
      // 通过移除 'v' 前缀来标准化版本格式
      const normalizedCurrent = current.replace(/^v/, '');
      const normalizedLatest = latest.replace(/^v/, '');

      // 解析版本号
      const currentParts = this.parseVersion(normalizedCurrent);
      const latestParts = this.parseVersion(normalizedLatest);

      // 比较主版本、次版本、补丁版本
      for (let i = 0; i < 3; i++) {
        if (latestParts[i] > currentParts[i]) {
          return {
            isNewer: true,
            currentParts,
            latestParts,
            difference: i === 0 ? 'major' : i === 1 ? 'minor' : 'patch'
          };
        } else if (latestParts[i] < currentParts[i]) {
          return {
            isNewer: false,
            currentParts,
            latestParts,
            difference: 'older'
          };
        }
      }

      // 版本相同
      return {
        isNewer: false,
        currentParts,
        latestParts,
        difference: 'same'
      };

    } catch (error) {
      sendLocalizedUpdateLog('version_comparison_failed', { error: error.message }, 'error');
      throw new Error(`Invalid version format: ${error.message}`);
    }
  }

  /**
   * 将语义化版本字符串解析为数字部分
   * @param {string} version - 版本字符串 (例如 "1.8.17")
   * @returns {number[]} [主版本, 次版本, 补丁版本] 数组
   */
  parseVersion(version) {
    // 分割版本字符串并转换为数字
    const parts = version.split('.').map(part => {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0) {
        throw new Error(`Invalid version part: ${part}`);
      }
      return num;
    });

    // 验证版本格式
    if (parts.length !== 3) {
      throw new Error(`Version must have exactly 3 parts: ${version}`);
    }

    return parts;
  }

  /**
   * 从 GitHub 发布数据格式化更新信息
   * @param {Object} releaseData - GitHub 发布 API 响应
   * @returns {Object} 格式化的更新信息
   */
  formatUpdateInfo(releaseData) {
    // 比较版本
    const comparison = this.compareVersions(this.currentVersion, releaseData.tag_name);

    return {
      updateAvailable: comparison.isNewer,
      currentVersion: this.currentVersion,
      latestVersion: releaseData.tag_name.replace(/^v/, ''),
      releaseUrl: releaseData.html_url,
      releaseNotes: releaseData.body ? releaseData.body.substring(0, 200) : '',
      publishedAt: releaseData.published_at,
      downloadUrl: releaseData.assets && releaseData.assets.length > 0
        ? releaseData.assets[0].browser_download_url
        : releaseData.html_url,
      versionComparison: comparison
    };
  }

  /**
   * 处理 API 错误并提供用户友好的错误信息，包含全面的错误检测
   * @param {Error} error - 原始错误
   * @returns {Object} 格式化的错误信息
   */
  handleApiError(error) {
    let errorType = 'UNKNOWN_ERROR';
    let userMessage = 'An unexpected error occurred';
    let retryable = false;
    let fallbackSuggestion = null;

    const errorMessage = error.message.toLowerCase();
    const errorName = error.name?.toLowerCase() || '';

    // 网络和连接错误
    if (errorMessage.includes('failed to fetch') ||
      errorMessage.includes('networkerror') ||
      errorMessage.includes('network error') ||
      errorName === 'networkerror') {
      errorType = 'NETWORK_ERROR';
      userMessage = 'Network connection failed. Please check your internet connection and try again.';
      retryable = true;
      fallbackSuggestion = 'Check your internet connection or try again later.';

      // 超时错误
    } else if (errorMessage.includes('timeout') ||
      errorMessage.includes('request timeout') ||
      errorName === 'aborterror') {
      errorType = 'TIMEOUT';
      userMessage = 'Request timed out. The server may be slow or your connection is unstable.';
      retryable = true;
      fallbackSuggestion = 'Try again with a stable internet connection.';

      // 速率限制 (403 状态码或特定消息)
    } else if (errorMessage.includes('403') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('api rate limit exceeded')) {
      errorType = 'RATE_LIMIT';
      userMessage = 'GitHub API rate limit exceeded. Please wait a few minutes before trying again.';
      retryable = true; // 等待后可以重试
      fallbackSuggestion = 'Visit the GitHub repository manually to check for updates.';

      // 仓库或资源未找到
    } else if (errorMessage.includes('404') ||
      errorMessage.includes('not found')) {
      errorType = 'NOT_FOUND';
      userMessage = 'Repository or release information not found. The repository may be private or moved.';
      retryable = false;
      fallbackSuggestion = 'Visit https://github.com/ChuwuYo/MultiLangSwitcher manually to check for updates.';

      // 服务器错误 (5xx)
    } else if (errorMessage.includes('500') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      errorMessage.includes('504') ||
      errorMessage.includes('github api error')) {
      errorType = 'API_ERROR';
      userMessage = 'GitHub API is temporarily unavailable. Please try again later.';
      retryable = true;
      fallbackSuggestion = 'GitHub services may be experiencing issues. Try again in a few minutes.';

      // 无效响应格式
    } else if (errorMessage.includes('invalid api response') ||
      errorMessage.includes('missing tag_name') ||
      errorMessage.includes('unexpected token') ||
      errorMessage.includes('json')) {
      errorType = 'INVALID_RESPONSE';
      userMessage = 'Received invalid response from GitHub API. The service may be experiencing issues.';
      retryable = true;
      fallbackSuggestion = 'GitHub API may be returning malformed data. Try again later.';

      // 版本解析错误
    } else if (errorMessage.includes('invalid version format') ||
      errorMessage.includes('version must have exactly 3 parts') ||
      errorMessage.includes('invalid version part')) {
      errorType = 'VERSION_ERROR';
      userMessage = 'Unable to parse version information. Please check for updates manually.';
      retryable = false;
      fallbackSuggestion = 'Visit the GitHub repository to check the latest release version manually.';

      // SSL/TLS 错误
    } else if (errorMessage.includes('ssl') ||
      errorMessage.includes('tls') ||
      errorMessage.includes('certificate')) {
      errorType = 'SSL_ERROR';
      userMessage = 'SSL/TLS connection error. Please check your network security settings.';
      retryable = true;
      fallbackSuggestion = 'Check your firewall or antivirus settings, or try again later.';

      // DNS 错误
    } else if (errorMessage.includes('dns') ||
      errorMessage.includes('name resolution')) {
      errorType = 'DNS_ERROR';
      userMessage = 'Unable to resolve GitHub API address. Please check your DNS settings.';
      retryable = true;
      fallbackSuggestion = 'Check your internet connection and DNS settings.';

      // CORS 错误 (在扩展环境中不应该发生，但以防万一)
    } else if (errorMessage.includes('cors') ||
      errorMessage.includes('cross-origin')) {
      errorType = 'CORS_ERROR';
      userMessage = 'Cross-origin request blocked. This may be a browser security issue.';
      retryable = false;
      fallbackSuggestion = 'Try reloading the extension or checking for updates manually.';

      // 用户取消请求
    } else if (errorMessage.includes('request was cancelled') ||
      errorMessage.includes('operation was aborted')) {
      errorType = 'CANCELLED';
      userMessage = 'Update check was cancelled.';
      retryable = false;
      fallbackSuggestion = null;

      // 通用未知错误
    } else {
      errorType = 'UNKNOWN_ERROR';
      userMessage = 'An unexpected error occurred while checking for updates.';
      retryable = false;
      fallbackSuggestion = 'Visit https://github.com/ChuwuYo/MultiLangSwitcher to check for updates manually.';
    }

    // 记录详细错误信息用于调试
    sendLocalizedUpdateLog('error_details', { type: errorType, message: error.message, stack: error.stack || 'N/A' }, 'error');

    return {
      type: errorType,
      message: userMessage,
      originalError: error.message,
      retryable: retryable,
      fallbackSuggestion: fallbackSuggestion,
      canRetry: retryable && ['TIMEOUT', 'NETWORK_ERROR', 'API_ERROR', 'RATE_LIMIT', 'INVALID_RESPONSE', 'SSL_ERROR', 'DNS_ERROR'].includes(errorType)
    };
  }

  /**
   * 在内存和持久化存储中缓存更新信息
   * @param {Object} updateInfo - 要缓存的更新信息
   */
  async cacheUpdateInfo(updateInfo) {
    const expiry = Date.now() + this.cacheTimeout;

    // 缓存到内存
    this.cache = updateInfo;
    this.cacheExpiry = expiry;

    // 如果启用，缓存到持久化存储
    if (this.persistentCacheEnabled) {
      try {
        const cacheData = {
          data: updateInfo,
          expiry: expiry,
          version: this.currentVersion,
          timestamp: Date.now()
        };

        // 保存到本地存储
        await new Promise((resolve, reject) => {
          chrome.storage.local.set({ [this.cacheKey]: cacheData }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });

        sendLocalizedUpdateLog('update_info_cached_persistently', {}, 'info');
      } catch (error) {
        sendLocalizedUpdateLog('failed_cache_update_info', { error: error.message }, 'warning');
        // 不抛出错误 - 内存缓存仍然工作
      }
    }
  }

  /**
   * 从存储中加载持久化缓存
   * @returns {Promise<Object|null>} 缓存数据或 null（如果未找到/已过期）
   */
  async loadPersistentCache() {
    if (!this.persistentCacheEnabled) {
      return null;
    }

    try {
      // 从本地存储获取缓存数据
      const result = await new Promise((resolve, reject) => {
        chrome.storage.local.get([this.cacheKey], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      });

      const cacheData = result[this.cacheKey];
      if (!cacheData) {
        return null;
      }

      // 验证缓存结构
      if (!cacheData.data || !cacheData.expiry || !cacheData.version) {
        sendLocalizedUpdateLog('invalid_persistent_cache_structure', {}, 'warning');
        await this.clearPersistentCache();
        return null;
      }

      // 检查缓存是否为相同版本
      if (cacheData.version !== this.currentVersion) {
        sendLocalizedUpdateLog('persistent_cache_different_version', {}, 'info');
        await this.clearPersistentCache();
        return null;
      }

      // 检查缓存是否已过期
      if (Date.now() >= cacheData.expiry) {
        sendLocalizedUpdateLog('persistent_cache_expired', {}, 'info');
        await this.clearPersistentCache();
        return null;
      }

      // 内部缓存操作，不输出到用户日志
      return cacheData;

    } catch (error) {
      sendLocalizedUpdateLog('failed_load_persistent_cache', { error: error.message }, 'warning');
      return null;
    }
  }

  /**
   * 从存储中清除持久化缓存
   */
  async clearPersistentCache() {
    if (!this.persistentCacheEnabled) {
      return;
    }

    try {
      // 从本地存储移除缓存
      await new Promise((resolve, reject) => {
        chrome.storage.local.remove([this.cacheKey], () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });

      sendLocalizedUpdateLog('persistent_cache_cleared', {}, 'info');
    } catch (error) {
      sendLocalizedUpdateLog('failed_clear_persistent_cache', { error: error.message }, 'warning');
    }
  }

  /**
   * 清除缓存的更新信息（内存和持久化）
   */
  async clearCache() {
    this.cache = null;
    this.cacheExpiry = null;
    await this.clearPersistentCache();
    sendLocalizedUpdateLog('update_checker_cache_cleared', {}, 'info');
  }

  /**
   * 获取包含持久化缓存的综合缓存状态
   * @returns {Promise<Object>} 缓存信息
   */
  async getCacheStatus() {
    // 内存缓存状态
    const memoryCache = {
      hasCachedData: !!this.cache,
      cacheExpiry: this.cacheExpiry,
      isExpired: this.cacheExpiry ? Date.now() >= this.cacheExpiry : true
    };

    // 持久化缓存状态
    let persistentCache = { hasCachedData: false, isExpired: true };

    if (this.persistentCacheEnabled) {
      try {
        const cacheData = await this.loadPersistentCache();
        persistentCache = {
          hasCachedData: !!cacheData,
          cacheExpiry: cacheData?.expiry,
          isExpired: cacheData ? Date.now() >= cacheData.expiry : true,
          version: cacheData?.version,
          timestamp: cacheData?.timestamp
        };
      } catch (error) {
        sendLocalizedUpdateLog('error_getting_cache_status', { error: error.message }, 'warning');
      }
    }

    return {
      memory: memoryCache,
      persistent: persistentCache,
      cacheTimeout: this.cacheTimeout,
      persistentCacheEnabled: this.persistentCacheEnabled
    };
  }

  /**
   * 通过清理过期条目和管理存储来优化缓存
   */
  async optimizeCache() {
    try {
      // 如果过期则清理内存缓存
      if (this.cacheExpiry && Date.now() >= this.cacheExpiry) {
        this.cache = null;
        this.cacheExpiry = null;
        sendLocalizedUpdateLog('expired_memory_cache_cleaned', {}, 'info');
      }

      // 如果过期则清理持久化缓存
      if (this.persistentCacheEnabled) {
        const cacheData = await this.loadPersistentCache();
        if (!cacheData) {
          sendLocalizedUpdateLog('persistent_cache_optimization_completed', {}, 'info');
        }
      }

      return true;
    } catch (error) {
      sendLocalizedUpdateLog('cache_optimization_failed', { error: error.message }, 'warning');
      return false;
    }
  }

  /**
   * 预加载缓存数据以加快后续请求
   */
  async preloadCache() {
    if (!this.persistentCacheEnabled) {
      return false;
    }

    try {
      const cacheData = await this.loadPersistentCache();
      if (cacheData && cacheData.expiry && Date.now() < cacheData.expiry) {
        this.cache = cacheData.data;
        this.cacheExpiry = cacheData.expiry;
        // 内部缓存操作，不输出到用户日志
        return true;
      }
      return false;
    } catch (error) {
      sendLocalizedUpdateLog('cache_preload_failed', { error: error.message }, 'warning');
      return false;
    }
  }

  /**
   * 当 GitHub API 完全不可用时提供优雅的回退方案
   * @returns {Object} 回退更新信息
   */
  getGracefulFallback() {
    sendLocalizedUpdateLog('providing_graceful_fallback', {}, 'info');

    return {
      updateAvailable: false,
      currentVersion: this.currentVersion,
      latestVersion: this.currentVersion,
      releaseUrl: `https://github.com/${this.repoOwner}/${this.repoName}/releases`,
      releaseNotes: 'Unable to check for updates automatically. Please visit the repository to check manually.',
      publishedAt: null,
      downloadUrl: `https://github.com/${this.repoOwner}/${this.repoName}/releases/latest`,
      versionComparison: {
        isNewer: false,
        currentParts: this.parseVersion(this.currentVersion),
        latestParts: this.parseVersion(this.currentVersion),
        difference: 'unknown'
      },
      fallbackMode: true,
      fallbackMessage: 'GitHub API is unavailable. Visit the repository to check for updates manually.'
    };
  }

  /**
   * 检查更新
   * @param {AbortSignal} [signal] - 可选的 AbortSignal，用于取消请求
   * @param {boolean} [allowFallback=true] - 当完全失败时是否使用优雅降级
   * @returns {Promise<Object>} 更新信息对象
   */
  async checkForUpdatesWithFallback(signal = null, allowFallback = true) {
    try {
      return await this.checkForUpdates(signal);
    } catch (error) {
      // 如果请求被取消，则不使用降级
      if (error.message === 'Request was cancelled' || error.name === 'AbortError') {
        throw error;
      }

      // 对于某些关键错误，如果启用，则提供优雅降级
      if (allowFallback && error.type && ['API_ERROR', 'NOT_FOUND', 'NETWORK_ERROR'].includes(error.type)) {
        sendLocalizedUpdateLog('using_graceful_fallback', { error: error.type }, 'warning');
        return this.getGracefulFallback();
      }

      // 对于其他情况，重新抛出错误
      throw error;
    }
  }
}

// 导出以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UpdateChecker;
}