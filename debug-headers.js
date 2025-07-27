/**
 * 调试脚本 - 用于验证请求头更改是否生效
 */

/**
 * 显示当前生效的动态规则和最近匹配的规则
 */
async function showCurrentRules() {
  try {
    sendDebugLog(debugI18n.t('getting_rules'), 'info');
    
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    sendDebugLog(`${debugI18n.t('current_rules')} ${JSON.stringify(rules, null, 2)}`, 'info');

    if (rules.length === 0) {
      sendDebugLog(debugI18n.t('no_rules_warning'), 'warning');
      return;
    }

    const matchedRules = await chrome.declarativeNetRequest.getMatchedRules({});
    sendDebugLog(`${debugI18n.t('matched_rules')} ${JSON.stringify(matchedRules, null, 2)}`, 'info');
    
  } catch (error) {
    sendDebugLog(`${debugI18n.t('get_rules_error')}${error.message}`, 'error');
  }
}

/**
 * 测试指定语言的 Accept-Language 请求头是否生效
 * @param {string} language - 要测试的语言代码
 */
async function testHeaderChange(language) {
  if (!language) {
    sendDebugLog(debugI18n.t('invalid_language_code'), 'error');
    return;
  }

  try {
    sendDebugLog(`${debugI18n.t('testing_language')} "${language}" ${debugI18n.t('header_effective')}`, 'info');

    const timestamp = Date.now();
    const data = await fetchWithRetry(`https://httpbin.org/headers?_=${timestamp}`, { 
      cache: 'no-store', 
      credentials: 'omit' 
    });
    
    handleHeaderResponse(data, language);
    
  } catch (error) {
    sendDebugLog(`${debugI18n.t('test_failed')} ${error.message}`, 'error');
    
    if (error.message.includes('Failed to fetch')) {
      sendDebugLog(debugI18n.t('network_check_suggestion'), 'info');
    }
  }
}

/**
 * 带重试机制的fetch请求
 * @param {string} url - 请求URL
 * @param {Object} options - fetch选项
 * @returns {Promise<Object>} 响应数据
 */
async function fetchWithRetry(url, options = {}) {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`${debugI18n.t('http_error_status')} ${response.status}`);
  }
  
  return response.json();
}

/**
 * 处理获取到的请求头数据
 * @param {Object} data - 从API返回的数据
 * @param {string} language - 预期的语言代码
 */
function handleHeaderResponse(data, language) {
  const headers = data.headers;
  sendDebugLog(`${debugI18n.t('received_headers')} ${JSON.stringify(headers, null, 2)}`, 'info');

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

// 显示使用说明
sendDebugLog(debugI18n.t('debug_tool_loaded'), 'info');