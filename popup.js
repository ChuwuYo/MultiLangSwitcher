// --- 全局函数 ---

/**
 * 更新自动切换UI状态
 * @param {boolean} enabled - 是否启用自动切换
 * @param {HTMLElement} autoSwitchToggle - 自动切换开关元素
 * @param {HTMLElement} languageSelect - 语言选择元素
 * @param {HTMLElement} applyButton - 应用按钮元素
 */
function updateAutoSwitchUI(enabled, autoSwitchToggle, languageSelect, applyButton) {
  if (autoSwitchToggle) autoSwitchToggle.checked = !!enabled;
  
  if (languageSelect) languageSelect.disabled = !!enabled;
  if (applyButton) applyButton.disabled = !!enabled;
  
  const statusMsg = enabled ? popupI18n.t('enabled') : popupI18n.t('disabled');
  const actionMsg = enabled ? popupI18n.t('disable_manual_selection') : popupI18n.t('enable_manual_selection');
  
  sendDebugLog(`${popupI18n.t('auto_switch_function')}${statusMsg}, ${actionMsg}.`, 'info');
}

// 发送日志消息到调试页面
function sendDebugLog(message, logType = 'info') {
    if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
            type: 'DEBUG_LOG',
            message: message,
            logType: logType
        }).catch(error => {
            // console.warn("Could not send debug log:", error.message);
        });
    } else {
        // console.log(`[Debug Log - ${logType.toUpperCase()}]: ${message}`);
    }
}

// 更新请求头规则，设置Accept-Language
function updateHeaderRules(language, autoCheck = false) {
  const RULE_ID = 1;
  language = language.trim();

  // 此处可以直接调用全局的 sendDebugLog
  sendDebugLog(`${popupI18n.t('trying_to_update_rules')} ${language}. ${popupI18n.t('auto_check')} ${autoCheck}.`, 'info');

  chrome.declarativeNetRequest.getDynamicRules(function(existingRules) {
    sendDebugLog(`${popupI18n.t('found_rules')} ${existingRules.length} ${popupI18n.t('existing_dynamic_rules')}`, 'info');
    // const existingRuleIds = existingRules.map(rule => rule.id); // 如果要移除所有
    const ruleExists = existingRules.some(rule => rule.id === RULE_ID);

    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleExists ? [RULE_ID] : [], // 只移除ID为RULE_ID的规则 (如果存在)
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
    }, function() {
      if (chrome.runtime.lastError) {
        sendDebugLog(`${popupI18n.t('update_rules_failed')} ${chrome.runtime.lastError.message}`, 'error');
        alert(popupI18n.t('update_request_header_failed') + ' ' + chrome.runtime.lastError.message);
        return;
      }

      sendDebugLog(`${popupI18n.t('rules_updated_successfully')} ${language}.`, 'success');
      const statusTextElement = document.getElementById('statusText');
      const currentLanguageSpan = document.getElementById('currentLanguage');

      if (statusTextElement && currentLanguageSpan) {
        currentLanguageSpan.textContent = language;
        const successSpan = document.createElement('span');
        successSpan.className = 'text-success ms-1'; // 加一点左边距
        successSpan.textContent = popupI18n.t('applied');
        
        const oldSuccessSpan = statusTextElement.querySelector('.text-success');
        if (oldSuccessSpan) {
            oldSuccessSpan.remove();
        }
        // 插入到 currentLanguageSpan 之后
        currentLanguageSpan.insertAdjacentElement('afterend', successSpan);
        

        setTimeout(function() {
          if (successSpan.parentNode === statusTextElement) {
            successSpan.remove();
          }
        }, 2000);
      }

      if (autoCheck) {
        const checkHeaderBtn = document.getElementById('checkHeaderBtn');
        if (checkHeaderBtn && document.getElementById('headerCheckResult')) {
          sendDebugLog(popupI18n.t('auto_trigger_quick_check'), 'info');
          setTimeout(function() {
            checkHeaderBtn.click();
          }, 500);
        }
      }
    });
  });
}


// --- 初始化扩展 ---
document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const languageSelect = document.getElementById('languageSelect');
  const applyButton = document.getElementById('applyButton');
  const currentLanguageSpan = document.getElementById('currentLanguage');
  const statusTextElement = document.getElementById('statusText');
  const checkHeaderBtn = document.getElementById('checkHeaderBtn');
  const autoSwitchToggle = document.getElementById('autoSwitchToggle');

  // 调用全局的 sendDebugLog
  sendDebugLog(popupI18n.t('popup_script_loaded'));

  // 加载自动切换状态
  chrome.storage.local.get(['autoSwitchEnabled'], function(result) {
    updateAutoSwitchUI(result.autoSwitchEnabled, autoSwitchToggle, languageSelect, applyButton);
  });

  // 自动切换按钮事件监听
  if (autoSwitchToggle) {
    autoSwitchToggle.addEventListener('change', function() {
      const enabled = this.checked;
      chrome.storage.local.set({ autoSwitchEnabled: enabled }, function() {
        sendDebugLog(`${popupI18n.t('auto_switch_status_saved')} ${enabled ? popupI18n.t('enabled') : popupI18n.t('disabled')}.`, 'info');
        chrome.runtime.sendMessage({ type: 'AUTO_SWITCH_TOGGLED', enabled: enabled });
      });
      
      updateAutoSwitchUI(enabled, autoSwitchToggle, languageSelect, applyButton);
    });
  }

  // 添加焦点事件监听器来展开下拉框
  if (languageSelect) {
    languageSelect.addEventListener('focus', function() {
      this.size = 6;
      sendDebugLog(popupI18n.t('language_select_focus'), 'info');
    });
    // 添加 blur 事件，当选择框失去焦点时收起 (apply按钮已处理)
    // languageSelect.addEventListener('blur', function() {
    //   this.size = 1;
    //   sendDebugLog('语言选择框失去焦点，收起下拉框.', 'info');
    // });
  }
  
  // 优先从网络请求规则获取当前语言，然后回退到存储
  const RULE_ID_FOR_INIT = 1; // 确保和 updateHeaderRules 中的 RULE_ID 一致
  chrome.declarativeNetRequest.getDynamicRules(function(rules) {
    const activeRule = rules.find(rule => rule.id === RULE_ID_FOR_INIT && rule.action.type === 'modifyHeaders' && rule.action.requestHeaders?.some(h => h.header.toLowerCase() === 'accept-language'));
    let activeLanguage = null;

    if (activeRule) {
      const headerAction = activeRule.action.requestHeaders.find(h => h.header.toLowerCase() === 'accept-language');
      if (headerAction) {
        activeLanguage = headerAction.value;
        sendDebugLog(`${popupI18n.t('get_current_language_from_rules')} ${activeLanguage}.`, 'info');
        if (languageSelect) languageSelect.value = activeLanguage;
        if (currentLanguageSpan) currentLanguageSpan.textContent = activeLanguage;
      }
    }

    if (!activeLanguage) {
      sendDebugLog(popupI18n.t('no_language_from_rules'), 'info');
      chrome.storage.local.get(['currentLanguage'], function(result) {
        if (result.currentLanguage) {
          if (languageSelect) languageSelect.value = result.currentLanguage;
          if (currentLanguageSpan) currentLanguageSpan.textContent = result.currentLanguage;
          sendDebugLog(`${popupI18n.t('loaded_stored_language')} ${result.currentLanguage}.`, 'info');
        } else {
          const defaultLanguage = languageSelect ? languageSelect.value : popupI18n.t('not_set');
          sendDebugLog(`${popupI18n.t('no_stored_language')} ${defaultLanguage}.`, 'warning');
          if (currentLanguageSpan) currentLanguageSpan.textContent = defaultLanguage;
        }
      });
    }
  });

  // 应用按钮点击事件
  if (applyButton) {
    applyButton.addEventListener('click', function() {
      if (!languageSelect) return; // 防御性编程
      const selectedLanguage = languageSelect.value;
      sendDebugLog(`${popupI18n.t('clicked_apply_button')} ${selectedLanguage}.`, 'info');

      chrome.storage.local.set({
        currentLanguage: selectedLanguage
      }, function() {
        sendDebugLog(`${popupI18n.t('language_settings_saved')} ${selectedLanguage}.`, 'info');
        if (currentLanguageSpan) currentLanguageSpan.textContent = selectedLanguage;
      });

      chrome.storage.local.get(['autoSwitchEnabled'], function(result) {
        if (!result.autoSwitchEnabled) {
          // 调用全局的 updateHeaderRules
          updateHeaderRules(selectedLanguage, true);
        } else {
          sendDebugLog(popupI18n.t('auto_switch_enabled_ignored'), 'warning');
        }
      });

      languageSelect.size = 1;
      sendDebugLog(popupI18n.t('collapse_language_select'), 'info');
    });
  }

  // 快速检查按钮点击事件
  if (checkHeaderBtn) {
    checkHeaderBtn.addEventListener('click', async function() {
      sendDebugLog(popupI18n.t('clicked_quick_check'), 'info');
      const headerCheckResultDiv = document.getElementById('headerCheckResult');
      const headerCheckContentPre = document.getElementById('headerCheckContent');

      if (headerCheckResultDiv) headerCheckResultDiv.classList.remove('d-none');
      if (headerCheckContentPre) headerCheckContentPre.textContent = popupI18n.t('fetching_headers');

      const timestamp = new Date().getTime();
      const testUrls = [
        `https://httpbin.org/headers?_=${timestamp}`,
        `https://postman-echo.com/headers?_=${timestamp}`,
        `https://header-echo.addr.tools/?_=${timestamp}`
      ];
      let success = false;
      let lastError = null;

      for (const url of testUrls) {
        try {
          sendDebugLog(`${popupI18n.t('trying_to_get_headers_from')} ${url} ${popupI18n.t('get_request_headers')}`, 'info');
          const response = await fetch(url, { cache: 'no-cache' });
          if (!response.ok) {
            const errorMsg = `${popupI18n.t('http_error_status')} ${response.status} ${popupI18n.t('from')} ${url}`;
            sendDebugLog(`${popupI18n.t('quick_check_request_failed')} ${errorMsg}`, 'warning');
            lastError = new Error(errorMsg);
            continue;
          }
          const data = await response.json();
          sendDebugLog(`${popupI18n.t('successfully_got_headers_from')} ${url}${popupI18n.t('displaying_results')}`, 'info');
          const headers = data.headers;
          const acceptLangHeader = headers['Accept-Language'] || headers['accept-language'];

          if (headerCheckContentPre) {
            if (acceptLangHeader) {
              sendDebugLog(`${popupI18n.t('quick_check_detected_accept_language')} ${acceptLangHeader}.`, 'success');
              headerCheckContentPre.innerHTML = `Accept-Language: <span class="text-success fw-bold">${acceptLangHeader}</span>`;
            } else {
              sendDebugLog(`${popupI18n.t('quick_check_no_accept_language')} ${url} ${popupI18n.t('detected_accept_language_header')}`, 'warning');
              headerCheckContentPre.textContent = popupI18n.t('no_accept_language_header');
            }
          }
          success = true;
          break;
        } catch (error) {
          sendDebugLog(`${popupI18n.t('error_getting_headers_from')} ${url}: ${error.message}`, 'warning');
          lastError = error;
        }
      }

      if (!success && headerCheckContentPre) {
        console.error(popupI18n.t('all_detection_points_failed'), lastError);
        sendDebugLog(`${popupI18n.t('quick_check_failed_all_points')} ${lastError ? lastError.message : popupI18n.t('unknown_error')}`, 'error');
        headerCheckContentPre.innerHTML = popupI18n.t('all_detection_points_failed_info') + ' ' + (lastError ? lastError.message : popupI18n.t('unknown_error')) +
          '\n' + popupI18n.t('please_visit_manually') + ' <a href="https://webcha.cn/" target="_blank" style="color: #007bff;">https://webcha.cn/</a> ' + popupI18n.t('or') + ' <a href="https://www.browserscan.net/zh" target="_blank" style="color: #007bff;">https://www.browserscan.net/zh</a> ' + popupI18n.t('to_view');
      }
    });
  }

  // 监听来自 background.js 的消息，以便在自动切换状态改变时更新UI和语言
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'AUTO_SWITCH_UI_UPDATE') {
      const autoSwitchEnabled = request.autoSwitchEnabled;
      if (autoSwitchToggle) {
        autoSwitchToggle.checked = autoSwitchEnabled;
        chrome.storage.local.set({ autoSwitchEnabled: autoSwitchEnabled });
      }

      updateAutoSwitchUI(autoSwitchEnabled, autoSwitchToggle, languageSelect, applyButton);
      
      if (request.currentLanguage) {
        if (currentLanguageSpan) currentLanguageSpan.textContent = request.currentLanguage;
        if (languageSelect) languageSelect.value = request.currentLanguage;
        sendDebugLog(`${popupI18n.t('received_background_message')} ${request.currentLanguage}${popupI18n.t('update_ui')}`, 'info');
      }
      sendResponse({status: "UI updated"});
    } else if (request.type === 'AUTO_SWITCH_STATE_CHANGED') {
      if (autoSwitchToggle && autoSwitchToggle.checked !== request.enabled) {
        autoSwitchToggle.checked = request.enabled;
        updateAutoSwitchUI(request.enabled, autoSwitchToggle, languageSelect, applyButton);
      }
    }
    return true; 
  });
});