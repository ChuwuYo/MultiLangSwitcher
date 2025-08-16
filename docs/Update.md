# v1.8.68（含迭代内容）

## 主要改动

### 1. 功能增强

- ✅ 菜单功能完善 - 添加浏览器拓展右键菜单

### 2. 代码优化

- ✅ 清理无效代码 - 去除无效变量 err
- ✅ 重构 createContextMenusOnce 使用 async/await（Promise API），符合代码规范
- ✅ 右键菜单项统一使用英文，去除 i18n 化（简化实现）
- ✅ 简化URL检查条件

### 3. Bug 修复

- ✅ 修复 `tabs.onUpdated` 过滤条件 Bug，该 Bug 会导致 http 页面不触发自动切换

## 文件变更清单

### 新增文件

- Problems.md - LLM整理的现存问题（v1.8.67）

### 重命名文件

- 

### 修改文件

- manifest.json - 版本号更新（v1.8.67、v1.8.68）；添加 contextMenus 权限（v1.8.67）
- TODO.md - 修改待办事项（v1.8.67）
- Update.md - 版本更新记录（v1.8.67、v1.8.68）
- background.js - 添加右键菜单初始化标志（v1.8.67）；重构 contextMenus 创建逻辑（async/await），右键菜单统一使用英文，去除 i18n 化（v1.8.68）；修复 `tabs.onUpdated` 的 URL 过滤条件 Bug（v1.8.68）；简化URL检查条件（v1.8.68）
- shared/shared-i18n-base.js - 优化翻译加载机制，避免重复加载脚本文件，完善翻译回退（v1.8.68）
- I18n_Usage_Guide.md - 内容更新（v1.8.67、v1.8.68）
- .gitignore - git忽略文件更新（v1.8.67）
- Problems.md - 问题列表更新（v1.8.68）

### 移除内容

- 移除未使用的变量 chrome.runtime.lastError 读取语句
- 已完成的TODO / 已修复的问题