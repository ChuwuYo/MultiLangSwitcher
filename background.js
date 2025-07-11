// 后台脚本，确保扩展在浏览器启动时就能应用语言设置

// 首先导入共享工具（包含 detectBrowserLanguage 函数）
importScripts('shared/shared-utils.js');
importScripts('i18n/background-i18n.js');
importScripts('i18n/domain-manager-i18n.js');
// 导入域名规则管理器
importScripts('domain-rules-manager.js');

// 常量定义
const RULE_ID = 1;
// 统一并简化语言常量
const DEFAULT_LANG_ZH = 'zh-CN'; // 为中文用户设置的默认语言
const DEFAULT_LANG_EN = 'en';      // 为英文用户设置的默认语言，也用作自动切换的回退语言

// 使用共享的sendDebugLog函数，但保留后台特定的日志前缀
function sendBackgroundLog(message, logType = 'info') {
  // 确保同样的消息被用于控制台日志和调试日志
  console.log(`[${backgroundI18n.t('background')} ${logType.toUpperCase()}] ${message}`);
  sendDebugLog(`[${backgroundI18n.t('background')}] ${message}`, logType);
}

// 全局状态变量
let rulesCache = null;          // 规则缓存，避免重复获取已知规则
let lastAppliedLanguage = null; // 最后应用的语言
let autoSwitchEnabled = false;  // 自动切换状态
let lastUIUpdateTime = 0;       // 最后UI更新时间
let pendingUIUpdate = null;     // 待处理的UI更新

/**
 * 根据域名获取对应的语言
 * @param {string} domain - 域名
 * @returns {Promise<string|null>} 对应的语言代码或null
 */
async function getLanguageForDomain(domain) {
  return await domainRulesManager.getLanguageForDomain(domain);
}



/**
 * 初始化域名规则管理器
 * @returns {Promise<void>}
 */
async function initDomainRulesManager() {
  try {
    await domainRulesManager.loadRules();
    sendBackgroundLog(backgroundI18n.t('domain_rules_loaded'), 'info');
  } catch (error) {
    sendBackgroundLog(`${backgroundI18n.t('domain_rules_load_failed')}: ${error.message}`, 'error');
  }
}

// 在浏览器启动时初始化
chrome.runtime.onStartup.addListener(async () => {
  try {
    await initDomainRulesManager();
    // 加载自动切换状态
    const result = await chrome.storage.local.get(['autoSwitchEnabled']);
    autoSwitchEnabled = !!result.autoSwitchEnabled;
    sendBackgroundLog(backgroundI18n.t('startup_load_auto_switch_status', {status: autoSwitchEnabled}), 'info');
  } catch (error) {
    sendBackgroundLog(`${backgroundI18n.t('startup_init_failed')}: ${error.message}`, 'error');
  }
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
async function clearAllDynamicRules() {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    if (existingRules.length > 0) {
      const ruleIds = existingRules.map(rule => rule.id);
      sendBackgroundLog(backgroundI18n.t('clearing_existing_rules', {count: ruleIds.length}), 'info');
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
async function updateHeaderRules(language, retryCount = 0, isAutoSwitch = false) {
  language = language ? language.trim() : DEFAULT_LANG_EN;
  
  // 检查是否需要更新（但对自动切换更宽松）
  if (!isAutoSwitch && language === lastAppliedLanguage && rulesCache) {
    sendBackgroundLog(backgroundI18n.t('language_already_set', {language}), 'info');
    return { status: 'cached', language };
  }

  sendBackgroundLog(`${backgroundI18n.t('trying_update_rules', {language})}${retryCount > 0 ? ` (${backgroundI18n.t('retry')} #${retryCount})` : ''}`, 'info');

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
      sendBackgroundLog(backgroundI18n.t('rules_already_set', {language}), 'info');
      lastAppliedLanguage = language;
      return { status: 'unchanged', language };
    }

    // 先清理所有现有规则，再添加新规则
    await clearAllDynamicRules();
    
    // 添加新规则
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [{
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
      }]
    });

    // 规则更新成功
    lastAppliedLanguage = language;
    sendBackgroundLog(`${backgroundI18n.t('rules_updated_successfully', {language})}${isAutoSwitch ? ` (${backgroundI18n.t('auto_switch')})` : ''}`, 'success');
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
async function handleRuleUpdateError(error, language, retryCount) {
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

    sendBackgroundLog(`${backgroundI18n.t('retry_after', {delay, count: nextRetryCount})}`, 'warning');

    // 等待后重试
    await new Promise(resolve => setTimeout(resolve, delay));
    return await updateHeaderRules(language, nextRetryCount);
  } else {
    // 超过重试次数或不可重试的错误
    const finalError = new Error(`${backgroundI18n.t('update_rules_failed_with_type', {type: errorType})}: ${error.message}`);
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
    }).catch(() => {});

    throw finalError;
  }
}


// 当扩展安装或更新时触发
chrome.runtime.onInstalled.addListener(async function (details) {
  sendBackgroundLog(backgroundI18n.t('extension_installed', {reason: details.reason}), 'info');

  try {
    // 初始化域名规则管理器
    await domainRulesManager.loadRules();
    sendBackgroundLog(backgroundI18n.t('domain_rules_loaded'), 'info');

    // 从存储中获取当前语言设置和自动切换状态并应用
    const result = await chrome.storage.local.get(['currentLanguage', 'autoSwitchEnabled']);
    autoSwitchEnabled = !!result.autoSwitchEnabled;
    sendBackgroundLog(`${backgroundI18n.t('loaded_auto_switch_status')}: ${autoSwitchEnabled}`, 'info');

    if (autoSwitchEnabled) {
      sendBackgroundLog(backgroundI18n.t('auto_switch_enabled_default_lang', {language: DEFAULT_LANG_EN}), 'info');
      try {
        await updateHeaderRules(DEFAULT_LANG_EN, 0, true);
        notifyPopupUIUpdate(true, DEFAULT_LANG_EN, true);
      } catch (error) {
        sendBackgroundLog(`${backgroundI18n.t('auto_switch_init_failed')}: ${error.message}`, 'error');
      }
    } else if (result.currentLanguage) {
      try {
        await updateHeaderRules(result.currentLanguage);
        sendBackgroundLog(`${backgroundI18n.t('loaded_applied_language')}: ${result.currentLanguage}`, 'info');
        notifyPopupUIUpdate(autoSwitchEnabled, result.currentLanguage, true);
      } catch (error) {
        sendBackgroundLog(`${backgroundI18n.t('load_language_failed')}: ${error.message}`, 'error');
      }
    } else {
      // 如果没有保存的语言设置，根据浏览器语言自动检测
      const detectedLang = detectBrowserLanguage();
      sendBackgroundLog(`${backgroundI18n.t('first_install_detected_lang')}: ${detectedLang}`, 'info');
      const initialLanguage = detectedLang === 'zh' ? DEFAULT_LANG_ZH : DEFAULT_LANG_EN;

      try {
        await chrome.storage.local.set({ currentLanguage: initialLanguage });
        await updateHeaderRules(initialLanguage);
        sendBackgroundLog(`${backgroundI18n.t('set_default_language')}: ${initialLanguage}`, 'info');
        notifyPopupUIUpdate(autoSwitchEnabled, initialLanguage, true);
      } catch (error) {
        sendBackgroundLog(`${backgroundI18n.t('set_default_language_failed')}: ${error.message}`, 'error');
      }
    }
  } catch (error) {
    sendBackgroundLog(`${backgroundI18n.t('domain_rules_load_failed')}: ${error.message}`, 'error');
  }
});

/**
 * 防抖的UI更新通知
 * @param {boolean} autoSwitchEnabled - 自动切换是否启用
 * @param {string} currentLanguage - 当前语言代码
 * @param {boolean} immediate - 是否立即更新
 */
function notifyPopupUIUpdate(autoSwitchEnabled, currentLanguage, immediate = false) {
  const now = Date.now();
  const message = {
    type: 'AUTO_SWITCH_UI_UPDATE',
    autoSwitchEnabled,
    currentLanguage
  };

  // 立即更新或距离上次更新超过500ms
  if (immediate || now - lastUIUpdateTime > 500) {
    clearTimeout(pendingUIUpdate);
    lastUIUpdateTime = now;

    chrome.runtime.sendMessage(message).catch(() => { });
    sendBackgroundLog(`${backgroundI18n.t('ui_update')}: ${backgroundI18n.t('auto_switch')}=${autoSwitchEnabled}, ${backgroundI18n.t('language')}=${currentLanguage}`, 'info');
  } else {
    // 防抖延迟更新
    clearTimeout(pendingUIUpdate);
    pendingUIUpdate = setTimeout(() => {
      lastUIUpdateTime = Date.now();
      chrome.runtime.sendMessage(message).catch(() => { });
      sendBackgroundLog(`${backgroundI18n.t('delayed_ui_update')}: ${backgroundI18n.t('auto_switch')}=${autoSwitchEnabled}, ${backgroundI18n.t('language')}=${currentLanguage}`, 'info');
    }, 300);
  }
}





// 监听来自 popup 或 debug 页面的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === 'UPDATE_RULES') {
    (async () => {
      try {
        const language = request.language;
        sendBackgroundLog(backgroundI18n.t('trying_update_rules', {language}), 'info');
        
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        sendBackgroundLog(`${backgroundI18n.t('rules_update_failed')}: ${errorMessage}`, 'error');
        if (typeof sendResponse === 'function') {
          sendResponse({ status: 'error', message: `${backgroundI18n.t('rules_update_error')}: ${errorMessage}` });
        }
      }
    })();
    return true;
  } else if (request.type === 'AUTO_SWITCH_TOGGLED') {
    (async () => {
      try {
        autoSwitchEnabled = request.enabled;
        sendBackgroundLog(`${backgroundI18n.t('auto_switch_status_updated')}: ${autoSwitchEnabled}`, 'info');
        
        await chrome.storage.local.set({ autoSwitchEnabled: autoSwitchEnabled });

        // 广播状态变化给所有页面
        chrome.runtime.sendMessage({
          type: 'AUTO_SWITCH_STATE_CHANGED',
          enabled: autoSwitchEnabled
        }).catch(() => {});

        if (autoSwitchEnabled) {
          sendBackgroundLog(backgroundI18n.t('auto_switch_enabled'), 'info');
          const result = await updateHeaderRules(DEFAULT_LANG_EN, 0, true);
          if (typeof sendResponse === 'function') {
            sendResponse({ status: 'success' });
          }
          notifyPopupUIUpdate(true, DEFAULT_LANG_EN, true);
        } else {
          const result = await chrome.storage.local.get(['currentLanguage']);
          const language = result.currentLanguage || DEFAULT_LANG_EN;
          sendBackgroundLog(backgroundI18n.t('auto_switch_disabled', {language}), 'info');
          await updateHeaderRules(language);
          if (typeof sendResponse === 'function') {
            sendResponse({ status: 'success' });
          }
          notifyPopupUIUpdate(false, language, true);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        sendBackgroundLog(`${backgroundI18n.t('auto_switch_toggle_failed')}: ${errorMessage}`, 'error');
        if (typeof sendResponse === 'function') {
          sendResponse({ status: 'error', message: errorMessage });
        }
      }
    })();
    return true;
  } else if (request.type === 'GET_CURRENT_LANG') {
    (async () => {
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
    })();
    return true;
  } else if (request.type === 'RESET_ACCEPT_LANGUAGE') {
    (async () => {
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
        notifyPopupUIUpdate(autoSwitchEnabled, null, true);
      } catch (error) {
        sendBackgroundLog(`${backgroundI18n.t('reset_error')}: ${error.message}`, 'error');
        if (typeof sendResponse === 'function') {
          sendResponse({ status: 'error', message: error.message });
        }
      }
    })();
    return true;
  } else if (request.type === 'GET_DOMAIN_RULES') {
    sendBackgroundLog(backgroundI18n.t('received_domain_rules_request'), 'info');
    try {
      // 确保规则已加载
      domainRulesManager.loadRules().then(() => {
        const rules = domainRulesManager.getRules();
        const stats = domainRulesManager.getRulesStats();
        sendBackgroundLog(backgroundI18n.t('domain_rules_fetch_success', {count: Object.keys(rules || {}).length}), 'success');
        if (typeof sendResponse === 'function') {
          sendResponse({ domainRules: rules, stats: stats });
        }
      }).catch(error => {
        sendBackgroundLog(`${backgroundI18n.t('domain_rules_load_failed')}: ${error.message}`, 'error');
        if (typeof sendResponse === 'function') {
          sendResponse({ error: `${backgroundI18n.t('domain_rules_load_failed')}: ${error.message}` });
        }
      });
    } catch (e) {
      sendBackgroundLog(`${backgroundI18n.t('process_get_domain_rules_error')}: ${e.message}`, 'error');
      if (typeof sendResponse === 'function') {
        sendResponse({ error: `${backgroundI18n.t('process_get_domain_rules_error')}: ${e.message}` });
      }
    }
    return true;
  }
});

// 监听标签页更新以实现自动切换 (Manifest V3 compatible)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 调试日志：记录所有相关事件
  if (changeInfo.status === 'complete' && tab?.url?.startsWith('http')) {
    sendBackgroundLog(backgroundI18n.t('tab_update_debug', {url: tab.url, autoSwitch: autoSwitchEnabled}), 'info');
  }

  // 确保自动切换已启用，标签页加载完成，并且有有效的URL (http or https)
  if (autoSwitchEnabled && changeInfo.status === 'complete' && tab && tab.url && (tab.url.startsWith('http:') || tab.url.startsWith('https://'))) {
    sendBackgroundLog(`${backgroundI18n.t('tab_updated')}: ${tab.url}, ${backgroundI18n.t('status')}: ${changeInfo.status}`, 'info');
    try {
      const url = new URL(tab.url);
      const currentHostname = url.hostname.toLowerCase();
      let targetLanguage = null;

      // 使用域名规则管理器获取语言
      sendBackgroundLog(backgroundI18n.t('finding_language_rule', {hostname: currentHostname}), 'info');
      targetLanguage = await getLanguageForDomain(currentHostname);
      if (targetLanguage) {
        sendBackgroundLog(backgroundI18n.t('domain_rule_match_success', {hostname: currentHostname, language: targetLanguage}), 'success');
      }

      if (targetLanguage) {
        sendBackgroundLog(backgroundI18n.t('auto_switching_hostname', {hostname: currentHostname, language: targetLanguage}), 'info');
        // 调用 updateHeaderRules 更新请求头，标记为自动切换 (isAutoSwitch = true)
        try {
          const result = await updateHeaderRules(targetLanguage, 0, true);
          sendBackgroundLog(backgroundI18n.t('auto_switch_success', {hostname: currentHostname, language: targetLanguage, status: result.status}), 'success');
          if (result.status === 'success') {
            notifyPopupUIUpdate(true, targetLanguage);
          }
        } catch (error) {
          sendBackgroundLog(`${backgroundI18n.t('auto_switch_failed', {hostname: currentHostname, language: targetLanguage})}: ${error.message}`, 'error');
        }
      } else {
        // 如果没有匹配的规则，使用回退语言
        const fallbackLanguage = DEFAULT_LANG_EN;
        sendBackgroundLog(backgroundI18n.t('no_matching_rule', {hostname: currentHostname, fallback: fallbackLanguage}), 'info');
        // 只有在当前语言不是回退语言时才更新
        try {
          const rules = await chrome.declarativeNetRequest.getDynamicRules();
          const currentRule = rules.find(rule => rule.id === RULE_ID);
          const currentLang = currentRule?.action?.requestHeaders?.find(h => h.header === 'Accept-Language')?.value;

          if (currentLang !== fallbackLanguage) {
            const result = await updateHeaderRules(fallbackLanguage, 0, true);
            sendBackgroundLog(backgroundI18n.t('fallback_language_applied', {hostname: currentHostname, fallback: fallbackLanguage, status: result.status}), 'info');
            if (result.status === 'success') {
              notifyPopupUIUpdate(true, fallbackLanguage);
            }
          } else {
            sendBackgroundLog(backgroundI18n.t('current_is_fallback', {fallback: fallbackLanguage}), 'info');
          }
        } catch (error) {
          sendBackgroundLog(`${backgroundI18n.t('fallback_language_failed', {hostname: currentHostname})}: ${error.message}`, 'error');
        }
      }
    } catch (e) {
      // 捕获并记录解析URL或处理过程中可能发生的任何错误
      sendBackgroundLog(`${backgroundI18n.t('error_processing_url', {url: tab.url})}: ${e.message}`, 'error');
    }
  }
});