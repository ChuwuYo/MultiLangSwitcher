# v1.8.62（含迭代内容）

## 主要改动

### 1. 功能增强

- ✅ Chrome Storage API 错误处理完善 - 为所有 `chrome.storage.local.get` 调用添加 `chrome.runtime.lastError` 检查，防止静默失败
- ✅ 错误处理一致性提升 - 统一存储访问的错误处理模式，遵循代码风格指南的最佳实践
- ✅ declarativeNetRequest 批量处理优化 - 实现规则更新的批量处理，单次 API 调用同时移除旧规则和添加新规则
- ✅ 修复i18n的多级加载机制，完善降级处理

### 2. 代码优化

- ✅ API 调用效率提升 - 语言切换操作从2次 API 调用优化为1次批量调用
- ✅ 残留清理 - 清理Accept-Language 格式说明多余的无效代码与未使用的分组规则代码

## 文件变更清单

### 新增文件

- 

### 重命名文件

- 

### 修改文件

- manifest.json - 版本号更新（v1.8.61、v1.8.62）
- Domain_Matching_Guide.md - 合并.60版本修改历史（v1.8.61）
- popup.js - Chrome Storage API 错误处理修复，代码风格优化（v1.8.61）
- debug-ui.js - Chrome Storage API 错误处理修复（v1.8.61）；添加域名匹配缓存管理功能的传递逻辑（v1.8.62）
- domain-rules-manager.js - Chrome Storage API 错误处理修复（v1.8.61）；清理未使用的分组规则代码（v1.8.62）
- TODO.md - 修改待办事项（v1.8.61、v1.8.62）
- Update.md - 版本更新记录（v1.8.61、v1.8.62）
- background.js - Chrome Storage API 错误处理修复，declarativeNetRequest 批量处理优化，性能监控（v1.8.61）；添加域名匹配缓存管理功能的处理逻辑（v1.8.62）
- background-zh.js - 添加相关翻译键（v1.8.61、v1.8.62）
- background-en.js - 添加相关翻译键（v1.8.61、v1.8.62）
- shared-utils.js - 修复i18n的多级加载机制，完善降级处理（v1.8.62）
- debug-zh.js - 添加相关翻译键（v1.8.61、v1.8.62）
- debug-en.js - 添加相关翻译键（v1.8.61、v1.8.62）
- debug.html - 添加域名匹配缓存管理功能的卡片UI（v1.8.62）

### 移除内容

- 未使用的分组规则代码（v1.8.62）
- Accept-Language 格式说明多余的无效代码（v1.8.62）