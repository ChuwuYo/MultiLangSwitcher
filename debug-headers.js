/**
 * 调试脚本 - 用于验证请求头更改是否生效
 */

/**
 * 显示当前生效的动态规则和最近匹配的规则
 */
const showCurrentRules = async () => {
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
    sendDebugLog(`${debugI18n.t('get_rules_error')} ${error.message}`, 'error');
  }
};

/**
 * 测试指定语言的 Accept-Language 请求头是否生效
 * @param {string} language - 要测试的语言代码
 */
const testHeaderChange = async (language) => {
  if (!language) {
    sendDebugLog(debugI18n.t('invalid_language_code'), 'error');
    return;
  }

  try {
    sendDebugLog(`${debugI18n.t('testing_language')} "${language}" ${debugI18n.t('header_effective')}`, 'info');

    // 使用共享模块获取请求头
    const result = await window.HeaderCheckUtils.fetchHeadersFromEndpoints();
    
    if (result.success) {
      sendDebugLog(`${debugI18n.t('received_headers')} ${JSON.stringify(result.headers, null, 2)}`, 'info');
      
      if (!result.acceptLanguage) {
        sendDebugLog(debugI18n.t('no_accept_language'), 'error');
        return;
      }
      
      const acceptLanguage = result.acceptLanguage.toLowerCase();
      const expectedLanguage = language.toLowerCase();
      
      if (acceptLanguage.includes(expectedLanguage)) {
        sendDebugLog(`${debugI18n.t('header_changed_success')} ${result.acceptLanguage}`, 'success');
      } else {
        sendDebugLog(`${debugI18n.t('header_not_changed')} ${expectedLanguage}, ${debugI18n.t('actually_detected')} ${acceptLanguage}`, 'error');
      }
    } else {
      sendDebugLog(`${debugI18n.t('test_failed')} ${result.error}`, 'error');
      sendDebugLog(debugI18n.t('network_check_suggestion'), 'info');
    }

  } catch (error) {
    sendDebugLog(`${debugI18n.t('test_failed')} ${error.message}`, 'error');
    sendDebugLog(debugI18n.t('network_check_suggestion'), 'info');
  }
};

// 导出函数供控制台使用
window.debugHeaders = {
  showRules: showCurrentRules,
  testHeader: testHeaderChange
};

// 显示使用说明
sendDebugLog(debugI18n.t('debug_tool_loaded'), 'info');