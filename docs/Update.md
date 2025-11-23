# 更新日志

## 2025-11-23

### 重构优化

- **统一请求头检测模块** (2023-11-23):
  - 重构了 `popup.js`, `detect.js`, `debug-ui.js`, `debug-headers.js` 四个文件，统一使用共享的 `header-check-utils.js` 模块进行请求头检测。
  - 删除了约 280 行重复代码，包括自定义的 `fetchFromAnySource`, `fetchWithTimeout`, `fetchWithRetry` 等函数。
  - 统一了检测端点配置，所有文件现在都使用相同的 3 个端点：`httpbin.org`, `postman-echo.com`, `header-echo.addr.tools`。
  - 提升了 `debug-ui.js` (2→3端点) 和 `debug-headers.js` (1→3端点) 的可靠性和容错能力。
  - 增强了 `Accept-Language` 头部查找的鲁棒性，支持不区分大小写的多种变体。

- **国际化改进** (2023-11-23):
  - 修复了 `header-check-utils.js` 中硬编码的中文文本 (`'请访问'`, `'或'`, `'进行查看'`)。
  - 重构了 `getExternalCheckLinksHTML` 函数以支持国际化，采用调用者传入翻译文本的模式，保持共享模块的纯净性。
  - 在 6 个 i18n 文件 (`popup/detect/debug` 的 `zh/en` 版本) 中添加了新的翻译键 (`external_check_prefix`, `external_check_or`, `external_check_suffix`)。
  - 更新了 8 处函数调用点，传递国际化文本对象，完全移除了硬编码文本。
  - 提供了英文默认回退值，确保向后兼容性和在未传入参数时的正常工作。
