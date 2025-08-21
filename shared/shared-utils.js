/**
 * 共享工具函数模块
 * 提供调试日志、语言检测、本地化翻译等通用功能
 */

/**
 * 发送调试日志消息到后台脚本
 * @param {string} message - 日志消息内容
 * @param {string} logType - 日志类型 (info, warning, error, success)
 */
const sendDebugLog = (message, logType = 'info') => {
  // 验证输入
  if (!message) return;

  try {
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG',
        message: String(message),
        logType
      }).catch(() => {
        // 静默处理消息发送失败，避免控制台噪音
      });
    }
  } catch (error) {
    // Chrome API不可用时的降级处理
    console.warn('Debug log failed:', error);
  }
};

/**
 * 检测浏览器界面语言
 * @returns {string} 返回 'zh' 或 'en'
 */
const detectBrowserLanguage = () => {
  try {
    const browserLang = chrome.i18n.getUILanguage().toLowerCase();
    return browserLang.startsWith('zh') ? 'zh' : 'en';
  } catch (error) {
    // API不可用时默认返回英文
    return 'en';
  }
};
/**
 * 获取更新相关的本地化翻译
 * @param {string} key - 翻译键
 * @param {Object} params - 参数对象，用于替换翻译文本中的占位符
 * @param {string} context - 上下文 ('popup' 或 'background')
 * @returns {string} 本地化的文本
 */
const getUpdateTranslation = (key, params = {}, context = 'popup') => {
  try {
    // 尝试从全局i18n实例获取翻译
    let translation = key; // 默认返回键名作为fallback

    // 智能检测上下文：如果指定了background但backgroundI18n不可用，尝试其他i18n实例
    if (context === 'background' && typeof backgroundI18n !== 'undefined' && backgroundI18n.initialized) {
      translation = backgroundI18n.t(key, params);
    } else if (context === 'popup' && typeof popupI18n !== 'undefined') {
      translation = popupI18n.t(key);
    } else {
      // 自动检测可用的i18n实例
      if (typeof backgroundI18n !== 'undefined' && backgroundI18n.initialized) {
        translation = backgroundI18n.t(key, params);
      } else if (typeof popupI18n !== 'undefined') {
        translation = popupI18n.t(key);
      } else if (typeof debugI18n !== 'undefined') {
        translation = debugI18n.t(key);
      }
    }

    // 如果没有找到翻译或翻译就是键名本身，使用fallback机制
    if (translation === key) {
      translation = getFallbackTranslation(key, params);
    }

    // 替换参数占位符（针对popup上下文，因为popup的t方法不支持参数）
    if ((context === 'popup' || typeof popupI18n !== 'undefined') && Object.keys(params).length > 0) {
      Object.keys(params).forEach(param => {
        translation = translation.replace(`{${param}}`, params[param]);
      });
    }

    return translation;
  } catch (error) {
    console.warn('Failed to get update translation:', error);
    return getFallbackTranslation(key, params);
  }
};

/**
 * 获取通用的fallback翻译
 * @param {string} key - 翻译键
 * @param {Object} params - 参数对象
 * @returns {string} fallback翻译文本
 */
const getFallbackTranslation = (key, params = {}) => {
  // 检测当前语言，优先使用i18n实例的语言设置
  let currentLang = 'en';
  try {
    // 1. 优先从已初始化的i18n实例获取当前语言
    if (typeof backgroundI18n !== 'undefined' && backgroundI18n.isReady) {
      currentLang = backgroundI18n.currentLang;
    } else if (typeof popupI18n !== 'undefined' && popupI18n.isReady) {
      currentLang = popupI18n.currentLang;
    } else if (typeof debugI18n !== 'undefined' && debugI18n.isReady) {
      currentLang = debugI18n.currentLang;
    } else if (typeof detectI18n !== 'undefined' && detectI18n.isReady) {
      currentLang = detectI18n.currentLang;
    } else {
      // 2. 如果没有可用的i18n实例，尝试使用localStorage中保存的用户语言设置
      // 注意：在Service Worker环境中localStorage不可用，需要安全检查
      if (typeof localStorage !== 'undefined' && localStorage) {
        try {
          const savedLang = localStorage.getItem('app-lang');
          if (savedLang) {
            currentLang = savedLang;
          } else {
            // 3. 如果没有保存的设置，使用浏览器语言检测
            if (typeof detectBrowserLanguage === 'function') {
              currentLang = detectBrowserLanguage();
            } else if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
              const browserLang = chrome.i18n.getUILanguage().toLowerCase();
              currentLang = browserLang.startsWith('zh') ? 'zh' : 'en';
            }
          }
        } catch (error) {
          // localStorage访问失败时的降级处理
          if (typeof detectBrowserLanguage === 'function') {
            currentLang = detectBrowserLanguage();
          } else if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
            const browserLang = chrome.i18n.getUILanguage().toLowerCase();
            currentLang = browserLang.startsWith('zh') ? 'zh' : 'en';
          }
        }
      } else {
        // 4. 在Service Worker环境中或localStorage不可用时，使用浏览器语言检测
        if (typeof detectBrowserLanguage === 'function') {
          currentLang = detectBrowserLanguage();
        } else if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
          const browserLang = chrome.i18n.getUILanguage().toLowerCase();
          currentLang = browserLang.startsWith('zh') ? 'zh' : 'en';
        }
      }
    }
  } catch (error) {
    currentLang = 'en';
  }

  // 尝试从现有的翻译对象获取翻译
  let translation = null;

  // 定义要尝试的翻译对象列表（按优先级排序）
  const translationSources = currentLang === 'zh'
    ? [
      () => typeof backgroundZh !== 'undefined' ? backgroundZh : null,
      () => typeof popupZh !== 'undefined' ? popupZh : null,
      () => typeof debugZh !== 'undefined' ? debugZh : null,
      () => typeof detectZh !== 'undefined' ? detectZh : null,
      () => typeof domainManagerZh !== 'undefined' ? domainManagerZh : null
    ]
    : [
      () => typeof backgroundEn !== 'undefined' ? backgroundEn : null,
      () => typeof popupEn !== 'undefined' ? popupEn : null,
      () => typeof debugEn !== 'undefined' ? debugEn : null,
      () => typeof detectEn !== 'undefined' ? detectEn : null,
      () => typeof domainManagerEn !== 'undefined' ? domainManagerEn : null
    ];

  // 依次尝试从各个翻译对象中获取翻译
  for (const getTranslationObj of translationSources) {
    try {
      const translationObj = getTranslationObj();
      if (translationObj && translationObj[key] && translationObj[key] !== key) {
        translation = translationObj[key];
        break;
      }
    } catch (error) {
      // 忽略访问错误，继续尝试下一个
      continue;
    }
  }

  // 如果找到翻译，处理参数替换并返回
  if (translation && translation !== key) {
    Object.keys(params).forEach(param => {
      translation = translation.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
    });
    return translation;
  }

  // 完整的 fallback 翻译
  const fallbackTranslations = {
    en: {
      'check_for_updates': 'Check for updates',
      'checking_updates': 'Checking for updates...',
      'update_available': 'Update available: v{version}',
      'no_updates_available': "You're using the latest version",
      'current_version': 'Current: v{current}',
      'latest_version': 'Latest: v{latest}',
      'view_release': 'View Release',
      'download_update': 'Download Update',
      'update_check_failed': 'Failed to check for updates',
      'network_error': 'Network error occurred',
      'rate_limit_exceeded': 'Rate limit exceeded, try again later',
      'invalid_response': 'Invalid response from server',
      'update_check_success': 'Update check completed successfully',
      'update_notification_title': 'Extension Update Available',
      'update_check_initiated': 'Update check initiated for repository: {repo}',
      'update_check_api_request': 'Making API request to GitHub releases endpoint',
      'update_check_network_error': 'Network error during update check: {error}',
      'update_check_rate_limited': 'GitHub API rate limit exceeded during update check',
      'update_check_invalid_response': 'Invalid response from GitHub API: {response}',
      'update_check_version_comparison': 'Version comparison: current={current}, latest={latest}, result={result}',
      'update_check_no_update_needed': 'No update needed, current version is latest',
      'update_check_update_available': 'Update available: {current} -> {latest}',
      'update_check_timeout': 'Update check timed out after {timeout}ms',
      'update_check_parsing_error': 'Error parsing version information: {error}',
      'update_check_cache_hit': 'Using cached update check result',
      'update_check_cache_expired': 'Update check cache expired, fetching fresh data',
      // Cache management messages
      'using_persistent_cached_update_info': 'Using persistent cached update information',
      'update_check_cancelled': 'Update check was cancelled',
      'update_info_cached_persistently': 'Update information cached persistently',
      'failed_cache_update_info': 'Failed to cache update info persistently: {error}',
      'invalid_persistent_cache_structure': 'Invalid persistent cache structure, clearing',
      'persistent_cache_different_version': 'Persistent cache is for different version, clearing',
      'persistent_cache_expired': 'Persistent cache expired, clearing',
      'failed_load_persistent_cache': 'Failed to load persistent cache: {error}',
      'persistent_cache_cleared': 'Persistent cache cleared',
      'failed_clear_persistent_cache': 'Failed to clear persistent cache: {error}',
      'update_checker_cache_cleared': 'Update checker cache cleared',
      'expired_memory_cache_cleaned': 'Expired memory cache cleaned up',
      'persistent_cache_optimization_completed': 'Persistent cache optimization completed - no cleanup needed',
      'cache_optimization_failed': 'Cache optimization failed: {error}',
      'cache_preload_failed': 'Cache preload failed: {error}',
      'providing_graceful_fallback': 'Providing graceful fallback for update check',
      'using_graceful_fallback': 'Using graceful fallback due to {error}',
      'update_check_attempt': 'Update check attempt {attempt}/{maxAttempts}',
      'update_check_succeeded_on_attempt': 'Update check succeeded on attempt {attempt}',
      'update_check_failed_after_attempts': 'Update check failed after {attempt} attempts. Error: {error}',
      'update_check_retry_delay': 'Update check attempt {attempt} failed ({error}), retrying in {delay}ms...',
      'version_comparison_failed': 'Version comparison failed: {error}',
      'error_details': 'Error details - Type: {type}, Original: {message}, Stack: {stack}',
      'error_getting_cache_status': 'Error getting persistent cache status: {error}',
      'update_check_completed': 'Update check completed. Update available: {updateAvailable}',
      'update_check_failed': 'Update check failed: {error}',
      // Error messages for thrown errors
      'request_was_cancelled': 'Request was cancelled',
      'request_timeout': 'Request timeout',
      'github_api_error': 'GitHub API error: {status} {statusText}',
      'invalid_api_response_missing_tag': 'Invalid API response: missing tag_name',
      'invalid_version_format': 'Invalid version format: {message}',
      'invalid_version_part': 'Invalid version part: {part}',
      'version_must_have_3_parts': 'Version must have exactly 3 parts: {version}',
      'update_check_failed_all_attempts': 'Update check failed after all retry attempts',
      // User-friendly error messages
      'network_connection_failed': 'Network connection failed. Please check your internet connection and try again.',
      'request_timed_out': 'Request timed out. The server may be slow or your connection is unstable.',
      'github_rate_limit_exceeded': 'GitHub API rate limit exceeded. Please wait a few minutes before trying again.',
      'repository_not_found': 'Repository or release information not found. The repository may be private or moved.',
      'github_api_unavailable': 'GitHub API is temporarily unavailable. Please try again later.',
      'invalid_response_from_api': 'Received invalid response from GitHub API. The service may be experiencing issues.',
      'unable_to_parse_version': 'Unable to parse version information. Please check for updates manually.',
      'ssl_connection_error': 'SSL/TLS connection error. Please check your network security settings.',
      'dns_resolution_error': 'Unable to resolve GitHub API address. Please check your DNS settings.',
      'cors_request_blocked': 'Cross-origin request blocked. This may be a browser security issue.',
      'update_check_was_cancelled': 'Update check was cancelled.',
      'unexpected_error_occurred': 'An unexpected error occurred while checking for updates.',
      // Fallback suggestions
      'check_internet_connection': 'Check your internet connection or try again later.',
      'try_stable_connection': 'Try again with a stable internet connection.',
      'visit_github_manually': 'Visit the GitHub repository manually to check for updates.',
      'visit_github_repo_url': 'Visit https://github.com/ChuwuYo/MultiLangSwitcher manually to check for updates.',
      'github_services_issues': 'GitHub services may be experiencing issues. Try again in a few minutes.',
      'github_api_malformed_data': 'GitHub API may be returning malformed data. Try again later.',
      'visit_github_for_version': 'Visit the GitHub repository to check the latest release version manually.',
      'check_firewall_settings': 'Check your firewall or antivirus settings, or try again later.',
      'check_dns_settings': 'Check your internet connection and DNS settings.',
      'reload_extension': 'Try reloading the extension or checking for updates manually.',
      // Debug log message
      'debug_log_started': 'Debug log started'
    },
    zh: {
      'check_for_updates': '检查更新',
      'checking_updates': '正在检查更新...',
      'update_available': '发现可用更新: v{version}',
      'no_updates_available': '您正在使用最新版本',
      'current_version': '当前: v{current}',
      'latest_version': '最新: v{latest}',
      'view_release': '查看发布',
      'download_update': '下载更新',
      'update_check_failed': '检查更新失败',
      'network_error': '发生网络错误',
      'rate_limit_exceeded': '请求频率超限，请稍后重试',
      'invalid_response': '服务器响应无效',
      'update_check_success': '更新检查成功完成',
      'update_notification_title': '扩展更新可用',
      'update_check_initiated': '为仓库启动更新检查: {repo}',
      'update_check_api_request': '向 GitHub releases 端点发起 API 请求',
      'update_check_network_error': '更新检查时发生网络错误: {error}',
      'update_check_rate_limited': '更新检查时 GitHub API 请求频率超限',
      'update_check_invalid_response': 'GitHub API 响应无效: {response}',
      'update_check_version_comparison': '版本比较: 当前={current}, 最新={latest}, 结果={result}',
      'update_check_no_update_needed': '无需更新，当前版本已是最新',
      'update_check_update_available': '发现可用更新: {current} -> {latest}',
      'update_check_timeout': '更新检查超时，超时时间 {timeout}ms',
      'update_check_parsing_error': '解析版本信息时出错: {error}',
      'update_check_cache_hit': '使用缓存的更新检查结果',
      'update_check_cache_expired': '更新检查缓存已过期，正在获取最新数据',
      // 缓存管理消息
      'using_persistent_cached_update_info': '使用持久化缓存的更新信息',
      'update_check_cancelled': '更新检查已取消',
      'update_info_cached_persistently': '更新信息已持久化缓存',
      'failed_cache_update_info': '持久化缓存更新信息失败: {error}',
      'invalid_persistent_cache_structure': '持久化缓存结构无效，正在清除',
      'persistent_cache_different_version': '持久化缓存版本不同，正在清除',
      'persistent_cache_expired': '持久化缓存已过期，正在清除',
      'failed_load_persistent_cache': '加载持久化缓存失败: {error}',
      'persistent_cache_cleared': '持久化缓存已清除',
      'failed_clear_persistent_cache': '清除持久化缓存失败: {error}',
      'update_checker_cache_cleared': '更新检查器缓存已清除',
      'expired_memory_cache_cleaned': '过期内存缓存已清理',
      'persistent_cache_optimization_completed': '持久化缓存优化完成 - 无需清理',
      'cache_optimization_failed': '缓存优化失败: {error}',
      'cache_preload_failed': '缓存预加载失败: {error}',
      'providing_graceful_fallback': '为更新检查提供优雅降级',
      'using_graceful_fallback': '由于 {error} 使用优雅降级',
      'update_check_attempt': '更新检查尝试 {attempt}/{maxAttempts}',
      'update_check_succeeded_on_attempt': '更新检查在第 {attempt} 次尝试时成功',
      'update_check_failed_after_attempts': '更新检查在 {attempt} 次尝试后失败。错误: {error}',
      'update_check_retry_delay': '更新检查第 {attempt} 次尝试失败 ({error})，将在 {delay}ms 后重试...',
      'version_comparison_failed': '版本比较失败: {error}',
      'error_details': '错误详情 - 类型: {type}, 原始: {message}, 堆栈: {stack}',
      'error_getting_cache_status': '获取持久化缓存状态时出错: {error}',
      'update_check_completed': '更新检查完成。有可用更新: {updateAvailable}',
      'update_check_failed': '更新检查失败: {error}',
      // 抛出错误的消息
      'request_was_cancelled': '请求已取消',
      'request_timeout': '请求超时',
      'github_api_error': 'GitHub API 错误: {status} {statusText}',
      'invalid_api_response_missing_tag': '无效的 API 响应: 缺少 tag_name',
      'invalid_version_format': '无效的版本格式: {message}',
      'invalid_version_part': '无效的版本部分: {part}',
      'version_must_have_3_parts': '版本必须包含 3 个部分: {version}',
      'update_check_failed_all_attempts': '所有重试尝试后更新检查失败',
      // 用户友好的错误消息
      'network_connection_failed': '网络连接失败。请检查您的网络连接并重试。',
      'request_timed_out': '请求超时。服务器可能响应缓慢或您的连接不稳定。',
      'github_rate_limit_exceeded': 'GitHub API 请求频率超限。请等待几分钟后重试。',
      'repository_not_found': '未找到仓库或发布信息。仓库可能是私有的或已移动。',
      'github_api_unavailable': 'GitHub API 暂时不可用。请稍后重试。',
      'invalid_response_from_api': '从 GitHub API 收到无效响应。服务可能遇到问题。',
      'unable_to_parse_version': '无法解析版本信息。请手动检查更新。',
      'ssl_connection_error': 'SSL/TLS 连接错误。请检查您的网络安全设置。',
      'dns_resolution_error': '无法解析 GitHub API 地址。请检查您的 DNS 设置。',
      'cors_request_blocked': '跨域请求被阻止。这可能是浏览器安全问题。',
      'update_check_was_cancelled': '更新检查已取消。',
      'unexpected_error_occurred': '检查更新时发生意外错误。',
      // 回退建议
      'check_internet_connection': '检查您的网络连接或稍后重试。',
      'try_stable_connection': '请在稳定的网络连接下重试。',
      'visit_github_manually': '请手动访问 GitHub 仓库检查更新。',
      'visit_github_repo_url': '请手动访问 https://github.com/ChuwuYo/MultiLangSwitcher 检查更新。',
      'github_services_issues': 'GitHub 服务可能遇到问题。请几分钟后重试。',
      'github_api_malformed_data': 'GitHub API 可能返回了格式错误的数据。请稍后重试。',
      'visit_github_for_version': '请访问 GitHub 仓库手动检查最新发布版本。',
      'check_firewall_settings': '检查您的防火墙或杀毒软件设置，或稍后重试。',
      'check_dns_settings': '检查您的网络连接和 DNS 设置。',
      'reload_extension': '尝试重新加载扩展或手动检查更新。',
      // 调试日志消息
      'debug_log_started': '调试日志已启动'
    }
  };

  const translations = fallbackTranslations[currentLang] || fallbackTranslations['en'];
  let text = translations[key] || key;

  // 替换参数占位符
  Object.keys(params).forEach(param => {
    text = text.replace(`{${param}}`, params[param]);
  });

  return text;
}

/**
 * 发送本地化的更新相关调试日志
 * @param {string} key - 翻译键
 * @param {Object} params - 参数对象
 * @param {string} logType - 日志类型 (info, warning, error, success)
 */
const sendLocalizedUpdateLog = (key, params = {}, logType = 'info') => {
  try {
    const message = getUpdateTranslation(key, params, 'background');
    sendDebugLog(message, logType);
  } catch (error) {
    console.error('Error in sendLocalizedUpdateLog:', error);
    // 如果翻译失败，直接使用fallback
    const fallbackMessage = getFallbackTranslation(key, params);
    sendDebugLog(fallbackMessage, logType);
  }
};