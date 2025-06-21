// --- 全局函数 ---

// 函数：发送日志消息到调试页面
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
// 把 updateHeaderRules 移到全局作用域，或至少在 DOMContentLoaded 之前定义
function updateHeaderRules(language, autoCheck = false) {
  const RULE_ID = 1;
  language = language.trim();

  // 此处可以直接调用全局的 sendDebugLog
  sendDebugLog(`正在尝试更新请求头规则，语言: ${language}. 是否自动检查: ${autoCheck}.`, 'info');

  chrome.declarativeNetRequest.getDynamicRules(function(existingRules) {
    sendDebugLog(`找到 ${existingRules.length} 条现有动态规则，准备移除并添加新规则.`, 'info');
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
        sendDebugLog(`更新 declarativeNetRequest 规则失败: ${chrome.runtime.lastError.message}`, 'error');
        alert('更新请求头规则失败: ' + chrome.runtime.lastError.message);
        return;
      }

      sendDebugLog(`DeclarativeNetRequest 规则已成功更新为: ${language}.`, 'success');
      const statusTextElement = document.getElementById('statusText');
      const currentLanguageSpan = document.getElementById('currentLanguage');

      if (statusTextElement && currentLanguageSpan) {
        currentLanguageSpan.textContent = language;
        const successSpan = document.createElement('span');
        successSpan.className = 'text-success ms-1'; // 加一点左边距
        successSpan.textContent = '(已应用)';
        
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
          sendDebugLog('规则更新后自动触发快速检查.', 'info');
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

  // 此处可以直接调用全局的 sendDebugLog
  sendDebugLog('Popup 脚本已加载.');

  // 加载自动切换状态
  chrome.storage.local.get(['autoSwitchEnabled'], function(result) {
    if (result.autoSwitchEnabled) {
      autoSwitchToggle.checked = true;
      if (languageSelect) languageSelect.disabled = true;
      if (applyButton) applyButton.disabled = true;
      sendDebugLog('自动切换功能已加载并启用, 禁用手动选择.', 'info');
    } else {
      autoSwitchToggle.checked = false;
      if (languageSelect) languageSelect.disabled = false;
      if (applyButton) applyButton.disabled = false;
      sendDebugLog('自动切换功能已加载并禁用, 启用手动选择.', 'info');
    }
  });

  // 自动切换按钮事件监听
  if (autoSwitchToggle) {
    autoSwitchToggle.addEventListener('change', function() {
      const enabled = this.checked;
      chrome.storage.local.set({ autoSwitchEnabled: enabled }, function() {
        sendDebugLog(`自动切换功能状态已保存: ${enabled ? '启用' : '禁用'}.`, 'info');
        chrome.runtime.sendMessage({ type: 'AUTO_SWITCH_TOGGLED', enabled: enabled });
      });

      if (enabled) {
        if (languageSelect) languageSelect.disabled = true;
        if (applyButton) applyButton.disabled = true;
        sendDebugLog('自动切换已启用，禁用手动语言选择和应用按钮。', 'info');
      } else {
        if (languageSelect) languageSelect.disabled = false;
        if (applyButton) applyButton.disabled = false;
        sendDebugLog('自动切换已禁用，启用手动语言选择和应用按钮。', 'info');
      }
    });
  }

  // 添加焦点事件监听器来展开下拉框
  if (languageSelect) {
    languageSelect.addEventListener('focus', function() {
      this.size = 6;
      sendDebugLog('语言选择框获得焦点，展开下拉框.', 'info');
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
        sendDebugLog(`从动态规则中获取到当前语言: ${activeLanguage}.`, 'info');
        if (languageSelect) languageSelect.value = activeLanguage;
        if (currentLanguageSpan) currentLanguageSpan.textContent = activeLanguage;
      }
    }

    if (!activeLanguage) {
      sendDebugLog('未从动态规则中获取到语言，尝试从存储加载.', 'info');
      chrome.storage.local.get(['currentLanguage'], function(result) {
        if (result.currentLanguage) {
          if (languageSelect) languageSelect.value = result.currentLanguage;
          if (currentLanguageSpan) currentLanguageSpan.textContent = result.currentLanguage;
          sendDebugLog(`已加载存储的语言设置: ${result.currentLanguage}.`, 'info');
        } else {
          const defaultLanguage = languageSelect ? languageSelect.value : "未设置";
          sendDebugLog(`未找到存储的语言设置. 使用默认值: ${defaultLanguage}.`, 'warning');
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
      sendDebugLog(`点击了应用更改按钮. 选择的语言: ${selectedLanguage}.`, 'info');

      chrome.storage.local.set({
        currentLanguage: selectedLanguage
      }, function() {
        sendDebugLog(`语言设置已保存: ${selectedLanguage}.`, 'info');
        if (currentLanguageSpan) currentLanguageSpan.textContent = selectedLanguage;
      });

      chrome.storage.local.get(['autoSwitchEnabled'], function(result) {
        if (!result.autoSwitchEnabled) {
          // 调用全局的 updateHeaderRules
          updateHeaderRules(selectedLanguage, true);
        } else {
          sendDebugLog('自动切换已启用，手动应用更改按钮被忽略。', 'warning');
        }
      });

      languageSelect.size = 1;
      sendDebugLog('收起语言选择下拉框.', 'info');
    });
  }

  // 快速检查按钮点击事件
  if (checkHeaderBtn) {
    checkHeaderBtn.addEventListener('click', async function() {
      sendDebugLog('点击了快速检查按钮. 正在获取请求头...', 'info');
      const headerCheckResultDiv = document.getElementById('headerCheckResult');
      const headerCheckContentPre = document.getElementById('headerCheckContent');

      if (headerCheckResultDiv) headerCheckResultDiv.classList.remove('d-none');
      if (headerCheckContentPre) headerCheckContentPre.textContent = '正在获取请求头信息 (尝试多个检测点)...';

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
          sendDebugLog(`尝试从 ${url} 获取请求头...`, 'info');
          const response = await fetch(url, { cache: 'no-cache' });
          if (!response.ok) {
            const errorMsg = `HTTP错误! 状态: ${response.status} 从 ${url}`;
            sendDebugLog(`快速检查请求失败: ${errorMsg}`, 'warning');
            lastError = new Error(errorMsg);
            continue;
          }
          const data = await response.json();
          sendDebugLog(`从 ${url} 成功获取到请求头，正在显示结果.`, 'info');
          const headers = data.headers;
          const acceptLangHeader = headers['Accept-Language'] || headers['accept-language'];

          if (headerCheckContentPre) {
            if (acceptLangHeader) {
              sendDebugLog(`快速检查检测到 Accept-Language: ${acceptLangHeader}.`, 'success');
              headerCheckContentPre.innerHTML = `Accept-Language: <span class="text-success fw-bold">${acceptLangHeader}</span>`;
            } else {
              sendDebugLog(`快速检查: 未在 ${url} 检测到 Accept-Language 请求头.`, 'warning');
              headerCheckContentPre.textContent = '未检测到 Accept-Language 请求头。';
            }
          }
          success = true;
          break;
        } catch (error) {
          sendDebugLog(`从 ${url} 获取请求头时发生错误: ${error.message}`, 'warning');
          lastError = error;
        }
      }

      if (!success && headerCheckContentPre) {
        console.error('所有检测点获取请求头均失败:', lastError);
        sendDebugLog(`快速检查获取请求头失败 (所有检测点): ${lastError ? lastError.message : '未知错误'}`, 'error');
        headerCheckContentPre.innerHTML = '所有检测点获取请求头信息均失败: ' + (lastError ? lastError.message : '未知错误') +
          '\n请自行跳转到 <a href="https://webcha.cn/" target="_blank" style="color: #007bff;">https://webcha.cn/</a> 或 <a href="https://www.browserscan.net/zh" target="_blank" style="color: #007bff;">https://www.browserscan.net/zh</a> 进行查看。';
      }
    });
  }

  // 监听来自 background.js 的消息，以便在自动切换状态改变时更新UI和语言
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'AUTO_SWITCH_UI_UPDATE') {
      const autoSwitchEnabled = request.autoSwitchEnabled;
      if (autoSwitchToggle) {
        autoSwitchToggle.checked = autoSwitchEnabled;
        // 同时更新存储状态，确保一致性
        chrome.storage.local.set({ autoSwitchEnabled: autoSwitchEnabled });
      }

      if (languageSelect) languageSelect.disabled = autoSwitchEnabled;
      if (applyButton) applyButton.disabled = autoSwitchEnabled;
      
      sendDebugLog(`接收到后台消息：自动切换已${autoSwitchEnabled ? '启用' : '禁用'}，更新UI。`, 'info');
      
      if (request.currentLanguage) {
        if (currentLanguageSpan) currentLanguageSpan.textContent = request.currentLanguage;
        if (languageSelect) languageSelect.value = request.currentLanguage;
        sendDebugLog(`接收到后台消息：当前语言已更新为 ${request.currentLanguage}，更新UI。`, 'info');
      }
      sendResponse({status: "UI updated"});
    }
    return true; 
  });
});