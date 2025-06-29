// 调试脚本，用于验证请求头更改是否生效

/**
 * 发送日志消息到调试页面
 * @param {string} message - 日志消息内容
 * @param {string} logType - 日志类型 (info, warning, error, success)
 */
function sendDebugLog(message, logType = 'info') {
    const canSendMessage = chrome && chrome.runtime && chrome.runtime.sendMessage;
    
    if (!canSendMessage) {
        // console.log(`[Debug Log - ${logType.toUpperCase()}]: ${message}`);
        return;
    }
    
    chrome.runtime.sendMessage({
        type: 'DEBUG_LOG',
        message: message,
        logType: logType
    }).catch(error => {
        // console.warn("Could not send debug log from debug-headers:", error.message);
    });
}


/**
 * 显示当前生效的动态规则和最近匹配的规则
 */
function showCurrentRules() {
  sendDebugLog(debugI18n.t('getting_rules'), 'info');
  chrome.declarativeNetRequest.getDynamicRules(function(rules) {
    sendDebugLog(debugI18n.t('current_rules') + ' ' + JSON.stringify(rules, null, 2), 'info');
    
    if (rules.length === 0) {
      sendDebugLog(debugI18n.t('no_rules_warning'), 'warning');
    } else {
      // Check rule priority
    }
  });
  
  // Get matched rules
  chrome.declarativeNetRequest.getMatchedRules({}, function(matchedRules) {
    sendDebugLog(debugI18n.t('matched_rules') + ' ' + JSON.stringify(matchedRules, null, 2), 'info');
  });
}


/**
 * 测试指定语言的 Accept-Language 请求头是否生效
 * @param {string} language - 要测试的语言代码
 */
function testHeaderChange(language) {
  sendDebugLog(`${debugI18n.t('testing_language')} "${language}" ${debugI18n.t('header_effective')}`, 'info');
  
  // Use random parameters to avoid cache
  const timestamp = new Date().getTime();
  
  fetchWithRetry(`https://httpbin.org/headers?_=${timestamp}`, { cache: 'no-store', credentials: 'omit' })
    .then(data => handleHeaderResponse(data, language))
    .catch(error => sendDebugLog(`${debugI18n.t('test_failed')} ${error.message}`, 'error'));
}

/**
 * 带验证的fetch请求
 * @param {string} url - 请求URL
 * @param {Object} options - fetch选项
 * @returns {Promise<Object>} 响应数据
 */
function fetchWithRetry(url, options = {}) {
  return fetch(url, options)
    .then(response => {
      if (!response.ok) {
        throw new Error(`${debugI18n.t('http_error_status')} ${response.status}`);
      }
      return response.json();
    });
}

/**
 * 处理获取到的请求头数据
 * @param {Object} data - 从API返回的数据
 * @param {string} language - 预期的语言代码
 */
function handleHeaderResponse(data, language) {
    const headers = data.headers;
    sendDebugLog(debugI18n.t('received_headers') + ' ' + JSON.stringify(headers, null, 2), 'info');
    
    if (!headers['Accept-Language']) {
        sendDebugLog(debugI18n.t('no_accept_language'), 'error');
        return;
    }
    
    const acceptLanguage = headers['Accept-Language'].toLowerCase();
    const expectedLanguage = language.toLowerCase();
    
    if (acceptLanguage.includes(expectedLanguage)) {
        sendDebugLog(`${debugI18n.t('header_changed_success')} ${acceptLanguage}`, 'success');
    } else {
        sendDebugLog(`${debugI18n.t('header_not_changed')} ${expectedLanguage}, ${debugI18n.t('actually_detected')} ${acceptLanguage}`, 'error');
    }
}

// 导出函数供控制台使用
window.debugHeaders = {
  showRules: showCurrentRules,
  testHeader: testHeaderChange
};

// Show usage instructions in console
sendDebugLog(debugI18n.t('debug_tool_loaded'), 'info');
// console.log('%c请求头调试工具已加载', 'color: blue; font-weight: bold');
// console.log('使用方法:');
// console.log('1. debugHeaders.showRules() - 显示当前规则');
// console.log('2. debugHeaders.testHeader("en-US") - 测试指定语言的请求头是否生效');