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



// 更新请求头规则，通过background脚本
function updateHeaderRules(language, autoCheck = false) {
  language = language.trim();
  sendDebugLog(`${popupI18n.t('trying_to_update_rules')} ${language}. ${popupI18n.t('auto_check')} ${autoCheck}.`, 'info');

  chrome.runtime.sendMessage({
    type: 'UPDATE_RULES',
    language: language
  }, function (response) {
    if (chrome.runtime.lastError) {
      sendDebugLog(`发送更新请求失败: ${chrome.runtime.lastError.message}`, 'error');
      return;
    }

    if (response && response.status === 'success') {
      sendDebugLog(`${popupI18n.t('rules_updated_successfully')} ${response.language}.`, 'success');
      updateLanguageDisplay(response.language, true);

      if (autoCheck) {
        const checkHeaderBtn = document.getElementById('checkHeaderBtn');
        if (checkHeaderBtn && document.getElementById('headerCheckResult')) {
          sendDebugLog(popupI18n.t('auto_trigger_quick_check'), 'info');
          setTimeout(() => checkHeaderBtn.click(), 500);
        }
      }
    } else if (response && response.status === 'error') {
      sendDebugLog(`${popupI18n.t('update_rules_failed')} ${response.message}`, 'error');
      alert(popupI18n.t('update_request_header_failed') + ' ' + response.message);
    }
  });
}

// 更新语言显示
function updateLanguageDisplay(language, showSuccess = false) {
  const statusTextElement = document.getElementById('statusText');
  const currentLanguageSpan = document.getElementById('currentLanguage');
  const languageSelect = document.getElementById('languageSelect');

  if (currentLanguageSpan) currentLanguageSpan.textContent = language;
  if (languageSelect) languageSelect.value = language;

  if (showSuccess && statusTextElement) {
    const oldSuccessSpan = statusTextElement.querySelector('.text-success');
    if (oldSuccessSpan) oldSuccessSpan.remove();

    const successSpan = document.createElement('span');
    successSpan.className = 'text-success ms-1';
    successSpan.textContent = popupI18n.t('applied');
    currentLanguageSpan.insertAdjacentElement('afterend', successSpan);

    setTimeout(() => {
      if (successSpan.parentNode === statusTextElement) {
        successSpan.remove();
      }
    }, 2000);
  }
}


// --- 初始化扩展 ---
document.addEventListener('DOMContentLoaded', function () {
  // 获取DOM元素
  const languageSelect = document.getElementById('languageSelect');
  const applyButton = document.getElementById('applyButton');
  const currentLanguageSpan = document.getElementById('currentLanguage');
  const statusTextElement = document.getElementById('statusText');
  const checkHeaderBtn = document.getElementById('checkHeaderBtn');
  const autoSwitchToggle = document.getElementById('autoSwitchToggle');

  // 初始化语言选项
  populateLanguageSelect(languageSelect);

  // 调用全局的 sendDebugLog
  sendDebugLog(popupI18n.t('popup_script_loaded'));

  // 加载自动切换状态
  chrome.storage.local.get(['autoSwitchEnabled'], function (result) {
    updateAutoSwitchUI(result.autoSwitchEnabled, autoSwitchToggle, languageSelect, applyButton);
  });

  // 自动切换按钮事件监听
  if (autoSwitchToggle) {
    autoSwitchToggle.addEventListener('change', function () {
      const enabled = this.checked;
      chrome.storage.local.set({ autoSwitchEnabled: enabled }, function () {
        sendDebugLog(`${popupI18n.t('auto_switch_status_saved')} ${enabled ? popupI18n.t('enabled') : popupI18n.t('disabled')}.`, 'info');
        chrome.runtime.sendMessage({ type: 'AUTO_SWITCH_TOGGLED', enabled: enabled });
      });

      updateAutoSwitchUI(enabled, autoSwitchToggle, languageSelect, applyButton);
    });
  }

  // 添加焦点事件监听器来展开下拉框
  if (languageSelect) {
    languageSelect.addEventListener('focus', function () {
      this.size = 6;
      sendDebugLog(popupI18n.t('language_select_focus'), 'info');
    });
    // 添加 blur 事件，当选择框失去焦点时收起 (apply按钮已处理)
    // languageSelect.addEventListener('blur', function() {
    //   this.size = 1;
    //   sendDebugLog('语言选择框失去焦点，收起下拉框.', 'info');
    // });
  }

  // 从后台获取当前状态
  chrome.runtime.sendMessage({ type: 'GET_CURRENT_LANG' }, function (response) {
    if (chrome.runtime.lastError) {
      sendDebugLog(`获取后台状态失败: ${chrome.runtime.lastError.message}`, 'error');
      // 回退到本地存储
      chrome.storage.local.get(['currentLanguage'], function (result) {
        if (result.currentLanguage) {
          updateLanguageDisplay(result.currentLanguage);
          sendDebugLog(`${popupI18n.t('loaded_stored_language')} ${result.currentLanguage}.`, 'info');
        }
      });
      return;
    }

    if (response && response.currentLanguage) {
      updateLanguageDisplay(response.currentLanguage);
      sendDebugLog(`从后台获取当前语言: ${response.currentLanguage}`, 'info');
    }
  });

  // 应用按钮点击事件
  if (applyButton) {
    applyButton.addEventListener('click', function () {
      if (!languageSelect) return; // 防御性编程
      const selectedLanguage = languageSelect.value;
      sendDebugLog(`${popupI18n.t('clicked_apply_button')} ${selectedLanguage}.`, 'info');

      chrome.storage.local.set({
        currentLanguage: selectedLanguage
      }, function () {
        sendDebugLog(`${popupI18n.t('language_settings_saved')} ${selectedLanguage}.`, 'info');
        if (currentLanguageSpan) currentLanguageSpan.textContent = selectedLanguage;
      });

      // 直接调用updateHeaderRules，通过background处理
      updateHeaderRules(selectedLanguage, true);

      languageSelect.size = 1;
      sendDebugLog(popupI18n.t('collapse_language_select'), 'info');
    });
  }

  // 快速检查按钮点击事件
  if (checkHeaderBtn) {
    checkHeaderBtn.addEventListener('click', async function () {
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

  // 防抖的UI更新
  let lastUIUpdate = 0;
  function debouncedUIUpdate(updateFn, delay = 100) {
    const now = Date.now();
    if (now - lastUIUpdate > delay) {
      lastUIUpdate = now;
      updateFn();
    } else {
      setTimeout(() => {
        lastUIUpdate = Date.now();
        updateFn();
      }, delay);
    }
  }

  // 监听来自 background.js 的消息
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'AUTO_SWITCH_UI_UPDATE') {
      debouncedUIUpdate(() => {
        const autoSwitchEnabled = request.autoSwitchEnabled;
        if (autoSwitchToggle) {
          autoSwitchToggle.checked = autoSwitchEnabled;
        }

        chrome.storage.local.set({ autoSwitchEnabled: autoSwitchEnabled }, function () {
          if (chrome.runtime.lastError) {
            sendDebugLog(`更新存储状态失败: ${chrome.runtime.lastError.message}`, 'error');
          } else {
            sendDebugLog(`已同步自动切换状态到存储: ${autoSwitchEnabled}`, 'info');
          }
        });

        updateAutoSwitchUI(autoSwitchEnabled, autoSwitchToggle, languageSelect, applyButton);

        if (request.currentLanguage) {
          updateLanguageDisplay(request.currentLanguage);
          sendDebugLog(`${popupI18n.t('received_background_message')} ${request.currentLanguage}${popupI18n.t('update_ui')}`, 'info');
        }
      });
      sendResponse({ status: "UI updated" });
    } else if (request.type === 'AUTO_SWITCH_STATE_CHANGED') {
      // 同步自动切换状态
      if (autoSwitchToggle) {
        autoSwitchToggle.checked = request.enabled;
        updateAutoSwitchUI(request.enabled, autoSwitchToggle, languageSelect, applyButton);
        sendDebugLog(`收到状态同步: 自动切换${request.enabled ? '启用' : '禁用'}`, 'info');
      }
    }
    return true;
  });
});