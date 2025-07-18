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

/**
 * 更新请求头规则，通过background脚本
 * @param {string} language - 语言代码
 * @param {boolean} autoCheck - 是否自动检查
 * @returns {Promise<void>}
 */
async function updateHeaderRules(language, autoCheck = false) {
  language = language.trim();
  sendDebugLog(`${popupI18n.t('trying_to_update_rules')} ${language}. ${popupI18n.t('auto_check')} ${autoCheck}.`, 'info');

  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'UPDATE_RULES',
        language: language
      }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });

    if (response?.status === 'success') {
      sendDebugLog(`${popupI18n.t('rules_updated_successfully')} ${response.language}.`, 'success');
      updateLanguageDisplay(response.language, true);

      if (autoCheck) {
        const checkHeaderBtn = document.getElementById('checkHeaderBtn');
        if (checkHeaderBtn && document.getElementById('headerCheckResult')) {
          sendDebugLog(popupI18n.t('auto_trigger_quick_check'), 'info');
          setTimeout(() => checkHeaderBtn.click(), 500);
        }
      }
    } else if (response?.status === 'error') {
      sendDebugLog(`${popupI18n.t('update_rules_failed')} ${response.message}`, 'error');
      showError(popupI18n.t('update_request_header_failed') + ' ' + response.message);
    }
  } catch (error) {
    sendDebugLog(`${popupI18n.t('send_update_request_failed', {message: error.message})}`, 'error');
  }
}

/**
 * 显示错误消息
 * @param {string} message - 错误消息
 */
function showError(message) {
  const errorAlert = document.getElementById('errorAlert');
  const errorMessage = document.getElementById('errorMessage');
  if (!errorAlert || !errorMessage) return;
  
  errorMessage.textContent = message;
  errorAlert.classList.remove('d-none');
  setTimeout(() => errorAlert.classList.add('d-none'), 5000);
}

/**
 * 更新语言显示
 * @param {string} language - 语言代码
 * @param {boolean} showSuccess - 是否显示成功提示
 */
function updateLanguageDisplay(language, showSuccess = false) {
  const currentLanguageSpan = document.getElementById('currentLanguage');
  const languageSelect = document.getElementById('languageSelect');

  if (currentLanguageSpan) currentLanguageSpan.textContent = language;
  if (languageSelect) languageSelect.value = language;

  if (showSuccess) {
    const statusTextElement = document.getElementById('statusText');
    if (!statusTextElement) return;
    
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

/**
 * 执行头部快速检查
 * @param {HTMLElement} headerCheckContentPre - 用于显示结果的 <pre> 元素
 */
async function performHeaderCheck(headerCheckContentPre) {
  const timestamp = new Date().getTime();
  const testUrls = [
    `https://httpbin.org/headers?_=${timestamp}`,
    `https://postman-echo.com/headers?_=${timestamp}`,
    `https://header-echo.addr.tools/?_=${timestamp}`
  ];
  
  headerCheckContentPre.textContent = popupI18n.t('fetching_headers') + '...';
  
  for (const url of testUrls) {
    try {
      const hostname = new URL(url).hostname;
      headerCheckContentPre.textContent = `${popupI18n.t('fetching_headers')} (${hostname})...`;
      sendDebugLog(`${popupI18n.t('trying_to_get_headers_from')} ${url}`, 'info');

      const response = await fetch(url, { 
        cache: 'no-cache', 
        signal: AbortSignal.timeout(5000) // 5秒超时
      });
      
      if (!response.ok) {
        sendDebugLog(`${popupI18n.t('quick_check_request_failed')} HTTP error! status: ${response.status} from ${url}`, 'warning');
        continue;
      }

      const data = await response.json();
      sendDebugLog(`${popupI18n.t('successfully_got_headers_from')} ${url}`, 'success');
      
      const headers = data.headers;
      const acceptLangHeader = headers['Accept-Language'] || headers['accept-language'];

      if (acceptLangHeader) {
        sendDebugLog(`${popupI18n.t('quick_check_detected_accept_language')} ${acceptLangHeader}.`, 'success');
        headerCheckContentPre.innerHTML = `Accept-Language: <span class="text-success fw-bold">${acceptLangHeader}</span>`;
        return;
      } 
      
      sendDebugLog(`${popupI18n.t('quick_check_no_accept_language')} ${url}`, 'warning');
      headerCheckContentPre.textContent = popupI18n.t('no_accept_language_header');
      return;
    } catch (error) {
      sendDebugLog(`${popupI18n.t('error_getting_headers_from')} ${url}: ${error.message}`, 'warning');
    }
  }

  // 所有尝试均失败
  sendDebugLog(`${popupI18n.t('quick_check_failed_all_points')}`, 'error');
  const finalErrorMsg = `${popupI18n.t('all_detection_points_failed_info')}<br>${popupI18n.t('please_visit_manually')} <a href="https://webcha.cn/" target="_blank" style="color: #007bff;">https://webcha.cn/</a>`;
  headerCheckContentPre.innerHTML = finalErrorMsg;
}

/**
 * 获取当前语言设置
 * @returns {Promise<string>} 当前语言设置
 */
async function getCurrentLanguage() {
  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'GET_CURRENT_LANG' }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });

    if (response?.currentLanguage) {
      sendDebugLog(popupI18n.t('get_current_language_from_background', {language: response.currentLanguage}), 'info');
      return response.currentLanguage;
    }
    throw new Error('No language in response');
  } catch (error) {
    sendDebugLog(popupI18n.t('get_background_status_failed', {message: error.message}), 'error');
    
    // 回退到本地存储
    try {
      const result = await new Promise(resolve => {
        chrome.storage.local.get(['currentLanguage'], resolve);
      });
      
      if (result.currentLanguage) {
        sendDebugLog(`${popupI18n.t('loaded_stored_language')} ${result.currentLanguage}.`, 'info');
        return result.currentLanguage;
      }
    } catch (storageError) {
      sendDebugLog(`Error accessing storage: ${storageError.message}`, 'error');
    }
    
    // 默认语言
    const languageSelect = document.getElementById('languageSelect');
    const defaultLanguage = languageSelect ? languageSelect.value : popupI18n.t('not_set');
    sendDebugLog(`${popupI18n.t('no_stored_language')} ${defaultLanguage}.`, 'warning');
    return defaultLanguage;
  }
}

/**
 * 获取自动切换状态
 * @returns {Promise<boolean>} 自动切换是否启用
 */
async function getAutoSwitchStatus() {
  try {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['autoSwitchEnabled'], resolve);
    });
    return !!result.autoSwitchEnabled;
  } catch (error) {
    sendDebugLog(`Error getting auto switch status: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 设置自动切换状态
 * @param {boolean} enabled - 是否启用
 */
async function setAutoSwitchStatus(enabled) {
  try {
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ autoSwitchEnabled: enabled }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
    
    sendDebugLog(`${popupI18n.t('auto_switch_status_saved')} ${enabled ? popupI18n.t('enabled') : popupI18n.t('disabled')}.`, 'info');
    chrome.runtime.sendMessage({ type: 'AUTO_SWITCH_TOGGLED', enabled: enabled });
    return true;
  } catch (error) {
    const message = error.message;
    showError(popupI18n.t('update_storage_status_failed', { message }));
    sendDebugLog(popupI18n.t('update_storage_status_failed', { message }), 'error');
    return false;
  }
}

/**
 * 保存当前语言设置
 * @param {string} language - 语言代码
 */
async function saveLanguageSetting(language) {
  try {
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ currentLanguage: language }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
    
    sendDebugLog(`${popupI18n.t('language_settings_saved')} ${language}.`, 'info');
    return true;
  } catch (error) {
    const message = error.message;
    showError(popupI18n.t('update_storage_status_failed', { message }));
    sendDebugLog(popupI18n.t('update_storage_status_failed', { message }), 'error');
    return false;
  }
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

// --- 初始化扩展 ---
document.addEventListener('DOMContentLoaded', async function() {
  // 获取DOM元素
  const languageSelect = document.getElementById('languageSelect');
  const applyButton = document.getElementById('applyButton');
  const currentLanguageSpan = document.getElementById('currentLanguage');
  const checkHeaderBtn = document.getElementById('checkHeaderBtn');
  const autoSwitchToggle = document.getElementById('autoSwitchToggle');
  const resetBtn = document.getElementById('resetBtn');

  // 初始化语言选项
  populateLanguageSelect(languageSelect);
  sendDebugLog(popupI18n.t('popup_script_loaded'));

  // 加载自动切换状态
  const autoSwitchEnabled = await getAutoSwitchStatus();
  updateAutoSwitchUI(autoSwitchEnabled, autoSwitchToggle, languageSelect, applyButton);

  // 加载当前语言设置
  const currentLanguage = await getCurrentLanguage();
  updateLanguageDisplay(currentLanguage);

  // 事件处理函数
  const eventHandlers = {
    autoSwitchChange: async function() {
      const enabled = this.checked;
      const success = await setAutoSwitchStatus(enabled);
      if (success) {
        updateAutoSwitchUI(enabled, autoSwitchToggle, languageSelect, applyButton);
      }
    },
    
    languageSelectFocus: function() {
      this.size = 6;
      sendDebugLog(popupI18n.t('language_select_focus'), 'info');
    },
    
    applyButtonClick: async function() {
      if (!languageSelect) return;
      
      const selectedLanguage = languageSelect.value;
      sendDebugLog(`${popupI18n.t('clicked_apply_button')} ${selectedLanguage}.`, 'info');
      
      await saveLanguageSetting(selectedLanguage);
      if (currentLanguageSpan) currentLanguageSpan.textContent = selectedLanguage;
      
      await updateHeaderRules(selectedLanguage, true);
      languageSelect.size = 1;
      sendDebugLog(popupI18n.t('collapse_language_select'), 'info');
    },
    
    resetButtonClick: async function() {
      sendDebugLog(popupI18n.t('clicked_reset_button'), 'info');
      try {
        await resetAcceptLanguage();
        sendDebugLog(popupI18n.t('reset_successful'), 'success');
        updateLanguageDisplay(popupI18n.t('not_set'));
        if (languageSelect) languageSelect.value = '';
      } catch (error) {
        const errorDetails = error.message || popupI18n.t('unknown_error');
        const userMessage = popupI18n.t('reset_failed_alert') + ': ' + errorDetails;
        sendDebugLog(popupI18n.t('reset_request_failed', { message: errorDetails }), 'error');
        showError(userMessage);
      }
    },
    
    checkHeaderBtnClick: function() {
      sendDebugLog(popupI18n.t('clicked_quick_check'), 'info');
      const headerCheckResultDiv = document.getElementById('headerCheckResult');
      const headerCheckContentPre = document.getElementById('headerCheckContent');

      if (headerCheckResultDiv) headerCheckResultDiv.classList.remove('d-none');
      if (headerCheckContentPre) {
        headerCheckContentPre.textContent = popupI18n.t('fetching_headers');
        performHeaderCheck(headerCheckContentPre);
      }
    }
  };

  // 绑定事件
  if (autoSwitchToggle) {
    autoSwitchToggle.addEventListener('change', eventHandlers.autoSwitchChange);
  }
  
  if (languageSelect) {
    languageSelect.addEventListener('focus', eventHandlers.languageSelectFocus);
  }
  
  if (applyButton) {
    applyButton.addEventListener('click', eventHandlers.applyButtonClick);
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', eventHandlers.resetButtonClick);
  }
  
  if (checkHeaderBtn) {
    checkHeaderBtn.addEventListener('click', eventHandlers.checkHeaderBtnClick);
  }

  // 页面卸载时清理事件
  window.addEventListener('beforeunload', function() {
    if (autoSwitchToggle) autoSwitchToggle.removeEventListener('change', eventHandlers.autoSwitchChange);
    if (languageSelect) languageSelect.removeEventListener('focus', eventHandlers.languageSelectFocus);
    if (applyButton) applyButton.removeEventListener('click', eventHandlers.applyButtonClick);
    if (resetBtn) resetBtn.removeEventListener('click', eventHandlers.resetButtonClick);
    if (checkHeaderBtn) checkHeaderBtn.removeEventListener('click', eventHandlers.checkHeaderBtnClick);
  }, { once: true });

  // 监听来自 background.js 的消息
  chrome.runtime.onMessage.addListener(function(request, _, sendResponse) {
    if (request.type === 'AUTO_SWITCH_UI_UPDATE') {
      debouncedUIUpdate(() => {
        const autoSwitchEnabled = request.autoSwitchEnabled;
        if (autoSwitchToggle) {
          autoSwitchToggle.checked = autoSwitchEnabled;
        }

        chrome.storage.local.set({ autoSwitchEnabled: autoSwitchEnabled }, function() {
          if (chrome.runtime.lastError) {
            sendDebugLog(popupI18n.t('update_storage_status_failed', {message: chrome.runtime.lastError.message}), 'error');
          } else {
            sendDebugLog(popupI18n.t('synced_auto_switch_status_to_storage', {status: autoSwitchEnabled}), 'info');
          }
        });

        updateAutoSwitchUI(autoSwitchEnabled, autoSwitchToggle, languageSelect, applyButton);

        if (request.currentLanguage) {
          updateLanguageDisplay(request.currentLanguage);
          // 同步更新语言选择器
          if (languageSelect) {
            languageSelect.value = request.currentLanguage;
          }
          sendDebugLog(`${popupI18n.t('received_background_message')} ${request.currentLanguage}${popupI18n.t('update_ui')}`, 'info');
        }
      });
      sendResponse({ status: "UI updated" });
    } else if (request.type === 'AUTO_SWITCH_STATE_CHANGED') {
      // 同步自动切换状态
      if (autoSwitchToggle) {
        autoSwitchToggle.checked = request.enabled;
        updateAutoSwitchUI(request.enabled, autoSwitchToggle, languageSelect, applyButton);
        sendDebugLog(popupI18n.t('received_status_sync', {status: request.enabled ? popupI18n.t('enabled') : popupI18n.t('disabled')}), 'info');
      }
    }
    return true;
  });
});