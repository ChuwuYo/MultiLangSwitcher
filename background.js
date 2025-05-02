// 后台脚本，确保扩展在浏览器启动时就能应用语言设置

// 定义规则ID
const RULE_ID = 1;
const DEFAULT_LANGUAGE = 'zh-CN';

// 函数：发送日志消息 (可选，如果不需要调试日志可以完全移除)
function sendBackgroundLog(message, logType = 'info') {
    // 在生产环境中可以移除或注释掉此发送消息逻辑
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


// 更新请求头规则
function updateHeaderRules(language) {
  // 确保语言值没有多余的空格
  language = language ? language.trim() : DEFAULT_LANGUAGE; // 增加对language空值的处理

  sendBackgroundLog(`尝试更新请求头规则为: ${language}`, 'info');

  // 直接尝试移除旧规则 (ID 为 RULE_ID) 并添加新规则
  // declarativeNetRequest.updateDynamicRules 会原子地执行移除和添加操作，效率较高
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
        sendBackgroundLog(`更新 declarativeNetRequest 规则失败: ${chrome.runtime.lastError.message}`, 'error');
        // 可以考虑增加更具体的错误处理，例如通知用户
        return;
      }

      // 规则更新成功
      sendBackgroundLog(`请求头规则已成功更新为: ${language}`, 'success');

      // 可选：验证规则是否已应用 (仅用于调试)
      /*
      chrome.declarativeNetRequest.getMatchedRules({}, function(matchedRules) {
        sendBackgroundLog('当前匹配的规则 (调试信息):' + JSON.stringify(matchedRules), 'info');
      });
      */
    });
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

// 监听来自Popup或其他页面的消息 (例如调试日志)
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'SET_LANGUAGE') {
        // 示例：通过消息设置语言并更新规则 (如果需要的话)
        if (request.language) {
             updateHeaderRules(request.language);
             sendBackgroundLog(`通过消息接收到语言设置请求: ${request.language}`, 'info');
             // 可以选择发送一个响应回发送者
             // sendResponse({status: 'success', message: 'Language updated'});
        }
    }
    // 其他消息类型...
});