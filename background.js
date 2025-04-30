// 后台脚本，确保扩展在浏览器启动时就能应用语言设置

// 当扩展安装或更新时触发
chrome.runtime.onInstalled.addListener(function() {
  console.log('Header Changer 扩展已安装/更新');
  
  // 从存储中获取当前语言设置并应用
  chrome.storage.local.get(['currentLanguage'], function(result) {
    if (result.currentLanguage) {
      updateHeaderRules(result.currentLanguage);
    } else {
      // 如果没有保存的语言设置，使用默认值并保存
      const defaultLanguage = 'zh-CN';
      chrome.storage.local.set({currentLanguage: defaultLanguage});
      updateHeaderRules(defaultLanguage);
    }
  });
});

// 当浏览器启动时触发
chrome.runtime.onStartup.addListener(function() {
  console.log('浏览器启动，Header Changer 扩展初始化');
  
  // 从存储中获取当前语言设置并应用
  chrome.storage.local.get(['currentLanguage'], function(result) {
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