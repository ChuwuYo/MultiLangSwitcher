// 初始化扩展
document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const languageSelect = document.getElementById('languageSelect');
  const applyButton = document.getElementById('applyButton');
  const currentLanguage = document.getElementById('currentLanguage');
  const checkHeaderBtn = document.getElementById('checkHeaderBtn');
  const autoSwitchToggle = document.getElementById('autoSwitchToggle'); // 新增：获取自动切换按钮

  // 函数：发送日志消息到调试页面
  function sendDebugLog(message, logType = 'info') {
      chrome.runtime.sendMessage({
          type: 'DEBUG_LOG', // 消息类型，用于在调试页面区分
          message: message,
          logType: logType // 日志级别 (info, warning, error, success)
      }).catch(error => {
          // 如果调试页面没打开，发送消息会失败，捕获错误避免控制台报错
          // console.warn("Could not send debug log:", error);
      });
  }

  sendDebugLog('Popup 脚本已加载.'); // 脚本加载时发送日志

  // 加载自动切换状态
  chrome.storage.local.get(['autoSwitchEnabled'], function(result) {
    if (result.autoSwitchEnabled) {
      autoSwitchToggle.checked = true;
      sendDebugLog('自动切换功能已加载并启用.', 'info');
    } else {
      autoSwitchToggle.checked = false;
      sendDebugLog('自动切换功能已加载并禁用.', 'info');
    }
  });

  // 自动切换按钮事件监听
  autoSwitchToggle.addEventListener('change', function() {
    const enabled = this.checked;
    chrome.storage.local.set({ autoSwitchEnabled: enabled }, function() {
      sendDebugLog(`自动切换功能状态已保存: ${enabled ? '启用' : '禁用'}.`, 'info');
      // 通知 background.js 状态已更改
      chrome.runtime.sendMessage({ type: 'AUTO_SWITCH_TOGGLED', enabled: enabled });
    });

    // 根据开关状态更新UI
    if (enabled) {
      languageSelect.disabled = true;
      applyButton.disabled = true;
      sendDebugLog('自动切换已启用，禁用手动语言选择和应用按钮。', 'info');
    } else {
      languageSelect.disabled = false;
      applyButton.disabled = false;
      sendDebugLog('自动切换已禁用，启用手动语言选择和应用按钮。', 'info');
    }
  });

  // 添加焦点事件监听器来展开下拉框
  languageSelect.addEventListener('focus', function() {
    this.size = 6; // 展开时最多显示6行
      sendDebugLog('语言选择框获得焦点，展开下拉框.', 'info'); // 记录焦点事件
  });

  // 移除 blur 事件监听器，改为在按钮点击时手动收起

  // 优先从网络请求规则获取当前语言，然后回退到存储
  const RULE_ID = 1;
  chrome.declarativeNetRequest.getDynamicRules(function(rules) {
    const activeRule = rules.find(rule => rule.id === RULE_ID && rule.action.type === 'modifyHeaders' && rule.action.requestHeaders?.some(h => h.header.toLowerCase() === 'accept-language'));
    let activeLanguage = null;

    if (activeRule) {
      const headerAction = activeRule.action.requestHeaders.find(h => h.header.toLowerCase() === 'accept-language');
      if (headerAction) {
        activeLanguage = headerAction.value;
        sendDebugLog(`从动态规则中获取到当前语言: ${activeLanguage}.`, 'info');
        languageSelect.value = activeLanguage;
        currentLanguage.textContent = activeLanguage;
      }
    }

    // 如果没有从规则中获取到语言，则尝试从存储中加载
    if (!activeLanguage) {
      sendDebugLog('未从动态规则中获取到语言，尝试从存储加载.', 'info');
      chrome.storage.local.get(['currentLanguage'], function(result) {
        if (result.currentLanguage) {
          languageSelect.value = result.currentLanguage;
          currentLanguage.textContent = result.currentLanguage;
          sendDebugLog(`已加载存储的语言设置: ${result.currentLanguage}.`, 'info');
        } else {
          // 如果存储中也没有，使用下拉框的默认值
          const defaultLanguage = languageSelect.value;
          sendDebugLog(`未找到存储的语言设置. 使用默认值: ${defaultLanguage}.`, 'warning');
          currentLanguage.textContent = defaultLanguage;
          // 如果希望默认值也保存，可以在这里取消注释
          // chrome.storage.local.set({currentLanguage: defaultLanguage});
        }
      });
    } else {
       // 如果从规则获取到了，也更新一下存储，保持同步
       // chrome.storage.local.set({currentLanguage: activeLanguage});
    }

    // 根据自动切换状态禁用/启用手动选择
    chrome.storage.local.get(['autoSwitchEnabled'], function(result) {
      if (result.autoSwitchEnabled) {
        languageSelect.disabled = true;
        applyButton.disabled = true;
        sendDebugLog('自动切换已启用，禁用手动语言选择。', 'info');
      } else {
        languageSelect.disabled = false;
        applyButton.disabled = false;
      }
    });
  });

  // 应用按钮点击事件，保存设置、更新规则并收起下拉框
  applyButton.addEventListener('click', function() {
    const selectedLanguage = languageSelect.value;
    sendDebugLog(`点击了应用更改按钮. 选择的语言: ${selectedLanguage}.`, 'info'); // 记录按钮点击

    // 保存语言设置
    chrome.storage.local.set({
      currentLanguage: selectedLanguage
    }, function() {
      console.log('设置已保存: 语言=' + selectedLanguage); // 保留控制台日志
      sendDebugLog(`语言设置已保存: ${selectedLanguage}.`, 'info'); // 记录设置保存
      currentLanguage.textContent = selectedLanguage;
    });

    // 更新请求头规则，并自动触发检查
    // 仅在自动切换关闭时才通过手动应用按钮更新规则
    chrome.storage.local.get(['autoSwitchEnabled'], function(result) {
      if (!result.autoSwitchEnabled) {
        updateHeaderRules(selectedLanguage, true);
      } else {
        sendDebugLog('自动切换已启用，手动应用更改按钮被忽略。', 'warning');
      }
    });

    // 点击按钮后手动将选择框收起
    languageSelect.size = 1;
     sendDebugLog('收起语言选择下拉框.', 'info'); // 记录收起操作
  });

  // 快速检查按钮点击事件，获取并显示当前请求头
  if (checkHeaderBtn) {
    checkHeaderBtn.addEventListener('click', async function() {
      sendDebugLog('点击了快速检查按钮. 正在获取请求头...', 'info');
      const headerCheckResult = document.getElementById('headerCheckResult');
      const headerCheckContent = document.getElementById('headerCheckContent');

      headerCheckResult.classList.remove('d-none');
      headerCheckContent.textContent = '正在获取请求头信息 (尝试多个检测点)...';

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
            continue; // 尝试下一个URL
          }
          const data = await response.json();
          sendDebugLog(`从 ${url} 成功获取到请求头，正在显示结果.`, 'info');
          const headers = data.headers;
          const acceptLangHeader = headers['Accept-Language'] || headers['accept-language'];

          if (acceptLangHeader) {
            sendDebugLog(`快速检查检测到 Accept-Language: ${acceptLangHeader}.`, 'success');
            headerCheckContent.innerHTML = `Accept-Language: <span class="text-success fw-bold">${acceptLangHeader}</span>`;
          } else {
            sendDebugLog(`快速检查: 未在 ${url} 检测到 Accept-Language 请求头.`, 'warning');
            headerCheckContent.textContent = '未检测到 Accept-Language 请求头。';
          }
          success = true;
          break; // 成功获取，跳出循环
        } catch (error) {
          sendDebugLog(`从 ${url} 获取请求头时发生错误: ${error.message}`, 'warning');
          lastError = error;
        }
      }

      if (!success) {
        console.error('所有检测点获取请求头均失败:', lastError);
        sendDebugLog(`快速检查获取请求头失败 (所有检测点): ${lastError ? lastError.message : '未知错误'}`, 'error');
        headerCheckContent.innerHTML = '所有检测点获取请求头信息均失败: ' + (lastError ? lastError.message : '未知错误') +
          '\n请自行跳转到 <a href="https://webcha.cn/" target="_blank" style="color: #007bff;">https://webcha.cn/</a> 或 <a href="https://www.browserscan.net/zh" target="_blank" style="color: #007bff;">https://www.browserscan.net/zh</a> 进行查看。';
      }
    });
  }
});

// 更新请求头规则，设置Accept-Language
function updateHeaderRules(language, autoCheck = false) {
   // 函数：发送日志消息到调试页面 (在函数内部重新定义或传递进来)
    function sendDebugLog(message, logType = 'info') {
        chrome.runtime.sendMessage({
            type: 'DEBUG_LOG',
            message: message,
            logType: logType
        }).catch(error => {
            // 捕获潜在错误
            // console.warn("Could not send debug log from updateHeaderRules:", error);
        });
    }

  // 创建规则ID (使用固定ID以便更新)
  const RULE_ID = 1;

  // 监听来自 background.js 的消息，以便在自动切换状态改变时更新UI
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'AUTO_SWITCH_UI_UPDATE') {
      if (request.autoSwitchEnabled) {
        languageSelect.disabled = true;
        applyButton.disabled = true;
        if (autoSwitchToggle) autoSwitchToggle.checked = true;
        sendDebugLog('接收到后台消息：自动切换已启用，更新UI。', 'info');
      } else {
        languageSelect.disabled = false;
        applyButton.disabled = false;
        if (autoSwitchToggle) autoSwitchToggle.checked = false;
        sendDebugLog('接收到后台消息：自动切换已禁用，更新UI。', 'info');
      }
      // 如果有当前语言信息，也一并更新
      if (request.currentLanguage) {
        currentLanguage.textContent = request.currentLanguage;
        languageSelect.value = request.currentLanguage;
        sendDebugLog(`接收到后台消息：当前语言已更新为 ${request.currentLanguage}，更新UI。`, 'info');
      }
    }
  });

  // 确保语言值没有多余的空格
  language = language.trim();

  console.log('应用设置: 语言=' + language); // 保留控制台日志
   sendDebugLog(`正在尝试更新请求头规则，语言: ${language}. 是否自动检查: ${autoCheck}.`, 'info'); // 记录操作

  // 获取当前所有动态规则，移除现有规则并添加新规则
  chrome.declarativeNetRequest.getDynamicRules(function(existingRules) {
     sendDebugLog(`找到 ${existingRules.length} 条现有动态规则，准备移除并添加新规则.`, 'info'); // 记录现有规则数量
    const existingRuleIds = existingRules.map(rule => rule.id);

    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: [{
        "id": RULE_ID,
        "priority": 100, // 使用更高的优先级覆盖静态规则
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
    }, function(result) {
      // 检查是否有错误并显示更新状态
      if (chrome.runtime.lastError) {
        console.error('更新规则失败:', chrome.runtime.lastError); // 保留控制台日志
        sendDebugLog(`更新 declarativeNetRequest 规则失败: ${chrome.runtime.lastError.message}`, 'error'); // 记录错误
        alert('更新请求头规则失败: ' + chrome.runtime.lastError.message);
        return;
      }

      chrome.declarativeNetRequest.getMatchedRules({}, function(matchedRules) {
        console.log('当前匹配的规则:', matchedRules); // 保留控制台日志
      });

      console.log('请求头规则已更新为: ' + language); // 保留控制台日志
       sendDebugLog(`DeclarativeNetRequest 规则已成功更新为: ${language}.`, 'success'); // 记录成功
      const statusText = document.getElementById('statusText');
      statusText.innerHTML = `当前语言: <span id="currentLanguage">${language}</span> <span class="text-success">(已应用)</span>`;

      // 2秒后移除成功消息
      setTimeout(function() {
        statusText.innerHTML = `当前语言: <span id="currentLanguage">${language}</span>`;
      }, 2000);

      // 如果需要自动检查且快速检查按钮存在，自动触发一次检查
      if (autoCheck) {
        const checkHeaderBtn = document.getElementById('checkHeaderBtn');
        if (checkHeaderBtn && document.getElementById('headerCheckResult')) {
           sendDebugLog('规则更新后自动触发快速检查.', 'info'); // 记录自动检查
          setTimeout(function() {
            checkHeaderBtn.click();
          }, 500); // 延迟500毫秒后触发，确保规则已应用
        }
      }
    });
  });
}