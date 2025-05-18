// 调试脚本，用于验证请求头更改是否生效

// 函数：发送日志消息到调试页面 (与 popup.js 中的 sendDebugLog 保持一致)
// 增加函数级注释
/**
 * 发送日志消息到调试页面
 * @param {string} message - 日志消息内容
 * @param {string} logType - 日志类型 (info, warning, error, success)
 */
function sendDebugLog(message, logType = 'info') {
    if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
            type: 'DEBUG_LOG',
            message: message,
            logType: logType
        }).catch(error => {
            // console.warn("Could not send debug log from debug-headers:", error.message);
        });
    } else {
        // console.log(`[Debug Log - ${logType.toUpperCase()}]: ${message}`);
    }
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
function testHeaderChange(language) {
  sendDebugLog(`正在测试语言 "${language}" 的请求头是否生效...`, 'info');
  
  // 使用随机参数避免缓存
  const timestamp = new Date().getTime();
  
  fetch(`https://httpbin.org/headers?_=${timestamp}`, {
    cache: 'no-store',
    credentials: 'omit'
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const headers = data.headers;
      sendDebugLog('收到的请求头: ' + JSON.stringify(headers, null, 2), 'info');
      
      if (headers['Accept-Language']) {
        const acceptLanguage = headers['Accept-Language'].toLowerCase();
        const expectedLanguage = language.toLowerCase();
        
        if (acceptLanguage.includes(expectedLanguage)) {
          sendDebugLog(`✓ 请求头已成功更改! 检测到的值: ${acceptLanguage}`, 'success');
        } else {
          sendDebugLog(`✗ 请求头未成功更改! 预期包含: ${expectedLanguage}, 实际检测到: ${acceptLanguage}`, 'error');
        }
      } else {
        sendDebugLog('✗ 未检测到Accept-Language请求头!', 'error');
      }
    })
    .catch(error => {
      sendDebugLog(`测试失败: ${error.message}`, 'error');
    });
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