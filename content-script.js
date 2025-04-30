// 内容脚本 - 用于修改JavaScript语言偏好和国际化API

// 在页面加载前立即初始化语言设置
(function() {
  // 从存储中获取当前语言设置
  chrome.storage.local.get(['currentLanguage', 'jsLanguageEnabled', 'intlAPIEnabled'], function(result) {
    if (result.currentLanguage) {
      // 应用JavaScript语言偏好修改
      if (result.jsLanguageEnabled) {
        applyJavaScriptLanguageOverride(result.currentLanguage);
      }
      
      // 应用国际化API修改
      if (result.intlAPIEnabled) {
        applyIntlAPIOverride(result.currentLanguage);
      }
    }
  });
})();

// 接收来自后台脚本的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'updateLanguage') {
    const language = message.language;
    const jsLanguageEnabled = message.jsLanguageEnabled;
    const intlAPIEnabled = message.intlAPIEnabled;
    
    console.log('[MultiLangSwitcher] 收到更新语言设置消息:', language, jsLanguageEnabled, intlAPIEnabled);
    
    // 保存设置到本地，确保页面刷新后仍能应用
    const settings = {
      currentLanguage: language,
      jsLanguageEnabled: jsLanguageEnabled,
      intlAPIEnabled: intlAPIEnabled,
      lastUpdated: new Date().getTime()
    };
    
    // 应用JavaScript语言偏好修改
    if (jsLanguageEnabled) {
      applyJavaScriptLanguageOverride(language);
    }
    
    // 应用国际化API修改
    if (intlAPIEnabled) {
      applyIntlAPIOverride(language);
    }
    
    // 发送响应
    sendResponse({success: true});
  }
  // 确保返回true以支持异步响应
  return true;
});

// 修改JavaScript语言偏好
function applyJavaScriptLanguageOverride(language) {
  try {
    // 使用chrome.scripting.executeScript API注入脚本
    const jsCode = function(language) {
      // 修改JavaScript语言偏好
      Object.defineProperty(navigator, 'language', {
        get: function() { return language; }
      });
      
      // 根据主语言创建语言列表，例如zh-CN会生成["zh-CN", "zh-TW", "zh"]
      let languageList = [language];
      
      // 添加相关语言变体
      if (language.includes('-')) {
        const baseLang = language.split('-')[0];
        // 如果是中文，添加其他中文变体
        if (baseLang === 'zh') {
          if (language !== 'zh-CN') languageList.push('zh-CN');
          if (language !== 'zh-TW') languageList.push('zh-TW');
          languageList.push('zh');
        }
        // 如果是英文，添加其他英文变体
        else if (baseLang === 'en') {
          if (language !== 'en-US') languageList.push('en-US');
          if (language !== 'en-GB') languageList.push('en-GB');
          languageList.push('en');
        }
        // 其他语言只添加基础语言代码
        else {
          languageList.push(baseLang);
        }
      }
      
      Object.defineProperty(navigator, 'languages', {
        get: function() { return languageList; }
      });
      console.log('[MultiLangSwitcher] 已修改JavaScript语言偏好为:', languageList);
    };
    
    // 获取当前标签页ID并在当前页面上下文中执行脚本
    chrome.runtime.sendMessage({action: 'getTabId'}, function(response) {
      if (response && response.tabId) {
        chrome.scripting.executeScript({
          target: {tabId: response.tabId},
          func: jsCode,
          args: [language],
          world: 'MAIN'
        }, function(results) {
          console.log('[MultiLangSwitcher] JavaScript语言偏好修改已应用');
        });
      } else {
        console.error('[MultiLangSwitcher] 无法获取标签页ID');
      }
    });
  } catch (error) {
    console.error('[MultiLangSwitcher] 应用JavaScript语言偏好修改时出错:', error);
  }
}

// 修改国际化API
function applyIntlAPIOverride(language) {
  try {
    // 使用chrome.scripting.executeScript API注入脚本
    const jsCode = function(language) {
      // 修改Internationalization API
      const originalDateTimeFormat = Intl.DateTimeFormat;
      Intl.DateTimeFormat = function(locales, options) {
        // 强制使用指定的语言，忽略传入的locales参数
        return originalDateTimeFormat.call(this, language, options);
      };
      
      // 保存原始的Intl.NumberFormat
      const originalNumberFormat = Intl.NumberFormat;
      Intl.NumberFormat = function(locales, options) {
        // 强制使用指定的语言，忽略传入的locales参数
        return originalNumberFormat.call(this, language, options);
      };
      
      // 保存原始的Intl.RelativeTimeFormat (如果浏览器支持)
      if (typeof Intl.RelativeTimeFormat !== 'undefined') {
        const originalRelativeTimeFormat = Intl.RelativeTimeFormat;
        Intl.RelativeTimeFormat = function(locales, options) {
          return originalRelativeTimeFormat.call(this, language, options);
        };
      }
      
      // 保存原始的Intl.PluralRules (如果浏览器支持)
      if (typeof Intl.PluralRules !== 'undefined') {
        const originalPluralRules = Intl.PluralRules;
        Intl.PluralRules = function(locales, options) {
          return originalPluralRules.call(this, language, options);
        };
      }
      
      console.log('[MultiLangSwitcher] 已修改Internationalization API语言偏好为:', language);
    };
    
    // 获取当前标签页ID并在当前页面上下文中执行脚本
    chrome.runtime.sendMessage({action: 'getTabId'}, function(response) {
      if (response && response.tabId) {
        chrome.scripting.executeScript({
          target: {tabId: response.tabId},
          func: jsCode,
          args: [language],
          world: 'MAIN'
        }, function(results) {
          console.log('[MultiLangSwitcher] 国际化API修改已应用');
        });
      } else {
        console.error('[MultiLangSwitcher] 无法获取标签页ID');
      }
    });
  } catch (error) {
    console.error('[MultiLangSwitcher] 应用国际化API修改时出错:', error);
  }
}