// 后台脚本，确保扩展在浏览器启动时就能应用语言设置

// 按正确顺序导入依赖
// 1. 首先导入共享工具（包含 detectBrowserLanguage 函数）
importScripts('shared/shared-utils.js');
// 2. 然后导入基础国际化类
importScripts('shared/shared-i18n-base.js');
// 3. 导入具体的国际化类
importScripts('i18n/background-i18n.js');
importScripts('i18n/domain-manager-i18n.js');
// 4. 导入域名规则管理器
importScripts('domain-rules-manager.js');
// 5. 导入更新检查器
importScripts('shared/shared-update-checker.js');

// 常量定义
const RULE_ID = 1;
// 统一并简化语言常量
const DEFAULT_LANG_ZH = 'zh-CN'; // 为中文用户设置的默认语言
const DEFAULT_LANG_EN = 'en-US';   // 为英文用户设置的默认语言，也用作自动切换的回退语言

// 使用共享的sendDebugLog函数，但保留后台特定的日志前缀
const sendBackgroundLog = (message, logType = 'info') => {
  // 安全获取翻译，如果翻译系统未准备好则使用英文回退
  const backgroundLabel = (backgroundI18n && backgroundI18n.isReady)
    ? backgroundI18n.t('background')
    : 'Background';

  // 确保同样的消息被用于控制台日志和调试日志
  console.log(`[${backgroundLabel} ${logType.toUpperCase()}] ${message}`);
  sendDebugLog(`[${backgroundLabel}] ${message}`, logType);
};

// 全局状态变量
let rulesCache = null;          // 规则缓存，避免重复获取已知规则
let lastAppliedLanguage = null; // 最后应用的语言
let autoSwitchEnabled = false;  // 自动切换状态
let pendingUIUpdate = null;     // 待处理的UI更新
let latestAutoSwitchEnabled = false; // 用于存储最新的 autoSwitchEnabled 状态
let latestCurrentLanguage = null;    // 用于存储最新的 currentLanguage 状态

/**
 * 根据域名获取对应的语言
 * @param {string} domain - 域名
 * @returns {Promise<string|null>} 对应的语言代码或null
 */
const getLanguageForDomain = (domain) => {
  return domainRulesManager.getLanguageForDomain(domain);
};


/**
 * 初始化域名规则管理器
 * @returns {Promise<void>}
 */
const initDomainRulesManager = async () => {
  try {
    await domainRulesManager.loadRules();
    sendBackgroundLog(backgroundI18n.t('domain_rules_loaded'), 'info');
  } catch (error) {
    sendBackgroundLog(`${backgroundI18n.t('domain_rules_load_failed')}: ${error.message}`, 'error');
  }
};

// 在浏览器启动时初始化
chrome.runtime.onStartup.addListener(() => {
  initializeState('startup');
});

// 在扩展安装或更新时初始化
chrome.runtime.onInstalled.addListener(initDomainRulesManager);

// 指数退避重试配置
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 500; // 毫秒

/**
 * 清理所有动态规则
 * @returns {Promise<void>}
 */
const clearAllDynamicRules = async () => {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    if (existingRules.length > 0) {
      const ruleIds = existingRules.map(rule => rule.id);
      sendBackgroundLog(backgroundI18n.t('clearing_existing_rules', { count: ruleIds.length }), 'info');
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
      sendBackgroundLog(backgroundI18n.t('rules_cleared_successfully'), 'success');
    }
  } catch (error) {
    sendBackgroundLog(`${backgroundI18n.t('clear_rules_failed')}: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * 更新请求头规则，支持错误重试和规则缓存
 * @param {string} language - 要设置的语言代码
 * @param {number} retryCount - 当前重试次数
 * @param {boolean} isAutoSwitch - 是否由自动切换触发
 * @returns {Promise<Object>} 更新结果
 */
const updateHeaderRules = async (language, retryCount = 0, isAutoSwitch = false) => {
  language = language ? language.trim() : DEFAULT_LANG_EN;

  // 检查是否需要更新（但对自动切换更宽松）
  if (!isAutoSwitch && language === lastAppliedLanguage && rulesCache) {
    sendBackgroundLog(backgroundI18n.t('language_already_set', { language }), 'info');
    return { status: 'cached', language };
  }

  sendBackgroundLog(`${backgroundI18n.t('trying_update_rules', { language })}${retryCount > 0 ? ` (${backgroundI18n.t('retry')} #${retryCount})` : ''}`, 'info');

  // 性能监控：记录开始时间
  const startTime = performance.now();

  try {
    // 获取现有规则
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    rulesCache = existingRules;

    // 检查是否已存在相同语言的规则
    const existingRule = existingRules.find(rule =>
      rule.id === RULE_ID &&
      rule.action.requestHeaders &&
      rule.action.requestHeaders.some(header =>
        header.header === 'Accept-Language' &&
        header.value === language
      )
    );

    if (existingRule) {
      sendBackgroundLog(backgroundI18n.t('rules_already_set', { language }), 'info');
      lastAppliedLanguage = language;
      return { status: 'unchanged', language };
    }

    // 批量处理：单次操作同时移除旧规则和添加新规则
    const removeRuleIds = existingRules.map(rule => rule.id);
    const newRule = {
      "id": RULE_ID,
      "priority": 100,
      "action": {
        "type": "modifyHeaders",
        "requestHeaders": [
          {
            "header": "Accept-Language",
            "operation": "set",
            "value": language
          }
        ]
      },
      "condition": {
        "urlFilter": "*",
        "resourceTypes": ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
      }
    };

    // 单次批量更新：移除所有现有规则并添加新规则
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeRuleIds,
      addRules: [newRule]
    });

    // 记录批量操作的详细信息
    let logMessage = `${backgroundI18n.t('batch_operation_completed')}: `;
    if (removeRuleIds.length > 0) {
      logMessage += `${backgroundI18n.t('removed')} ${removeRuleIds.length} ${backgroundI18n.t('rules')}, `;
    }
    logMessage += `${backgroundI18n.t('added')} 1 ${backgroundI18n.t('rule')}`;
    sendBackgroundLog(logMessage, 'info');

    // 性能监控：记录完成时间
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    // 规则更新成功
    lastAppliedLanguage = language;
    sendBackgroundLog(`${backgroundI18n.t('rules_updated_successfully', { language })}${isAutoSwitch ? ` (${backgroundI18n.t('auto_switch')})` : ''} (${duration}ms)`, 'success');
    return { status: 'success', language };

  } catch (error) {
    sendBackgroundLog(`${backgroundI18n.t('update_rules_failed')}: ${error.message}`, 'error');
    return handleRuleUpdateError(error, language, retryCount);
  }
}

/**
 * 处理规则更新错误，实现指数退避重试
 * @param {Error} error - 错误对象
 * @param {string} language - 要设置的语言代码
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<Object>} 更新结果或抛出错误
 */
const handleRuleUpdateError = async (error, language, retryCount) => {
  // 对不同类型的错误进行分类处理
  let errorType = 'unknown';
  let canRetry = true;

  // 分析错误类型
  if (error.message.includes('quota')) {
    errorType = 'quota_exceeded';
    canRetry = false;
  } else if (error.message.includes('permission')) {
    errorType = 'permission_denied';
    canRetry = false;
  } else if (error.message.includes('network')) {
    errorType = 'network_error';
  }

  sendBackgroundLog(`${backgroundI18n.t('rule_update_error_type')}: ${errorType}, ${backgroundI18n.t('message')}: ${error.message}`, 'error');

  // 如果可以重试且未超过最大重试次数
  if (canRetry && retryCount < MAX_RETRY_ATTEMPTS) {
    const nextRetryCount = retryCount + 1;
    const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount);

    sendBackgroundLog(`${backgroundI18n.t('retry_after', { delay, count: nextRetryCount })}`, 'warning');

    // 等待后重试
    await new Promise(resolve => setTimeout(resolve, delay));
    return await updateHeaderRules(language, nextRetryCount);
  } else {
    // 超过重试次数或不可重试的错误
    const finalError = new Error(`${backgroundI18n.t('update_rules_failed_with_type', { type: errorType })}: ${error.message}`);
    finalError.originalError = error;
    finalError.type = errorType;
    finalError.retryCount = retryCount;

    sendBackgroundLog(backgroundI18n.t('max_retry_reached'), 'error');

    // 通知用户出现了问题
    chrome.runtime.sendMessage({
      type: 'UPDATE_ERROR',
      error: {
        type: errorType,
        message: error.message,
        retryCount: retryCount
      }
    }).catch(() => { });

    throw finalError;
  }
}


/**
 * 统一的初始化函数，用于设置扩展的初始状态
 * @param {string} reason - 触发初始化的原因 (e.g., 'install', 'update', 'startup')
 */
const initializeState = async (reason) => {
  sendBackgroundLog(backgroundI18n.t('initializing_state', { reason }), 'info');
  try {
    // 1. 初始化域名规则管理器
    await initDomainRulesManager();

    // 2. 从存储中获取设置
    const result = await new Promise((resolve, reject) => {
      chrome.storage.local.get(['currentLanguage', 'autoSwitchEnabled'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(result);
      });
    });
    autoSwitchEnabled = !!result.autoSwitchEnabled;
    sendBackgroundLog(`${backgroundI18n.t('loaded_auto_switch_status')}: ${autoSwitchEnabled}`, 'info');

    let initialLanguage = null;
    let isAuto = autoSwitchEnabled;

    if (autoSwitchEnabled) {
      // 如果自动切换开启，则应用默认的回退语言
      initialLanguage = DEFAULT_LANG_EN;
      sendBackgroundLog(backgroundI18n.t('auto_switch_enabled_default_lang', { language: initialLanguage }), 'info');
    } else if (result.currentLanguage) {
      // 如果有关闭自动切换且有已保存的语言
      initialLanguage = result.currentLanguage;
      sendBackgroundLog(`${backgroundI18n.t('loaded_applied_language')}: ${initialLanguage}`, 'info');
    } else {
      // 首次安装，检测浏览器语言
      const detectedLang = detectBrowserLanguage();
      const lang = detectedLang === 'zh' ? DEFAULT_LANG_ZH : DEFAULT_LANG_EN;
      initialLanguage = lang;
      sendBackgroundLog(`${backgroundI18n.t('first_install_detected_lang')}: ${detectedLang} -> ${initialLanguage}`, 'info');
      // 将首次设置的语言保存到存储中
      await chrome.storage.local.set({ currentLanguage: initialLanguage });
    }

    // 3. 应用请求头规则
    if (initialLanguage) {
      await updateHeaderRules(initialLanguage, 0, isAuto);
    } else {
      // 如果没有目标语言（例如，重置后），则清理规则
      await clearAllDynamicRules();
    }

    // 4. 通知UI更新
    notifyPopupUIUpdate(isAuto, initialLanguage);
    sendBackgroundLog(backgroundI18n.t('initialization_complete'), 'success');

  } catch (error) {
    sendBackgroundLog(backgroundI18n.t('initialization_failed', { message: error.message }), 'error');
    // 设置一个明确、安全的回退状态
    autoSwitchEnabled = false;
    lastAppliedLanguage = null;
    try {
      await clearAllDynamicRules();
      await chrome.storage.local.set({ autoSwitchEnabled: false, currentLanguage: '' });
      notifyPopupUIUpdate(false, null);
      sendBackgroundLog(backgroundI18n.t('fallback_state_set'), 'warning');
    } catch (cleanupError) {
      sendBackgroundLog(backgroundI18n.t('fallback_state_failed', { message: cleanupError.message }), 'error');
    }
  }
}


// 当扩展安装或更新时触发
chrome.runtime.onInstalled.addListener(details => {
  initializeState(details.reason);
});

/**
 * 防抖的UI更新通知
 * @param {boolean} autoSwitchEnabled - 自动切换是否启用
 * @param {string} currentLanguage - 当前语言代码
 */
const notifyPopupUIUpdate = (autoSwitchEnabled, currentLanguage) => {
  // Store the latest state
  latestAutoSwitchEnabled = autoSwitchEnabled;
  latestCurrentLanguage = currentLanguage;

  clearTimeout(pendingUIUpdate);
  pendingUIUpdate = setTimeout(() => {
    const message = {
      type: 'AUTO_SWITCH_UI_UPDATE',
      autoSwitchEnabled: latestAutoSwitchEnabled,
      currentLanguage: latestCurrentLanguage
    };
    chrome.runtime.sendMessage(message).catch(() => { });
    sendBackgroundLog(`${backgroundI18n.t('ui_update')}: ${backgroundI18n.t('auto_switch')}=${latestAutoSwitchEnabled}, ${backgroundI18n.t('language')}=${latestCurrentLanguage}`, 'info');
  }, 100); // Reduced debounce delay to 100ms
}


/**
 * 处理更新规则请求
 * @param {Object} request - 请求对象
 * @param {Function} sendResponse - 响应函数
 */
const handleUpdateRulesRequest = async (request, sendResponse) => {
  try {
    const language = request.language;
    sendBackgroundLog(backgroundI18n.t('trying_update_rules', { language }), 'info');

    const result = await updateHeaderRules(language);
    sendBackgroundLog(`${backgroundI18n.t('rules_update_completed')}: ${result.status}`, 'info');

    await chrome.storage.local.set({ currentLanguage: language });

    if (typeof sendResponse === 'function') {
      sendResponse({ status: 'success', language: result.language });
    }

    // 只在状态发生变化时才通知UI更新
    if (result.status === 'success') {
      notifyPopupUIUpdate(autoSwitchEnabled, result.language);
    }
  } catch (error) {
    handleUpdateRulesError(error, sendResponse);
  }
};

/**
 * 处理更新规则错误
 * @param {Error} error - 错误对象
 * @param {Function} sendResponse - 响应函数
 */
const handleUpdateRulesError = (error, sendResponse) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorType = error.type || 'UNKNOWN_ERROR';

  // 详细的错误日志，便于Debug页面查看
  sendBackgroundLog(`${backgroundI18n.t('rules_update_failed')}: ${errorMessage} (${backgroundI18n.t('rule_update_error_type')}: ${errorType})`, 'error');

  // 如果有原始错误，也记录下来
  if (error.originalError) {
    sendBackgroundLog(`${backgroundI18n.t('original_error')}: ${error.originalError}`, 'error');
  }

  if (typeof sendResponse === 'function') {
    sendResponse({
      status: 'error',
      message: errorMessage,
      errorType: errorType
    });
  }
};

/**
 * 处理自动切换开关请求
 * @param {Object} request - 请求对象
 * @param {Function} sendResponse - 响应函数
 */
const handleAutoSwitchToggleRequest = async (request, sendResponse) => {
  try {
    autoSwitchEnabled = request.enabled;
    sendBackgroundLog(`${backgroundI18n.t('auto_switch_status_updated')}: ${autoSwitchEnabled}`, 'info');

    await chrome.storage.local.set({ autoSwitchEnabled: autoSwitchEnabled });

    // 广播状态变化给所有页面
    chrome.runtime.sendMessage({
      type: 'AUTO_SWITCH_STATE_CHANGED',
      enabled: autoSwitchEnabled
    }).catch(() => { });

    if (autoSwitchEnabled) {
      await handleAutoSwitchEnabled(sendResponse);
    } else {
      await handleAutoSwitchDisabled(sendResponse);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendBackgroundLog(`${backgroundI18n.t('auto_switch_toggle_failed')}: ${errorMessage}`, 'error');
    if (typeof sendResponse === 'function') {
      sendResponse({ status: 'error', message: errorMessage });
    }
  }
};

/**
 * 处理自动切换启用
 * @param {Function} sendResponse - 响应函数
 */
const handleAutoSwitchEnabled = async (sendResponse) => {
  sendBackgroundLog(backgroundI18n.t('auto_switch_enabled'), 'info');
  await updateHeaderRules(DEFAULT_LANG_EN, 0, true);
  if (typeof sendResponse === 'function') {
    sendResponse({ status: 'success' });
  }
  notifyPopupUIUpdate(true, DEFAULT_LANG_EN);
};

/**
 * 处理自动切换禁用
 * @param {Function} sendResponse - 响应函数
 */
const handleAutoSwitchDisabled = async (sendResponse) => {
  const result = await new Promise((resolve, reject) => {
    chrome.storage.local.get(['currentLanguage'], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result);
    });
  });
  const language = result.currentLanguage || DEFAULT_LANG_EN;
  sendBackgroundLog(backgroundI18n.t('auto_switch_disabled', { language }), 'info');
  await updateHeaderRules(language);
  if (typeof sendResponse === 'function') {
    sendResponse({ status: 'success' });
  }
  notifyPopupUIUpdate(false, language);
};

/**
 * 处理获取当前语言请求
 * @param {Function} sendResponse - 响应函数
 */
const handleGetCurrentLangRequest = async (sendResponse) => {
  try {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const currentRule = rules.find(rule => rule.id === RULE_ID);
    const actualCurrentLang = currentRule?.action?.requestHeaders?.find(h => h.header === 'Accept-Language')?.value;

    const result = await new Promise((resolve, reject) => {
      chrome.storage.local.get(['currentLanguage', 'autoSwitchEnabled'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(result);
      });
    });
    if (typeof sendResponse === 'function') {
      sendResponse({
        currentLanguage: actualCurrentLang || result.currentLanguage || lastAppliedLanguage,
        autoSwitchEnabled: !!result.autoSwitchEnabled
      });
    }
  } catch (error) {
    sendBackgroundLog(`${backgroundI18n.t('get_current_lang_error')}: ${error.message}`, 'error');
    if (typeof sendResponse === 'function') {
      sendResponse({ error: error.message });
    }
  }
};

/**
 * 处理重置Accept-Language请求
 * @param {Function} sendResponse - 响应函数
 */
const handleResetAcceptLanguageRequest = async (sendResponse) => {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [RULE_ID]
    });

    await chrome.storage.local.remove(['currentLanguage']);
    lastAppliedLanguage = null;
    sendBackgroundLog(backgroundI18n.t('accept_language_reset_successful'), 'success');
    if (typeof sendResponse === 'function') {
      sendResponse({ status: 'success' });
    }
    notifyPopupUIUpdate(autoSwitchEnabled, null);
  } catch (error) {
    sendBackgroundLog(`${backgroundI18n.t('reset_error')}: ${error.message}`, 'error');
    if (typeof sendResponse === 'function') {
      sendResponse({ status: 'error', message: error.message });
    }
  }
};

/**
 * 处理获取域名规则请求
 * @param {Function} sendResponse - 响应函数
 */
const handleGetDomainRulesRequest = async (sendResponse) => {
  sendBackgroundLog(backgroundI18n.t('received_domain_rules_request'), 'info');

  try {
    await domainRulesManager.loadRules();
    const rules = domainRulesManager.getRules();
    const stats = domainRulesManager.getRulesStats();

    sendBackgroundLog(backgroundI18n.t('domain_rules_fetch_success', { count: Object.keys(rules || {}).length }), 'success');

    if (typeof sendResponse === 'function') {
      sendResponse({ domainRules: rules, stats: stats });
    }
  } catch (error) {
    const errorMessage = `${backgroundI18n.t('domain_rules_load_failed')}: ${error.message}`;
    sendBackgroundLog(errorMessage, 'error');

    if (typeof sendResponse === 'function') {
      sendResponse({ error: errorMessage });
    }
  }
};

/**
 * 处理更新检查请求
 * @param {Function} sendResponse - 响应函数
 */
const handleUpdateCheckRequest = async (sendResponse) => {
  try {
    const repoOwner = 'ChuwuYo';
    const repoName = 'MultiLangSwitcher';
    const currentVersion = chrome.runtime.getManifest().version; // 动态获取manifest.json中的版本号

    sendBackgroundLog(backgroundI18n.t('update_check_initiated', { repo: `${repoOwner}/${repoName}` }), 'info');

    // 创建更新检查器实例
    const updateChecker = new UpdateChecker(repoOwner, repoName, currentVersion);

    // 首先检查缓存状态
    const cacheStatus = updateChecker.getCacheStatus();
    if (cacheStatus.hasCachedData && !cacheStatus.isExpired) {
      sendBackgroundLog(backgroundI18n.t('update_check_cache_hit'), 'info');
    } else if (cacheStatus.hasCachedData && cacheStatus.isExpired) {
      sendBackgroundLog(backgroundI18n.t('update_check_cache_expired'), 'info');
    }

    sendBackgroundLog(backgroundI18n.t('update_check_api_request'), 'info');

    // 执行更新检查
    const updateInfo = await updateChecker.checkForUpdates();

    // 记录版本比较详情
    sendBackgroundLog(backgroundI18n.t('update_check_version_comparison', {
      current: updateInfo.currentVersion,
      latest: updateInfo.latestVersion,
      result: updateInfo.updateAvailable ? 'newer' : 'same_or_older'
    }), 'info');

    if (updateInfo.updateAvailable) {
      sendBackgroundLog(backgroundI18n.t('update_check_update_available', {
        current: updateInfo.currentVersion,
        latest: updateInfo.latestVersion
      }), 'success');
    } else {
      sendBackgroundLog(backgroundI18n.t('update_check_no_update_needed'), 'info');
    }

    sendBackgroundLog(backgroundI18n.t('update_check_success'), 'success');

    if (typeof sendResponse === 'function') {
      sendResponse({
        status: 'success',
        updateInfo: updateInfo
      });
    }

  } catch (error) {
    handleUpdateCheckError(error, sendResponse);
  }
};

/**
 * 处理获取缓存统计请求
 * @param {Function} sendResponse - 响应函数
 */
const handleGetCacheStatsRequest = async (sendResponse) => {
  try {
    // 确保域名规则管理器已加载
    await domainRulesManager.loadRules();

    // 获取缓存统计信息和规则统计信息
    const cacheStats = domainRulesManager.getCacheStats();
    const rulesStats = domainRulesManager.getRulesStats();

    // 合并统计信息
    const combinedStats = {
      ...cacheStats,
      ...rulesStats
    };

    sendBackgroundLog(`${backgroundI18n.t('cache_stats_requested')}: ${JSON.stringify(combinedStats)}`, 'info');

    if (typeof sendResponse === 'function') {
      sendResponse({
        success: true,
        stats: combinedStats
      });
    }
  } catch (error) {
    const errorMessage = `${backgroundI18n.t('get_cache_stats_failed')}: ${error.message}`;
    sendBackgroundLog(errorMessage, 'error');

    if (typeof sendResponse === 'function') {
      sendResponse({
        success: false,
        error: errorMessage
      });
    }
  }
};

/**
 * 处理域名缓存测试请求
 * @param {Object} request - 请求对象
 * @param {Function} sendResponse - 响应函数
 */
const handleTestDomainCacheRequest = async (request, sendResponse) => {
  try {
    const domain = request.domain;
    if (!domain) {
      throw new Error(backgroundI18n.t('domain_required_error'));
    }

    sendBackgroundLog(backgroundI18n.t('testing_domain_cache', { domain }), 'info');

    // 确保域名规则管理器已加载
    await domainRulesManager.loadRules();

    // 在调用 getLanguageForDomain 之前检查缓存状态，以获得准确的"是否命中缓存"状态
    // 检查二级域名的缓存状态
    const parsedDomain = domain.split('.');
    const secondLevelDomain = parsedDomain.length >= 2 ? parsedDomain.slice(-2).join('.') : domain;
    const fromCache = domainRulesManager.domainCache.has(domain) ||
      domainRulesManager.domainCache.has(secondLevelDomain) ||
      (domain.startsWith('www.') && domainRulesManager.domainCache.has(domain.substring(4))) ||
      domainRulesManager.domainCache.has('www.' + domain);

    // 测试域名查询（这会触发缓存机制，如果是 miss，则会填充缓存）
    let language = await domainRulesManager.getLanguageForDomain(domain);
    let isUsingFallback = false;



    // 如果没有找到匹配规则，使用回退策略
    if (!language) {
      isUsingFallback = true;

      // 策略1: 检查当前活动的规则
      try {
        const rules = await chrome.declarativeNetRequest.getDynamicRules();
        const currentRule = rules.find(rule => rule.id === RULE_ID);
        
        if (currentRule && currentRule.action && currentRule.action.requestHeaders) {
          const acceptLangHeader = currentRule.action.requestHeaders.find(h => h.header === 'Accept-Language');
          if (acceptLangHeader && acceptLangHeader.value) {
            language = acceptLangHeader.value;
          }
        }
      } catch (error) {
        sendBackgroundLog(`Failed to check active rules: ${error.message}`, 'error');
      }

      // 策略2: 如果还没有找到，检查存储的当前语言设置
      if (!language) {
        try {
          const result = await chrome.storage.local.get(['currentLanguage']);
          
          if (result.currentLanguage) {
            language = result.currentLanguage;
          }
        } catch (error) {
          sendBackgroundLog(`Failed to check stored language: ${error.message}`, 'error');
        }
      }

      // 策略3: 最后的回退，使用默认语言
      if (!language) {
        language = DEFAULT_LANG_EN;
      }
    }



    // 获取更新后的缓存统计
    const cacheStats = domainRulesManager.getCacheStats();
    const rulesStats = domainRulesManager.getRulesStats();

    // 合并统计信息
    const combinedStats = {
      ...cacheStats,
      ...rulesStats
    };



    const cacheStatus = fromCache ? backgroundI18n.t('cached') : backgroundI18n.t('new');
    const fallbackStatus = isUsingFallback ? backgroundI18n.t('fallback') : '';
    sendBackgroundLog(backgroundI18n.t('domain_test_result', {
      domain,
      language: language || 'not found',
      cacheStatus,
      fallbackStatus
    }), 'info');

    if (typeof sendResponse === 'function') {
      sendResponse({
        success: true,
        language: language,
        fromCache: fromCache,
        isUsingFallback: isUsingFallback,
        cacheStats: combinedStats
      });
    }

  } catch (error) {
    const errorMessage = backgroundI18n.t('domain_cache_test_failed', { error: error.message });
    sendBackgroundLog(errorMessage, 'error');

    if (typeof sendResponse === 'function') {
      sendResponse({
        success: false,
        error: errorMessage
      });
    }
  }
};

/**
 * 通用缓存操作处理辅助函数
 * @param {Function} sendResponse - 响应函数
 * @param {Function} operation - 要执行的操作函数
 * @param {Object} logMessages - 日志消息对象
 */
const handleCacheOperation = async (sendResponse, operation, logMessages) => {
  try {
    sendBackgroundLog(logMessages.start, 'info');

    // 执行具体操作
    await operation();

    // 获取更新后的统计信息
    const cacheStats = domainRulesManager.getCacheStats();
    const rulesStats = domainRulesManager.getRulesStats();
    const combinedStats = { ...cacheStats, ...rulesStats };

    sendBackgroundLog(logMessages.success, 'success');

    if (typeof sendResponse === 'function') {
      sendResponse({
        success: true,
        stats: combinedStats
      });
    }
  } catch (error) {
    const errorMessage = `${logMessages.fail}: ${error.message}`;
    sendBackgroundLog(errorMessage, 'error');

    if (typeof sendResponse === 'function') {
      sendResponse({
        success: false,
        error: errorMessage
      });
    }
  }
};

/**
 * 处理预加载规则请求
 * @param {Function} sendResponse - 响应函数
 */
const handlePreloadRulesRequest = (sendResponse) => handleCacheOperation(
  sendResponse,
  () => domainRulesManager.preloadRules(),
  {
    start: 'Preloading domain rules...',
    success: 'Rules preloaded successfully',
    fail: 'Rules preload failed'
  }
);

/**
 * 处理清理域名缓存请求
 * @param {Function} sendResponse - 响应函数
 */
const handleClearDomainCacheRequest = (sendResponse) => handleCacheOperation(
  sendResponse,
  () => domainRulesManager.clearCache(false), // false = 只清理域名缓存
  {
    start: 'Clearing domain cache...',
    success: 'Domain cache cleared successfully',
    fail: 'Clear domain cache failed'
  }
);

/**
 * 处理清理所有缓存请求
 * @param {Function} sendResponse - 响应函数
 */
const handleClearAllCacheRequest = (sendResponse) => handleCacheOperation(
  sendResponse,
  () => domainRulesManager.clearCache(true), // true = 清理所有缓存
  {
    start: 'Clearing all cache...',
    success: 'All cache cleared successfully',
    fail: 'Clear all cache failed'
  }
);

/**
 * 处理重置缓存统计请求
 * @param {Function} sendResponse - 响应函数
 */
const handleResetCacheStatsRequest = (sendResponse) => handleCacheOperation(
  sendResponse,
  () => domainRulesManager.resetCacheStats(),
  {
    start: 'Resetting cache statistics...',
    success: 'Cache statistics reset successfully',
    fail: 'Reset cache statistics failed'
  }
);

/**
 * 处理更新检查错误
 * @param {Error} error - 错误对象
 * @param {Function} sendResponse - 响应函数
 */
const handleUpdateCheckError = (error, sendResponse) => {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Log specific error types with appropriate translations
  if (error.type === 'TIMEOUT') {
    sendBackgroundLog(backgroundI18n.t('update_check_timeout', { timeout: 10000 }), 'error');
  } else if (error.type === 'NETWORK_ERROR') {
    sendBackgroundLog(backgroundI18n.t('update_check_network_error', { error: errorMessage }), 'error');
  } else if (error.type === 'RATE_LIMIT') {
    sendBackgroundLog(backgroundI18n.t('update_check_rate_limited'), 'error');
  } else if (error.type === 'INVALID_RESPONSE') {
    sendBackgroundLog(backgroundI18n.t('update_check_invalid_response', { response: errorMessage }), 'error');
  } else if (error.type === 'VERSION_ERROR') {
    sendBackgroundLog(backgroundI18n.t('update_check_parsing_error', { error: errorMessage }), 'error');
  } else {
    sendBackgroundLog(backgroundI18n.t('update_check_failed', { error: errorMessage }), 'error');
  }

  if (typeof sendResponse === 'function') {
    sendResponse({
      status: 'error',
      error: {
        type: error.type || 'UNKNOWN_ERROR',
        message: error.message || errorMessage,
        userMessage: error.message || 'An unexpected error occurred',
        retryable: error.retryable || false
      }
    });
  }
};

// 监听来自 popup 或 debug 页面的消息
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.type === 'UPDATE_RULES') {
    handleUpdateRulesRequest(request, sendResponse);
    return true;
  } else if (request.type === 'AUTO_SWITCH_TOGGLED') {
    handleAutoSwitchToggleRequest(request, sendResponse);
    return true;
  } else if (request.type === 'GET_CURRENT_LANG') {
    handleGetCurrentLangRequest(sendResponse);
    return true;
  } else if (request.type === 'RESET_ACCEPT_LANGUAGE') {
    handleResetAcceptLanguageRequest(sendResponse);
    return true;
  } else if (request.type === 'GET_DOMAIN_RULES') {
    handleGetDomainRulesRequest(sendResponse);
    return true;
  } else if (request.type === 'UPDATE_CHECK') {
    handleUpdateCheckRequest(sendResponse);
    return true;
  } else if (request.type === 'GET_CACHE_STATS') {
    handleGetCacheStatsRequest(sendResponse);
    return true;
  } else if (request.type === 'TEST_DOMAIN_CACHE') {
    handleTestDomainCacheRequest(request, sendResponse);
    return true;
  } else if (request.type === 'PRELOAD_RULES') {
    handlePreloadRulesRequest(sendResponse);
    return true;
  } else if (request.type === 'CLEAR_DOMAIN_CACHE') {
    handleClearDomainCacheRequest(sendResponse);
    return true;
  } else if (request.type === 'CLEAR_ALL_CACHE') {
    handleClearAllCacheRequest(sendResponse);
    return true;
  } else if (request.type === 'RESET_CACHE_STATS') {
    handleResetCacheStatsRequest(sendResponse);
    return true;
  }
});

// 监听标签页更新以实现自动切换 (Manifest V3 compatible)
chrome.tabs.onUpdated.addListener(async (_, changeInfo, tab) => {
  // 调试日志：记录所有相关事件
  if (changeInfo.status === 'complete' && tab?.url?.startsWith('http')) {
    sendBackgroundLog(backgroundI18n.t('tab_update_debug', { url: tab.url, autoSwitch: autoSwitchEnabled }), 'info');
  }

  // 确保自动切换已启用，标签页加载完成，并且有有效的URL (http or https)
  if (autoSwitchEnabled && changeInfo.status === 'complete' && tab && tab.url && (tab.url.startsWith('http:') || tab.url.startsWith('https://'))) {
    sendBackgroundLog(`${backgroundI18n.t('tab_updated')}: ${tab.url}, ${backgroundI18n.t('status')}: ${changeInfo.status}`, 'info');
    try {
      const url = new URL(tab.url);
      const currentHostname = url.hostname.toLowerCase();
      let targetLanguage = null;

      // 使用域名规则管理器获取语言
      sendBackgroundLog(backgroundI18n.t('finding_language_rule', { hostname: currentHostname }), 'info');
      targetLanguage = await getLanguageForDomain(currentHostname);
      if (targetLanguage) {
        sendBackgroundLog(backgroundI18n.t('domain_rule_match_success', { hostname: currentHostname, language: targetLanguage }), 'success');
      }

      if (targetLanguage) {
        sendBackgroundLog(backgroundI18n.t('auto_switching_hostname', { hostname: currentHostname, language: targetLanguage }), 'info');
        // 调用 updateHeaderRules 更新请求头，标记为自动切换 (isAutoSwitch = true)
        try {
          const result = await updateHeaderRules(targetLanguage, 0, true);
          sendBackgroundLog(backgroundI18n.t('auto_switch_success', { hostname: currentHostname, language: targetLanguage, status: result.status }), 'success');
          if (result.status === 'success') {
            notifyPopupUIUpdate(true, targetLanguage);
          }
        } catch (error) {
          sendBackgroundLog(`${backgroundI18n.t('auto_switch_failed', { hostname: currentHostname, language: targetLanguage })}: ${error.message}`, 'error');
        }
      } else {
        // 如果没有匹配的规则，使用回退语言
        const fallbackLanguage = DEFAULT_LANG_EN;
        sendBackgroundLog(backgroundI18n.t('no_matching_rule', { hostname: currentHostname, fallback: fallbackLanguage }), 'info');
        // 只有在当前语言不是回退语言时才更新
        try {
          const rules = await chrome.declarativeNetRequest.getDynamicRules();
          const currentRule = rules.find(rule => rule.id === RULE_ID);
          const currentLang = currentRule?.action?.requestHeaders?.find(h => h.header === 'Accept-Language')?.value;

          if (currentLang !== fallbackLanguage) {
            const result = await updateHeaderRules(fallbackLanguage, 0, true);
            sendBackgroundLog(backgroundI18n.t('fallback_language_applied', { hostname: currentHostname, fallback: fallbackLanguage, status: result.status }), 'info');
            if (result.status === 'success') {
              notifyPopupUIUpdate(true, fallbackLanguage);
            }
          } else {
            sendBackgroundLog(backgroundI18n.t('current_is_fallback', { fallback: fallbackLanguage }), 'info');
          }
        } catch (error) {
          sendBackgroundLog(`${backgroundI18n.t('fallback_language_failed', { hostname: currentHostname })}: ${error.message}`, 'error');
        }
      }
    } catch (e) {
      // 捕获并记录解析URL或处理过程中可能发生的任何错误
      sendBackgroundLog(`${backgroundI18n.t('error_processing_url', { url: tab.url })}: ${e.message}`, 'error');
    }
  }
});