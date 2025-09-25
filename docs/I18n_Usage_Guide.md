# 国际化系统使用指南

## 概述

MultiLangSwitcher 采用一种 **混合国际化策略**，结合了标准的 Chrome 扩展 i18n API 和一个自定义的模块化 i18n 系统。这种设计旨在兼顾 `manifest.json` 的静态国际化需求和应用内部动态内容的复杂翻译场景。

- **标准 Chrome i18n (`_locales`)**: 主要用于 `manifest.json` 中的静态文本，如扩展描述。
- **自定义 i18n 系统 (`BaseI18n`)**: 基于 `BaseI18n` 基础类构建，用于所有 JavaScript 驱动的 UI 文本和动态消息。系统支持中英文双语，具备自动语言检测、智能回退机制和高性能缓存优化。

## 混合国际化策略

为了平衡不同场景下的需求，系统采用了两种国际化方案。

### 1. 标准 Chrome i18n API (`_locales`)

此方案用于处理 `manifest.json` 文件中的静态文本，这是 Chrome 扩展的标准实践。

- **文件结构**:
  ```
  _locales/
  ├── en/
  │   └── messages.json
  └── zh/
      └── messages.json
  ```

- **使用示例 (`manifest.json`)**:
  ```json
  {
    "name": "MultiLangSwitcher",
    "description": "__MSG_extension_description__",
    "default_locale": "zh"
  }
  ```

- **翻译文件 (`_locales/en/messages.json`)**:
  ```json
  {
    "extension_description": {
      "message": "Quickly switch the Accept-Language request header..."
    }
  }
  ```
  `__MSG_extension_description__` 会被浏览器根据用户的语言设置自动替换为 `messages.json` 中对应的值。

### 2. 自定义 `BaseI18n` 系统

这是项目中的主要 i18n 系统，专为 JavaScript 中的动态内容设计。它提供了更灵活的控制和更丰富的功能。

- **核心**: `shared/shared-i18n-base.js`
- **特点**: 模块化、环境自适应、高性能、支持参数和回退。
- **应用场景**: 弹窗 (Popup)、调试页面、后台脚本日志等所有需要通过 JavaScript 操作的文本内容。

**本指南的后续部分将重点介绍自定义 `BaseI18n` 系统的使用方法。**

## 文件结构

```
shared/
├── shared-i18n-base.js          # 基础国际化类（重构优化）
├── shared-utils.js               # 包含语言检测\fallback系统等工具函数
└── ...

i18n/
├── background-i18n.js            # 后台脚本国际化类
├── popup-i18n.js                # 弹窗页面国际化类
├── debug-i18n.js                # 调试页面国际化类
├── detect-i18n.js               # 检测页面国际化类
├── domain-manager-i18n.js       # 域名管理器国际化类
├── background-en.js              # 后台脚本英文翻译
├── background-zh.js              # 后台脚本中文翻译
├── popup-en.js                   # 弹窗页面英文翻译
├── popup-zh.js                   # 弹窗页面中文翻译
├── debug-en.js                   # 调试页面英文翻译
├── debug-zh.js                   # 调试页面中文翻译
├── detect-en.js                  # 检测页面英文翻译
├── detect-zh.js                  # 检测页面中文翻译
├── domain-manager-en.js          # 域名管理器英文翻译
└── domain-manager-zh.js          # 域名管理器中文翻译
```

## 核心特性

### 🌐 **翻译功能**
1. **自动语言检测**: 优先使用保存的语言设置，然后检测浏览器语言
2. **智能回退机制**: 如果当前语言的翻译不存在，自动回退到英文
3. **参数替换**: 支持在翻译文本中使用 `{param}` 占位符进行动态替换
4. **DOM自动翻译**: 页面加载完成后自动应用翻译到DOM元素

### ⚡ **性能优化**
1. **预加载支持**: 支持翻译文件预加载，减少首次翻译延迟
2. **异步加载**: 支持动态加载翻译文件，提高页面加载性能
3. **缓存机制**: 翻译对象缓存，避免重复加载
4. **早期返回**: 优化的代码逻辑，减少不必要的计算

### 🔧 **环境适配**
1. **双环境支持**: 自动适配Service Worker和浏览器环境
2. **同步/异步加载**: Service Worker使用同步加载，浏览器使用异步加载
3. **全局作用域适配**: 智能检测并使用正确的全局作用域对象
4. **API兼容性**: 兼容不同浏览器的API差异

### 🛡️ **稳定性保障**
1. **防重复声明**: 所有翻译文件支持安全的多次加载
2. **错误容错**: 完善的错误处理和回退机制
3. **类型安全**: 翻译对象存在性检查，避免运行时错误
4. **超时处理**: 动态加载脚本的超时保护机制

## 在HTML文件中的使用方法

### 1. 弹窗页面 (popup.html)

```html
<!DOCTYPE html>
<html>
<head>
    <!-- 页面头部内容 -->
</head>
<body>
    <!-- 页面内容 -->
    
    <!-- 共享工具脚本 - 按正确顺序加载 -->
    <script src="shared/shared-utils.js"></script>
    <script src="shared/shared-i18n-base.js"></script>
    <script src="shared/shared-language-options.js"></script>
    <script src="shared/shared-actions.js"></script>
    <script src="shared/shared-update-checker.js"></script>
    
    <!-- 预加载翻译文件以避免延迟 -->
    <script src="i18n/popup-en.js"></script>
    <script src="i18n/popup-zh.js"></script>
    <script src="i18n/popup-i18n.js"></script>
    
    <!-- 主要功能脚本 -->
    <script src="popup.js"></script>
    <script type="module" src="toggle.js"></script>
</body>
</html>
```

### 2. 调试页面 (debug.html)

```html
<!DOCTYPE html>
<html>
<head>
    <!-- 页面头部内容 -->
</head>
<body>
    <!-- 页面内容 -->
    
    <!-- 按正确顺序加载脚本 -->
    <script src="shared/shared-utils.js"></script>
    <script src="shared/shared-i18n-base.js"></script>
    <script src="shared/shared-language-options.js"></script>
    <script src="shared/shared-actions.js"></script>
    
    <!-- 预加载翻译文件 -->
    <script src="i18n/debug-en.js"></script>
    <script src="i18n/debug-zh.js"></script>
    <script src="i18n/debug-i18n.js"></script>
    <script src="debug-headers.js"></script>
    <script src="debug-ui.js"></script>
    <script type="module" src="toggle.js"></script>
</body>
</html>
```

### 3. 检测页面 (detect.html)

```html
<!DOCTYPE html>
<html>
<head>
    <!-- 页面头部内容 -->
</head>
<body>
    <!-- 页面内容 -->
    
    <!-- 按正确顺序加载脚本 -->
    <script src="shared/shared-utils.js"></script>
    <script src="shared/shared-i18n-base.js"></script>
    
    <!-- 预加载翻译文件 -->
    <script src="i18n/detect-en.js"></script>
    <script src="i18n/detect-zh.js"></script>
    <script src="i18n/detect-i18n.js"></script>
    <script src="detect.js"></script>
    <script type="module" src="toggle.js"></script>
</body>
</html>
```

## Service Worker中的使用方法

### background.js

```javascript
// 在Service Worker中，使用importScripts按正确顺序加载依赖
// 1. 首先导入共享工具（包含 detectBrowserLanguage 函数）
importScripts('shared/shared-utils.js');
// 2. 然后导入基础国际化类
importScripts('shared/shared-i18n-base.js');
// 3. 导入具体的国际化类
importScripts('i18n/background-i18n.js');
importScripts('i18n/domain-manager-i18n.js');
// 4. 导入域名规则管理器
importScripts('domain-rules-manager.js');
// 5. 导入更新检查器
importScripts('shared/shared-update-checker.js');

// 现在可以使用国际化实例
console.log(backgroundI18n.t('domain_rules_loaded'));
console.log(domainManagerI18n.t('trying_load_rules_file'));
```

**重要提示**：在Service Worker环境中，各个i18n类文件（如`background-i18n.js`）不应该再次导入`shared-i18n-base.js`，因为它已经在主文件中导入了。

## 使用方式

### 基本用法

```javascript
// 所有i18n实例都会自动创建并初始化
// 例如：popupI18n, debugI18n, detectI18n, backgroundI18n, domainManagerI18n

// 翻译文本
const text = popupI18n.t('extension_name');

// 带参数的翻译
const message = backgroundI18n.t('update_available', { version: '1.2.3' });

// 等待翻译系统准备就绪
popupI18n.ready(() => {
    // 翻译系统已准备就绪，可以安全使用
    console.log(popupI18n.t('ready_message'));
});
```

### 域名管理器国际化

域名管理器具有专门的国际化支持，用于域名匹配算法的调试日志：

```javascript
// 在 domain-rules-manager.js 中的使用示例
const i18n = this.ensureI18n(); // 获取domainManagerI18n实例

// 基础翻译
console.log(`[DomainRulesManager] ${i18n ? i18n.t('searching_domain') : 'Searching domain'}: ${domain}`);

// 带参数的翻译
console.log(`[DomainRulesManager] ${i18n ? i18n.t('domain_rules_loaded_count', { count: ruleCount }) : `Loaded ${ruleCount} rules`}`);

// 缓存相关翻译
console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_cache') : 'Found in cache'}: ${domain}`);
```

**域名管理器支持的翻译键：**
- `searching_domain` - 查找域名
- `found_in_cache` - 在缓存中找到
- 更多翻译键请参考 `i18n/domain-manager-zh.js` 和 `i18n/domain-manager-en.js`

### 高级用法

```javascript
// 切换语言
popupI18n.switchLanguage('zh');

// 检查是否已准备就绪
if (popupI18n.isReady) {
    // 可以直接使用翻译
    const text = popupI18n.t('welcome_message');
}

// 获取当前语言
console.log(popupI18n.currentLang); // 'en' 或 'zh'

// 错误处理和回退机制
const safeTranslation = (key, fallback = key) => {
    try {
        return popupI18n.t(key) || fallback;
    } catch (error) {
        console.warn(`Translation failed for key: ${key}`, error);
        return fallback;
    }
};
```

### 性能优化最佳实践

#### 1. 预加载翻译文件
```html
<!-- 在HTML中预加载翻译文件，减少首次翻译延迟 -->
<script src="i18n/popup-en.js"></script>
<script src="i18n/popup-zh.js"></script>
<script src="i18n/popup-i18n.js"></script>
```

#### 2. 批量翻译DOM元素
```javascript
// 等待翻译系统准备就绪后批量处理
popupI18n.ready(() => {
    // 批量翻译所有带有data-i18n属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = popupI18n.t(key);
    });
});
```

#### 3. 缓存翻译结果
```javascript
// 对于频繁使用的翻译，可以缓存结果
const translationCache = new Map();

const getCachedTranslation = (key) => {
    if (translationCache.has(key)) {
        return translationCache.get(key);
    }
    
    const translation = popupI18n.t(key);
    translationCache.set(key, translation);
    return translation;
};
```

## 类继承结构

```
BaseI18n (基础类 - 重构优化)
├── BackgroundI18n (Service Worker环境)
├── PopupI18n (弹窗页面)
├── DebugI18n (调试页面)
├── DetectI18n (检测页面)
└── DomainManagerI18n (域名管理器，Service Worker环境)
```

## 重构改进详情

### 🔄 **代码结构优化**

#### 1. **减少嵌套层级**
```javascript
// 重构前：深层嵌套
detectLanguage() {
  try {
    if (!this.isServiceWorker && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('app-lang');
      if (saved) {
        this.currentLang = saved;
        return;
      }
    }
    if (typeof detectBrowserLanguage === 'function') {
      // ...更多嵌套
    } else {
      if (typeof chrome !== 'undefined' && chrome.i18n) {
        // ...更多嵌套
      }
    }
  } catch (error) {
    // ...
  }
}

// 重构后：清晰的早期返回
detectLanguage() {
  try {
    const savedLang = this.getSavedLanguage();
    if (savedLang) {
      this.currentLang = savedLang;
      return;
    }

    if (typeof detectBrowserLanguage === 'function') {
      const detectedLang = detectBrowserLanguage();
      this.currentLang = detectedLang.startsWith('zh') ? 'zh' : 'en';
      return;
    }

    this.currentLang = this.detectSystemLanguage();
  } catch (error) {
    this.currentLang = 'en';
  }
}
```

#### 2. **提取的工具方法**
- `getSavedLanguage()` - 获取保存的语言设置
- `detectSystemLanguage()` - 检测系统语言
- `getGlobalScope()` - 获取全局作用域对象
- `markAsReady()` - 标记为就绪状态
- `executeReadyCallbacks()` - 执行回调函数
- `getExpectedTranslationVariable()` - 获取期望的翻译变量名
- `loadScriptDynamically()` - 动态加载脚本
- `getEnglishTranslationsFromGlobal()` - 获取英文翻译对象

#### 3. **防重复声明机制**
```javascript
// 所有翻译文件现在使用安全的条件声明
if (typeof popupEn === 'undefined') {
  var popupEn = {
    // 翻译内容
    "key": "value",
    // ...
  };
}
```


## 统一的脚本加载顺序

现在所有HTML文件都遵循统一的加载顺序：

```html
<!-- 1. 基础工具函数 -->
<script src="shared/shared-utils.js"></script>

<!-- 2. 基础国际化类 -->
<script src="shared/shared-i18n-base.js"></script>

<!-- 3. 其他共享工具 -->
<script src="shared/shared-language-options.js"></script>
<script src="shared/shared-actions.js"></script>

<!-- 4. 预加载翻译文件（提高性能） -->
<script src="i18n/[component]-en.js"></script>
<script src="i18n/[component]-zh.js"></script>

<!-- 5. 具体的国际化类 -->
<script src="i18n/[component]-i18n.js"></script>

<!-- 6. 页面功能脚本 -->
<script src="[component].js"></script>
```

## 注意事项

### ⚠️ **重要提醒**

1. **加载顺序很重要**: 必须先加载 `shared-utils.js` 和 `shared-i18n-base.js`，再加载具体的i18n类
2. **预加载翻译文件**: 为了提高性能，建议预加载翻译文件
3. **Service Worker限制**: 在Service Worker中只能使用 `importScripts`，不能使用动态script标签
4. **DOM准备**: 确保在DOM加载完成后再使用需要操作DOM的翻译功能
5. **防重复声明**: 翻译文件现在支持安全的多次加载，不会出现重复声明错误
6. **右键菜单文本**: 当前版本中，通过 `background.js` 创建的右键菜单项（如 "Detection Page"）的标题是硬编码的英文字符串，未纳入国际化系统。

### 🔧 **故障排除**

如果遇到问题，请检查：

1. **脚本加载顺序**：确保按照文档中的顺序加载脚本
2. **翻译文件存在**：确保对应的翻译文件存在且可访问
3. **控制台错误**：查看浏览器控制台是否有错误信息
4. **Service Worker状态**：确保Service Worker正常启动

## 迁移指南

如果你有现有的代码使用旧的i18n系统，需要：

1. **更新HTML文件**：按照新的脚本引用顺序更新HTML文件
2. **等待系统就绪**：确保在使用翻译功能前等待系统准备就绪
3. **检查直接访问**：检查是否有直接访问翻译对象的代码，改为使用 `t()` 方法
4. **测试所有页面**：确保所有页面的翻译功能正常工作

## 完整的系统架构

```
浏览器环境 (HTML文件)
├── shared-utils.js (工具函数)
├── shared-i18n-base.js (基础类 - 重构优化)
├── [component]-en.js (英文翻译 - 防重复声明)
├── [component]-zh.js (中文翻译 - 防重复声明)
├── [component]-i18n.js (继承BaseI18n)
└── [component].js (使用翻译功能)

Service Worker环境 (background.js)
├── shared-utils.js (工具函数)
├── shared-i18n-base.js (基础类 - 重构优化)
├── background-i18n.js (继承BaseI18n)
├── domain-manager-i18n.js (继承BaseI18n)
└── 其他功能模块
```

## 实际应用示例

### 域名管理器集成示例

域名匹配算法优化中的国际化集成：

```javascript
// domain-rules-manager.js 中的实际使用
class DomainRulesManager {
  constructor() {
    this.i18n = null; // 延迟初始化
  }

  // 确保 i18n 已初始化
  ensureI18n() {
    if (!this.i18n && typeof domainManagerI18n !== 'undefined') {
      this.i18n = domainManagerI18n;
    }
    return this.i18n;
  }

  async getLanguageForDomain(domain) {
    const i18n = this.ensureI18n();
    
    // 使用国际化的调试日志
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('searching_domain') : 'Searching domain'}: ${domain}`);
    
    // 缓存命中时的国际化消息
    if (this.domainCache.has(domain)) {
      const cachedResult = this.domainCache.get(domain);
      console.log(`[DomainRulesManager] ${i18n ? i18n.t('found_in_cache') : 'Found in cache'}: ${domain}`);
      return cachedResult ? cachedResult.language : null;
    }
    
    // 更多国际化日志...
  }
}
```

### 测试页面集成示例

在 `test-domain-performance.html` 中的使用：

```html
<!-- 加载必要的脚本文件 -->
<script src="shared/shared-i18n-base.js"></script>
<script src="i18n/domain-manager-zh.js"></script>
<script src="i18n/domain-manager-en.js"></script>
<script src="i18n/domain-manager-i18n.js"></script>
<script src="domain-rules-manager.js"></script>

<script>
// 检查国际化系统是否正常工作
function checkI18nAvailability() {
    if (typeof domainManagerI18n === 'undefined') {
        console.error('域名管理器国际化系统未加载');
        return false;
    }
    
    // 测试翻译功能
    const testTranslation = domainManagerI18n.t('searching_domain');
    console.log('测试翻译结果:', testTranslation);
    
    return true;
}
</script>
```

## 开发最佳实践

### 1. 翻译键命名规范

遵循项目的命名约定：

```javascript
// ✅ 推荐：使用下划线分隔的小写命名
"searching_domain": "查找域名",
"found_in_cache": "在缓存中找到",

// ❌ 避免：驼峰命名或其他格式
"searchingDomain": "查找域名",        // 不推荐
"found-in-cache": "在缓存中找到",     // 不推荐
```

### 2. 参数化翻译

对于包含动态内容的翻译：

```javascript
// 翻译文件中定义
"domain_rules_loaded_count": "成功加载 {count} 条域名规则",
"cache_efficiency": "缓存效率: {rate}% ({hits}/{total})",

// 代码中使用
const message = i18n.t('domain_rules_loaded_count', { count: ruleCount });
const efficiency = i18n.t('cache_efficiency', { 
    rate: hitRate, 
    hits: cacheHits, 
    total: totalRequests 
});
```

### 3. 错误处理模式

采用防御性编程：

```javascript
// ✅ 推荐：安全的翻译调用
const safeLog = (key, fallback, ...args) => {
    const i18n = this.ensureI18n();
    const message = i18n ? i18n.t(key) : fallback;
    console.log(`[DomainRulesManager] ${message}`, ...args);
};

// 使用示例
safeLog('searching_domain', 'Searching domain', domain);
```

### 4. 性能考虑

对于高频调用的翻译，建议使用统一的日志函数：

```javascript
// ✅ 推荐：使用统一的日志函数（实际项目中的做法）
const safeLog = (key, fallback, ...args) => {
    const i18n = this.ensureI18n();
    const message = i18n ? i18n.t(key) : fallback;
    console.log(`[DomainRulesManager] ${message}`, ...args);
};

// 实际使用示例（与 domain-rules-manager.js 中的实现一致）
async getLanguageForDomain(domain) {
    const i18n = this.ensureI18n();
    console.log(`[DomainRulesManager] ${i18n ? i18n.t('searching_domain') : 'Searching domain'}: ${domain}`);
    
    // 其他逻辑...
}
```

**注意**：域名管理器已经内置了高效的域名查询缓存机制，无需额外的翻译缓存。

## 相关文档

### 核心文档
- [代码风格指南](./Code_Style_Guide.md) - 包含国际化相关的代码规范
- [项目结构文档](./Project_Structure.md) - 国际化文件的组织结构
- [开发者 Wiki](./Wiki.md) - 项目整体架构和国际化系统概述

### 专项文档
- [域名优化指南](./Domain_Optimization_Guide.md) - 域名管理器国际化的具体应用
- [更新日志](./Update.md) - 国际化系统的版本更新记录

## 故障排除指南

### 常见问题

#### 1. 翻译不显示或显示为键名
**原因**：翻译文件未正确加载或翻译键不存在
**解决方案**：
```javascript
// 检查翻译文件是否加载
console.log('domainManagerZh:', typeof domainManagerZh);
console.log('domainManagerEn:', typeof domainManagerEn);

// 检查国际化实例是否初始化
console.log('domainManagerI18n:', typeof domainManagerI18n);
console.log('domainManagerI18n.isReady:', domainManagerI18n?.isReady);
```

#### 2. Service Worker 中翻译不工作
**原因**：脚本加载顺序错误或缺少必要的导入
**解决方案**：
```javascript
// 确保正确的导入顺序
importScripts('shared/shared-utils.js');
importScripts('shared/shared-i18n-base.js');
importScripts('i18n/domain-manager-en.js');
importScripts('i18n/domain-manager-zh.js');
importScripts('i18n/domain-manager-i18n.js');
```

#### 3. 参数替换不工作
**原因**：参数格式错误或翻译方法调用错误
**解决方案**：
```javascript
// ✅ 正确的参数传递
const message = i18n.t('domain_rules_loaded_count', { count: 100 });

// ❌ 错误的参数格式
const message = i18n.t('domain_rules_loaded_count', 100); // 不会替换参数
```

### 调试技巧

#### 1. 启用详细日志
```javascript
// 在开发环境中启用详细的国际化日志
if (chrome.runtime.getManifest().version.includes('dev')) {
    console.log('I18n Debug Mode Enabled');
    
    // 监控翻译调用
    const originalT = domainManagerI18n.t;
    domainManagerI18n.t = function(key, params) {
        const result = originalT.call(this, key, params);
        console.log(`[I18n] ${key} -> ${result}`, params);
        return result;
    };
}
```

#### 2. 验证翻译完整性
```javascript
// 检查所有翻译键是否存在
const checkTranslationCompleteness = () => {
    const enKeys = Object.keys(domainManagerEn || {});
    const zhKeys = Object.keys(domainManagerZh || {});
    
    const missingInZh = enKeys.filter(key => !zhKeys.includes(key));
    const missingInEn = zhKeys.filter(key => !enKeys.includes(key));
    
    if (missingInZh.length > 0) {
        console.warn('中文翻译中缺失的键:', missingInZh);
    }
    
    if (missingInEn.length > 0) {
        console.warn('英文翻译中缺失的键:', missingInEn);
    }
    
    console.log(`翻译完整性检查完成: EN(${enKeys.length}), ZH(${zhKeys.length})`);
};
```

## 版本更新说明

### 当前版本特性
- **模块化架构**：基于 `BaseI18n` 的继承体系
- **域名管理器集成**：专门的 `DomainManagerI18n` 类
- **性能优化**：预加载和缓存机制
- **错误容错**：完善的回退和错误处理

### 升级指南
如需从旧版本升级，请参考 [迁移指南](#迁移指南) 部分的详细说明。

---

*本指南与项目的代码风格指南和开发者 Wiki 保持同步更新。如有疑问，请参考相关文档或提交 Issue。*