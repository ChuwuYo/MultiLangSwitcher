/**
 * GitHub 更新检查器工具模块
 * 提供扩展版本更新检查功能
 */

/**
 * 获取本地化翻译的辅助函数
 * @param {string} key - 翻译键
 * @param {Object} params - 参数对象
 * @returns {string} 本地化的文本
 */
const getLocalizedText = (key, params = {}) => {
  // 早期返回 - 使用通用的 fallback 翻译系统
  if (typeof getFallbackTranslation === 'function') {
    return getFallbackTranslation(key, params);
  }

  // 如果 getFallbackTranslation 不可用，最后的回退
  return key;
};

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
    this.cacheTimeout = 4 * 60 * 60 * 1000; // 4小时缓存
    this.cacheKey = `updateChecker_${repoOwner}_${repoName}`;
    this.persistentCacheEnabled = true;

    // 重试配置
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 2000,        // 2秒基础延迟
      backoffMultiplier: 2,   // 指数退避倍数
      retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'API_ERROR', 'RATE_LIMIT', 'INVALID_RESPONSE', 'SSL_ERROR', 'DNS_ERROR']
    };
  }

  /**
   * 从 GitHub Releases API 检查更新，带重试机制
   * @param {AbortSignal} [signal] - 可选的中止信号用于取消请求
   * @returns {Promise<Object>} 更新信息对象
   */
  async checkForUpdates(signal = null) {
    try {
      // 在开始前检查请求是否已被取消
      if (signal?.aborted) {
        throw new Error(getLocalizedText('request_was_cancelled'));
      }

      // 首先检查内存缓存
      if (this.cache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
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
        throw new Error(getLocalizedText('request_was_cancelled'));
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
          throw new Error(getLocalizedText('request_was_cancelled'));
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
        if (this.isCancelledError(error)) {
          throw error;
        }

        // 只调用一次错误处理，避免重复处理
        const errorInfo = this.handleApiError(error);

        // 处理重试逻辑
        const shouldRetry = this.shouldRetryError(errorInfo, attempt);
        if (!shouldRetry) {
          throw this.enhanceErrorForFinalFailure(error, errorInfo, attempt);
        }

        // 执行重试延迟
        await this.executeRetryDelay(errorInfo, attempt, signal);
      }
    }

    throw lastError || new Error(getLocalizedText('update_check_failed_all_attempts'));
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
          reject(new Error(getLocalizedText('request_was_cancelled')));
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
        throw new Error(getLocalizedText('github_api_error', { status: response.status, statusText: response.statusText }));
      }

      // 解析响应数据
      const data = await response.json();

      // 验证响应数据
      if (!data.tag_name) {
        throw new Error(getLocalizedText('invalid_api_response_missing_tag'));
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
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name?.toLowerCase() || '';

    // 网络和连接错误
    if (errorMessage.includes('failed to fetch') ||
      errorMessage.includes('networkerror') ||
      errorMessage.includes('network error') ||
      errorName === 'networkerror') {
      return this.createErrorInfo('NETWORK_ERROR', 'network_connection_failed', true, 'check_internet_connection', error);
    }

    // 超时错误
    if (errorMessage.includes('timeout') ||
      errorMessage.includes('request timeout') ||
      errorName === 'aborterror') {
      return this.createErrorInfo('TIMEOUT', 'request_timed_out', true, 'try_stable_connection', error);
    }

      // 速率限制 (403 状态码或特定消息)
    if (errorMessage.includes('403') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('api rate limit exceeded')) {
      return this.createErrorInfo('RATE_LIMIT', 'github_rate_limit_exceeded', true, 'visit_github_manually', error);
    }

    // 资源未找到
    if (errorMessage.includes('404') ||
      errorMessage.includes('not found')) {
      return this.createErrorInfo('NOT_FOUND', 'repository_not_found', false, 'visit_github_repo_url', error);
    }

    // 服务器错误
    if (errorMessage.includes('500') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      errorMessage.includes('504') ||
      errorMessage.includes('github api error')) {
      return this.createErrorInfo('API_ERROR', 'github_api_unavailable', true, 'github_services_issues', error);
    }

    // 无效响应格式
    if (errorMessage.includes('invalid api response') ||
      errorMessage.includes('missing tag_name') ||
      errorMessage.includes('unexpected token') ||
      errorMessage.includes('json')) {
      return this.createErrorInfo('INVALID_RESPONSE', 'invalid_response_from_api', true, 'github_api_malformed_data', error);
    }

    // 版本解析错误
    if (errorMessage.includes('invalid version format') ||
      errorMessage.includes('version must have exactly 3 parts') ||
      errorMessage.includes('invalid version part')) {
      return this.createErrorInfo('VERSION_ERROR', 'unable_to_parse_version', false, 'visit_github_for_version', error);
    }

    // SSL/TLS 错误
    if (errorMessage.includes('ssl') ||
      errorMessage.includes('tls') ||
      errorMessage.includes('certificate')) {
      return this.createErrorInfo('SSL_ERROR', 'ssl_connection_error', true, 'check_firewall_settings', error);
    }

    // DNS 错误
    if (errorMessage.includes('dns') ||
      errorMessage.includes('name resolution')) {
      return this.createErrorInfo('DNS_ERROR', 'dns_resolution_error', true, 'check_dns_settings', error);
    }

    // CORS 错误
    if (errorMessage.includes('cors') ||
      errorMessage.includes('cross-origin')) {
      return this.createErrorInfo('CORS_ERROR', 'cors_request_blocked', false, 'reload_extension', error);
    }

    // 用户取消请求
    if (errorMessage.includes('request was cancelled') ||
      errorMessage.includes('operation was aborted')) {
      return this.createErrorInfo('CANCELLED', 'update_check_was_cancelled', false, null, error);
    }

    // 默认情况 - 通用未知错误
    return this.createErrorInfo('UNKNOWN_ERROR', 'unexpected_error_occurred', false, 'visit_github_repo_url', error);
  }

  /**
   * 创建统一格式的错误信息对象
   * @param {string} errorType - 错误类型
   * @param {string} messageKey - 消息键
   * @param {boolean} retryable - 是否可重试
   * @param {string|null} fallbackKey - 回退建议键
   * @param {Error} originalError - 原始错误
   * @returns {Object} 格式化的错误信息
   */
  createErrorInfo(errorType, messageKey, retryable, fallbackKey, originalError) {
    const userMessage = getLocalizedText(messageKey);
    const fallbackSuggestion = fallbackKey ? getLocalizedText(fallbackKey) : null;

    // 记录详细错误信息用于调试
    sendLocalizedUpdateLog('error_details', {
      type: errorType,
      message: originalError.message,
      stack: originalError.stack || 'N/A'
    }, 'error');

    return {
      type: errorType,
      message: userMessage,
      originalError: originalError.message,
      retryable: retryable,
      fallbackSuggestion: fallbackSuggestion,
      canRetry: retryable && this.retryConfig.retryableErrors.includes(errorType)
    };
  }

  /**
   * 检查错误是否为取消错误
   * @param {Error} error - 错误对象
   * @returns {boolean} 是否为取消错误
   */
  isCancelledError(error) {
    return error.message === 'Request was cancelled' || error.name === 'AbortError';
  }

  /**
   * 判断错误是否应该重试
   * @param {Object} errorInfo - 已处理的错误信息对象
   * @param {number} attempt - 当前尝试次数
   * @returns {boolean} 是否应该重试
   */
  shouldRetryError(errorInfo, attempt) {
    // 如果已达到最大尝试次数，不重试
    if (attempt >= this.retryConfig.maxAttempts) {
      return false;
    }

    // 检查错误类型是否可重试
    return this.retryConfig.retryableErrors.includes(errorInfo.type);
  }

  /**
   * 为最终失败增强错误信息
   * @param {Error} error - 原始错误
   * @param {Object} errorInfo - 已处理的错误信息对象
   * @param {number} attempt - 失败时的尝试次数
   * @returns {Error} 增强后的错误对象
   */
  enhanceErrorForFinalFailure(error, errorInfo, attempt) {
    sendLocalizedUpdateLog('update_check_failed_after_attempts', { 
      attempt: attempt, 
      error: errorInfo.type 
    }, 'error');

    // 创建增强的错误对象
    const enhancedError = new Error(errorInfo.message);
    enhancedError.type = errorInfo.type;
    enhancedError.originalError = error.message;
    enhancedError.retryable = errorInfo.retryable;
    enhancedError.canRetry = errorInfo.canRetry;
    enhancedError.fallbackSuggestion = errorInfo.fallbackSuggestion;
    enhancedError.attempts = attempt;
    enhancedError.maxAttempts = this.retryConfig.maxAttempts;

    return enhancedError;
  }

  /**
   * 执行重试延迟
   * @param {Object} errorInfo - 已处理的错误信息对象
   * @param {number} attempt - 当前尝试次数
   * @param {AbortSignal} signal - 中止信号
   */
  async executeRetryDelay(errorInfo, attempt, signal) {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    
    sendLocalizedUpdateLog('update_check_retry_delay', { 
      attempt: attempt, 
      error: errorInfo.type, 
      delay: delay 
    }, 'warning');

    await this.delay(delay, signal);
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
        await chrome.storage.local.set({ [this.cacheKey]: cacheData });

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
      const result = await chrome.storage.local.get([this.cacheKey]);

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
      await chrome.storage.local.remove([this.cacheKey]);

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