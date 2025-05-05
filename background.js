// 后台脚本，确保扩展在浏览器启动时就能应用语言设置

// 定义规则ID
const RULE_ID = 1;
const DEFAULT_LANGUAGE = 'zh-CN';

// 函数：发送日志消息 (可选，如果不需要调试日志可以删掉)
function sendBackgroundLog(message, logType = 'info') {
    // 在生产环境中可以移除或注释掉这个发送消息逻辑
    /*
    chrome.runtime.sendMessage({
        type: 'DEBUG_LOG', // 消息类型，用于在调试页面区分
        message: `[Background] ${message}`,
        logType: logType // 日志级别 (info, warning, error, success)
    }).catch(error => {
        // 捕获错误避免控制台报错
        // console.warn("Could not send debug log from background:", error);
    });
    */
    // 或者只在控制台输出重要信息
    if (logType === 'error' || logType === 'warning' || logType === 'info') {
         console.log(`[Background ${logType.toUpperCase()}] ${message}`);
    }
}


// 规则缓存，避免重复获取已知规则
let rulesCache = null;
let lastAppliedLanguage = null;

// 指数退避重试配置
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 500; // 毫秒

// 更新请求头规则，支持错误重试和规则缓存
function updateHeaderRules(language, retryCount = 0) {
  language = language ? language.trim() : DEFAULT_LANGUAGE; // 增加对language空值的处理

  // 如果语言与上次应用的相同，且规则缓存存在，可以跳过更新
  if (language === lastAppliedLanguage && rulesCache) {
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
      }, function() {
        // 检查是否有错误
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError;
          sendBackgroundLog(`更新 declarativeNetRequest 规则失败: ${error.message}`, 'error');
          handleRuleUpdateError(error, language, retryCount, resolve, reject);
          return;
        }

        // 规则更新成功
        lastAppliedLanguage = language;
        sendBackgroundLog(`请求头规则已成功更新为: ${language}`, 'success');
        resolve({ status: 'success', language });
      });
    });
  });
}

// 处理规则更新错误，实现指数退避重试
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
chrome.runtime.onInstalled.addListener(function(details) {
  sendBackgroundLog(`MultiLangSwitcher 扩展已安装/更新. Reason: ${details.reason}`, 'info');

  // 从存储中获取当前语言设置并应用
  chrome.storage.local.get(['currentLanguage'], function(result) {
    if (result.currentLanguage) {
      updateHeaderRules(result.currentLanguage);
      sendBackgroundLog(`加载并应用存储的语言设置: ${result.currentLanguage}`, 'info');
    } else {
      // 如果没有保存的语言设置，使用默认值并保存
      chrome.storage.local.set({
        currentLanguage: DEFAULT_LANGUAGE
      }, function() {
         updateHeaderRules(DEFAULT_LANGUAGE);
         sendBackgroundLog(`未找到存储的语言设置，使用并保存默认值: ${DEFAULT_LANGUAGE}`, 'warning');
      });
    }
  });
});

// 当浏览器启动时触发
chrome.runtime.onStartup.addListener(function() {
  sendBackgroundLog('浏览器启动，MultiLangSwitcher 扩展初始化', 'info');

  // 从存储中获取当前语言设置并应用
  chrome.storage.local.get(['currentLanguage'], function(result) {
    if (result.currentLanguage) {
      updateHeaderRules(result.currentLanguage);
      sendBackgroundLog(`浏览器启动时加载并应用存储的语言设置: ${result.currentLanguage}`, 'info');
    } else {
        // 如果浏览器启动时存储中没有设置，也应用默认值，但不改变存储
         updateHeaderRules(DEFAULT_LANGUAGE);
         sendBackgroundLog(`浏览器启动时未找到存储的语言设置，应用默认值: ${DEFAULT_LANGUAGE}`, 'warning');
    }
  });
});

// 监听来自 popup 或 debug 页面的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'UPDATE_RULES') {
    try { // Add try block
      const language = request.language;
      sendBackgroundLog(`收到更新规则请求，语言: ${language}`, 'info');
      updateHeaderRules(language)
        .then(result => {
          sendBackgroundLog(`规则更新完成，状态: ${result.status}`, 'info');
          // 保存语言设置到 storage
          chrome.storage.local.set({ currentLanguage: language }, () => {
            if (chrome.runtime.lastError) {
              sendBackgroundLog(`保存语言设置 ${language} 到 storage 失败: ${chrome.runtime.lastError.message}`, 'error');
            } else {
              sendBackgroundLog(`语言设置 ${language} 已成功保存到 storage`, 'success');
            }
            // 在保存操作完成后发送响应
            if (chrome.runtime.lastError) {
               sendBackgroundLog(`Error before sending success response: ${chrome.runtime.lastError.message}`, 'error');
            } else if (typeof sendResponse === 'function') {
               sendResponse({ status: 'success', language: result.language });
            } else {
               sendBackgroundLog('sendResponse 在 then 块中不可用!', 'warning');
            }
          });
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          sendBackgroundLog(`规则更新失败: ${errorMessage}`, 'error');
           // Check if sendResponse is still valid
          if (chrome.runtime.lastError) {
             sendBackgroundLog(`Error before sending error response: ${chrome.runtime.lastError.message}`, 'error');
          } else if (typeof sendResponse === 'function') { // Check if function exists
             sendResponse({ status: 'error', message: `规则更新时发生错误: ${errorMessage}` });
          } else {
             sendBackgroundLog('sendResponse 在 catch 块中不可用!', 'error');
          }
        });
    } catch (syncError) { // Add catch block for synchronous errors
      const errorMessage = syncError instanceof Error ? syncError.message : String(syncError);
      sendBackgroundLog(`处理 UPDATE_RULES 时发生同步错误: ${errorMessage}`, 'error');
      // Try to send an error response if possible
      if (chrome.runtime.lastError) {
         sendBackgroundLog(`Error before sending sync error response: ${chrome.runtime.lastError.message}`, 'error');
      } else if (typeof sendResponse === 'function') {
         sendResponse({ status: 'error', message: `处理规则更新时发生意外错误: ${errorMessage}` });
      } else {
         sendBackgroundLog('sendResponse 在同步 catch 块中不可用!', 'error');
      }
    }
    // Return true MUST be outside the try...catch to signal async handling
    return true;
  } else if (request.type === 'GET_CURRENT_LANGUAGE') {
    chrome.storage.local.get(['currentLanguage'], function(result) {
      sendResponse({ language: result.currentLanguage || DEFAULT_LANGUAGE });
    });
    return true; // 异步响应
  }
  // 对于其他类型的消息，可以添加更多处理逻辑
});

// 监听存储变化，如果语言设置在其他地方被更改，则更新规则
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes.currentLanguage) {
    const newLanguage = changes.currentLanguage.newValue;
    const oldLanguage = changes.currentLanguage.oldValue;
    if (newLanguage && newLanguage !== oldLanguage) {
      sendBackgroundLog(`检测到存储中的语言变化: ${oldLanguage} -> ${newLanguage}，正在更新规则...`, 'info');
      updateHeaderRules(newLanguage);
    }
  }
});

// 初始检查和应用规则 (如果浏览器启动时未执行)
// 这可以确保即使在扩展重新加载后规则也能保持最新
chrome.runtime.onStartup.addListener(() => {
    sendBackgroundLog('浏览器启动事件触发，检查并应用规则', 'info');
    chrome.storage.local.get(['currentLanguage'], function(result) {
        const language = result.currentLanguage || DEFAULT_LANGUAGE;
        updateHeaderRules(language);
    });
});