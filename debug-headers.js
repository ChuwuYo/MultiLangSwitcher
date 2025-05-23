// 调试脚本，用于验证请求头更改是否生效

// 函数：发送日志消息到调试页面 (与 popup.js 中的 sendDebugLog 保持一致)
// 增加函数级注释
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

// 在控制台中显示当前的动态规则
// 增加函数级注释
/**
 * 显示当前生效的动态规则和最近匹配的规则
 */
function showCurrentRules() {
  sendDebugLog('正在获取当前动态规则...', 'info');
  chrome.declarativeNetRequest.getDynamicRules(function(rules) {
    sendDebugLog('当前动态规则: ' + JSON.stringify(rules, null, 2), 'info');
    
    if (rules.length === 0) {
      sendDebugLog('警告: 没有发现动态规则!', 'warning');
    } else {
      // 检查规则优先级
    }
  });
  
  // 获取匹配的规则
  chrome.declarativeNetRequest.getMatchedRules({}, function(matchedRules) {
    sendDebugLog('当前匹配的规则: ' + JSON.stringify(matchedRules, null, 2), 'info');
  });
}

// 测试请求头是否生效
// 增加函数级注释
/**
 * 测试指定语言的 Accept-Language 请求头是否生效
 * @param {string} language - 要测试的语言代码
 */
/**
 * 处理获取到的请求头数据
 * @param {Object} data - 从httpbin.org返回的数据
 * @param {string} language - 预期的语言代码
 */
function handleHeaderResponse(data, language) {
    const headers = data.headers;
    sendDebugLog('收到的请求头: ' + JSON.stringify(headers, null, 2), 'info');
    
    if (!headers['Accept-Language']) {
        sendDebugLog('✗ 未检测到Accept-Language请求头!', 'error');
        return;
    }
    
    const acceptLanguage = headers['Accept-Language'].toLowerCase();
    const expectedLanguage = language.toLowerCase();
    
    if (acceptLanguage.includes(expectedLanguage)) {
        sendDebugLog(`✓ 请求头已成功更改! 检测到的值: ${acceptLanguage}`, 'success');
    } else {
        sendDebugLog(`✗ 请求头未成功更改! 预期包含: ${expectedLanguage}, 实际检测到: ${acceptLanguage}`, 'error');
    }
}

/**
 * 处理fetch请求错误
 * @param {Error} error - 错误对象
 */
function handleFetchError(error) {
    sendDebugLog(`测试失败: ${error.message}`, 'error');
}

/**
 * 验证HTTP响应状态
 * @param {Response} response - fetch响应对象
 * @returns {Response} 验证通过的响应对象
 */
function validateResponse(response) {
    if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`);
    }
    return response;
}

function testHeaderChange(language) {
  sendDebugLog(`正在测试语言 "${language}" 的请求头是否生效...`, 'info');
  
  // 使用随机参数避免缓存
  const timestamp = new Date().getTime();
  
  fetch(`https://httpbin.org/headers?_=${timestamp}`, {
    cache: 'no-store',
    credentials: 'omit'
  })
    .then(validateResponse)
    .then(response => response.json())
    .then(data => handleHeaderResponse(data, language))
    .catch(handleFetchError);
}

// 导出函数供控制台使用
window.debugHeaders = {
  showRules: showCurrentRules,
  testHeader: testHeaderChange
};

// 在控制台中显示使用说明
sendDebugLog('请求头调试工具已加载', 'info');
// console.log('%c请求头调试工具已加载', 'color: blue; font-weight: bold');
// console.log('使用方法:');
// console.log('1. debugHeaders.showRules() - 显示当前规则');
// console.log('2. debugHeaders.testHeader("en-US") - 测试指定语言的请求头是否生效');