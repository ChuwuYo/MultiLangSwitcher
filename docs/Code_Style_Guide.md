# MultiLangSwitcher 代码风格指南

## 概述

本文档定义了 MultiLangSwitcher 项目的代码风格标准，确保整个项目的代码一致性、可读性和可维护性。所有开发者都应遵循这些规范。

## 目录

- [JavaScript 代码风格](#javascript-代码风格)
- [函数和变量命名](#函数和变量命名)
- [代码结构和组织](#代码结构和组织)
- [注释和文档](#注释和文档)
- [错误处理](#错误处理)
- [性能优化](#性能优化)
- [项目特定规范](#项目特定规范)

## JavaScript 代码风格

### 1. ES6+ 特性使用

#### ✅ 推荐做法

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

// 使用解构赋值
const { currentLanguage, autoSwitchEnabled } = result;

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

#### ❌ 避免的做法

```javascript
// 不要使用 var
var language = 'zh-CN'; // ❌

// 不要使用传统函数声明（除非必要）
function updateLanguage(language) { // ❌
  return language.trim().toLowerCase();
}

// 不要使用字符串拼接
var message = '当前语言设置为: ' + language; // ❌

// 不要使用 Promise.then() 链式调用（优先使用 async/await）
fetch(url).then(response => response.json()).then(data => { // ❌
  // 处理数据
});
```

### 2. 函数声明规范

#### 主要函数类型

```javascript
// 1. 箭头函数（推荐用于独立函数）
const processData = (data) => {
  return data.filter(item => item.active);
};

// 2. 类方法（使用简写语法或箭头函数语法都可以）
class LanguageManager {
  /**
   * 更新语言设置 - 简写语法（推荐）
   * @param {string} language - 语言代码
   */
  updateLanguage(language) {
    this.currentLanguage = language;
  }

  /**
   * 异步方法 - 简写语法（推荐）
   */
  async loadData() {
    // 实现
  }

  // 箭头函数语法也可以，但不是必须的
  // updateLanguage = (language) => {
  //   this.currentLanguage = language;
  // };
}

// 3. 独立的异步函数
const loadTranslations = async (language) => {
  const translations = await import(`./i18n/${language}.js`);
  return translations.default;
};
```

### 3. 早期返回模式

#### ✅ 推荐做法

```javascript
const validateLanguage = (language) => {
  // 早期返回，减少嵌套
  if (!language) {
    console.error('语言代码不能为空');
    return false;
  }
  
  if (typeof language !== 'string') {
    console.error('语言代码必须是字符串');
    return false;
  }
  
  if (language.length < 2) {
    console.error('语言代码长度不能少于2个字符');
    return false;
  }
  
  // 主要逻辑
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(language);
};
```

#### ❌ 避免的做法

```javascript
const validateLanguage = (language) => {
  // 深层嵌套，难以阅读
  if (language) {
    if (typeof language === 'string') {
      if (language.length >= 2) {
        return /^[a-z]{2}(-[A-Z]{2})?$/.test(language);
      } else {
        console.error('语言代码长度不能少于2个字符');
        return false;
      }
    } else {
      console.error('语言代码必须是字符串');
      return false;
    }
  } else {
    console.error('语言代码不能为空');
    return false;
  }
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
const initializeDomainManager = async () => { /* ... */ };

// 类：帕斯卡命名法
class LanguageManager { /* ... */ }
class DomainRulesManager { /* ... */ }

// 私有方法：下划线前缀
class UpdateChecker {
  _validateVersion = (version) => { /* ... */ };
  _handleError = (error) => { /* ... */ };
}
```

### 2. 布尔值命名

```javascript
// 使用 is/has/can/should 前缀
const isEnabled = true;
const hasPermission = false;
const canRetry = true;
const shouldUpdate = false;

// 函数返回布尔值
const isValidLanguage = (language) => { /* ... */ };
const hasRequiredPermissions = () => { /* ... */ };
```

## 代码结构和组织

### 1. 文件结构

```javascript
// 1. 导入语句
importScripts('shared/shared-utils.js');
importScripts('shared/shared-i18n-base.js');

// 2. 常量定义
const RULE_ID = 1;
const DEFAULT_LANGUAGE = 'zh-CN';

// 3. 工具函数
const sendBackgroundLog = (message, logType = 'info') => {
  // 实现
};

// 4. 主要功能函数
const updateHeaderRules = async (language) => {
  // 实现
};

// 5. 事件监听器
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  // 实现
});
```

### 2. 函数组织

```javascript
// 将复杂函数拆分为多个单一职责的小函数
const processLanguageUpdate = async (language) => {
  const validatedLanguage = validateLanguage(language);
  if (!validatedLanguage) return null;
  
  const rules = await buildLanguageRules(validatedLanguage);
  const result = await applyRules(rules);
  
  return result;
};

const validateLanguage = (language) => {
  // 验证逻辑
};

const buildLanguageRules = (language) => {
  // 构建规则逻辑
};

const applyRules = (rules) => {
  // 应用规则逻辑
};
```

## 注释和文档

### 1. JSDoc 注释规范

```javascript
/**
 * 更新请求头规则，支持错误重试和规则缓存
 * @param {string} language - 要设置的语言代码
 * @param {number} retryCount - 当前重试次数
 * @param {boolean} isAutoSwitch - 是否由自动切换触发
 * @returns {Promise<Object>} 更新结果 {status: string, language: string}
 * @throws {Error} 当规则更新失败时抛出错误
 */
const updateHeaderRules = async (language, retryCount = 0, isAutoSwitch = false) => {
  // 实现
};

/**
 * 语言管理器类
 * 负责处理语言切换、规则管理和状态同步
 */
class LanguageManager {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {string} options.defaultLanguage - 默认语言
   * @param {boolean} options.autoSwitch - 是否启用自动切换
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
  language = language ? language.trim() : DEFAULT_LANG_EN;
  
  // 检查是否需要更新（避免重复操作）
  if (language === lastAppliedLanguage && rulesCache) {
    return { status: 'cached', language };
  }

  try {
    // 获取现有规则进行比较
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    
    // 先清理所有现有规则，再添加新规则
    await clearAllDynamicRules();
    
    // 添加新的语言规则
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [buildLanguageRule(language)]
    });
    
    return { status: 'success', language };
  } catch (error) {
    // 错误处理和重试逻辑
    return handleRuleUpdateError(error, language);
  }
};
```

### 3. 中文注释规范

```javascript
// ✅ 推荐：简洁明了的中文注释
// 初始化域名规则管理器
const initDomainManager = async () => { /* ... */ };

// 处理用户语言切换请求
const handleLanguageSwitch = (language) => { /* ... */ };

// ❌ 避免：过于冗长或不必要的注释
// 这个函数用来初始化域名规则管理器，它会加载所有的域名规则并进行初始化操作
const initDomainManager = async () => { /* ... */ };
```

## 错误处理

### 1. 统一错误处理模式

```javascript
const fetchWithRetry = async (url, options = {}, retryCount = 0) => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    // 记录错误日志
    sendDebugLog(`请求失败: ${error.message}`, 'error');
    
    // 重试逻辑
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retryCount + 1);
    }
    
    // 重新抛出错误供上层处理
    throw error;
  }
};
```

### 2. 错误分类和处理

```javascript
const handleRuleUpdateError = async (error, language, retryCount) => {
  // 错误分类
  let errorType = 'unknown';
  let canRetry = true;

  if (error.message.includes('quota')) {
    errorType = 'quota_exceeded';
    canRetry = false;
  } else if (error.message.includes('permission')) {
    errorType = 'permission_denied';
    canRetry = false;
  } else if (error.message.includes('network')) {
    errorType = 'network_error';
  }

  // 创建增强的错误对象
  const enhancedError = new Error(`规则更新失败 (${errorType}): ${error.message}`);
  enhancedError.originalError = error;
  enhancedError.type = errorType;
  enhancedError.canRetry = canRetry;
  enhancedError.retryCount = retryCount;

  return enhancedError;
};
```

## 性能优化

### 1. DOM 操作优化

```javascript
// 批量 DOM 更新
let pendingDOMUpdates = [];
let domUpdateScheduled = false;

const scheduleDOMUpdate = (updateFn) => {
  pendingDOMUpdates.push(updateFn);
  
  if (!domUpdateScheduled) {
    domUpdateScheduled = true;
    requestAnimationFrame(processPendingDOMUpdates);
  }
};

const processPendingDOMUpdates = () => {
  const updates = pendingDOMUpdates.splice(0);
  updates.forEach(updateFn => {
    try {
      updateFn();
    } catch (error) {
      console.error('DOM 更新失败:', error);
    }
  });
  domUpdateScheduled = false;
};
```

### 2. 缓存和防抖

```javascript
// DOM 元素缓存
const domCache = {
  languageSelect: null,
  applyButton: null,
  currentLanguageSpan: null
};

const initializeDOMCache = () => {
  domCache.languageSelect = document.getElementById('languageSelect');
  domCache.applyButton = document.getElementById('applyButton');
  domCache.currentLanguageSpan = document.getElementById('currentLanguage');
};

// 防抖函数
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

const debouncedUpdateCheck = debounce(performUpdateCheck, 1000);
```

## 项目特定规范

### 1. 国际化 (i18n) 使用

```javascript
// ✅ 推荐：使用国际化函数
const message = backgroundI18n.t('rules_updated_successfully', { language });
sendDebugLog(debugI18n.t('update_check_failed'), 'error');

// ❌ 避免：硬编码文本
const message = '规则更新成功: ' + language; // ❌
sendDebugLog('更新检查失败', 'error'); // ❌
```

### 2. Chrome Extension API 使用

```javascript
// 使用 Promise 包装 Chrome API
const getChromeStorageData = (keys) => {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
};

// 事件监听器参数处理
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  // 使用 _ 替代未使用的 sender 参数
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

// 包含上下文信息
sendDebugLog(`语言切换: ${oldLang} -> ${newLang}`, 'info');
sendDebugLog(`规则更新失败: ${error.message}`, 'error');
```

## 代码审查检查清单

在提交代码前，请确保：

### ✅ 基本检查
- [ ] 使用 `const`/`let` 替代 `var`
- [ ] 函数使用箭头函数语法
- [ ] 使用模板字符串替代字符串拼接
- [ ] 应用早期返回模式减少嵌套
- [ ] 移除未使用的变量和参数

### ✅ 函数和命名
- [ ] 函数名清晰描述其功能
- [ ] 变量名使用驼峰命名法
- [ ] 常量使用大写字母和下划线
- [ ] 布尔值使用 is/has/can 前缀

### ✅ 注释和文档
- [ ] 复杂函数有 JSDoc 注释
- [ ] 关键逻辑有行内注释
- [ ] 注释使用中文且简洁明了

### ✅ 错误处理
- [ ] 异步操作有 try-catch 块
- [ ] 错误信息有意义且可调试
- [ ] 适当的错误重试机制

### ✅ 性能优化
- [ ] DOM 操作进行了批量处理
- [ ] 频繁调用的函数进行了防抖
- [ ] 重复使用的 DOM 元素进行了缓存

### ✅ 项目特定
- [ ] 使用国际化函数而非硬编码文本
- [ ] Chrome API 调用有适当的错误处理
- [ ] 调试日志使用统一的格式

## 工具和配置

### 推荐的开发工具
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **JSDoc**: 文档生成
- **Chrome DevTools**: 调试和性能分析

### VS Code 推荐插件
- ESLint
- Prettier
- JavaScript (ES6) code snippets
- Auto Rename Tag
- Bracket Pair Colorizer

---

## 更新历史

- **v1.8.52**: 初始版本，基于项目代码风格统一工作总结
- 后续版本将根据项目发展需要更新此指南

---

*本指南是活文档，会随着项目的发展而持续更新。如有建议或问题，请提交 Issue 或 Pull Request。*