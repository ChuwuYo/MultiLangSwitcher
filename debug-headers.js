/**
 * 调试脚本 - 用于验证请求头更改是否生效
 */

/**
 * 显示当前生效的动态规则和最近匹配的规则
 */
const showCurrentRules = async () => {
  try {
    sendDebugLog(debugI18n.t('getting_rules'), 'info');

    const rulesResult = await window.sharedDebugCore.getCurrentRules();
    
    if (!rulesResult.success) {
      sendDebugLog(`${debugI18n.t('get_rules_error')} ${rulesResult.error}`, 'error');
      return;
    }

    sendDebugLog(`${debugI18n.t('current_rules')} ${JSON.stringify(rulesResult.dynamicRules, null, 2)}`, 'info');

    if (rulesResult.dynamicRules.length === 0) {
      sendDebugLog(debugI18n.t('no_rules_warning'), 'warning');
      return;
    }

    sendDebugLog(`${debugI18n.t('matched_rules')} ${JSON.stringify(rulesResult.matchedRules, null, 2)}`, 'info');

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

    // 使用共享模块的标准化请求头测试
    await window.sharedDebugCore.performHeaderTest(language, {
      onProgress: (message) => {
        sendDebugLog(message, 'info');
      },
      onResult: (result) => {
        if (result.success) {
          if (result.acceptLanguage) {
            sendDebugLog(`${debugI18n.t('header_changed_success')} ${result.acceptLanguage}`, 'success');
          } else {
            sendDebugLog(`${debugI18n.t('no_accept_language')}`, 'error');
          }
        } else {
          const errorMsg = result.error || '未知错误';
          sendDebugLog(`${debugI18n.t('header_not_changed')} ${result.expectedLanguage}, ${debugI18n.t('actually_detected')} ${errorMsg}`, 'error');
        }
      }
    });

  } catch (error) {
    sendDebugLog(`${debugI18n.t('test_failed')} ${error.message}`, 'error');

    if (error.message.includes('Failed to fetch')) {
      sendDebugLog(debugI18n.t('network_check_suggestion'), 'info');
    }
  }
};

// 导出函数供控制台使用
window.debugHeaders = {
  showRules: showCurrentRules,
  testHeader: testHeaderChange
};

// 显示使用说明
sendDebugLog(debugI18n.t('debug_tool_loaded'), 'info');