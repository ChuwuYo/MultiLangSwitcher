// 后台脚本，确保扩展在浏览器启动时就能应用语言设置

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // 处理获取当前标签页ID的请求
  if (message.action === 'getTabId') {
    sendResponse({tabId: sender.tab.id});
    return true;
  }
});

// 当扩展安装或更新时触发
chrome.runtime.onInstalled.addListener(function() {
  console.log('MultiLangSwitcher 扩展已安装/更新');
  
  // 从存储中获取当前语言设置并应用
  chrome.storage.local.get(['currentLanguage', 'jsLanguageEnabled', 'intlAPIEnabled'], function(result) {
    if (result.currentLanguage) {
      updateHeaderRules(result.currentLanguage);
    } else {
      // 如果没有保存的语言设置，使用默认值并保存
      const defaultLanguage = 'zh-CN';
      chrome.storage.local.set({
        currentLanguage: defaultLanguage,
        jsLanguageEnabled: false,
        intlAPIEnabled: false
      });
      updateHeaderRules(defaultLanguage);
    }
  });
});

// 当浏览器启动时触发
chrome.runtime.onStartup.addListener(function() {
  console.log('浏览器启动，MultiLangSwitcher 扩展初始化');
  
  // 从存储中获取当前语言设置并应用
  chrome.storage.local.get(['currentLanguage', 'jsLanguageEnabled', 'intlAPIEnabled'], function(result) {
    if (result.currentLanguage) {
      updateHeaderRules(result.currentLanguage);
    }
  });
});

// 更新请求头规则
function updateHeaderRules(language) {
  // 创建规则ID (使用固定ID以便更新)
  const RULE_ID = 1;
  
  // 确保语言值没有多余的空格
  language = language.trim();
  
  console.log('正在更新请求头规则为:', language);
  
  // 获取当前所有动态规则和功能开关状态
  chrome.storage.local.get(['jsLanguageEnabled', 'intlAPIEnabled'], function(result) {
    const jsLanguageEnabled = result.jsLanguageEnabled || false;
    const intlAPIEnabled = result.intlAPIEnabled || false;
    
    console.log('JavaScript语言偏好修改:', jsLanguageEnabled ? '已启用' : '未启用');
    console.log('国际化API修改:', intlAPIEnabled ? '已启用' : '未启用');
    
    // 处理内容脚本 - 使用消息传递机制
    // 向所有标签页发送消息，更新语言设置
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(function(tab) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateLanguage',
          language: language,
          jsLanguageEnabled: jsLanguageEnabled,
          intlAPIEnabled: intlAPIEnabled
        }, function(response) {
          // 忽略可能的错误，因为有些标签页可能还没有加载内容脚本
          if (chrome.runtime.lastError) {
            console.log('向标签页发送消息时出错:', chrome.runtime.lastError.message);
          } else if (response && response.success) {
            console.log('标签页语言设置已更新:', tab.id);
          }
        });
      });
    });
    
    // 保存当前设置，以便新打开的标签页可以获取
    chrome.storage.local.set({
      currentLanguage: language,
      jsLanguageEnabled: jsLanguageEnabled,
      intlAPIEnabled: intlAPIEnabled
    }, function() {
      console.log('语言设置已保存到存储');
    });
  });
  
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
    }, function() {
      // 检查是否有错误
      if (chrome.runtime.lastError) {
        console.error('更新规则失败:', chrome.runtime.lastError);
        return;
      }
      
      // 验证规则是否已应用
      chrome.declarativeNetRequest.getMatchedRules({}, function(matchedRules) {
        console.log('当前匹配的规则:', matchedRules);
      });
      
      console.log('请求头规则已成功更新为: ' + language);
    });
  });

}