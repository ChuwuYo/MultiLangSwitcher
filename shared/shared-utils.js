// 共享工具函数

/**
 * 发送调试日志消息
 * @param {string} message - 日志消息内容
 * @param {string} logType - 日志类型 (info, warning, error, success)
 */
function sendDebugLog(message, logType = 'info') {
  if (!message) return;

  try {
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG',
        message: String(message),
        logType: logType
      }).catch(() => {
        // 静默处理消息发送失败
      });
    }
  } catch (error) {
    // Chrome API不可用时的降级处理
    console.warn('Debug log failed:', error);
  }
}

/**
 * 检测浏览器界面语言
 * @returns {string} 返回 'zh' 或 'en'
 */
function detectBrowserLanguage() {
  try {
    const browserLang = chrome.i18n.getUILanguage().toLowerCase();
    return browserLang.startsWith('zh') ? 'zh' : 'en';
  } catch (error) {
    // API不可用时默认返回英文
    return 'en';
  }
}
/**
 *
 获取更新相关的本地化翻译
 * @param {string} key - 翻译键
 * @param {Object} params - 参数对象，用于替换翻译文本中的占位符
 * @param {string} context - 上下文 ('popup' 或 'background')
 * @returns {string} 本地化的文本
 */
function getUpdateTranslation(key, params = {}, context = 'popup') {
  try {
    // 尝试从全局i18n实例获取翻译
    let translation = key; // 默认返回键名作为fallback
    
    if (context === 'popup' && typeof popupI18n !== 'undefined') {
      translation = popupI18n.t(key);
    } else if (context === 'background' && typeof backgroundI18n !== 'undefined') {
      translation = backgroundI18n.t(key, params);
    }
    
    // 如果没有找到翻译或翻译就是键名本身，使用fallback机制
    if (translation === key) {
      translation = getFallbackUpdateTranslation(key, params);
    }
    
    // 替换参数占位符（针对popup上下文，因为popup的t方法不支持参数）
    if (context === 'popup' && Object.keys(params).length > 0) {
      Object.keys(params).forEach(param => {
        translation = translation.replace(`{${param}}`, params[param]);
      });
    }
    
    return translation;
  } catch (error) {
    console.warn('Failed to get update translation:', error);
    return getFallbackUpdateTranslation(key, params);
  }
}

/**
 * 获取更新功能的fallback翻译
 * @param {string} key - 翻译键
 * @param {Object} params - 参数对象
 * @returns {string} fallback翻译文本
 */
function getFallbackUpdateTranslation(key, params = {}) {
  const fallbackTranslations = {
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
    'update_check_cache_expired': 'Update check cache expired, fetching fresh data'
  };
  
  let text = fallbackTranslations[key] || key;
  
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
function sendLocalizedUpdateLog(key, params = {}, logType = 'info') {
  const message = getUpdateTranslation(key, params, 'background');
  sendDebugLog(message, logType);
}