# MultiLangSwitcher 开发者 Wiki

## 概述

MultiLangSwitcher 是一个基于 Chrome Manifest V3 的浏览器扩展，通过动态修改 `Accept-Language` HTTP 请求头来实现网站语言切换功能。本 Wiki 整合了项目的核心架构、技术规范和开发指南。

## 目录

- [产品概述](#产品概述)
- [核心架构](#核心架构)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [代码规范](#代码规范)
- [开发指南](#开发指南)
- [性能要求](#性能要求)
- [相关文档](#相关文档)

## 产品概述

### 核心功能
- **手动语言选择**：通过弹窗界面进行语言切换
- **自定义语言头**：支持自定义 `Accept-Language` 请求头字符串
- **自动域名切换**：基于 TLD 和二级域名的自动语言匹配
- **实时头部验证**：通过 `detect.html` 进行实时请求头验证
- **英文回退机制**：未匹配域名默认使用英文

### 设计原则
- 使用 Manifest V3 最新标准
- 纯 JavaScript/HTML/CSS 实现，无构建系统
- 模块化架构，代码复用性强
- 完整的国际化支持
- 健壮的错误处理和回退机制

## 核心架构

### Service Worker 模式

```
background.js (中央服务工作者)
├── 管理所有扩展逻辑
├── 独占管理 declarativeNetRequest 规则
├── 实现指数退避重试机制
└── 处理基于域名的自动切换
```

**关键要求：**
- `background.js` 是唯一的服务工作者
- 必须独占管理 `declarativeNetRequest` 规则
- 必须实现消息传递机制
- 必须处理标签页监控和自动切换

### Service Worker 初始化与状态管理

为了应对 Service Worker 在 Manifest V3 中随时可能休眠和重启的特性，项目采用了一套健壮的初始化与状态管理机制，确保扩展在任何时候都能正确运行。

**核心原则：**
- **统一初始化入口**：所有与状态恢复相关的逻辑（如扩展安装、浏览器启动、Service Worker 意外重启）都由一个统一的 `initialize` 函数处理，确保行为一致性。
- **懒加载与事件驱动**：初始化并非在脚本加载时立即执行，而是在首次需要访问状态或处理关键事件（如 `onMessage`, `onUpdated`）时通过一个守卫函数 `ensureInitialized` 触发。这避免了不必要的前期工作，并保证了在执行任何操作前，状态一定是就绪的。
- **幂等性**：初始化过程是幂等的，即使被多次调用，也只会有效执行一次，防止了重复操作和状态冲突。

**实现模式：**
```javascript
// background.js

// 全局的初始化Promise，用于防止重复执行
let initializationPromise = null;
// 状态标志，表示初始化是否已完成
let isInitialized = false;

// 守卫函数：在执行任何需要状态的操作前调用
const ensureInitialized = async () => {
 if (!isInitialized) {
   await initialize('lazy'); // 如果未初始化，则触发
 }
};

// 统一的初始化函数
const initialize = (reason) => {
 if (initializationPromise) {
   return initializationPromise; // 如果正在进行中，则返回现有Promise
 }
 
 initializationPromise = (async () => {
   // ...执行所有初始化逻辑...
   isInitialized = true; // 标记为完成
 })();
 
 return initializationPromise;
};

// 在事件监听器中应用守卫
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
 (async () => {
   await ensureInitialized(); // ✅ 确保状态就绪
   // ...处理消息...
 })();
 return true;
});
```

### 组件架构

```
MultiLangSwitcher/
├── 根目录/                    # 主要扩展文件
│   ├── popup.js              # 弹窗界面逻辑
│   ├── debug-ui.js           # 调试界面逻辑
│   └── background.js         # 后台服务工作者
├── /shared/                  # 共享工具库（必须使用）
│   ├── shared-utils.js       # 日志、语言检测、回退翻译系统
│   ├── shared-actions.js     # 消息传递常量
│   ├── shared-language-options.js  # 语言选项工具
│   ├── shared-update-checker.js    # 更新检查功能
│   └── shared-i18n-base.js   # 基础国际化功能
├── /i18n/                    # 国际化系统
│   ├── {component}-{lang}.js # 翻译文件
│   └── {component}-i18n.js   # 国际化类定义
└── domain-rules-manager.js   # 域名规则管理
```

## 技术栈

### 必需技术
- **Manifest V3**：Chrome 扩展最新清单版本
- **JavaScript**：ES6+ 语法，禁用外部框架
- **Bootstrap 5**：使用现有的 `bootstrap.min.css` 进行 UI 样式
- **Chrome Extension APIs**：
  - `declarativeNetRequest` - 唯一的请求头修改方法
  - `storage.local` - 设置持久化
  - `tabs` - 标签页监控用于自动切换
  - `runtime` - 组件间消息传递

### 架构模式

#### 回退翻译系统
```
翻译优先级：
1. 主要：组件特定的 i18n 实例 (popupI18n, backgroundI18n 等)
2. 次要：跨组件翻译对象 (popupEn, backgroundZh 等)
3. 第三：shared-utils.js 中的内置回退翻译
4. 自动检测：浏览器语言 → localStorage → 回退到英文
```

**关键函数：**
- `getFallbackTranslation()` - 获取回退翻译
- `getUpdateTranslation()` - 获取更新相关翻译
- `sendLocalizedUpdateLog()` - 发送本地化调试日志

#### 消息传递
- 必须使用 `chrome.runtime.sendMessage` 进行后台 ↔ UI 通信
- 实现事件驱动的组件间更新
- 必须对 UI 更新进行防抖处理

#### 存储管理
- 必须通过 `chrome.storage.local` 持久化设置
- 在 `domain-rules.json` 中存储域名规则，支持运行时自定义
- 在浏览器存储中缓存自定义规则以提高性能

## 项目结构

详细的项目结构请参考：[项目结构文档](./Project_Structure.md)

### 文件命名规范（强制）

#### JavaScript 文件
- **UI 组件**：`{page}.js` (popup.js, debug-ui.js)
- **共享模块**：`shared-*.js` 前缀
- **管理器**：`*-manager.js` 后缀
- **国际化文件**：`{component}-{lang}.js` 和 `{component}-i18n.js`

#### HTML 文件
- **扩展页面**：`{function}.html` (popup.html, debug.html)
- **测试工具**：`test-*.html` 前缀

## 代码规范

详细的代码风格指南请参考：[代码风格指南](./Code_Style_Guide.md)

### JavaScript 要求
- **ES6+ 特性**：async/await、箭头函数、解构、模板字符串
- **变量声明**：使用 `const`/`let` - 不使用 `var`
- **异步操作**：所有异步操作包装在 try/catch 块中
- **模块导入**：从 `/shared/` 目录导入共享工具

### 错误处理
- **统一错误处理模式**：采用早期返回模式，避免深层嵌套的 if-else 链
- **指数退避重试机制**：对所有 Chrome API 调用实现智能重试，包含错误分类和重试决策
- **模块化重试逻辑**：将复杂的重试逻辑拆分为专门的辅助方法，提高可维护性
- **避免重复处理**：确保同一个错误只被处理一次，避免重复调用错误处理函数，提高性能
- **错误增强机制**：为最终失败提供详细的错误信息和回退建议
- **调试日志记录**：使用共享工具中的 `sendDebugLog()` 函数记录所有错误
- **优雅回退方案**：为失败操作提供用户友好的回退机制
- **用户友好提示**：在 UI 组件中显示清晰的错误消息和解决建议

### 组件创建规则
1. 将主文件放在根目录
2. 在 `/i18n/` 中创建对应的国际化文件
3. 始终从 `/shared/` 导入共享工具 - 禁止重复代码
4. 严格遵循既定的命名规范

## 开发指南

### 开发工作流
- **纯技术栈**：JavaScript/HTML/CSS，无构建系统
- **开发测试**：作为未打包扩展加载进行开发
- **请求头验证**：使用 `detect.html` 进行实时验证
- **规则检查**：使用 `debug.html` 进行规则检查和故障排除

### 测试策略
- 使用多个标签页测试域名切换
- 测试各种 TLD 模式
- 验证自动切换和手动选择功能
- 测试错误处理和回退机制

## 性能要求

### 后台脚本优化
- 最小化后台脚本执行时间和内存使用
- 使用高效的域名匹配算法（尽可能避免正则表达式）
- 批量并精确地处理 `declarativeNetRequest` 规则更新，仅针对特定规则 ID 进行操作，以避免影响其他规则。
- 在内存中缓存域名规则以实现快速查找

#### 域名匹配算法
项目实现了高效的域名匹配算法，支持多种匹配模式和智能语言识别，为"自动切换语言"功能提供核心支持：

**算法架构：**
- **多层匹配策略**：完整域名匹配、语言子域名识别、二级域名匹配、TLD匹配
- **缓存系统**：域名查询缓存和解析缓存，采用LRU策略管理内存
- **规则预处理**：启动时按类型分组规则，提高查找效率

**核心功能：**
- **传统域名匹配**：基于TLD和二级域名的语言识别
- **现代网站支持**：识别语言子域名模式，如 `cn.bing.com`、`zh-hans.react.dev`
- **智能推断**：当规则匹配失败时，根据语言子域名推断语言代码
- **性能优化**：多层缓存机制，显著提升重复查询性能

**使用示例：**
```javascript
// 基本域名语言识别
const language = await domainRulesManager.getLanguageForDomain('example.com');

// 支持的匹配模式
'baidu.com' → 'zh-CN'        // 完整域名匹配
'cn.bing.com' → 'zh-CN'      // 语言子域名识别
'google.co.jp' → 'ja'        // 二级域名匹配
'example.de' → 'de-DE'       // TLD匹配

// 管理功能
await domainRulesManager.preloadRules(); // 规则预加载
domainRulesManager.getCacheStats();      // 缓存统计
domainRulesManager.clearCache();         // 清理缓存
```

详细信息请参考：[域名匹配算法指南](./Domain_Matching_Guide.md)

### UI 性能
- 对 UI 更新进行防抖处理以防止过度重渲染
- 批量处理 DOM 操作
- 使用事件委托减少事件监听器数量

## 资源管理架构

### 统一资源管理策略

项目采用统一的资源管理架构，确保浏览器扩展的内存安全性和性能稳定性。资源管理主要涉及事件监听器、定时器、消息监听器等浏览器资源的正确创建、跟踪和清理。

#### 核心设计原则
- **环境适配**：根据不同运行环境（页面环境 vs Service Worker环境）采用不同的资源管理策略
- **统一接口**：所有资源操作通过 `resourceTracker` 对象进行统一管理
- **自动清理**：在适当的生命周期节点自动清理资源，防止内存泄漏
- **性能优化**：资源管理本身占用最小的内存开销

#### 环境差异策略

| 环境类型 | 适用文件 | 管理资源 | 清理时机 | 复杂度 |
|---------|---------|---------|---------|--------|
| 页面环境 | `debug-ui.js`, `popup.js`, `toggle.js` | 事件监听器、定时器、消息监听器 | `beforeunload` | 高 |
| Service Worker环境 | `background.js` | 定时器 | `onSuspend` | 低 |

#### 资源管理最佳实践
- **页面环境**：管理所有类型的资源，包括DOM事件监听器和Chrome API消息监听器
- **Service Worker环境**：仅管理定时器等临时资源，Chrome API事件监听器由系统自动管理
- **统一清理**：在页面卸载或Service Worker暂停时统一清理所有跟踪的资源
- **错误安全**：资源操作包含适当的错误处理，避免清理失败影响功能

详细信息请参考：[资源管理最佳实践指南](./Resource_Management_Guide.md)

## 相关文档

### 核心文档
- [代码风格指南](./Code_Style_Guide.md) - 详细的代码规范和最佳实践
- [项目结构文档](./Project_Structure.md) - 完整的项目文件结构说明
- [国际化使用指南](./I18n_Usage_Guide.md) - 国际化系统的使用方法
- [资源管理最佳实践指南](./Resource_Management_Guide.md) - 资源管理架构和最佳实践

### 开发文档
- [更新日志](./Update.md) - 版本更新记录
- [TODO 列表](./TODO.md) - 待完成功能和改进项目

### GitHub 仓库
- 项目地址：https://github.com/ChuwuYo/MultiLangSwitcher

## 贡献指南

### 开发前准备
1. 阅读本 Wiki 和相关文档
2. 了解 Chrome Extension Manifest V3 规范
3. 熟悉项目的代码风格和架构模式

### 代码提交规范
1. 遵循项目的代码风格指南
2. 确保所有新功能都有对应的错误处理
3. 添加适当的调试日志和注释
4. 测试功能在不同场景下的表现

### 问题报告
- 使用 `debug.html` 收集调试信息
- 提供详细的重现步骤
- 包含浏览器版本和扩展版本信息