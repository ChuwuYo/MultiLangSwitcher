# MultiLangSwitcher 代码风格指南

## 概述

本文档定义了 MultiLangSwitcher 项目的核心代码风格标准，确保代码一致性、可读性和可维护性。

## 目录

- [JavaScript 代码风格](#javascript-代码风格)
- [函数和变量命名](#函数和变量命名)
- [注释和文档](#注释和文档)
- [项目特定规范](#项目特定规范)
- [代码审查检查清单](#代码审查检查清单)

## JavaScript 代码风格

### 1. 基础规范

```javascript
// 使用 const/let 替代 var
const API_URL = 'https://api.example.com';
let currentLanguage = 'zh-CN';

// 使用箭头函数
const updateLanguage = (language) => {
  return language.trim().toLowerCase();
};

// 使用模板字符串
const message = `当前语言设置为: ${language}`;

// 使用 async/await
const fetchData = async () => {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('请求失败:', error);
  }
};
```

### 2. 错误处理

```javascript
// 异步函数必须有错误处理
const sendMessage = async (data) => {
  try {
    const response = await chrome.runtime.sendMessage(data);
    return response;
  } catch (error) {
    console.error('消息发送失败:', error);
    throw error;
  }
};

// Promise 链式调用必须有 catch
chrome.runtime.sendMessage(data)
  .then(response => {
    console.log('消息发送成功:', response);
  })
  .catch(error => {
    console.error('消息发送失败:', error);
  });
```

### 3. 早期返回模式

```javascript
const validateLanguage = (language) => {
  // 早期返回，减少嵌套
  if (!language) return false;
  if (typeof language !== 'string') return false;
  if (language.length < 2) return false;

  // 主要逻辑
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(language);
};
```

## 函数和变量命名

### 1. 命名约定

```javascript
// 常量：大写字母 + 下划线
const DEFAULT_LANGUAGE = 'zh-CN';
const MAX_RETRY_ATTEMPTS = 3;

// 变量和函数：驼峰命名法
const currentLanguage = 'zh-CN';
const isAutoSwitchEnabled = true;

// 函数：动词开头，描述性命名
const updateHeaderRules = (language) => { /* ... */ };
const validateAcceptLanguage = (header) => { /* ... */ };

// 类：帕斯卡命名法
class LanguageManager { /* ... */ }
class DomainRulesManager { /* ... */ }

// 布尔值：使用 is/has/can 前缀
const isEnabled = true;
const hasPermission = false;
const canRetry = true;
```

## 注释和文档

### 1. JSDoc 注释规范

```javascript
/**
 * 更新请求头规则
 * @param {string} language - 语言代码
 * @param {number} retryCount - 重试次数
 * @returns {Promise<Object>} 更新结果
 */
const updateHeaderRules = async (language, retryCount = 0) => {
  // 实现
};

/**
 * 语言管理器类
 * 负责处理语言切换和规则管理
 */
class LanguageManager {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    // 实现
  }
}
```

### 2. 行内注释

```javascript
const updateHeaderRules = async (language) => {
  // 清理并验证语言代码
  language = language ? language.trim() : DEFAULT_LANGUAGE;

  // 检查是否需要更新
  if (language === lastAppliedLanguage) {
    return { status: 'cached', language };
  }

  try {
    // 获取现有规则
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    // 更新规则
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [buildLanguageRule(language)]
    });

    return { status: 'success', language };
  } catch (error) {
    // 错误处理
    return handleRuleUpdateError(error, language);
  }
};
```

## 项目特定规范

### 1. 国际化 (i18n) 使用

```javascript
// ✅ 推荐：使用国际化函数
const message = backgroundI18n.t('rules_updated_successfully', { language });
sendDebugLog(debugI18n.t('update_check_failed'), 'error');

// ❌ 避免：硬编码文本
const message = '规则更新成功: ' + language; // ❌
```

### 2. Chrome Extension API 使用

```javascript
// 推荐：直接使用 Promise 风格
const getChromeStorageData = async (keys) => {
  return await chrome.storage.local.get(keys);
};

// 事件监听器
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.type === 'UPDATE_RULES') {
    handleUpdateRules(request, sendResponse);
  }
  return true; // 保持消息通道开放
});
```

### 3. 调试日志规范

```javascript
// 使用统一的日志函数
sendDebugLog('操作开始', 'info');
sendDebugLog('操作成功完成', 'success');
sendDebugLog('发现潜在问题', 'warning');
sendDebugLog('操作失败', 'error');
```

## 代码审查检查清单

在提交代码前，请确保：

### ✅ 基本检查
- [ ] 使用 `const`/`let` 替代 `var`
- [ ] 使用箭头函数和模板字符串
- [ ] 异步操作有 try-catch 块
- [ ] 移除未使用的变量和参数

### ✅ 函数和命名
- [ ] 函数名清晰描述功能
- [ ] 变量名使用驼峰命名法
- [ ] 常量使用大写字母和下划线
- [ ] 布尔值使用 is/has/can 前缀

### ✅ 注释和文档
- [ ] 复杂函数有 JSDoc 注释
- [ ] 关键逻辑有行内注释
- [ ] 注释使用中文且简洁明了

### ✅ 项目特定
- [ ] 使用国际化函数而非硬编码文本
- [ ] Chrome API 调用有适当的错误处理
- [ ] 调试日志使用统一的格式

---

## 更新历史

- **v1.8.52**: 初始版本，基于项目代码风格统一工作总结
- **v1.8.57**: 主要函数类型部分注释优化，添加异步方法推荐实现指南
- **v1.8.58**: 统一并完善错误处理实现指南、基本检查
- **v1.8.59**: 完善提示
- **v1.8.60**: 修改部分注释 
---

*本指南是活文档，会随着项目的发展而持续更新。如有建议或问题，请提交 Issue 或 Pull Request。*