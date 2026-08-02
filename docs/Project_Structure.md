# 项目结构

> 2026-08 重构后：全仓 ES Modules，无构建步骤，浏览器/SW 原生加载。代码统一收拢在 `src/`。

```
MultiLangSwitcher/
├── LICENSE                          - 许可证文件
├── README.md                        - 项目说明文档
├── manifest.json                    - MV3 清单（SW: src/background/background.js，popup: src/popup/popup.html）
├── package.json / tsconfig.json / biome.json / renovate.json
├── _locales/                        - manifest 元数据国际化（chrome.i18n）
├── assets/                          - 静态资产
│   ├── images/                      - 图标与图片
│   └── fonts/                       - 自托管字体
├── docs/                            - 文档（含 screenshots/）
├── scripts/                         - CI 校验/构建脚本
├── tests/                           - vitest 测试
└── src/                             - 全部运行时代码
    ├── popup/                       - 弹窗页
    │   ├── popup.html               - 页面（单 module 入口 popup.js）
    │   ├── popup.js                 - 入口：消息接线、init、storage.onChanged
    │   ├── shared.js                - getEl / runDOMUpdate
    │   ├── ui-sync.js               - DOM 同步/显示辅助 + 快速检查（含防重入控制器）
    │   ├── language-apply.js        - 语言应用流程
    │   └── update-check.js          - 更新检查（含防抖）
    ├── debug/                       - 调试页
    │   ├── debug.html               - 页面（单 module 入口 debug-ui.js）
    │   ├── debug-ui.js              - 入口：init 编排
    │   ├── debug-headers.js         - 控制台工具（window.debugHeaders）
    │   └── *.js                     - safe-dom/log-panel/rules-view/header-test/cache-mgmt/custom-language/rules-fix/diagnostics/auto-switch/domain-rules
    ├── detect/                      - 检测页
    │   ├── detect.html              - 页面（单 module 入口 detect-ai.js，vendor classic 在前）
    │   ├── detect.js                - 采集编排 + DetectPageContext（AI 侧唯一读接口）
    │   ├── detect-ai.js             - 入口：sanitizeSnapshotForAI、init、事件监听
    │   ├── shared.js                - translate/getUiLanguage/createMessageId
    │   ├── collectors.js            - 全部 collect*（含 UA-CH 高熵值）
    │   ├── renderers.js             - 全部 render*
    │   ├── snapshot.js              - 快照状态 + buildDetectionSnapshot + CustomEvent 派发
    │   ├── ai-shared.js             - AI 面板元素缓存 + aiSessionState + 状态助手
    │   ├── ai-config.js             - AI 配置存储/校验/持久化
    │   ├── ai-ui.js                 - 聊天渲染与导出
    │   └── ai-session.js            - 会话流程与 Prompt
    ├── background/                  - Service Worker
    │   ├── background.js            - 入口：i18n 注册、normalizeMessageError、应答信封、listener 装配
    │   ├── shared.js                - i18nReady、常量、sendBackgroundLog、notifyPopupUIUpdate、autoSwitch 状态
    │   ├── lifecycle.js             - 初始化、上下文菜单、启动/安装/标签页监听
    │   ├── rule-engine.js           - DNR 规则应用（互斥锁 + 重试）
    │   ├── message-handlers.js      - MESSAGE_HANDLERS 分发表 + 全部处理器
    │   ├── domain-rules-manager.js  - 域名规则（LRU 缓存；customDomainRules 扩展点）
    │   └── domain-rules.json        - 内置域名规则（web_accessible_resource）
    ├── shared/                      - 跨页共享模块
    │   ├── message-types.js         - 消息协议常量（MessageTypes，13 个）
    │   ├── storage-keys.js          - 存储键常量（STORAGE_KEYS / LOCAL_STORAGE_KEYS）
    │   ├── shared-utils.js          - 日志、语言检测、i18n 注册表、兜底翻译
    │   ├── shared-i18n-base.js      - BaseI18n（字典静态注入 + data-i18n 扫描器）
    │   ├── shared-actions.js        - requestBackground 信封 + resetAcceptLanguage
    │   ├── shared-update-checker.js - UpdateChecker（版本比较/缓存/https 校验）
    │   ├── shared-language-options.js / header-check-utils.js / shared-resource-manager.js
    │   ├── ai-provider-presets.js / ai-chat-client.js / copy-button.js(+css) / md5.js
    │   ├── theme-init.js            - 主题初始化（classic script，预渲染同步执行）
    │   ├── toggle.js / toggle.css   - 语言/主题切换组件（各页面 side-effect 导入）
    │   ├── page-base.css            - 页面公共基础样式（字体定义，单一来源）
    │   └── vendor/                  - 第三方资产：marked / DOMPurify / bootstrap 源文件与 PurgeCSS 产物
    └── i18n/                        - 运行时 i18n（每组件单文件双语字典 + 实例模块）
        ├── popup-dict.js / popup-i18n.js
        ├── debug-dict.js / debug-i18n.js
        ├── detect-dict.js / detect-i18n.js
        └── background-dict.js / background-i18n.js   （Service Worker）
```

## 架构契约

- **消息协议**：页面与 SW 之间的消息类型一律使用 `src/shared/message-types.js` 的 `MessageTypes`，禁止字符串字面量；响应信封 `{ ok, data } / { ok, error }`。
- **存储键**：一律使用 `src/shared/storage-keys.js` 常量。`currentLanguage` / `autoSwitchEnabled` 由 background 单写者持久化（自动切换未显式开启时默认关闭）；`uiState` 位于 `chrome.storage.session`，页面经 `storage.onChanged` 只读订阅。
- **i18n**：字典静态注入 `BaseI18n` 子类；运行时切换语言能力保留（`app-lang` localStorage + reload）；i18n 实例经 `registerI18nInstance` 注册，禁止全局嗅探。
- **页面加载**：每页单个 `<script type="module">` 入口；`theme-init.js` 是唯一 classic 业务脚本（预渲染防主题闪烁，"theme" 键与 `LOCAL_STORAGE_KEYS.THEME` 保持同步）。
- **类型**：JSDoc + `tsc --checkJs`（`npm run check:types`），CI 强制零错误。
- **i18n DOM**：静态文本用 `data-i18n` / `data-i18n-title` / `data-i18n-placeholder` / `data-i18n-alt` 声明（禁止嵌套 data-i18n）；`_applyDataAttributes` 统一扫描；特殊结构保留命令式。
- **样式**：HTML 引用 `bootstrap.purged.css`（产物）；改动任何 class 后跑 `npm run build:css`，CI 校验产物与源同步。
- **检测页解耦**：detect.js 不引用 detect-ai.js；AI 侧经 `DetectPageContext` 读快照；快照生命周期经 `detect:snapshot-updated` / `detect:run-finished` CustomEvent 传播。
