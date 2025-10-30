# 更新日志

## 2025-10-31

### 优化

- **重构 `shared/shared-i18n-base.js`**:
  - 统一了浏览器和 Service Worker 环境的翻译文件加载逻辑，显著减少了代码冗余。
  - 将初始化过程从原来的回调模式 (`ready()`) 升级为基于 Promise 的异步方法 (`init()`)，使API更现代、更易于使用。
  - 简化了语言检测、脚本加载和错误回退机制，提高了代码的可读性和可维护性。

- **适配 UI 国际化脚本**:
  - 重构了 `i18n/popup-i18n.js`, `i18n/debug-i18n.js`, 和 `i18n/detect-i18n.js` 以兼容新的 `BaseI18n` 类。
  - 确保在 `DOMContentLoaded` 事件触发后，通过新的异步流程初始化并应用翻译，保证了 UI 渲染的正确时机。

- **安全修复**:
  - 修复了 `debug-ui.js` 中的 XSS 漏洞，将 `innerHTML` 赋值替换为安全的 DOM 操作，防止恶意脚本注入。
  - 修复了 `i18n/popup-i18n.js` 中的 XSS 漏洞，使用 `textContent` 和 DOM 创建元素替代 `innerHTML`，确保翻译文本的安全渲染。
  - 所有修复都保持了原有功能的同时提高了安全性，符合现代 Web 安全最佳实践。

- **代码优化**:
  - 简化了 `background.js` 中的 `ensureInitialized` 函数，移除了过度工程化的三层初始化检查。
  - 由于 `initialize` 函数内部已实现并发控制，`ensureInitialized` 的多层防护是冗余的，现在直接检查初始化状态并调用 `initialize`，提高了代码简洁性和可读性。