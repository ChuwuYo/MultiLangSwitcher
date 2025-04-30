// 初始化扩展
document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const languageSelect = document.getElementById('languageSelect');
  const applyButton = document.getElementById('applyButton');
  const currentLanguage = document.getElementById('currentLanguage');
  const checkHeaderBtn = document.getElementById('checkHeaderBtn');
  
  // 从存储中加载当前语言设置
  chrome.storage.local.get(['currentLanguage'], function(result) {
    if (result.currentLanguage) {
      languageSelect.value = result.currentLanguage;
      currentLanguage.textContent = result.currentLanguage;
      // 确保扩展加载时就应用当前语言设置，但不自动触发检查
      updateHeaderRules(result.currentLanguage, false);
    } else {
      // 如果没有保存的语言设置，使用默认值并应用
      const defaultLanguage = languageSelect.value;
      chrome.storage.local.set({currentLanguage: defaultLanguage});
      currentLanguage.textContent = defaultLanguage;
      updateHeaderRules(defaultLanguage, false);
    }
  });
  
  // 应用按钮点击事件
  applyButton.addEventListener('click', function() {
    const selectedLanguage = languageSelect.value;
    
    // 保存选择的语言
    chrome.storage.local.set({currentLanguage: selectedLanguage}, function() {
      console.log('语言设置已保存: ' + selectedLanguage);
      currentLanguage.textContent = selectedLanguage;
    });
    
    // 更新请求头规则，并自动触发检查
    updateHeaderRules(selectedLanguage, true);
  });
  
  // 快速检查按钮点击事件
  if (checkHeaderBtn) {
    checkHeaderBtn.addEventListener('click', function() {
      const headerCheckResult = document.getElementById('headerCheckResult');
      const headerCheckContent = document.getElementById('headerCheckContent');
      
      // 显示加载状态
      headerCheckResult.classList.remove('d-none');
      headerCheckContent.textContent = '正在获取请求头信息...';
      
      // 使用随机参数避免缓存
      const timestamp = new Date().getTime();
      // 发送请求获取当前请求头
      fetch(`https://httpbin.org/headers?_=${timestamp}`, {
        cache: 'no-cache' // 禁用缓存
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          // 格式化并显示请求头
          const headers = data.headers;
          let formattedHeaders = JSON.stringify(headers, null, 2);
          headerCheckContent.textContent = formattedHeaders;
          
          // 高亮Accept-Language头
          if (headers['Accept-Language']) {
            const acceptLanguage = headers['Accept-Language'];
            headerCheckContent.innerHTML = formattedHeaders.replace(
              `"Accept-Language": "${acceptLanguage}"`, 
              `"Accept-Language": "<span class=\"text-success fw-bold\">${acceptLanguage}</span>"`
            );
            console.log('检测到的Accept-Language:', acceptLanguage);
          } else {
            console.log('未检测到Accept-Language请求头');
          }
        })
        .catch(error => {
          console.error('获取请求头失败:', error);
          headerCheckContent.textContent = '获取请求头信息失败: ' + error.message;
        });
    });
  }
});

// 更新请求头规则
function updateHeaderRules(language, autoCheck = false) {
  // 创建规则ID (使用固定ID以便更新)
  const RULE_ID = 1;
  
  // 确保语言值没有多余的空格
  language = language.trim();
  
  // 获取当前所有动态规则
  chrome.declarativeNetRequest.getDynamicRules(function(existingRules) {
    // 获取所有现有规则ID
    const existingRuleIds = existingRules.map(rule => rule.id);
    
    // 移除现有规则并添加新规则（在一个操作中完成）
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
      // 检查是否有错误
      if (chrome.runtime.lastError) {
        console.error('更新规则失败:', chrome.runtime.lastError);
        alert('更新请求头规则失败: ' + chrome.runtime.lastError.message);
        return;
      }
      
      // 验证规则是否已应用
      chrome.declarativeNetRequest.getMatchedRules({}, function(matchedRules) {
        console.log('当前匹配的规则:', matchedRules);
      });
      
      console.log('请求头规则已更新为: ' + language);
      // 显示成功消息
      const statusText = document.getElementById('statusText');
      statusText.innerHTML = `当前语言: <span id="currentLanguage">${language}</span> <span class="text-success">(已应用)</span>`;
      
      // 2秒后移除成功消息
      setTimeout(function() {
        statusText.innerHTML = `当前语言: <span id="currentLanguage">${language}</span>`;
      }, 2000);
      
      // 如果需要自动检查且快速检查按钮存在，自动触发一次检查以验证更改
      if (autoCheck) {
        const checkHeaderBtn = document.getElementById('checkHeaderBtn');
        if (checkHeaderBtn && document.getElementById('headerCheckResult')) {
          setTimeout(function() {
            checkHeaderBtn.click();
          }, 500); // 延迟500毫秒后触发，确保规则已应用
        }
      }
    });
  });

}