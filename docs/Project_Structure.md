# 项目结构

> 2026-08 重构后：全仓 ES Modules，无构建步骤，浏览器/SW 原生加载。

```
MultiLangSwitcher/
├── LICENSE                          - 许可证文件
├── README.md                        - 项目说明文档
├── package.json                     - 工程基线（biome/vitest，private，仅 devDependencies）
├── biome.json                       - lint + format 配置（tab 缩进、双引号）
├── _locales/                        - 扩展描述的国际化目录（chrome.i18n，仅 manifest 元数据）
│   ├── en/
│   └── zh/
├── docs/                            - 项目文档目录
├── scripts/                         - CI 校验脚本
│   ├── check-syntax.mjs             - 全部 js 的 node --check
│   └── validate-manifest.mjs        - manifest + _locales 校验
├── tests/                           - vitest 测试（纯逻辑 + 失败路径）
│   └── helpers/global-loader.js     - extractFunction（提取自包含纯函数）
├── shared/                          - 共享 ESM 模块
│   ├── message-types.js             - 消息协议常量（MessageTypes）
│   ├── storage-keys.js              - 存储键常量（STORAGE_KEYS / LOCAL_STORAGE_KEYS）
│   ├── shared-utils.js              - 通用工具（日志、语言检测、兜底翻译）
│   ├── shared-i18n-base.js          - BaseI18n 基类（字典由子类静态注入）
│   ├── shared-actions.js            - requestBackground 信封 + resetAcceptLanguage
│   ├── shared-update-checker.js     - UpdateChecker（版本比较/缓存）
│   ├── shared-language-options.js   - 语言选项列表
│   ├── header-check-utils.js        - 请求头检查工具
│   ├── shared-resource-manager.js   - 资源管理器
│   ├── ai-provider-presets.js       - AI 服务商预设
│   ├── ai-chat-client.js            - OpenAI 兼容聊天客户端
│   ├── copy-button.js               - 复制按钮组件（+ copy-button.css）
│   ├── md5.js                       - MD5 哈希
│   ├── theme-init.js                - 主题初始化（classic script，预渲染同步执行）
│   └── vendor/                      - 第三方库（marked / DOMPurify，classic script）
├── i18n/                            - 运行时 i18n（每组件单文件双语字典 + 实例模块）
│   ├── popup-dict.js / popup-i18n.js
│   ├── debug-dict.js / debug-i18n.js
│   ├── detect-dict.js / detect-i18n.js
│   ├── background-dict.js / background-i18n.js       （Service Worker）
│   └── domain-manager-dict.js / domain-manager-i18n.js（Service Worker）
├── fonts/ images/                   - 静态资源
├── manifest.json                    - MV3 清单（background 为 module SW）
├── popup.html / popup.js            - 弹窗页（单 module 入口）
│   └── popup/                       - 弹窗模块（shared/ui-sync/language-apply/update-check）
├── debug.html / debug-ui.js         - 调试页（单 module 入口）
│   └── debug/                       - 调试模块（safe-dom/log-panel/rules-view/header-test/cache-mgmt/custom-language/rules-fix/diagnostics/auto-switch/domain-rules）
├── debug-headers.js                 - 调试页控制台工具（window.debugHeaders）
├── detect.html / detect.js          - 检测页采集编排（导出 DetectPageContext）
│   └── detect/                      - 检测模块（shared/collectors/renderers/snapshot/ai-shared/ai-config/ai-ui/ai-session）
├── detect-ai.js                     - 检测页 AI 诊断（单 module 入口；经 CustomEvent 感知快照生命周期）
├── toggle.js / toggle.css           - 语言/主题切换（ESM，被各页面入口 side-effect 导入）
├── domain-rules-manager.js          - 域名规则管理（LRU 缓存；customDomainRules 扩展点）
├── domain-rules.json                - 内置域名规则
├── background.js                    - Service Worker 入口（ESM；normalizeMessageError、应答信封）
│   └── background/                  - SW 模块（shared/rule-engine/lifecycle/message-handlers）
├── bootstrap.purged.css             - PurgeCSS 裁剪产物（263KB→52KB，CI 校验与源同步）
└── bootstrap.min.css                - Bootstrap 源文件（仅裁剪输入，不直接引用）
```

## 架构契约

- **消息协议**：页面与 SW 之间的消息类型一律使用 `shared/message-types.js` 的 `MessageTypes`，禁止字符串字面量；响应信封 `{ ok, data } / { ok, error }`。
- **存储键**：一律使用 `shared/storage-keys.js` 常量。`currentLanguage` / `autoSwitchEnabled` 由 background 单写者持久化；`uiState` 位于 `chrome.storage.session`，页面经 `storage.onChanged` 只读订阅。
- **i18n**：字典静态注入 `BaseI18n` 子类；运行时切换语言能力保留（`app-lang` localStorage + reload）。
- **页面加载**：每页单个 `<script type="module">` 入口；`theme-init.js` 是唯一 classic 业务脚本（预渲染防主题闪烁，"theme" 键与 `LOCAL_STORAGE_KEYS.THEME` 保持同步）。
- **类型**：JSDoc + `tsc --checkJs`（`npm run check:types`），CI 强制零错误。
- **i18n DOM**：静态文本用 `data-i18n` / `data-i18n-title` / `data-i18n-placeholder` / `data-i18n-alt` 声明（禁止嵌套 data-i18n）；`_applyDataAttributes` 统一扫描；特殊结构保留命令式。
- **样式**：HTML 引用 `bootstrap.purged.css`（产物）；改动任何 class 后跑 `npm run build:css`，CI 校验产物与源同步。
- **检测页解耦**：detect.js 不引用 detect-ai.js；快照生命周期经 `detect:snapshot-updated` / `detect:run-finished` CustomEvent 传播。
