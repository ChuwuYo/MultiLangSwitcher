// 后台脚本，确保扩展在浏览器启动时就能应用语言设置

// 导入域名规则管理器
importScripts('domain-rules-manager.js');

// 常量定义
const RULE_ID = 1;
const DEFAULT_LANGUAGE = 'en-US';
const FALLBACK_LANGUAGE = 'en';

/**
 * 发送后台日志消息，用于调试和重要信息输出
 * @param {string} message - 日志消息内容
 * @param {string} logType - 日志类型 (info, warning, error, success)
 */
function sendBackgroundLog(message, logType = 'info') {
  // 在控制台输出重要信息
  if (logType === 'error' || logType === 'warning' || logType === 'info' || logType === 'success') {
    console.log(`[Background ${logType.toUpperCase()}] ${message}`);
  }

  // 尝试发送到调试页面
  chrome.runtime.sendMessage({
    type: 'DEBUG_LOG',
    message: `[Background] ${message}`,
    logType: logType
  }).catch(() => {
    // 捕获错误避免控制台报错
  });
}

// 全局状态变量
let rulesCache = null;          // 规则缓存，避免重复获取已知规则
let lastAppliedLanguage = null; // 最后应用的语言
let autoSwitchEnabled = false;  // 自动切换状态

/**
 * 根据域名获取对应的语言
 * @param {string} domain - 域名
 * @returns {Promise<string|null>} 对应的语言代码或null
 */
async function getLanguageForDomain(domain) {
  return await domainRulesManager.getLanguageForDomain(domain);
}

/**
 * 检测浏览器语言并返回对应的i18n语言代码
 * @returns {string} 'zh' 或 'en'
 */
function detectBrowserLanguage() {
  const browserLang = chrome.i18n.getUILanguage().toLowerCase();
  sendBackgroundLog(`检测到浏览器语言: ${browserLang}`, 'info');
  
  // 检查是否为中文及其变体
  if (browserLang.startsWith('zh')) {
    return 'zh';
  }
  
  // 默认返回英文
  return 'en';
}

/**
 * 初始化域名规则管理器
 * @returns {Promise<void>}
 */
async function initDomainRulesManager() {
  try {
    await domainRulesManager.loadRules();
    sendBackgroundLog('Domain rules loaded successfully', 'info');
  } catch (error) {
    sendBackgroundLog(`Failed to load domain rules: ${error.message}`, 'error');
  }
}

// 在浏览器启动时初始化
chrome.runtime.onStartup.addListener(initDomainRulesManager);

// 在扩展安装或更新时初始化
chrome.runtime.onInstalled.addListener(initDomainRulesManager);

// 指数退避重试配置
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 500; // 毫秒

/**
 * 更新请求头规则，支持错误重试和规则缓存
 * @param {string} language - 要设置的语言代码
 * @param {number} retryCount - 当前重试次数
 * @param {boolean} isAutoSwitch - 是否由自动切换触发
 * @returns {Promise<Object>} 更新结果
 */
function updateHeaderRules(language, retryCount = 0, isAutoSwitch = false) {
  language = language ? language.trim() : DEFAULT_LANGUAGE; // 增加对language空值的处理

  // 检查是否需要更新（但对自动切换更宽松）
  if (!isAutoSwitch && language === lastAppliedLanguage && rulesCache) {
    sendBackgroundLog(`语言设置 ${language} 已经应用，跳过更新`, 'info');
    return Promise.resolve({ status: 'cached', language });
  }

  sendBackgroundLog(`尝试更新请求头规则为: ${language}${retryCount > 0 ? ` (重试 #${retryCount})` : ''}`, 'info');

  // 返回Promise以便支持重试机制
  return new Promise((resolve, reject) => {
    // 获取当前规则以检查是否需要更新
    chrome.declarativeNetRequest.getDynamicRules(existingRules => {
      // 检查是否有错误
      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError;
        sendBackgroundLog(`获取现有规则失败: ${error.message}`, 'error');
        handleRuleUpdateError(error, language, retryCount, resolve, reject);
        return;
      }

      // 缓存现有规则
      rulesCache = existingRules;

      // 检查是否已存在相同语言的规则，如果是则跳过更新
      const existingRule = existingRules.find(rule =>
        rule.id === RULE_ID &&
        rule.action.requestHeaders &&
        rule.action.requestHeaders.some(header =>
          header.header === 'Accept-Language' &&
          header.value === language
        )
      );

      if (existingRule) {
        sendBackgroundLog(`已存在相同语言 ${language} 的规则，跳过更新`, 'info');
        lastAppliedLanguage = language;
        resolve({ status: 'unchanged', language });
        return;
      }

      // 直接尝试移除旧规则 (ID 为 RULE_ID) 并添加新规则
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [RULE_ID], // 直接指定要移除的规则 ID
        addRules: [{
          "id": RULE_ID,
          "priority": 100, // 使用更高的优先级覆盖静态规则
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
      }, function () {
        // 检查是否有错误
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError;
          sendBackgroundLog(`更新 declarativeNetRequest 规则失败: ${error.message}`, 'error');
          handleRuleUpdateError(error, language, retryCount, resolve, reject);
          return;
        }

        // 规则更新成功
        lastAppliedLanguage = language; // 总是更新最后应用的语言
        sendBackgroundLog(`请求头规则已成功更新为: ${language}${isAutoSwitch ? ' (自动切换)' : ''}`, 'success');
        resolve({ status: 'success', language });
      });
    });
  });
}

/**
 * 处理规则更新错误，实现指数退避重试
 * @param {Error} error - 错误对象
 * @param {string} language - 要设置的语言代码
 * @param {number} retryCount - 当前重试次数
 * @param {Function} resolve - Promise resolve函数
 * @param {Function} reject - Promise reject函数
 */
function handleRuleUpdateError(error, language, retryCount, resolve, reject) {
  // 对不同类型的错误进行分类处理
  let errorType = 'unknown';
  let canRetry = true;

  // 分析错误类型
  if (error.message.includes('quota')) {
    errorType = 'quota_exceeded';
    canRetry = false; // 配额错误通常无法通过重试解决
  } else if (error.message.includes('permission')) {
    errorType = 'permission_denied';
    canRetry = false; // 权限错误通常无法通过重试解决
  } else if (error.message.includes('network')) {
    errorType = 'network_error';
    // 网络错误可以重试
  }

  // 记录详细错误信息
  sendBackgroundLog(`规则更新错误类型: ${errorType}, 消息: ${error.message}`, 'error');

  // 如果可以重试且未超过最大重试次数
  if (canRetry && retryCount < MAX_RETRY_ATTEMPTS) {
    const nextRetryCount = retryCount + 1;
    const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount); // 指数退避

    sendBackgroundLog(`将在 ${delay}ms 后进行第 ${nextRetryCount} 次重试`, 'warning');

    setTimeout(() => {
      // 递归调用更新函数进行重试
      updateHeaderRules(language, nextRetryCount)
        .then(resolve)
        .catch(reject);
    }, delay);
  } else {
    // 超过重试次数或不可重试的错误
    const finalError = new Error(`更新规则失败 (${errorType}): ${error.message}`);
    finalError.originalError = error;
    finalError.type = errorType;
    finalError.retryCount = retryCount;

    sendBackgroundLog(`已达到最大重试次数或错误不可重试，放弃更新`, 'error');
    reject(finalError);

    // 通知用户出现了问题
    chrome.runtime.sendMessage({
      type: 'UPDATE_ERROR',
      error: {
        type: errorType,
        message: error.message,
        retryCount: retryCount
      }
    }).catch(() => {
      // 忽略发送消息的错误
    });
  }
}


// 当扩展安装或更新时触发
chrome.runtime.onInstalled.addListener(function (details) {
  sendBackgroundLog(`MultiLangSwitcher 扩展已安装/更新. Reason: ${details.reason}`, 'info');

  // 初始化域名规则管理器
  domainRulesManager.loadRules().then(() => {
    sendBackgroundLog('Domain rules loaded after install', 'info');
    
    // 从存储中获取当前语言设置和自动切换状态并应用
    chrome.storage.local.get(['currentLanguage', 'autoSwitchEnabled'], function (result) {
      autoSwitchEnabled = !!result.autoSwitchEnabled; // 更新内存中的状态
      sendBackgroundLog(`加载存储的自动切换状态: ${autoSwitchEnabled}`, 'info');

      if (autoSwitchEnabled) {
        sendBackgroundLog(`自动切换已启用，将应用默认语言(${FALLBACK_LANGUAGE})直到首次导航触发规则。`, 'info');
        // 当自动切换启用时，使用回退语言，直到访问特定域名时再切换或用户手动更改
        updateHeaderRules(FALLBACK_LANGUAGE, 0, true).then(() => { // 标记为自动切换初始化
          notifyPopupUIUpdate(true, FALLBACK_LANGUAGE); // 通知UI当前是自动模式
        });
      } else if (result.currentLanguage) {
        updateHeaderRules(result.currentLanguage);
        sendBackgroundLog(`加载并应用存储的语言设置: ${result.currentLanguage}`, 'info');
        notifyPopupUIUpdate(autoSwitchEnabled, result.currentLanguage);
      } else {
        // 如果没有保存的语言设置，根据浏览器语言自动检测
        const detectedLang = detectBrowserLanguage();
        const defaultLanguage = detectedLang === 'zh' ? 'zh-CN' : DEFAULT_LANGUAGE;
        
        chrome.storage.local.set({
          currentLanguage: defaultLanguage
        }, function () {
          if (chrome.runtime.lastError) {
            sendBackgroundLog(`保存默认语言设置 ${defaultLanguage} 到 storage 失败: ${chrome.runtime.lastError.message}`, 'error');
          }
          updateHeaderRules(defaultLanguage);
          sendBackgroundLog(`首次安装检测到浏览器语言为 ${detectedLang}，设置默认语言为: ${defaultLanguage}`, 'info');
          notifyPopupUIUpdate(autoSwitchEnabled, defaultLanguage);
        });
      }
    });
  }).catch(error => {
    sendBackgroundLog(`Failed to load domain rules: ${error.message}`, 'error');
  });
});

/**
 * 通知popup更新UI
 * @param {boolean} autoSwitchEnabled - 自动切换是否启用
 * @param {string} currentLanguage - 当前语言代码
 */
function notifyPopupUIUpdate(autoSwitchEnabled, currentLanguage) {
  chrome.runtime.sendMessage({
    type: 'AUTO_SWITCH_UI_UPDATE',
    autoSwitchEnabled,
    currentLanguage
  }).catch(() => {
    // 忽略发送消息的错误
  });
}

/**
 * 处理自动切换逻辑
 * @param {Object} details - 请求详情
 * @returns {Promise<void>}
 */
async function handleAutoSwitch(details) {
  if (!autoSwitchEnabled || details.method !== 'GET' || !details.url || details.tabId < 0 || details.type !== 'main_frame') {
    return; // 只处理主框架请求
  }

  try {
    const url = new URL(details.url);
    const hostname = url.hostname;
    let targetLanguage = null;
    let matchedRule = null;

    // 使用域名规则管理器获取语言
    targetLanguage = await getLanguageForDomain(hostname);
    if (targetLanguage) {
      matchedRule = hostname;

      // 检查URL路径中是否包含语言代码
      const pathParts = url.pathname.split('/');
      const commonLanguageCodes = ['en', 'zh', 'fr', 'de', 'es', 'ru', 'it', 'ja', 'ko', 'ar'];
      const hasLanguageInPath = pathParts.some(part => commonLanguageCodes.includes(part));

      // 如果URL路径中包含语言代码，记录日志但仍然使用域名规则
      if (hasLanguageInPath) {
        sendBackgroundLog(`注意: 域名 ${hostname} 的URL路径中包含语言代码，但仍然使用域名规则 ${matchedRule} -> ${targetLanguage}`, 'info');
      }
    }

    if (targetLanguage) {
      sendBackgroundLog(`自动切换: 检测到域名 ${hostname} (匹配规则: ${matchedRule}), 目标语言: ${targetLanguage}`, 'info');
      optimizedUpdateHeaderRules(targetLanguage, 0, true).then(updateResult => {
        if (updateResult.status === 'success' || updateResult.status === 'unchanged') {
          sendBackgroundLog(`为 ${hostname} 应用语言 ${targetLanguage} 成功`, 'info');
          // 只在状态变化时更新UI
          if (updateResult.status === 'success') {
            notifyPopupUIUpdate(autoSwitchEnabled, targetLanguage);
          }
        } else {
          sendBackgroundLog(`为 ${hostname} 应用语言 ${targetLanguage} 失败: ${updateResult.message}`, 'error');
        }
      }).catch(error => {
        sendBackgroundLog(`更新 ${hostname} 的规则时出错: ${error.message}`, 'error');
      });
    } else {
      // 如果没有特定域名规则，使用回退语言
      const fallbackLanguage = FALLBACK_LANGUAGE;
      sendBackgroundLog(`自动切换: 域名 ${hostname} 无匹配规则, 默认使用语言: ${fallbackLanguage}`, 'info');

      updateHeaderRules(fallbackLanguage, 0, true).then(updateResult => {
        if (updateResult.status === 'success' || updateResult.status === 'unchanged') {
          sendBackgroundLog(`为 ${hostname} 应用默认/回退语言 ${fallbackLanguage} 成功`, 'info');
          notifyPopupUIUpdate(autoSwitchEnabled, fallbackLanguage); // 更新UI
        } else {
          sendBackgroundLog(`为 ${hostname} 应用默认/回退语言 ${fallbackLanguage} 失败: ${updateResult.message}`, 'error');
        }
      }).catch(error => {
        sendBackgroundLog(`更新 ${hostname} 的默认/回退规则时出错: ${error.message}`, 'error');
      });
    }
  } catch (e) {
    sendBackgroundLog(`解析URL或处理自动切换时出错: ${e.message}`, 'error');
  }
}

// 防抖函数，防止频繁操作
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 优化的规则更新函数，带状态检查
const optimizedUpdateHeaderRules = debounce(async function(language, delay = 0, isAutoSwitch = false) {
  try {
    // 检查当前规则是否已经是目标语言
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const currentRule = currentRules.find(rule => rule.id === 1);
    const currentLang = currentRule?.action?.requestHeaders?.find(h => h.header === 'Accept-Language')?.value;
    
    if (currentLang === language) {
      sendBackgroundLog(`语言已是 ${language}，跳过更新`, 'info');
      return { status: 'unchanged', language: language };
    }
    
    return await updateHeaderRules(language, delay, isAutoSwitch);
  } catch (error) {
    sendBackgroundLog(`优化更新规则失败: ${error.message}`, 'error');
    throw error;
  }
}, 100);

// 监听来自 popup 或 debug 页面的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === 'UPDATE_RULES') {
    try {
      const language = request.language;
      sendBackgroundLog(`收到更新规则请求，语言: ${language}`, 'info');
      optimizedUpdateHeaderRules(language)
        .then(result => {
          sendBackgroundLog(`规则更新完成，状态: ${result.status}`, 'info');
          chrome.storage.local.set({ currentLanguage: language }, () => {
            if (chrome.runtime.lastError) {
              sendBackgroundLog(`保存语言设置 ${language} 到 storage 失败: ${chrome.runtime.lastError.message}`, 'error');
            }
            if (typeof sendResponse === 'function') {
              sendResponse({ status: 'success', language: result.language });
            }
            // 只在状态发生变化时才通知UI更新
            if (result.status === 'success') {
              notifyPopupUIUpdate(autoSwitchEnabled, result.language);
            }
          });
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          sendBackgroundLog(`规则更新失败: ${errorMessage}`, 'error');
          if (typeof sendResponse === 'function') {
            sendResponse({ status: 'error', message: `规则更新时发生错误: ${errorMessage}` });
          }
        });
    } catch (syncError) {
      const errorMessage = syncError instanceof Error ? syncError.message : String(syncError);
      sendBackgroundLog(`处理 UPDATE_RULES 时发生同步错误: ${errorMessage}`, 'error');
      if (typeof sendResponse === 'function') {
        sendResponse({ status: 'error', message: `处理规则更新时发生意外错误: ${errorMessage}` });
      }
    }
    return true;
  } else if (request.type === 'AUTO_SWITCH_TOGGLED') {
    autoSwitchEnabled = request.enabled;
    sendBackgroundLog(`自动切换功能状态已更新为: ${autoSwitchEnabled}`, 'info');
    chrome.storage.local.set({ autoSwitchEnabled: autoSwitchEnabled }); // 保存状态

    if (autoSwitchEnabled) {
      sendBackgroundLog('自动切换已启用。后续请求将根据域名自动切换语言。', 'info');
      // 启用自动切换时，先应用回退语言
      updateHeaderRules(FALLBACK_LANGUAGE, 0, true).then(() => {
        if (typeof sendResponse === 'function') {
          sendResponse({ status: 'success' });
        }
        notifyPopupUIUpdate(true, FALLBACK_LANGUAGE);
      }).catch(error => {
        sendBackgroundLog(`自动切换启用时更新规则失败: ${error.message}`, 'error');
        if (typeof sendResponse === 'function') {
          sendResponse({ status: 'error', message: `自动切换启用时更新规则失败: ${error.message}` });
        }
      });
    } else {
      // 禁用自动切换时，恢复到用户之前手动设置的语言
      chrome.storage.local.get(['currentLanguage'], function (result) {
        const language = result.currentLanguage || DEFAULT_LANGUAGE;
        sendBackgroundLog(`自动切换已禁用。恢复到用户设置的语言: ${language}`, 'info');
        updateHeaderRules(language).then(() => {
          if (typeof sendResponse === 'function') {
            sendResponse({ status: 'success' });
          }
          notifyPopupUIUpdate(false, language);
        }).catch(error => {
          sendBackgroundLog(`自动切换禁用时更新规则失败: ${error.message}`, 'error');
          if (typeof sendResponse === 'function') {
            sendResponse({ status: 'error', message: `自动切换禁用时更新规则失败: ${error.message}` });
          }
        });
      });
    }
    // 由于此分支中的 sendResponse 是在异步操作 (.then() 或回调) 中调用的，
    // 因此整个 'AUTO_SWITCH_TOGGLED' 分支必须返回 true。
    return true;
  } else if (request.type === 'GET_DOMAIN_RULES') {
    sendBackgroundLog('收到获取域名映射规则请求', 'info');
    try {
      // 确保规则已加载
      domainRulesManager.loadRules().then(() => {
        const rules = domainRulesManager.getRules();
        const stats = domainRulesManager.getRulesStats();
        sendBackgroundLog(`成功获取${Object.keys(rules || {}).length}条域名映射规则`, 'success');
        if (typeof sendResponse === 'function') {
          sendResponse({ domainRules: rules, stats: stats });
        }
      }).catch(error => {
        sendBackgroundLog(`加载域名规则失败: ${error.message}`, 'error');
        if (typeof sendResponse === 'function') {
          sendResponse({ error: `加载域名规则失败: ${error.message}` });
        }
      });
    } catch (e) {
      sendBackgroundLog(`处理 GET_DOMAIN_RULES 时出错: ${e.message}`, 'error');
      if (typeof sendResponse === 'function') {
        sendResponse({ error: `处理 GET_DOMAIN_RULES 时出错: ${e.message}` });
      }
    }
    return true;
  }
});



// 监听标签页更新以实现自动切换 (Manifest V3 compatible)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  sendBackgroundLog(`Tab: tabId=${tabId}, status=${changeInfo.status}, autoSwitch=${autoSwitchEnabled}, url=${tab?.url}`, 'info');
  
  // 确保自动切换已启用，标签页加载完成，并且有有效的URL (http or https)
  if (autoSwitchEnabled && changeInfo.status === 'complete' && tab && tab.url && (tab.url.startsWith('http:') || tab.url.startsWith('https://'))) {
    sendBackgroundLog(`Tab updated: ${tab.url}, Status: ${changeInfo.status}`, 'info');
    try {
      const url = new URL(tab.url);
      const currentHostname = url.hostname.toLowerCase();
      let targetLanguage = null;

      // 使用域名规则管理器获取语言
      sendBackgroundLog(`正在为域名 '${currentHostname}' 查找语言规则... (URL: ${tab.url})`, 'info');
      targetLanguage = await getLanguageForDomain(currentHostname);
      if (targetLanguage) {
        sendBackgroundLog(`域名规则匹配成功: '${currentHostname}' -> '${targetLanguage}'`, 'success');
      } else {
        sendBackgroundLog(`域名 '${currentHostname}' 未找到匹配的语言规则`, 'warning');
      }

      if (targetLanguage) {
        sendBackgroundLog(`Auto-switching for hostname '${currentHostname}' to language '${targetLanguage}'.`, 'info');
        // 调用 updateHeaderRules 更新请求头，标记为自动切换 (isAutoSwitch = true)
        updateHeaderRules(targetLanguage, 0, true)
          .then(result => {
            sendBackgroundLog(`自动切换成功: ${currentHostname} -> ${targetLanguage} (${result.status})`, 'success');
            notifyPopupUIUpdate(true, targetLanguage);
          })
          .catch(error => {
            sendBackgroundLog(`自动切换失败: ${currentHostname} -> ${targetLanguage}: ${error.message}`, 'error');
          });
      } else {
        // 如果没有匹配的规则，使用回退语言
        const defaultLanguage = FALLBACK_LANGUAGE;
        sendBackgroundLog(`域名 '${currentHostname}' 没有匹配的规则，使用默认语言: ${defaultLanguage}`, 'info');
        // 只有在当前语言不是默认语言时才更新
        chrome.declarativeNetRequest.getDynamicRules(function(rules) {
          const currentRule = rules.find(rule => rule.id === 1);
          const currentLang = currentRule?.action?.requestHeaders?.find(h => h.header === 'Accept-Language')?.value;
          
          if (currentLang !== defaultLanguage) {
            updateHeaderRules(defaultLanguage, 0, true)
              .then(result => {
                sendBackgroundLog(`已为 ${currentHostname} 应用默认语言(${defaultLanguage}): ${result.status}`, 'info');
                notifyPopupUIUpdate(true, defaultLanguage);
              })
              .catch(error => {
                sendBackgroundLog(`为 ${currentHostname} 应用默认语言失败: ${error.message}`, 'error');
              });
          } else {
            sendBackgroundLog(`${currentHostname} 已是默认语言(${defaultLanguage})，跳过更新`, 'info');
          }
        });
      }
    } catch (e) {
      // 捕获并记录解析URL或处理过程中可能发生的任何错误
      sendBackgroundLog(`Error processing URL ('${tab.url}') for auto-switch: ${e.message}`, 'error');
    }
  }
});