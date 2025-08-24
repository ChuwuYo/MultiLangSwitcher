# v1.8.74（含迭代内容）

## 主要改动

### 1. 功能增强

- ✅ 菜单功能完善 - 添加浏览器拓展右键菜单
- ✅ 重构 Service Worker 初始化逻辑：
  - **统一初始化入口**：创建了单一的 `initialize` 函数，用于处理扩展安装、浏览器启动和 Service Worker 意外重启时的状态恢复，确保了逻辑的一致性
  - **实现懒加载守卫**：引入 `ensureInitialized` 机制，在处理 `onMessage`、`onUpdated` 等事件前检查并确保初始化已完成，防止因 Service Worker 休眠后重启导致的状态丢失问题
- ✅ 修复并发与竞态问题：
  - **引入互斥机制**：为 `updateHeaderRules` 添加 Promise 队列，确保规则更新操作串行执行，避免并发调用导致的状态不一致
  - **防抖合并请求**：实现短时间内相同语言切换请求的自动合并，减少不必要的API调用和日志
  - **优化缓存策略**：改进 `rulesCache` 机制，自动切换也能安全使用短路返回，因为规则仅由本扩展管理
  - **状态同步增强**：确保 `lastAppliedLanguage` 和 `rulesCache` 在并发场景下的一致性
- ✅ 性能优化 - 修复自动切换时的无效更新与性能浪费问题，通过改进缓存检查逻辑避免不必要的 API 调用

### 2. 代码优化

- ✅ 清理无效代码 - 去除无效变量 err
- ✅ 重构 createContextMenusOnce 使用 async/await（Promise API），符合代码规范
- ✅ 右键菜单统一使用英文，去除 i18n 化（简化实现）
- ✅ 简化URL检查条件
- ✅ 优化动态规则ID数组创建逻辑，采用 `.some()` 方法以兼顾性能与代码表现力
- ✅ 将 `updateHeaderRules` 拆分为外部包装器和内部实现，提供更好的并发控制
- ✅ 修复重试逻辑中的递归调用问题，避免绕过并发控制机制，优化错误处理
- ✅ 优化按钮代码
- ✅ 优化 Chrome API 调用方式，移除不必要的 Promise 包装，直接使用 async/await
- ✅ 重构调试 UI 的代码结构，将回调函数改为 async/await 方式，调整了部分变量和函数的命名，移除冗余的代码
- ✅ 优化多处异步操作并移除错误处理冗余

### 3. Bug 修复

- ✅ 修复 `tabs.onUpdated` 过滤条件 Bug，该 Bug 会导致 http 页面不触发自动切换
- ✅ 修复动态规则清理范围过宽问题，现在只移除与 `RULE_ID` 相关的规则，避免误删其他动态规则
- ✅ 收窄 DNR 资源类型与匹配范围

## 文件变更清单

### 新增文件

- Problems.md - LLM整理的现存问题（v1.8.67）
- Wiki_EN.md - 英文版Wiki（v1.8.69）

### 重命名文件

- 

### 修改文件

- manifest.json - 版本号更新（v1.8.67、v1.8.68、v1.8.69、v1.8.70、v1.8.71、v1.8.72、v1.8.73、v1.8.74）；添加 contextMenus 权限（v1.8.67）
- TODO.md - 修改待办事项（v1.8.67）
- Update.md - 版本更新记录（v1.8.67、v1.8.68、v1.8.69、v1.8.70、v1.8.71、v1.8.72、v1.8.73、v1.8.74）
- background.js - 添加右键菜单初始化标志（v1.8.67）；重构 contextMenus 创建逻辑（async/await），右键菜单统一使用英文，去除 i18n 化（v1.8.68）；修复 `tabs.onUpdated` 的 URL 过滤条件 Bug（v1.8.68）；简化URL检查条件（v1.8.68）；重构了初始化和事件处理逻辑（v1.8.69）；修复动态规则清理范围过宽问题（v1.8.70）；优化动态规则ID数组创建逻辑（v1.8.70）；引入并发控制机制，添加 Promise 队列和防抖机制，修复并发与竞态问题（v1.8.71）；优化异步操作并移除错误处理冗余（v1.8.73）； 修复自动切换时的无效更新与性能浪费问题（v1.8.73）；收窄 DNR 资源类型与匹配范围（v1.8.74）
- shared-i18n-base.js - 优化翻译加载机制，避免重复加载脚本文件，完善翻译回退（v1.8.68）
- I18n_Usage_Guide.md - 内容更新（v1.8.67、v1.8.68）
- .gitignore - git忽略文件更新（v1.8.67）
- Problems.md - 问题列表更新（v1.8.68、v1.8.69、v1.8.70、v1.8.71、v1.8.73、v1.8.74）
- Wiki.md - Wiki更新（v1.8.69、v1.8.70）
- Wiki_EN.md - 英文Wiki更新（v1.8.70）
- i18n/background-*.js - 完善相关翻译（v1.8.71、v1.8.73）
- toggle.js - 优化按钮代码（v1.8.71）
- popup.js - 优化 Chrome API 调用方式，直接使用 async/await（v1.8.72）；优化按钮处理逻辑为event事件处理（v1.8.73）
- debug-ui.js - 优化代码结构，将回调函数改为 async/await 方式，调整了部分变量和函数的命名，移除冗余的代码（v1.8.72）
- shared-utils.js - 完善fallback翻译键（v1.8.72）
- Code_Style_Guide.md - 代码风格指南更新（v1.8.72）
- shared-update-checker.js - 优化异步操作并移除错误处理冗余（v1.8.73）
- domain-rules-manager.js - 优化异步操作并移除错误处理冗余（v1.8.73）

### 移除内容

- 移除未使用的变量 chrome.runtime.lastError 读取语句
- 已完成的TODO / 已修复的问题
- 将 `performInitialization` 和 `handleAutoSwitchToggleRequest` 中的重复规则应用逻辑提取到新的共享函数 `applyLanguageRulesBasedOnState` 中
- 移除大量prromise包装