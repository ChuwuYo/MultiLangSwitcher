// --- 导入共享模块 ---
// 注意：这些脚本已在 popup.html 中通过 <script> 标签加载

// --- 全局常量和配置 ---
const UPDATE_CHECK_DEBOUNCE_DELAY = 1000; // 1秒防抖延迟
const UPDATE_CHECK_MIN_INTERVAL = 3000; // 最小检查间隔3秒

// --- 全局变量 ---
let updateChecker = null;
let updateCheckInProgress = false;
let updateCheckController = null;
let updateCheckDebounceTimer = null;
let lastUpdateCheckTime = 0;

// DOM元素缓存
let domCache = {
  // 更新检查相关元素
  updateCheckBtn: null,
  updateCheckText: null,
  updateCheckSpinner: null,
  updateNotification: null,
  updateNotificationContent: null,
  updateErrorAlert: null,
  updateErrorMessage: null,
  // 主要功能元素缓存
  languageSelect: null,
  applyButton: null,
  currentLanguageSpan: null,
  checkHeaderBtn: null,
  autoSwitchToggle: null,
  resetBtn: null,
  errorAlert: null,
  errorMessage: null
};

// 批量DOM更新
let pendingDOMUpdates = [];
let domUpdateScheduled = false;

/**
 * 更新自动切换UI状态
 * @param {boolean} enabled - 是否启用自动切换
 * @param {HTMLElement} autoSwitchToggle - 自动切换开关元素
 * @param {HTMLElement} languageSelect - 语言选择元素
 * @param {HTMLElement} applyButton - 应用按钮元素
 */
const updateAutoSwitchUI = (enabled, autoSwitchToggle, languageSelect, applyButton) => {
  // 检查必要元素
  if (!autoSwitchToggle) return;

  // 更新开关状态
  autoSwitchToggle.checked = !!enabled;

  // 根据自动切换状态禁用/启用手动选择控件
  if (languageSelect) languageSelect.disabled = !!enabled;
  if (applyButton) applyButton.disabled = !!enabled;

  // 记录状态变更日志
  const statusMsg = enabled ? popupI18n.t('enabled') : popupI18n.t('disabled');
  const actionMsg = enabled ? popupI18n.t('disable_manual_selection') : popupI18n.t('enable_manual_selection');

  sendDebugLog(`${popupI18n.t('auto_switch_function')}${statusMsg}, ${actionMsg}.`, 'info');
};

/**
 * 更新请求头规则，通过background脚本
 * @param {string} language - 语言代码
 * @param {boolean} autoCheck - 是否自动检查
 * @returns {Promise<void>}
 */
const updateHeaderRules = async (language, autoCheck = false) => {
  // 验证输入
  if (!language) {
    throw new Error('Language parameter is required');
  }

  // 清理语言代码
  const cleanLanguage = language.trim();
  sendDebugLog(`${popupI18n.t('trying_to_update_rules')} ${cleanLanguage}. ${popupI18n.t('auto_check')} ${autoCheck}.`, 'info');

  // 使用Promise包装Chrome API调用
  const response = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'UPDATE_RULES',
      language: cleanLanguage
    }, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });

  // 处理响应结果
  if (response?.status === 'error') {
    throw new Error(response.message);
  }

  if (response?.status !== 'success') {
    throw new Error(popupI18n.t('unexpected_response_format'));
  }

  // 成功处理
  sendDebugLog(`${popupI18n.t('rules_updated_successfully')} ${response.language}.`, 'success');
  updateLanguageDisplay(response.language, true);

  // 如果启用自动检查，触发快速检查
  if (autoCheck) {
    const checkHeaderBtn = document.getElementById('checkHeaderBtn');
    if (checkHeaderBtn && document.getElementById('headerCheckResult')) {
      sendDebugLog(popupI18n.t('auto_trigger_quick_check'), 'info');
      setTimeout(() => checkHeaderBtn.click(), 500);
    }
  }
};

/**
 * 显示错误消息
 * @param {string} message - 错误消息
 */
const showError = (message) => {
  // 验证输入
  if (!message) return;

  // 使用缓存的DOM元素提高性能
  const errorAlert = domCache.errorAlert || document.getElementById('errorAlert');
  const errorMessage = domCache.errorMessage || document.getElementById('errorMessage');

  // 检查DOM元素
  if (!errorAlert || !errorMessage) return;

  // 使用批量DOM更新提高性能
  scheduleDOMUpdate(() => {
    errorMessage.textContent = message;
    errorAlert.classList.remove('d-none');
  });

  // 5秒后自动隐藏错误消息
  setTimeout(() => {
    scheduleDOMUpdate(() => {
      errorAlert.classList.add('d-none');
    });
  }, 5000);
};

/**
 * 更新语言显示
 * @param {string} language - 语言代码
 * @param {boolean} showSuccess - 是否显示成功提示
 */
const updateLanguageDisplay = (language, showSuccess = false) => {
  // 验证输入
  if (!language) return;

  // 使用缓存的DOM元素提高性能
  const currentLanguageSpan = domCache.currentLanguageSpan || document.getElementById('currentLanguage');
  const languageSelect = domCache.languageSelect || document.getElementById('languageSelect');

  // 使用批量DOM更新提高性能
  scheduleDOMUpdate(() => {
    // 更新当前语言显示
    if (currentLanguageSpan) currentLanguageSpan.textContent = language;
    // 同步语言选择框的值
    if (languageSelect) languageSelect.value = language;

    // 如果需要显示成功提示
    if (showSuccess) {
      const statusTextElement = document.getElementById('statusText');
      if (!statusTextElement) return;

      // 移除之前的成功提示
      const oldSuccessSpan = statusTextElement.querySelector('.text-success');
      if (oldSuccessSpan) oldSuccessSpan.remove();

      // 创建新的成功提示
      const successSpan = document.createElement('span');
      successSpan.className = 'text-success ms-1';
      successSpan.textContent = popupI18n.t('applied');
      currentLanguageSpan.insertAdjacentElement('afterend', successSpan);

      // 2秒后移除成功提示
      setTimeout(() => {
        scheduleDOMUpdate(() => {
          if (successSpan.parentNode === statusTextElement) {
            successSpan.remove();
          }
        });
      }, 2000);
    }
  });
};

/**
 * 执行头部快速检查
 * @param {HTMLElement} headerCheckContentPre - 用于显示结果的 <pre> 元素
 */
const performHeaderCheck = async (headerCheckContentPre) => {
  // 生成时间戳避免缓存
  const timestamp = new Date().getTime();
  // 定义测试URL列表
  const testUrls = [
    `https://httpbin.org/headers?_=${timestamp}`,
    `https://postman-echo.com/headers?_=${timestamp}`,
    `https://header-echo.addr.tools/?_=${timestamp}`
  ];

  // 显示初始加载状态
  headerCheckContentPre.textContent = popupI18n.t('fetching_headers') + '...';

  // 依次尝试每个测试URL
  for (const url of testUrls) {
    try {
      const hostname = new URL(url).hostname;
      headerCheckContentPre.textContent = `${popupI18n.t('fetching_headers')} (${hostname})...`;
      sendDebugLog(`${popupI18n.t('trying_to_get_headers_from')} ${url}`, 'info');

      // 发送请求获取头部信息
      const response = await fetch(url, {
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5秒超时
      });

      // 检查响应状态
      if (!response.ok) {
        sendDebugLog(`${popupI18n.t('quick_check_request_failed')} HTTP error! status: ${response.status} from ${url}`, 'warning');
        continue;
      }

      // 解析响应数据
      const data = await response.json();
      sendDebugLog(`${popupI18n.t('successfully_got_headers_from')} ${url}`, 'success');

      // 查找Accept-Language头部
      const headers = data.headers;
      const acceptLangHeader = headers['Accept-Language'] || headers['accept-language'];

      if (acceptLangHeader) {
        sendDebugLog(`${popupI18n.t('quick_check_detected_accept_language')} ${acceptLangHeader}.`, 'success');
        headerCheckContentPre.innerHTML = `Accept-Language: <span class="text-success fw-bold">${acceptLangHeader}</span>`;
        return;
      }

      // 未找到Accept-Language头部
      sendDebugLog(`${popupI18n.t('quick_check_no_accept_language')} ${url}`, 'warning');
      headerCheckContentPre.textContent = popupI18n.t('no_accept_language_header');
      return;
    } catch (error) {
      sendDebugLog(`${popupI18n.t('error_getting_headers_from')} ${url}: ${error.message}`, 'warning');
    }
  }

  // 所有尝试均失败，显示错误信息
  sendDebugLog(`${popupI18n.t('quick_check_failed_all_points')}`, 'error');
  const finalErrorMsg = `${popupI18n.t('all_detection_points_failed_info')}<br>${popupI18n.t('please_visit_manually')} <a href="https://webcha.cn/" target="_blank" style="color: #007bff;">https://webcha.cn/</a>`;
  headerCheckContentPre.innerHTML = finalErrorMsg;
}

/**
 * 获取当前语言设置
 * @returns {Promise<string>} 当前语言设置
 */
const getCurrentLanguage = async () => {
  // 尝试从background脚本获取当前语言
  const backgroundLanguage = await getLanguageFromBackground();
  if (backgroundLanguage) return backgroundLanguage;

  // 回退到本地存储
  const storageLanguage = await getLanguageFromStorage();
  if (storageLanguage) return storageLanguage;

  // 使用默认语言作为最后的回退
  return getDefaultLanguage();
};

/**
 * 从background脚本获取语言设置
 * @returns {Promise<string|null>} 语言代码或null
 */
const getLanguageFromBackground = async () => {
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
      sendDebugLog(popupI18n.t('get_current_language_from_background', { language: response.currentLanguage }), 'info');
      return response.currentLanguage;
    }

    return null;
  } catch (error) {
    sendDebugLog(popupI18n.t('get_background_status_failed', { message: error.message }), 'error');
    return null;
  }
};

/**
 * 从本地存储获取语言设置
 * @returns {Promise<string|null>} 语言代码或null
 */
const getLanguageFromStorage = async () => {
  try {
    const result = await new Promise((resolve, reject) => {
      chrome.storage.local.get(['currentLanguage'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(result);
      });
    });

    if (result?.currentLanguage) {
      sendDebugLog(`${popupI18n.t('loaded_stored_language')} ${result.currentLanguage}.`, 'info');
      return result.currentLanguage;
    }

    return null;
  } catch (error) {
    sendDebugLog(popupI18n.t('error_accessing_storage', { message: error.message }), 'error');
    return null;
  }
};

/**
 * 获取默认语言设置
 * @returns {string} 默认语言代码
 */
const getDefaultLanguage = () => {
  const languageSelect = document.getElementById('languageSelect');
  const defaultLanguage = languageSelect ? languageSelect.value : popupI18n.t('not_set');
  sendDebugLog(`${popupI18n.t('no_stored_language')} ${defaultLanguage}.`, 'warning');
  return defaultLanguage;
}

/**
 * 获取自动切换状态
 * @returns {Promise<boolean>} 自动切换是否启用
 */
const getAutoSwitchStatus = async () => {
  try {
    // 从本地存储获取自动切换状态
    const result = await new Promise((resolve, reject) => {
      chrome.storage.local.get(['autoSwitchEnabled'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(result);
      });
    });
    return !!result.autoSwitchEnabled;
  } catch (error) {
    sendDebugLog(popupI18n.t('error_getting_auto_switch_status', { message: error.message }), 'error');
    return false; // 默认返回false
  }
};

/**
 * 设置自动切换状态
 * @param {boolean} enabled - 是否启用
 * @returns {Promise<boolean>} 操作是否成功
 */
const setAutoSwitchStatus = async (enabled) => {
  try {
    // 保存自动切换状态到本地存储
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ autoSwitchEnabled: enabled }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });

    // 记录状态变更日志
    sendDebugLog(`${popupI18n.t('auto_switch_status_saved')} ${enabled ? popupI18n.t('enabled') : popupI18n.t('disabled')}.`, 'info');

    // 通知background脚本状态变更
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
 * @returns {Promise<void>} 
 */
const saveLanguageSetting = async (language) => {
  // 验证输入
  if (!language) {
    throw new Error('Language parameter is required');
  }

  // 保存语言设置到本地存储
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
};

/**
 * 初始化DOM元素缓存以优化性能
 */
const initializeDOMCache = () => {
  // 更新检查器相关元素
  domCache.updateCheckBtn = document.getElementById('updateCheckBtn');
  domCache.updateCheckText = document.getElementById('updateCheckText');
  domCache.updateCheckSpinner = document.getElementById('updateCheckSpinner');
  domCache.updateNotification = document.getElementById('updateNotification');
  domCache.updateNotificationContent = document.getElementById('updateNotificationContent');
  domCache.updateErrorAlert = document.getElementById('updateErrorAlert');
  domCache.updateErrorMessage = document.getElementById('updateErrorMessage');

  // 主要弹窗功能元素
  domCache.languageSelect = document.getElementById('languageSelect');
  domCache.applyButton = document.getElementById('applyButton');
  domCache.currentLanguageSpan = document.getElementById('currentLanguage');
  domCache.checkHeaderBtn = document.getElementById('checkHeaderBtn');
  domCache.autoSwitchToggle = document.getElementById('autoSwitchToggle');
  domCache.resetBtn = document.getElementById('resetBtn');
  domCache.errorAlert = document.getElementById('errorAlert');
  domCache.errorMessage = document.getElementById('errorMessage');

  sendDebugLog(popupI18n.t('dom_cache_initialized'), 'info');
}

/**
 * 调度批量DOM更新以提高性能
 * @param {Function} updateFn - 执行DOM更新的函数
 */
const scheduleDOMUpdate = (updateFn) => {
  // 验证输入
  if (typeof updateFn !== 'function') return;

  // 将更新函数添加到待处理队列
  pendingDOMUpdates.push(updateFn);

  // 如果没有已调度的更新，则调度一个
  if (!domUpdateScheduled) {
    domUpdateScheduled = true;

    // 使用requestAnimationFrame获得最佳性能
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(processPendingDOMUpdates);
    } else {
      // 对于不支持requestAnimationFrame的环境的回退方案
      setTimeout(processPendingDOMUpdates, 16); // ~60fps
    }
  }
};

/**
 * 在单个批次中处理所有待处理的DOM更新
 */
const processPendingDOMUpdates = () => {
  // 检查是否有待处理的更新
  if (pendingDOMUpdates.length === 0) {
    domUpdateScheduled = false;
    return;
  }

  // 执行所有待处理的更新
  const updates = pendingDOMUpdates.splice(0);
  for (const updateFn of updates) {
    try {
      updateFn();
    } catch (error) {
      sendDebugLog(popupI18n.t('dom_update_error', { message: error.message }), 'error');
    }
  }

  domUpdateScheduled = false;

  // 如果在处理过程中添加了更多更新，则调度另一个批次
  if (pendingDOMUpdates.length > 0) {
    scheduleDOMUpdate(() => { }); // 空函数用于触发处理
  }
};

/**
 * 初始化更新检查器实例
 */
const initializeUpdateChecker = () => {
  // 检查是否已初始化
  if (updateChecker) return;

  // 动态获取manifest.json中的版本号
  const currentVersion = chrome.runtime.getManifest().version;
  updateChecker = new UpdateChecker('ChuwuYo', 'MultiLangSwitcher', currentVersion);
  sendDebugLog(popupI18n.t('update_checker_initialized', { version: currentVersion }), 'info');
};

/**
 * 显示更新错误消息，具有增强的错误处理
 * @param {string} message - 主要错误消息
 * @param {string} [fallbackMessage] - 可选的回退建议
 * @param {boolean} [showRetryOption] - 是否显示重试选项
 */
const showUpdateError = (message, fallbackMessage = null, showRetryOption = false) => {
  // 使用缓存的DOM元素提高性能
  const updateErrorAlert = domCache.updateErrorAlert || document.getElementById('updateErrorAlert');
  const updateErrorMessage = domCache.updateErrorMessage || document.getElementById('updateErrorMessage');

  if (!updateErrorAlert || !updateErrorMessage) return;

  // 构建错误消息内容
  let errorContent = message;

  // 如果提供了回退建议，则添加
  if (fallbackMessage) {
    errorContent += `<br><small class="text-muted mt-1">${fallbackMessage}</small>`;
  }

  // 如果适用，添加重试选项
  if (showRetryOption) {
    errorContent += `<br><small class="mt-2">
      <a href="#" onclick="debouncedUpdateCheck(); return false;" class="text-primary">
        ${popupI18n.t('retry_update_check')}
      </a>
    </small>`;
  }

  // 使用批量DOM更新提高性能
  scheduleDOMUpdate(() => {
    updateErrorMessage.innerHTML = errorContent;
    updateErrorAlert.classList.remove('d-none');
  });

  // 对于复杂错误使用更长的自动隐藏时间
  const hideDelay = fallbackMessage || showRetryOption ? 8000 : 5000;
  setTimeout(() => {
    scheduleDOMUpdate(() => {
      updateErrorAlert.classList.add('d-none');
    });
  }, hideDelay);
}

/**
 * 显示更新检查的加载状态 - 立即执行
 */
const showUpdateLoadingState = () => {
  // 直接获取DOM元素，不使用缓存，确保立即响应
  const updateNotification = document.getElementById('updateNotification');
  const updateNotificationContent = document.getElementById('updateNotificationContent');

  if (!updateNotification || !updateNotificationContent) return;

  const alertDiv = updateNotification.querySelector('.alert');

  // 立即执行DOM操作，不使用批处理
  // 保持动画类，确保slideIn动画效果
  updateNotification.style.display = 'block'; // 强制显示
  alertDiv.className = 'alert alert-info mb-0 update-notification info';
  updateNotificationContent.innerHTML = `
    <div class="text-center update-version-info">
      <div class="d-flex align-items-center justify-content-center">
        <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
        <strong>${popupI18n.t('fetching_version_info')}</strong>
      </div>
    </div>
  `;

  // 确保立即显示，不依赖任何异步操作
  updateNotification.classList.remove('d-none');

  // 强制重绘以确保动画效果
  updateNotification.offsetHeight; // 触发重绘

  // 强制浏览器立即渲染
  void updateNotification.getBoundingClientRect();
}

/**
 * 显示更新通知，支持回退模式
 * @param {Object} updateInfo - 更新信息
 */
const showUpdateNotification = (updateInfo) => {
  // 使用缓存的DOM元素提高性能
  const updateNotification = domCache.updateNotification || document.getElementById('updateNotification');
  const updateNotificationContent = domCache.updateNotificationContent || document.getElementById('updateNotificationContent');

  if (!updateNotification || !updateNotificationContent) return;

  const alertDiv = updateNotification.querySelector('.alert');

  // 使用批量DOM更新提高性能
  scheduleDOMUpdate(() => {
    // 当GitHub API不可用时处理回退模式
    if (updateInfo.fallbackMode) {
      alertDiv.className = 'alert alert-warning mb-0 update-notification warning';
      updateNotificationContent.innerHTML = `
        <div class="text-center update-version-info">
          <strong>${popupI18n.t('update_check_fallback_title')}</strong>
          <div class="version-comparison">
            <div class="version-line" style="justify-content: center;">
              <span class="version-badge">v${updateInfo.currentVersion}</span>
            </div>
          </div>
          <div class="fallback-message mt-2">
            <small class="text-muted">${popupI18n.t('update_check_fallback_message')}</small>
          </div>
          <div class="update-actions mt-2">
            <a href="${updateInfo.releaseUrl}" target="_blank" class="btn btn-outline-warning btn-sm">
              ${popupI18n.t('check_manually')}
            </a>
          </div>
        </div>
      `;
      sendDebugLog(popupI18n.t('showing_fallback_notification'), 'warning');

      // 6秒后自动隐藏回退通知
      setTimeout(() => {
        scheduleDOMUpdate(() => {
          updateNotification.classList.add('d-none');
        });
      }, 6000);

    } else if (updateInfo.updateAvailable) {
      // 有可用更新
      alertDiv.className = 'alert alert-info mb-0 update-notification info';

      const versionInfo = `
        <div class="update-version-info">
          <strong>${popupI18n.t('update_notification_title')}</strong>
          <div class="version-comparison">
            <div class="version-line">
              <span>${popupI18n.t('current_version').replace('v{current}', '').replace('{current}', '')}</span>
              <span class="version-badge">v${updateInfo.currentVersion}</span>
            </div>
            <div class="version-line">
              <span>${popupI18n.t('latest_version').replace('v{latest}', '').replace('{latest}', '')}</span>
              <span class="version-badge">v${updateInfo.latestVersion}</span>
            </div>
          </div>
        </div>
        <div class="update-actions">
          <a href="${updateInfo.releaseUrl}" target="_blank" class="btn btn-outline-primary">
            ${popupI18n.t('view_release')}
          </a>
          <a href="https://github.com/ChuwuYo/MultiLangSwitcher/archive/refs/tags/v${updateInfo.latestVersion}.zip" target="_blank" class="btn btn-primary">
            ${popupI18n.t('download_update')}
          </a>
        </div>
      `;

      updateNotificationContent.innerHTML = versionInfo;
      sendDebugLog(popupI18n.t('update_available', { version: updateInfo.latestVersion }), 'info');
    } else {
      // 没有可用更新
      alertDiv.className = 'alert alert-success mb-0 update-notification success';
      updateNotificationContent.innerHTML = `
        <div class="text-center update-version-info">
          <strong>${popupI18n.t('no_updates_available')}</strong>
          <div class="version-comparison">
            <div class="version-line" style="justify-content: center;">
              <span class="version-badge">v${updateInfo.currentVersion}</span>
            </div>
          </div>
        </div>
      `;
      sendDebugLog(popupI18n.t('extension_is_up_to_date'), 'info');

      // 4秒后自动隐藏成功通知
      setTimeout(() => {
        scheduleDOMUpdate(() => {
          updateNotification.classList.add('d-none');
        });
      }, 4000);
    }

    updateNotification.classList.remove('d-none');
  });
}

/**
 * 更新检查按钮UI状态
 * @param {boolean} isChecking - 是否正在进行更新检查
 */
const updateCheckButtonState = (isChecking) => {
  // 使用缓存的DOM元素提高性能
  const updateCheckBtn = domCache.updateCheckBtn || document.getElementById('updateCheckBtn');
  const updateCheckText = domCache.updateCheckText || document.getElementById('updateCheckText');
  const updateCheckSpinner = domCache.updateCheckSpinner || document.getElementById('updateCheckSpinner');

  // 检查DOM元素
  if (!updateCheckBtn || !updateCheckText || !updateCheckSpinner) return;

  // 使用批量DOM更新提高性能
  scheduleDOMUpdate(() => {
    if (isChecking) {
      updateCheckBtn.disabled = true;
      updateCheckText.textContent = popupI18n.t('checking_updates');
      updateCheckSpinner.classList.remove('d-none');
    } else {
      updateCheckBtn.disabled = false;
      updateCheckText.textContent = popupI18n.t('check_for_updates');
      updateCheckSpinner.classList.add('d-none');
    }
  });
};

/**
 * 取消正在进行的更新检查请求
 */
const cancelUpdateCheck = () => {
  if (updateCheckController) {
    updateCheckController.abort();
    updateCheckController = null;
    sendDebugLog(popupI18n.t('update_check_cancelled'), 'info');
  }

  if (updateCheckInProgress) {
    updateCheckInProgress = false;
    updateCheckButtonState(false);
  }
};

/**
 * 防抖的更新检查函数 - 即时UI响应
 */
const debouncedUpdateCheck = () => {
  // 清除现有的防抖定时器
  if (updateCheckDebounceTimer) {
    clearTimeout(updateCheckDebounceTimer);
    updateCheckDebounceTimer = null;
  }

  // 检查请求之间的最小间隔
  const now = Date.now();
  const timeSinceLastCheck = now - lastUpdateCheckTime;

  // 检查频率限制
  if (timeSinceLastCheck < UPDATE_CHECK_MIN_INTERVAL) {
    const remainingTime = UPDATE_CHECK_MIN_INTERVAL - timeSinceLastCheck;
    sendDebugLog(popupI18n.t('update_check_rate_limited', { seconds: Math.ceil(remainingTime / 1000) }), 'warning');
    return;
  }

  // 立即执行，不使用任何延迟
  sendDebugLog(popupI18n.t('update_check_starting'), 'info');

  // 立即执行，不使用setTimeout
  performUpdateCheck();
};

/**
 * 执行更新检查，请求管理（非阻塞操作）
 */
const performUpdateCheck = async () => {
  if (updateCheckInProgress) {
    sendDebugLog(popupI18n.t('update_check_in_progress'), 'warning');
    return;
  }

  // 取消任何已有的请求
  cancelUpdateCheck();

  updateCheckInProgress = true;
  lastUpdateCheckTime = Date.now();

  // 隐藏之前的错误通知 - 直接使用DOM操作，不使用缓存
  const updateErrorAlert = document.getElementById('updateErrorAlert');
  if (updateErrorAlert) updateErrorAlert.classList.add('d-none');

  // 立即显示加载状态 - 同步执行确保立即响应
  showUpdateLoadingState();

  // 更新按钮状态 - 放在加载状态显示之后，避免阻塞UI更新
  updateCheckButtonState(true);

  // 为此请求创建新的中止控制器
  updateCheckController = new AbortController();

  try {
    initializeUpdateChecker();
    sendDebugLog(popupI18n.t('starting_update_check'), 'info');

    // 为更新检查器添加中止信号支持，具有优雅的回退机制
    const updateInfo = await updateChecker.checkForUpdatesWithFallback(updateCheckController.signal, true);

    // 检查请求是否被取消
    if (updateCheckController?.signal.aborted) {
      sendDebugLog(popupI18n.t('update_check_was_cancelled'), 'info');
      return;
    }

    sendDebugLog(popupI18n.t('update_check_success'), 'success');
    showUpdateNotification(updateInfo);

  } catch (error) {
    // 检查错误是否由于取消导致
    if (error.name === 'AbortError' || updateCheckController?.signal.aborted) {
      sendDebugLog(popupI18n.t('update_check_was_cancelled'), 'info');
      return;
    }

    sendDebugLog(popupI18n.t('update_check_failed_with_message', { message: error.message }), 'error');

    let errorMessage = popupI18n.t('update_check_failed');
    let showRetryOption = false;
    let fallbackMessage = null;

    // 将错误类型映射到本地化消息，增强错误处理
    if (error.type) {
      switch (error.type) {
        case 'TIMEOUT':
          errorMessage = popupI18n.t('update_timeout_error');
          showRetryOption = true;
          break;
        case 'NETWORK_ERROR':
          errorMessage = popupI18n.t('network_error');
          showRetryOption = true;
          break;
        case 'RATE_LIMIT':
          errorMessage = popupI18n.t('rate_limit_exceeded');
          showRetryOption = false; // 不显示重试选项，避免加剧速率限制
          fallbackMessage = popupI18n.t('rate_limit_fallback');
          break;
        case 'INVALID_RESPONSE':
          errorMessage = popupI18n.t('invalid_response');
          showRetryOption = true;
          break;
        case 'API_ERROR':
          errorMessage = popupI18n.t('api_unavailable_error');
          showRetryOption = true;
          fallbackMessage = popupI18n.t('api_error_fallback');
          break;
        case 'NOT_FOUND':
          errorMessage = popupI18n.t('repository_not_found_error');
          showRetryOption = false;
          fallbackMessage = popupI18n.t('manual_check_fallback');
          break;
        case 'VERSION_ERROR':
          errorMessage = popupI18n.t('version_parse_error');
          showRetryOption = false;
          fallbackMessage = popupI18n.t('manual_check_fallback');
          break;
        case 'SSL_ERROR':
          errorMessage = popupI18n.t('ssl_error');
          showRetryOption = true;
          fallbackMessage = popupI18n.t('ssl_error_fallback');
          break;
        case 'DNS_ERROR':
          errorMessage = popupI18n.t('dns_error');
          showRetryOption = true;
          fallbackMessage = popupI18n.t('connection_error_fallback');
          break;
        case 'CORS_ERROR':
          errorMessage = popupI18n.t('cors_error');
          showRetryOption = false;
          fallbackMessage = popupI18n.t('extension_reload_fallback');
          break;
        case 'CANCELLED':
          // 对于取消的请求不显示错误
          return;
        default:
          errorMessage = error.message || popupI18n.t('update_check_failed');
          showRetryOption = error.canRetry || false;
          fallbackMessage = popupI18n.t('manual_check_fallback');
      }
    } else {
      // 对于没有类型信息的错误的回退处理
      errorMessage = error.message || popupI18n.t('update_check_failed');
      fallbackMessage = popupI18n.t('manual_check_fallback');
    }

    // 显示增强的错误信息和回退建议
    showUpdateError(errorMessage, fallbackMessage, showRetryOption);
  } finally {
    // 清理更新检查状态
    updateCheckInProgress = false;
    updateCheckController = null;
    updateCheckButtonState(false);
  }
}

// 防抖的UI更新函数
let lastUIUpdate = 0;
const debouncedUIUpdate = (updateFn, delay = 100) => {
  // 验证输入
  if (typeof updateFn !== 'function') return;

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
};

// --- 扩展初始化 ---
document.addEventListener('DOMContentLoaded', async () => {
  // 等待翻译系统加载完成
  await new Promise(resolve => {
    if (popupI18n.isReady) {
      resolve();
    } else {
      popupI18n.ready(resolve);
    }
  });

  // 初始化DOM缓存以提高性能
  initializeDOMCache();

  // 获取DOM元素（使用缓存）
  const languageSelect = domCache.languageSelect;
  const applyButton = domCache.applyButton;
  const currentLanguageSpan = domCache.currentLanguageSpan;
  const checkHeaderBtn = domCache.checkHeaderBtn;
  const autoSwitchToggle = domCache.autoSwitchToggle;
  const resetBtn = domCache.resetBtn;

  // 初始化语言选项下拉列表
  populateLanguageSelect(languageSelect);
  sendDebugLog(popupI18n.t('popup_script_loaded'));

  // 加载并应用自动切换状态
  const autoSwitchEnabled = await getAutoSwitchStatus();
  updateAutoSwitchUI(autoSwitchEnabled, autoSwitchToggle, languageSelect, applyButton);

  // 加载并显示当前语言设置
  const currentLanguage = await getCurrentLanguage();
  updateLanguageDisplay(currentLanguage);

  // 事件处理函数定义
  const eventHandlers = {
    // 防抖相关状态
    lastApplyTime: 0,

    // 自动切换开关变更处理
    autoSwitchChange: async () => {
      const enabled = this.checked;
      const success = await setAutoSwitchStatus(enabled);
      if (success) {
        updateAutoSwitchUI(enabled, autoSwitchToggle, languageSelect, applyButton);
      }
    },

    // 语言选择框获得焦点处理
    languageSelectFocus: () => {
      this.size = 6;
      sendDebugLog(popupI18n.t('language_select_focus'), 'info');
    },

    // 应用按钮点击处理
    applyButtonClick: async () => {
      if (!languageSelect) return;

      const selectedLanguage = languageSelect.value;

      // 防抖处理 - 0.6秒内的重复点击会被忽略
      const now = Date.now();
      if (eventHandlers.lastApplyTime && (now - eventHandlers.lastApplyTime) < 600) {
        sendDebugLog(popupI18n.t('apply_debounced'), 'info');
        return;
      }
      eventHandlers.lastApplyTime = now;

      sendDebugLog(`${popupI18n.t('clicked_apply_button')} ${selectedLanguage}.`, 'info');

      try {
        // 保存语言设置并更新显示
        await saveLanguageSetting(selectedLanguage);
        if (currentLanguageSpan) currentLanguageSpan.textContent = selectedLanguage;

        // 更新请求头规则并触发自动检查
        await updateHeaderRules(selectedLanguage, true);
        languageSelect.size = 1;
        sendDebugLog(popupI18n.t('collapse_language_select'), 'info');
      } catch (error) {
        // 简化的错误处理
        const errorMsg = error.message || popupI18n.t('unknown_error');
        sendDebugLog(popupI18n.t('apply_language_failed', { language: selectedLanguage, error: errorMsg }), 'error');
        showError(popupI18n.t('apply_language_failed_user', { language: selectedLanguage }));
      }
    },

    // 重置按钮点击处理
    resetButtonClick: async () => {
      sendDebugLog(popupI18n.t('clicked_reset_button'), 'info');

      try {
        await resetAcceptLanguage();

        // 重置成功后更新UI
        sendDebugLog(popupI18n.t('reset_successful'), 'success');
        updateLanguageDisplay(popupI18n.t('not_set'));
        if (languageSelect) languageSelect.value = '';

      } catch (error) {
        // 重置失败处理
        eventHandlers.handleResetError(error);
      }
    },

    // 重置操作错误处理函数
    handleResetError(error) {
      const errorDetails = error?.message || popupI18n.t('unknown_error');
      const userMessage = popupI18n.t('reset_failed_alert') + ': ' + errorDetails;
      sendDebugLog(popupI18n.t('reset_request_failed', { message: errorDetails }), 'error');
      showError(userMessage);
    },

    // 快速检查按钮点击处理
    checkHeaderBtnClick: () => {
      sendDebugLog(popupI18n.t('clicked_quick_check'), 'info');
      const headerCheckResultDiv = document.getElementById('headerCheckResult');
      const headerCheckContentPre = document.getElementById('headerCheckContent');

      // 检查必要元素
      if (!headerCheckContentPre) return;

      // 显示检查结果区域并开始检查
      if (headerCheckResultDiv) headerCheckResultDiv.classList.remove('d-none');
      headerCheckContentPre.textContent = popupI18n.t('fetching_headers');
      performHeaderCheck(headerCheckContentPre);
    },

    // 更新检查按钮点击处理
    updateCheckBtnClick: () => {
      sendDebugLog(popupI18n.t('clicked_update_check_button'), 'info');
      debouncedUpdateCheck();
    }
  };

  // 绑定事件监听器
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

  // DOM缓存已在主初始化中完成，无需重复初始化

  // 初始化更新检查器并预加载缓存以提高性能
  initializeUpdateChecker();
  if (updateChecker) {
    // 在后台预加载缓存以加快后续请求
    updateChecker.preloadCache().then(preloaded => {
      if (preloaded) {
        sendDebugLog(popupI18n.t('update_checker_cache_preloaded'), 'info');
      }
    }).catch(error => {
      sendDebugLog(`Cache preload failed: ${error.message}`, 'warning');
    });

    // 通过清理过期条目来优化缓存
    updateChecker.optimizeCache().then(optimized => {
      if (optimized) {
        sendDebugLog(popupI18n.t('update_checker_cache_optimized'), 'info');
      }
    }).catch(error => {
      sendDebugLog(`Cache optimization failed: ${error.message}`, 'warning');
    });
  }

  // 添加更新检查按钮事件监听器
  const updateCheckBtn = document.getElementById('updateCheckBtn');
  if (updateCheckBtn) {
    updateCheckBtn.addEventListener('click', eventHandlers.updateCheckBtnClick);
  }

  // 页面卸载时清理事件和请求
  window.addEventListener('beforeunload', () => {
    // 取消正在进行的更新检查
    cancelUpdateCheck();

    // 清除防抖定时器
    if (updateCheckDebounceTimer) {
      clearTimeout(updateCheckDebounceTimer);
      updateCheckDebounceTimer = null;
    }

    // 移除事件监听器
    if (autoSwitchToggle) autoSwitchToggle.removeEventListener('change', eventHandlers.autoSwitchChange);
    if (languageSelect) languageSelect.removeEventListener('focus', eventHandlers.languageSelectFocus);
    if (applyButton) applyButton.removeEventListener('click', eventHandlers.applyButtonClick);
    if (resetBtn) resetBtn.removeEventListener('click', eventHandlers.resetButtonClick);
    if (checkHeaderBtn) checkHeaderBtn.removeEventListener('click', eventHandlers.checkHeaderBtnClick);
    if (updateCheckBtn) updateCheckBtn.removeEventListener('click', eventHandlers.updateCheckBtnClick);

    sendDebugLog('Popup cleanup completed', 'info');
  }, { once: true });

  // 通过可见性变化处理弹窗关闭
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // 当弹窗变为隐藏时取消正在进行的更新检查
      cancelUpdateCheck();
      sendDebugLog(popupI18n.t('popup_hidden_cancelled_update'), 'info');
    }
  });

  /**
   * 处理自动切换UI更新消息
   * @param {Object} request - 消息请求对象
   * @param {HTMLElement} autoSwitchToggle - 自动切换开关元素
   * @param {HTMLElement} languageSelect - 语言选择元素
   * @param {HTMLElement} applyButton - 应用按钮元素
   */
  const handleAutoSwitchUIUpdate = (request, autoSwitchToggle, languageSelect, applyButton) => {
    debouncedUIUpdate(() => {
      const autoSwitchEnabled = request.autoSwitchEnabled;

      // 更新开关状态
      if (autoSwitchToggle) {
        autoSwitchToggle.checked = autoSwitchEnabled;
      }

      // 同步状态到本地存储
      syncAutoSwitchStatusToStorage(autoSwitchEnabled);

      // 更新UI状态
      updateAutoSwitchUI(autoSwitchEnabled, autoSwitchToggle, languageSelect, applyButton);

      // 处理当前语言信息更新
      if (request.currentLanguage) {
        updateCurrentLanguageInfo(request.currentLanguage, languageSelect);
      }
    });
  };

  /**
   * 同步自动切换状态到本地存储
   * @param {boolean} autoSwitchEnabled - 自动切换是否启用
   */
  const syncAutoSwitchStatusToStorage = (autoSwitchEnabled) => {
    chrome.storage.local.set({ autoSwitchEnabled }, () => {
      if (chrome.runtime.lastError) {
        sendDebugLog(popupI18n.t('update_storage_status_failed', { message: chrome.runtime.lastError.message }), 'error');
      } else {
        sendDebugLog(popupI18n.t('synced_auto_switch_status_to_storage', { status: autoSwitchEnabled }), 'info');
      }
    });
  };

  /**
   * 更新当前语言信息显示
   * @param {string} currentLanguage - 当前语言
   * @param {HTMLElement} languageSelect - 语言选择元素
   */
  const updateCurrentLanguageInfo = (currentLanguage, languageSelect) => {
    updateLanguageDisplay(currentLanguage);

    // 同步更新语言选择器
    if (languageSelect) {
      languageSelect.value = currentLanguage;
    }

    sendDebugLog(`${popupI18n.t('received_background_message')} ${currentLanguage}${popupI18n.t('update_ui')}`, 'info');
  };

  /**
   * 处理自动切换状态变更消息
   * @param {Object} request - 消息请求对象
   * @param {HTMLElement} autoSwitchToggle - 自动切换开关元素
   * @param {HTMLElement} languageSelect - 语言选择元素
   * @param {HTMLElement} applyButton - 应用按钮元素
   */
  const handleAutoSwitchStateChanged = (request, autoSwitchToggle, languageSelect, applyButton) => {
    // 检查必要元素
    if (!autoSwitchToggle) return;

    autoSwitchToggle.checked = request.enabled;
    updateAutoSwitchUI(request.enabled, autoSwitchToggle, languageSelect, applyButton);

    const statusText = request.enabled ? popupI18n.t('enabled') : popupI18n.t('disabled');
    sendDebugLog(popupI18n.t('received_status_sync', { status: statusText }), 'info');
  };

  // 监听来自 background.js 的消息
  chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    // 处理 AUTO_SWITCH_UI_UPDATE
    if (request.type === 'AUTO_SWITCH_UI_UPDATE') {
      handleAutoSwitchUIUpdate(request, autoSwitchToggle, languageSelect, applyButton);
      sendResponse({ status: "UI updated" });
      return true;
    }

    // 处理 AUTO_SWITCH_STATE_CHANGED
    if (request.type === 'AUTO_SWITCH_STATE_CHANGED') {
      handleAutoSwitchStateChanged(request, autoSwitchToggle, languageSelect, applyButton);
      return true;
    }

    return true;
  });
});