# 国际化系统使用指南

## 概述

已经完成了国际化系统的重大重构，提取了共同的基础类 `BaseI18n`，所有组件的i18n类现在都继承自这个基础类。


## 文件结构

```
shared/
├── shared-i18n-base.js          # 基础国际化类（重构优化）
├── shared-utils.js               # 包含语言检测等工具函数
└── ...

i18n/
├── background-i18n.js            # 后台脚本国际化类
├── popup-i18n.js                # 弹窗页面国际化类
├── debug-i18n.js                # 调试页面国际化类
├── detect-i18n.js               # 检测页面国际化类
├── domain-manager-i18n.js       # 域名管理器国际化类
├── background-en.js              # 后台脚本英文翻译（防重复声明）
├── background-zh.js              # 后台脚本中文翻译（防重复声明）
├── popup-en.js                   # 弹窗页面英文翻译（防重复声明）
├── popup-zh.js                   # 弹窗页面中文翻译（防重复声明）
└── ...
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
    <!-- 按正确顺序加载脚本 -->
    <!-- 1. 基础工具函数 -->
    <script src="shared/shared-utils.js"></script>
    
    <!-- 2. 基础国际化类 -->
    <script src="shared/shared-i18n-base.js"></script>
    
    <!-- 3. 其他共享工具 -->
    <script src="shared/shared-language-options.js"></script>
    <script src="shared/shared-actions.js"></script>
    
    <!-- 4. 预加载翻译文件（提高性能） -->
    <script src="i18n/popup-en.js"></script>
    <script src="i18n/popup-zh.js"></script>
    
    <!-- 5. 具体的国际化类 -->
    <script src="i18n/popup-i18n.js"></script>
</head>
<body>
    <!-- 页面内容 -->
    <script src="popup.js"></script>
</body>
</html>
```

### 2. 调试页面 (debug.html)

```html
<!DOCTYPE html>
<html>
<head>
    <!-- 按正确顺序加载脚本 -->
    <script src="shared/shared-utils.js"></script>
    <script src="shared/shared-i18n-base.js"></script>
    <script src="shared/shared-language-options.js"></script>
    <script src="shared/shared-actions.js"></script>
    
    <!-- 预加载翻译文件 -->
    <script src="i18n/debug-en.js"></script>
    <script src="i18n/debug-zh.js"></script>
    <script src="i18n/debug-i18n.js"></script>
</head>
<body>
    <!-- 页面内容 -->
    <script src="debug-ui.js"></script>
</body>
</html>
```

### 3. 检测页面 (detect.html)

```html
<!DOCTYPE html>
<html>
<head>
    <!-- 按正确顺序加载脚本 -->
    <script src="shared/shared-utils.js"></script>
    <script src="shared/shared-i18n-base.js"></script>
    
    <!-- 预加载翻译文件 -->
    <script src="i18n/detect-en.js"></script>
    <script src="i18n/detect-zh.js"></script>
    <script src="i18n/detect-i18n.js"></script>
</head>
<body>
    <!-- 页面内容 -->
    <script src="detect.js"></script>
</body>
</html>
```

## Service Worker中的使用方法

### background.js

```javascript
// 在Service Worker中，使用importScripts按正确顺序加载依赖
// 1. 首先导入共享工具
importScripts('shared/shared-utils.js');
// 2. 然后导入基础国际化类
importScripts('shared/shared-i18n-base.js');
// 3. 最后导入具体的国际化类（不需要再次导入基础类）
importScripts('i18n/background-i18n.js');
importScripts('i18n/domain-manager-i18n.js');

// 现在可以使用backgroundI18n实例
console.log(backgroundI18n.t('extension_started'));
```

**重要提示**：在Service Worker环境中，各个i18n类文件（如`background-i18n.js`）不应该再次导入`shared-i18n-base.js`，因为它已经在主文件中导入了。

## 使用方式

### 基本用法

```javascript
// 所有i18n实例都会自动创建并初始化
// 例如：popupI18n, debugI18n, detectI18n, backgroundI18n

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

### 高级用法

```javascript
// 切换语言
popupI18n.switchLanguage('zh');

// 检查是否已准备就绪
if (popupI18n.isReady) {
    // 可以直接使用翻译
}

// 获取当前语言
console.log(popupI18n.currentLang); // 'en' 或 'zh'
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

## 示例

完整的使用示例可以参考项目中的 `popup.html`、`debug.html` 和 `detect.html` 文件。