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

// --- 资源管理器  ---
// 仅管理定时器，避免误导性的事件监听器管理
const resourceTracker = {
  timers: [],
  intervals: [],

  // 定时器管理
  setTimeout: function(callback, delay) {
    const id = setTimeout(callback, delay);
    this.timers.push(id);
    return id;
  },

  setInterval: function(callback, delay) {
    const id = setInterval(callback, delay);
    this.intervals.push(id);
    return id;
  },

  clearTimeout: function(id) {
    clearTimeout(id);
    this.timers = this.timers.filter(timerId => timerId !== id);
  },

  clearInterval: function(id) {
    clearInterval(id);
    this.intervals = this.intervals.filter(intervalId => intervalId !== id);
  },

  // 统一清理方法
  cleanup: function() {
    // 清理定时器
    this.timers.forEach(id => clearTimeout(id));
    this.timers = [];
    this.intervals.forEach(id => clearInterval(id));
    this.intervals = [];
  }
};

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

/**
 * 确保初始化已完成的守卫函数
 * @returns {Promise}
 */
const ensureInitialized = async () => {
  // 如果初始化正在进行但尚未完成，则等待它完成
  if (initializationPromise && !isInitialized) {
    await initializationPromise;
  }
  
  // 如果尚未初始化，则调用initialize
  if (!isInitialized) {
    sendBackgroundLog('Lazy initialization triggered.', 'info');
    await initialize('lazy');
  }
};
// 全局状态变量
let rulesCache = null;          // 规则缓存，避免重复获取已知规则
let lastAppliedLanguage = null; // 最后应用的语言
let autoSwitchEnabled = false;  // 自动切换状态
let pendingUIUpdate = null;     // 待处理的UI更新
let latestAutoSwitchEnabled = false; // 用于存储最新的 autoSwitchEnabled 状态
let latestCurrentLanguage = null;    // 用于存储最新的 currentLanguage 状态
let isInitialized = false;           // 初始化完成标志
let initializationPromise = null;    // 初始化Promise，防止重复执行

// 并发控制变量
let updateRulesQueue = Promise.resolve(); // 规则更新队列，确保串行执行
let pendingLanguageRequests = new Map(); // 防抖：合并相同语言的重复请求

/**
 * 清理并发控制状态（用于测试或重置）
 */
const resetConcurrencyState = () => {
  updateRulesQueue = Promise.resolve();
  pendingLanguageRequests.clear();
  sendBackgroundLog(backgroundI18n.t('concurrency_state_reset'), 'info');
};

// 右键菜单初始化标志
let contextMenusCreated = false;

const createContextMenusOnce = async () => {
  if (contextMenusCreated) return; // 避免重复创建
  try {
    await chrome.contextMenus.removeAll();
    await chrome.contextMenus.create({
      id: 'open-detect-page',
      title: 'Detection Page',
      contexts: ['action']
    });
    await chrome.contextMenus.create({
      id: 'open-debug-page',
      title: 'Debug Page',
      contexts: ['action']
    });
    contextMenusCreated = true;
    sendBackgroundLog('Context menus created', 'info');
  } catch (e) {
    sendBackgroundLog('Create contextMenus failed: ' + e.message, 'error');
  }
};

// 安装与启动时尝试创建（幂等）
chrome.runtime.onInstalled.addListener(() => {
  createContextMenusOnce();
});

chrome.runtime.onStartup.addListener(() => {
  createContextMenusOnce();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-detect-page') {
    chrome.tabs.create({ url: chrome.runtime.getURL('detect.html') });
  } else if (info.menuItemId === 'open-debug-page') {
    chrome.tabs.create({ url: chrome.runtime.getURL('debug.html') });
  }
});

/**
 * 根据域名获取对应的语言
 * @param {string} domain - 域名
 * @returns {Promise<string|null>} 对应的语言代码或null
 */
const getLanguageForDomain = (domain) => {
  return domainRulesManager.getLanguageForDomain(domain);
};



// 在浏览器启动时初始化
chrome.runtime.onStartup.addListener(() => {
  initialize('startup');
});

// 在扩展安装或更新时初始化

// 指数退避重试配置
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 500; // 毫秒

/**
 * 清理所有动态规则
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
 * 带并发控制的规则更新包装器
 * @param {string} language - 要设置的语言代码
 * @param {number} retryCount - 当前重试次数
 * @param {boolean} isAutoSwitch - 是否由自动切换触发
 * @returns {Promise<Object>} 更新结果
 */
const updateHeaderRules = async (language, retryCount = 0, isAutoSwitch = false) => {
  language = language ? language.trim() : DEFAULT_LANG_EN;
  
  // 防抖机制：检查是否有相同语言的待处理请求
  const requestKey = `${language}_${isAutoSwitch}`;
  if (pendingLanguageRequests.has(requestKey)) {
    sendBackgroundLog(backgroundI18n.t('merging_duplicate_request', { language }), 'info');
    return await pendingLanguageRequests.get(requestKey);
  }

  // 创建新的请求Promise并加入队列
  const requestPromise = updateRulesQueue.then(() => 
    updateHeaderRulesInternal(language, retryCount, isAutoSwitch)
  );
  
  // 将请求加入防抖映射
  pendingLanguageRequests.set(requestKey, requestPromise);
  
  // 更新队列
  updateRulesQueue = requestPromise.catch(() => {
    // 即使失败也要继续队列，避免阻塞后续请求
  });

  try {
    const result = await requestPromise;
    return result;
  } finally {
    // 清理防抖映射
    pendingLanguageRequests.delete(requestKey);
  }
};

/**
 * 内部规则更新实现，支持错误重试和规则缓存
 * @param {string} language - 要设置的语言代码
 * @param {number} retryCount - 当前重试次数
 * @param {boolean} isAutoSwitch - 是否由自动切换触发
 * @returns {Promise<Object>} 更新结果
 */
const updateHeaderRulesInternal = async (language, retryCount = 0, isAutoSwitch = false) => {
  language = language ? language.trim() : DEFAULT_LANG_EN;

  // 优化的缓存检查：对所有调用（包括自动切换）都进行短路检查
  if (language === lastAppliedLanguage && rulesCache && rulesCache.length > 0) {
    // 验证缓存中确实存在对应的规则
    const existingRule = rulesCache.find(rule =>
      rule.id === RULE_ID &&
      rule.action.requestHeaders &&
      rule.action.requestHeaders.some(header =>
        header.header === 'Accept-Language' &&
        header.value === language
      )
    );
    
    if (existingRule) {
      const logMessage = isAutoSwitch
        ? backgroundI18n.t('auto_switch_skip_duplicate', { language })
        : backgroundI18n.t('language_already_set', { language });
      sendBackgroundLog(logMessage, 'info');
      return { status: 'cached', language };
    } else {
      // 语言相同但缓存中没有对应规则，记录警告并继续处理
      sendBackgroundLog(backgroundI18n.t('cache_empty_but_language_same', { language }), 'warning');
    }
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

    // 批量处理：仅当存在时才移除具有 RULE_ID 的旧规则，然后添加新规则
    const removeRuleIds = existingRules.some(rule => rule.id === RULE_ID) ? [RULE_ID] : [];
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
        "resourceTypes": ["main_frame", "sub_frame", "xmlhttprequest", "script"]
      }
    };

    // 单次批量更新：移除旧规则（如果存在）并添加新规则
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

    // 规则更新成功，同步更新状态
    lastAppliedLanguage = language;
    rulesCache = await chrome.declarativeNetRequest.getDynamicRules(); // 更新缓存
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
    await new Promise(resolve => resourceTracker.setTimeout(resolve, delay));
    return await updateHeaderRulesInternal(language, nextRetryCount, false);
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
    }).catch((notifyError) => {
      sendBackgroundLog(`${backgroundI18n.t('failed_notify_ui_error')}: ${notifyError.message}`, 'warning');
    });

    throw finalError;
  }
}


/**
 * 执行核心初始化逻辑
 * @param {string} reason - 初始化的原因 (e.g., 'install', 'update', 'startup')
 */
const performInitialization = async (reason) => {
  sendBackgroundLog(backgroundI18n.t('initializing_state', { reason }), 'info');
  try {
    // 1. 初始化域名规则管理器 (现在直接加载)
    await domainRulesManager.loadRules();
    sendBackgroundLog(backgroundI18n.t('domain_rules_loaded'), 'info');

    // 2. 从存储中获取设置
    const result = await chrome.storage.local.get(['currentLanguage', 'autoSwitchEnabled']);
    autoSwitchEnabled = result.autoSwitchEnabled !== false; // 默认为 true
    sendBackgroundLog(`${backgroundI18n.t('loaded_auto_switch_status')}: ${autoSwitchEnabled}`, 'info');

    // 3. 根据状态应用规则
    await applyLanguageRulesBasedOnState(result.currentLanguage);

    // 4. 通知UI更新
    const lang = autoSwitchEnabled ? DEFAULT_LANG_EN : (result.currentLanguage || DEFAULT_LANG_EN);
    notifyPopupUIUpdate(autoSwitchEnabled, lang);
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
    throw error; // 向上抛出错误
  }
};


/**
 * 统一的初始化函数，确保只执行一次
 * @param {string} reason - 初始化的原因
 * @returns {Promise<void>}
 */
const initialize = (reason) => {
  if (initializationPromise) {
    sendBackgroundLog(`Initialization already in progress. Waiting for completion.`, 'info');
    return initializationPromise;
  }

  sendBackgroundLog(`Starting initialization with reason: ${reason}`, 'info');
  initializationPromise = (async () => {
    try {
      await performInitialization(reason);
      isInitialized = true;
      sendBackgroundLog('Initialization completed successfully.', 'info');
    } catch (error) {
      sendBackgroundLog(`Initialization failed: ${error.message}`, 'error');
      // 在失败时重置，以便可以重试
      initializationPromise = null;
      isInitialized = false;
    }
  })();

  return initializationPromise;
};


// 当扩展安装或更新时触发
chrome.runtime.onInstalled.addListener(details => {
  initialize(details.reason);
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

  if (pendingUIUpdate) {
    clearTimeout(pendingUIUpdate);
  }
  pendingUIUpdate = resourceTracker.setTimeout(() => {
    const message = {
      type: 'AUTO_SWITCH_UI_UPDATE',
      autoSwitchEnabled: latestAutoSwitchEnabled,
      currentLanguage: latestCurrentLanguage
    };
    chrome.runtime.sendMessage(message).catch((notifyError) => {
      sendBackgroundLog(`${backgroundI18n.t('failed_notify_ui_update')}: ${notifyError.message}`, 'warning');
    });
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

    const { currentLanguage: storedLanguage } = await chrome.storage.local.get(['currentLanguage']);
    await applyLanguageRulesBasedOnState(storedLanguage);

    const currentEffectiveLanguage = autoSwitchEnabled ? DEFAULT_LANG_EN : (storedLanguage || DEFAULT_LANG_EN);

    if (typeof sendResponse === 'function') {
      sendResponse({ status: 'success' });
    }
    notifyPopupUIUpdate(autoSwitchEnabled, currentEffectiveLanguage);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendBackgroundLog(`${backgroundI18n.t('auto_switch_toggle_failed')}: ${errorMessage}`, 'error');
    if (typeof sendResponse === 'function') {
      sendResponse({ status: 'error', message: errorMessage });
    }
  }
};

/**
 * 根据当前的自动切换状态应用相应的语言规则
 * @param {string} storedLanguage - 从存储中读取的语言
 */
const applyLanguageRulesBasedOnState = async (storedLanguage) => {
  let languageToApply;
  let isAuto = autoSwitchEnabled;

  if (autoSwitchEnabled) {
    languageToApply = DEFAULT_LANG_EN;
    sendBackgroundLog(backgroundI18n.t('auto_switch_enabled_applying_rules', { language: languageToApply }), 'info');
  } else {
    languageToApply = storedLanguage || DEFAULT_LANG_EN;
    sendBackgroundLog(backgroundI18n.t('auto_switch_disabled_applying_rules', { language: languageToApply }), 'info');
  }
  
  await updateHeaderRules(languageToApply, 0, isAuto);
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

    const result = await chrome.storage.local.get(['currentLanguage', 'autoSwitchEnabled']);
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
 * 处理清理缓存请求
 * @param {Function} sendResponse - 响应函数
 */
const handleClearCacheRequest = (sendResponse) => handleCacheOperation(
 sendResponse,
 () => domainRulesManager.clearCache(),
 {
   start: 'Clearing cache...',
   success: 'Cache cleared successfully',
   fail: 'Clear cache failed'
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
  (async () => {
    await ensureInitialized();
    if (request.type === 'UPDATE_RULES') {
      handleUpdateRulesRequest(request, sendResponse);
    } else if (request.type === 'AUTO_SWITCH_TOGGLED') {
      handleAutoSwitchToggleRequest(request, sendResponse);
    } else if (request.type === 'GET_CURRENT_LANG') {
      handleGetCurrentLangRequest(sendResponse);
    } else if (request.type === 'RESET_ACCEPT_LANGUAGE') {
      handleResetAcceptLanguageRequest(sendResponse);
    } else if (request.type === 'GET_DOMAIN_RULES') {
      handleGetDomainRulesRequest(sendResponse);
    } else if (request.type === 'UPDATE_CHECK') {
      handleUpdateCheckRequest(sendResponse);
    } else if (request.type === 'GET_CACHE_STATS') {
      handleGetCacheStatsRequest(sendResponse);
    } else if (request.type === 'TEST_DOMAIN_CACHE') {
      handleTestDomainCacheRequest(request, sendResponse);
    } else if (request.type === 'CLEAR_DOMAIN_CACHE') {
      handleClearDomainCacheRequest(sendResponse);
    } else if (request.type === 'RESET_CACHE_STATS') {
      handleResetCacheStatsRequest(sendResponse);
    } else if (request.type === 'GET_DYNAMIC_RULES') {
      handleGetDynamicRulesRequest(sendResponse);
    } else if (request.type === 'GET_MATCHED_RULES') {
      handleGetMatchedRulesRequest(sendResponse);
    } else if (request.type === 'UPDATE_DYNAMIC_RULES') {
      handleUpdateDynamicRulesRequest(request, sendResponse);
    } else if (request.type === 'GET_STORAGE_DATA') {
      handleGetStorageDataRequest(request, sendResponse);
    } else if (request.type === 'SET_STORAGE_DATA') {
      handleSetStorageDataRequest(request, sendResponse);
    } else if (request.type === 'GET_MANIFEST_INFO') {
      handleGetManifestInfoRequest(sendResponse);
    }
  })();
  return true;
});

// 监听标签页更新以实现自动切换 (Manifest V3 compatible)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  await ensureInitialized();

  if (autoSwitchEnabled && changeInfo.status === 'complete' && tab?.url?.startsWith('http')) {
    try {
      const url = new URL(tab.url);
      const hostname = url.hostname.toLowerCase();
      
      const targetLanguage = await getLanguageForDomain(hostname);

      if (targetLanguage) {
        // 如果找到特定于域的语言，则应用它
        sendBackgroundLog(backgroundI18n.t('auto_switching_hostname', { hostname, language: targetLanguage }), 'info');
        const result = await updateHeaderRules(targetLanguage, 0, true);
        if (result.status === 'success') {
          notifyPopupUIUpdate(true, targetLanguage);
        }
      } else {
        // 否则，确保应用了默认的回退语言
        const fallbackLanguage = DEFAULT_LANG_EN;
        const rules = await chrome.declarativeNetRequest.getDynamicRules();
        const currentRule = rules.find(rule => rule.id === RULE_ID);
        const currentLang = currentRule?.action?.requestHeaders?.find(h => h.header === 'Accept-Language')?.value;

        if (currentLang !== fallbackLanguage) {
          sendBackgroundLog(backgroundI18n.t('no_matching_rule', { hostname, fallback: fallbackLanguage }), 'info');
          const result = await updateHeaderRules(fallbackLanguage, 0, true);
          if (result.status === 'success') {
            notifyPopupUIUpdate(true, fallbackLanguage);
          }
        }
      }
    } catch (error) {
      sendBackgroundLog(`${backgroundI18n.t('error_processing_url', { url: tab.url })}: ${error.message}`, 'error');
    }
  }
});
/*
*
 * 处理获取动态规则请求
 * @param {Function} sendResponse - 响应函数
 */
const handleGetDynamicRulesRequest = async (sendResponse) => {
  try {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    if (typeof sendResponse === 'function') {
      sendResponse({
        success: true,
        rules: rules
      });
    }
  } catch (error) {
    sendBackgroundLog(`Failed to get dynamic rules: ${error.message}`, 'error');
    if (typeof sendResponse === 'function') {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
};

/**
 * 处理获取匹配规则请求
 * @param {Function} sendResponse - 响应函数
 */
const handleGetMatchedRulesRequest = async (sendResponse) => {
  try {
    const matchedRules = await chrome.declarativeNetRequest.getMatchedRules({});

    if (typeof sendResponse === 'function') {
      sendResponse({
        success: true,
        matchedRules: matchedRules
      });
    }
  } catch (error) {
    sendBackgroundLog(`Failed to get matched rules: ${error.message}`, 'error');
    if (typeof sendResponse === 'function') {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
};

/**
 * 处理更新动态规则请求
 * @param {Object} request - 请求对象
 * @param {Function} sendResponse - 响应函数
 */
const handleUpdateDynamicRulesRequest = async (request, sendResponse) => {
  try {
    const { removeRuleIds, addRules } = request;
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeRuleIds || [],
      addRules: addRules || []
    });
    
    if (typeof sendResponse === 'function') {
      sendResponse({
        success: true
      });
    }
  } catch (error) {
    sendBackgroundLog(`Failed to update dynamic rules: ${error.message}`, 'error');
    if (typeof sendResponse === 'function') {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
};

/**
 * 处理获取存储数据请求
 * @param {Object} request - 请求对象
 * @param {Function} sendResponse - 响应函数
 */
const handleGetStorageDataRequest = async (request, sendResponse) => {
  try {
    const { keys } = request;
    const result = await chrome.storage.local.get(keys);
    
    if (typeof sendResponse === 'function') {
      sendResponse({
        success: true,
        data: result
      });
    }
  } catch (error) {
    sendBackgroundLog(`Failed to get storage data: ${error.message}`, 'error');
    if (typeof sendResponse === 'function') {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
};

/**
 * 处理设置存储数据请求
 * @param {Object} request - 请求对象
 * @param {Function} sendResponse - 响应函数
 */
const handleSetStorageDataRequest = async (request, sendResponse) => {
  try {
    const { data } = request;
    await chrome.storage.local.set(data);
    
    if (typeof sendResponse === 'function') {
      sendResponse({
        success: true
      });
    }
  } catch (error) {
    sendBackgroundLog(`Failed to set storage data: ${error.message}`, 'error');
    if (typeof sendResponse === 'function') {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
};

/**
 * 处理获取清单信息请求
 * @param {Function} sendResponse - 响应函数
 */
const handleGetManifestInfoRequest = (sendResponse) => {
  try {
    const manifest = chrome.runtime.getManifest();
    const extensionId = chrome.runtime.id;

    if (typeof sendResponse === 'function') {
      sendResponse({
        success: true,
        manifest: manifest,
        extensionId: extensionId
      });
    }
  } catch (error) {
    sendBackgroundLog(`Failed to get manifest info: ${error.message}`, 'error');
    if (typeof sendResponse === 'function') {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
};

// 扩展卸载时的清理
chrome.runtime.onSuspend.addListener(() => {
  sendBackgroundLog('Extension suspending, cleaning up resources...', 'info');
  resourceTracker.cleanup();
});