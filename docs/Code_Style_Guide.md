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

### 3. 通用函数设计原则（主函数+具体函数模式）

当多个函数有相似的处理逻辑时，应该提取出一个通用的主函数，然后用多个具体函数来调用它。这种模式遵循DRY原则，提高代码的可维护性和一致性。

#### ✅ 推荐做法：通用操作处理函数

```javascript
/**
 * 通用操作处理函数模板
 * @param {string} operationType - 操作类型标识
 * @param {string} successMessageKey - 成功消息的翻译键
 * @param {Object} options - 可选配置项
 * @param {Function} options.preProcess - 操作前的预处理函数
 * @param {Function} options.postProcess - 操作后的后处理函数
 * @param {string} options.resultElementId - 结果显示元素ID
 * @param {string} options.logPrefix - 日志前缀
 */
const handleGenericOperation = async (operationType, successMessageKey, options = {}) => {
  const {
    preProcess = null,
    postProcess = null,
    resultElementId = 'operationResult',
    logPrefix = 'Operation'
  } = options;

  const resultElement = document.getElementById(resultElementId);
  
  try {
    // 预处理步骤
    if (preProcess && typeof preProcess === 'function') {
      await preProcess();
    }

    // 执行主要操作
    const response = await chrome.runtime.sendMessage({ type: operationType });
    
    // 早期返回模式，避免深层嵌套
    if (!response || !response.success) {
      setSafeErrorMessage(resultElement, `${debugI18n.t('operation_failed')}: ${response?.error || 'Unknown error'}`);
      return;
    }

    // 后处理步骤
    if (postProcess && typeof postProcess === 'function') {
      await postProcess(response);
    }

    // 显示成功消息
    const successMessage = debugI18n.t(successMessageKey);
    setSafeSuccessMessage(resultElement, successMessage);
    console.log(`[${logPrefix}] ${successMessage}`);

    return response;

  } catch (error) {
    setSafeErrorMessage(resultElement, `${debugI18n.t('operation_failed')}: ${error.message}`);
    console.error(`[${logPrefix}] ${debugI18n.t('operation_failed')}: ${error.message}`);
    throw error;
  }
};
```

#### 应用示例1：缓存管理操作

```javascript
// 缓存操作的具体实现
const handleCacheOperation = async (messageType, successMessageKey, additionalCallback = null) => {
  return handleGenericOperation(messageType, successMessageKey, {
    postProcess: async (response) => {
      // 更新缓存统计显示
      if (response.stats) {
        updateCacheStatsDisplay(response.stats);
      }
      // 执行额外回调
      if (additionalCallback && typeof additionalCallback === 'function') {
        additionalCallback();
      }
    },
    resultElementId: 'cacheOperationResult',
    logPrefix: 'Cache'
  });
};

// 具体的缓存管理函数 - 简洁明了
const refreshCacheStats = async () => {
  return handleCacheOperation('GET_CACHE_STATS', 'cache_stats_refreshed', () => {
    updatePreloadStatus();
  });
};

const clearDomainCache = async () => {
  return handleCacheOperation('CLEAR_DOMAIN_CACHE', 'domain_cache_cleared');
};

const clearAllCache = async () => {
  return handleCacheOperation('CLEAR_ALL_CACHE', 'all_cache_cleared');
};

const resetCacheStats = async () => {
  return handleCacheOperation('RESET_CACHE_STATS', 'cache_stats_reset');
};
```

#### 应用示例2：规则管理操作

```javascript
// 规则操作的具体实现
const handleRuleOperation = async (messageType, successMessageKey, ruleData = null) => {
  return handleGenericOperation(messageType, successMessageKey, {
    preProcess: async () => {
      // 验证规则数据
      if (ruleData && !validateRuleData(ruleData)) {
        throw new Error('Invalid rule data');
      }
    },
    postProcess: async (response) => {
      // 更新规则显示
      if (response.rules) {
        updateRulesDisplay(response.rules);
      }
      // 刷新规则统计
      refreshRuleStats();
    },
    resultElementId: 'ruleOperationResult',
    logPrefix: 'Rule'
  });
};

// 具体的规则管理函数
const addDomainRule = async (domain, language) => {
  return handleRuleOperation('ADD_DOMAIN_RULE', 'rule_added_success', { domain, language });
};

const removeDomainRule = async (domain) => {
  return handleRuleOperation('REMOVE_DOMAIN_RULE', 'rule_removed_success', { domain });
};

const updateDomainRule = async (domain, newLanguage) => {
  return handleRuleOperation('UPDATE_DOMAIN_RULE', 'rule_updated_success', { domain, language: newLanguage });
};
```

#### 应用示例3：语言切换操作

```javascript
// 语言切换操作的具体实现
const handleLanguageOperation = async (messageType, successMessageKey, languageData = null) => {
  return handleGenericOperation(messageType, successMessageKey, {
    preProcess: async () => {
      // 显示加载状态
      showLoadingState();
      // 验证语言代码
      if (languageData && !validateLanguageCode(languageData.language)) {
        throw new Error('Invalid language code');
      }
    },
    postProcess: async (response) => {
      // 更新UI显示
      updateLanguageDisplay(response.currentLanguage);
      // 更新规则状态
      if (response.rulesApplied) {
        updateRuleStatus(response.rulesApplied);
      }
      // 隐藏加载状态
      hideLoadingState();
    },
    resultElementId: 'languageOperationResult',
    logPrefix: 'Language'
  });
};

// 具体的语言切换函数
const switchToLanguage = async (language) => {
  return handleLanguageOperation('SWITCH_LANGUAGE', 'language_switched_success', { language });
};

const resetToDefaultLanguage = async () => {
  return handleLanguageOperation('RESET_LANGUAGE', 'language_reset_success');
};

const applyCustomLanguage = async (customLanguageString) => {
  return handleLanguageOperation('APPLY_CUSTOM_LANGUAGE', 'custom_language_applied', { 
    language: customLanguageString 
  });
};
```

#### ❌ 避免的做法：重复代码

```javascript
// 不要为每个操作重复相同的错误处理和响应逻辑
const clearDomainCacheBad = async () => {
  const resultElement = document.getElementById('cacheOperationResult');
  try {
    const response = await chrome.runtime.sendMessage({ type: 'CLEAR_DOMAIN_CACHE' });
    if (response && response.success) {
      if (response.stats) {
        updateCacheStatsDisplay(response.stats);
      }
      setSafeSuccessMessage(resultElement, debugI18n.t('domain_cache_cleared'));
      console.log(`[Cache] ${debugI18n.t('domain_cache_cleared')}`);
    } else {
      setSafeErrorMessage(resultElement, `${debugI18n.t('cache_operation_failed')}: ${response?.error || 'Unknown error'}`);
    }
  } catch (error) {
    setSafeErrorMessage(resultElement, `${debugI18n.t('cache_operation_failed')}: ${error.message}`);
    console.error(`[Cache] ${debugI18n.t('cache_operation_failed')}: ${error.message}`);
  }
};

const clearAllCacheBad = async () => {
  // 重复相同的逻辑... ❌
};
```

#### 设计原则总结

1. **DRY原则**: 消除重复代码，提取共同逻辑
2. **单一职责**: 主函数处理通用逻辑，具体函数处理特定需求
3. **可扩展性**: 通过配置选项支持不同的操作需求
4. **一致性**: 所有相似操作使用统一的处理模式
5. **可维护性**: 修改通用逻辑只需要改一个地方

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

采用早期返回模式，避免深层嵌套的 if-else 链：

```javascript
// ✅ 推荐：早期返回模式
const handleApiError = (error) => {
  const errorMessage = error.message.toLowerCase();

  // 网络错误
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return createErrorInfo('NETWORK_ERROR', 'network_connection_failed', true, 'check_connection');
  }

  // 超时错误
  if (errorMessage.includes('timeout')) {
    return createErrorInfo('TIMEOUT', 'request_timed_out', true, 'try_again');
  }

  // 权限错误
  if (errorMessage.includes('permission')) {
    return createErrorInfo('PERMISSION_ERROR', 'permission_denied', false, 'check_permissions');
  }

  // 默认情况
  return createErrorInfo('UNKNOWN_ERROR', 'unexpected_error', false, 'contact_support');
};

// ❌ 避免：深层嵌套
const handleApiErrorBad = (error) => {
  if (error.message.includes('network')) {
    if (error.code === 'NETWORK_ERROR') {
      if (retryCount < maxRetries) {
        // 深层嵌套逻辑
      } else {
        // 更深的嵌套
      }
    } else {
      // 继续嵌套
    }
  } else {
    // 更多嵌套
  }
};
```

### 2. 模块化重试逻辑

将复杂的重试逻辑拆分为专门的辅助方法：

```javascript
// 主要重试方法 - 简洁清晰
const fetchWithRetry = async (url, options = {}, signal = null) => {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // 检查取消状态
      if (signal?.aborted) {
        throw new Error('Request was cancelled');
      }

      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      lastError = error;

      // 如果请求被取消，不要重试
      if (isCancelledError(error)) {
        throw error;
      }

      // 处理重试逻辑
      const shouldRetry = shouldRetryError(error, attempt);
      if (!shouldRetry) {
        throw enhanceErrorForFinalFailure(error, attempt);
      }

      // 执行重试延迟
      await executeRetryDelay(error, attempt, signal);
    }
  }

  throw lastError;
};

// 辅助方法
const isCancelledError = (error) => {
  return error.message === 'Request was cancelled' || error.name === 'AbortError';
};

const shouldRetryError = (error, attempt) => {
  // 如果已达到最大尝试次数，不重试
  if (attempt >= MAX_RETRY_ATTEMPTS) {
    return false;
  }

  const errorInfo = handleApiError(error);
  return RETRYABLE_ERRORS.includes(errorInfo.type);
};

const enhanceErrorForFinalFailure = (error, attempt) => {
  const errorInfo = handleApiError(error);
  
  sendDebugLog(`请求失败，已尝试 ${attempt} 次: ${errorInfo.type}`, 'error');

  // 创建增强的错误对象
  const enhancedError = new Error(errorInfo.message);
  enhancedError.type = errorInfo.type;
  enhancedError.originalError = error.message;
  enhancedError.retryable = errorInfo.retryable;
  enhancedError.attempts = attempt;
  enhancedError.fallbackSuggestion = errorInfo.fallbackSuggestion;

  return enhancedError;
};

const executeRetryDelay = async (error, attempt, signal) => {
  const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
  sendDebugLog(`重试延迟 ${delay}ms，第 ${attempt} 次尝试`, 'warning');
  
  await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(resolve, delay);
    
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Request was cancelled'));
      }, { once: true });
    }
  });
};
```

### 3. 错误信息创建和增强

```javascript
// 统一的错误信息创建方法
const createErrorInfo = (errorType, messageKey, retryable, fallbackKey) => {
  const userMessage = getLocalizedText(messageKey);
  const fallbackSuggestion = fallbackKey ? getLocalizedText(fallbackKey) : null;

  // 记录详细错误信息用于调试
  sendDebugLog(`错误类型: ${errorType}`, 'error');

  return {
    type: errorType,
    message: userMessage,
    retryable: retryable,
    fallbackSuggestion: fallbackSuggestion,
    canRetry: retryable && RETRYABLE_ERRORS.includes(errorType)
  };
};
```

### 4. 避免重复处理

**重要原则**：确保同一个错误只被处理一次，避免重复调用错误处理函数。

```javascript
// ❌ 避免：重复调用错误处理函数
const handleRetryLogic = (error, attempt) => {
  const errorInfo1 = handleApiError(error); // 第1次调用
  const shouldRetry = checkRetryability(error, attempt);
  
  if (!shouldRetry) {
    const errorInfo2 = handleApiError(error); // 第2次调用 - 浪费性能
    throw enhanceError(errorInfo2, attempt);
  }
  
  const errorInfo3 = handleApiError(error); // 第3次调用 - 浪费性能
  scheduleRetry(errorInfo3, attempt);
};

// ✅ 推荐：只处理一次，传递结果
const handleRetryLogic = (error, attempt) => {
  // 只调用一次错误处理
  const errorInfo = handleApiError(error);
  
  const shouldRetry = checkRetryability(errorInfo, attempt);
  if (!shouldRetry) {
    throw enhanceError(error, errorInfo, attempt);
  }
  
  scheduleRetry(errorInfo, attempt);
};

// 更新辅助方法签名以接受已处理的错误信息
const checkRetryability = (errorInfo, attempt) => {
  if (attempt >= MAX_ATTEMPTS) return false;
  return RETRYABLE_ERRORS.includes(errorInfo.type);
};

const enhanceError = (originalError, errorInfo, attempt) => {
  const enhancedError = new Error(errorInfo.message);
  enhancedError.type = errorInfo.type;
  enhancedError.originalError = originalError.message;
  enhancedError.attempts = attempt;
  return enhancedError;
};

const scheduleRetry = (errorInfo, attempt) => {
  const delay = BASE_DELAY * Math.pow(2, attempt - 1);
  sendDebugLog(`重试延迟: ${delay}ms, 错误类型: ${errorInfo.type}`, 'warning');
  return new Promise(resolve => setTimeout(resolve, delay));
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

#### 国际化消息同步修改规范

当添加新的翻译键或修改现有翻译时，**必须**同步更新以下文件：

**翻译文件同步：**
```javascript
// 1. 中文翻译文件 (例如: i18n/domain-manager-zh.js)
"new_feature_message": "新功能消息",

// 2. 英文翻译文件 (例如: i18n/domain-manager-en.js)  
"new_feature_message": "New feature message",
```

**文档同步更新清单：**
- ✅ **翻译文件**：同时更新 `-zh.js` 和 `-en.js` 文件
- ✅ **使用指南**：更新 `docs/I18n_Usage_Guide.md` 中的翻译键列表
- ✅ **优化指南**：如涉及性能功能，更新 `docs/Domain_Optimization_Guide.md`
- ✅ **项目Wiki**：如涉及架构变更，更新 `docs/Wiki.md`
- ✅ **更新日志**：在 `docs/Update.md` 中记录变更
- ✅ **TODO清单**：如有未完成功能，更新 `docs/TODO.md`

**检查清单：**
```bash
# 添加新翻译键时的检查步骤
□ 中英文翻译文件都已更新
□ 翻译键命名符合项目规范 (小写+下划线)
□ 参数化翻译使用 {param} 格式
□ 相关文档已同步更新
□ 在代码中正确使用新的翻译键
```

**示例：添加域名匹配优化相关翻译**
```javascript
// ✅ 正确的同步修改流程
// 1. 在 i18n/domain-manager-zh.js 中添加
"cache_preloaded": "缓存预加载完成",

// 2. 在 i18n/domain-manager-en.js 中添加  
"cache_preloaded": "Cache preloaded",

// 3. 在代码中使用
console.log(`${i18n ? i18n.t('cache_preloaded') : 'Cache preloaded'}`);

// 4. 更新 docs/I18n_Usage_Guide.md 中的翻译键列表
// 5. 在 docs/Update.md 中记录此次变更
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
- [ ] 独立函数使用箭头函数语法，类方法使用简写语法
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
- **v1.8.57**: 主要函数类型部分注释优化，添加异步方法推荐实现指南
- **v1.8.58**: 统一并完善错误处理实现指南、基本检查
- **v1.8.59**: 完善提示
- **v1.8.60**: 修改部分注释 
---

*本指南是活文档，会随着项目的发展而持续更新。如有建议或问题，请提交 Issue 或 Pull Request。*