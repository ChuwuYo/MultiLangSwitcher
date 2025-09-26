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

  // 简化的 fallback 翻译 - 只保留最基本的翻译
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
      'debug_log_started': 'Debug log started'
    },
    zh: {
      'check_for_updates': '检查更新',
      'checking_updates': '正在检查更新...',
      'update_available': '发现新版本: v{version}',
      'no_updates_available': '您正在使用最新版本',
      'current_version': '当前版本: v{current}',
      'latest_version': '最新版本: v{latest}',
      'view_release': '查看发布页面',
      'download_update': '下载更新',
      'update_check_failed': '检查更新失败',
      'network_error': '网络错误',
      'rate_limit_exceeded': '请求频率超限，请稍后再试',
      'invalid_response': '服务器响应无效',
      'update_check_success': '更新检查完成',
      'update_notification_title': '扩展更新可用',
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