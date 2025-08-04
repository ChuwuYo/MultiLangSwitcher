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
- 批量处理 `declarativeNetRequest` 规则更新
- 在内存中缓存域名规则以实现快速查找

#### 域名匹配算法优化
项目实现了多层缓存机制和语言子域名识别来优化域名匹配性能，特别是在启用"自动切换语言"功能时：

**缓存架构：**
- **域名查询缓存**：缓存完整的查询结果（包括null结果），避免重复规则查找
- **域名解析缓存**：缓存 `domain.split('.')` 的结果，避免重复字符串操作
- **LRU淘汰策略**：最大100条记录，自动清理最久未使用的缓存条目

**规则预处理：**
- **按类型分组**：将规则分为顶级域名、二级域名、完整域名三类，提高查找效率
- **启动时预处理**：在加载 `domain-rules.json` 时一次性完成所有预处理

**语言子域名识别：**
- **智能识别**：支持现代网站的语言子域名模式
- **优化映射表**：包含常见语言代码，覆盖实际网站使用场景
- **智能推断**：当规则匹配失败时，根据语言子域名直接推断语言代码

**使用方式：**
```javascript
// 基本使用（完全兼容现有代码）
const language = await domainRulesManager.getLanguageForDomain('example.com');

// 语言子域名识别示例
'cn.bing.com' → 'zh-CN'
'zh-hans.react.dev' → 'zh-CN'
'en.wikipedia.org' → 'en-US'
'de.unknown-site.xyz' → 'de-DE'

// 可选的管理功能（已实现，待集成到debug页面）
await domainRulesManager.preloadRules(); // 规则预加载
domainRulesManager.getCacheStats(); // 查看缓存统计
domainRulesManager.clearCache(); // 清理缓存
```

详细信息请参考：[域名优化指南](./Domain_Optimization_Guide.md)

### UI 性能
- 对 UI 更新进行防抖处理以防止过度重渲染
- 批量处理 DOM 操作
- 使用事件委托减少事件监听器数量

## 相关文档

### 核心文档
- [代码风格指南](./Code_Style_Guide.md) - 详细的代码规范和最佳实践
- [项目结构文档](./Project_Structure.md) - 完整的项目文件结构说明
- [国际化使用指南](./I18n_Usage_Guide.md) - 国际化系统的使用方法

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