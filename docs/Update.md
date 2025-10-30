# 更新日志

## 2025-10-30

### 优化

- **重构 `shared/shared-i18n-base.js`**:
  - 统一了浏览器和 Service Worker 环境的翻译文件加载逻辑，显著减少了代码冗余。
  - 将初始化过程从原来的回调模式 (`ready()`) 升级为基于 Promise 的异步方法 (`init()`)，使API更现代、更易于使用。
  - 简化了语言检测、脚本加载和错误回退机制，提高了代码的可读性和可维护性。

- **适配 UI 国际化脚本**:
  - 重构了 `i18n/popup-i18n.js`, `i18n/debug-i18n.js`, 和 `i18n/detect-i18n.js` 以兼容新的 `BaseI18n` 类。
  - 确保在 `DOMContentLoaded` 事件触发后，通过新的异步流程初始化并应用翻译，保证了 UI 渲染的正确时机。