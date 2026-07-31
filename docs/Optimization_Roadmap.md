# 架构优化路线图

> 基于 2026-06 全量架构勘察（消息协议、状态管理、共享层、i18n、domain-rules、detect 子系统）。
> 原则：先建安全网，再固化契约，再动结构；每阶段为下一阶段降险；全程小步 PR。

## 执行状态（2026-08，refactor/architecture 分支）

- [x] 阶段 0 工程基线：package.json + biome + scripts/check-syntax.mjs + validate-manifest.mjs + GitHub Actions
- [x] 阶段 1 契约固化：MessageTypes（16→15）+ STORAGE_KEYS/LOCAL_STORAGE_KEYS 常量；`currentLanguage` 双写修复（background 单写者）；`customDomainRules` 决策为文档化扩展点（docs/Custom_Domain_Rules.md）；SET_STORAGE_DATA 删除
- [x] 阶段 2 测试基线：vitest 43 测试（domain 查找链/LRU、版本比较、_formatString、normalizeMessageError、sanitizeSnapshotForAI、失败路径）；顺带修复 isNewerVersion NaN 守卫
- [x] 阶段 3 ESM 迁移：全仓 ESM；每页单 module 入口；SW `type: "module"`；垫片已摘除；动态 script 注入消亡；detect ↔ detect-ai 经 DetectPageContext + CustomEvent 解耦
- [x] 阶段 4 状态收紧：storage.onChanged 取代广播（WIP 期已完成）；GET_STORAGE_DATA 删除（页面直读存储）；domain cache FIFO→LRU；SW 瞬态状态评估后不迁移（模块级 Promise 已去重，DNR 规则即真相源）
- [x] 阶段 6.1 i18n 字典合并：10 文件 → 5 个 per-component dict 模块
- [ ] 阶段 5 单体文件拆分（未做，见下）
- [ ] 阶段 6.2–6.5 data-i18n 声明式翻译 / 兜底字典去重 / bootstrap 裁剪 / detect 清理（未做）

已知无害残留：popupZh 缺 `displaying_results`（该键无消费方，史前遗留）；i18n 键 `set_storage_data_failed`、`language_settings_saved`、`get_storage_data_failed` 已无调用方，可在阶段 6.3 一并清理。

## 现状档案（勘察结论）

| 维度 | 现状 | 证据 |
|---|---|---|
| 工程化 | 无 package.json / linter / 测试 / CI；代码含 `biome-ignore` 注释但无 biome 配置 | 仓库根目录 |
| 消息协议 | 18 个消息类型全部为散落字符串字面量；信封已统一（`requestBackground` + `sendOk/sendErr`） | shared/shared-actions.js:6-44, background.js:978-1036 |
| 状态管理 | `autoSwitchEnabled` 存在双写路径（background 直写 + 页面 `SET_STORAGE_DATA`），无串行化；`customDomainRules` 只读不写（死功能桩） | background.js:627, popup.js:1266, debug-ui.js:1260, domain-rules-manager.js:246 |
| 模块体系 | 14 个 `window.*` 全局；每页 12–17 个 `<script>` 标签，顺序敏感；SW 用 `importScripts`；detect.js ↔ detect-ai.js 经 window 双向耦合 | 各 .html、detect.js:1049, detect-ai.js:1247 |
| 单体文件 | debug-ui.js 1573 行、popup.js 1319、detect-ai.js 1257、background.js 1218、detect.js 1170 | wc -l |
| i18n | 15 个文件 / 2243 行；每组件中英两套字典 + 动态 script 注入加载；DOM 应用为命令式（每页 50+ 次 querySelector）；shared-utils 另有 91 键兜底字典（重复） | shared/shared-i18n-base.js, i18n/*, shared-utils.js:150-256 |
| domain-rules | 129 条扁平映射；FIFO 100 项缓存；每次未命中都 `chrome.storage.local.get` 拉自定义规则 | domain-rules-manager.js |
| 资源管理 | ResourceManager 使用不一致：debug-ui 100%、popup 60%、detect-ai 仅 10%（9 处裸 addEventListener） | detect-ai.js:1215-1237 |
| 资产 | bootstrap.min.css 263KB 全量 ×3 页；自体字体 58KB 已 preload | 各 .html |

已排除的伪发现：popup.html 缺 header-check-utils（实际在 popup.html:541）；SW 冷启动初始化静默失败（懒初始化路径完整，background.js:90-103）。

---

## 阶段 0：工程基线（半天–1 天，零行为风险）⭐ 先做

**内容**
- `package.json`（private，devDependencies only）
- Biome：lint + format，规则对齐现有风格（tab 缩进、双引号），让既有 `biome-ignore` 注释生效
- GitHub Actions：`biome ci` + 全部 js `node --check` + manifest.json 解析校验
- `.gitignore` 补 node_modules

**为什么排第一**：后续每一步的"零行为验证"目前靠人肉 diff 审查，先把机器能做的部分自动化，所有后续阶段的成本和风险同时下降。

**验证**：CI 在当前代码上全绿（允许首轮 biome 规则降级到 warn 逐步收紧）。

## 阶段 1：契约固化（1–2 天，低风险高杠杆）

**内容**
1. `shared/message-types.js`：18 个消息类型常量化，替换全部字面量（纯机械替换，grep 可验证完备性）
2. 存储键常量化（7 个 chrome.storage 键 + 2 个 localStorage 键）
3. **修复 `autoSwitchEnabled` 双写竞态**：确立 background 单写者原则——popup.js:1266 / debug-ui.js:1260 在收到广播后回写存储的逻辑删除（background 在 toggle 处理器里已写过，页面回写是冗余且引入竞态）
4. `customDomainRules` 决策：三选一——做成 debug 页 UI 功能 / 文档化为"手动 storage 注入的扩展点" / 删除读取代码

**为什么在模块化之前**：常量集中后，阶段 3 的改名与移动可被 grep/linter 兜底；单写者原则先确立，阶段 4 的状态收紧才有清晰底座。

**验证**：grep 确认无残留字面量；双写删除需手测一次 popup/debug 同开时切换自动模式。

## 阶段 2：纯逻辑测试基线（1–2 天，与阶段 3 交错进行）

**内容**
- 引入 `vitest`（或 node:test），先覆盖五块纯逻辑：
  - domain-rules 查找链（`_findMatchingRule` / `_parseDomain`：全域名/二级/顶级/www 变体）
  - update-checker 版本比较（prerelease、缺段补零）
  - `BaseI18n._formatString`（占位符多次出现、缺参）
  - `normalizeMessageError`（信封字段保真）
  - `sanitizeSnapshotForAI`（脱敏完备性——这是安全敏感逻辑）
- 现阶段用 global-stub 加载器（vm 注入 window/chrome 桩）跑全局脚本；阶段 3 每转一个模块即把对应测试转为正常 import

**为什么不等模块化做完**：脱敏、版本比较这类逻辑改坏了 CI 必须能拦住；测试与模块化互为安全网，交错推进。

## 阶段 3：ES Modules 渐进迁移（1–2 周，分批 PR，本路线图的结构核心）

**迁移顺序（依赖叶子 → 根）**
1. 零依赖叶子：md5、ai-provider-presets、header-check-utils、shared-language-options、copy-button、ai-chat-client
2. 核心共享：shared-utils、shared-i18n-base、shared-resource-manager、shared-actions、shared-update-checker
3. 页面入口：popup.js / debug-ui.js / detect.js / detect-ai.js 改 `type="module"`，script 标签收敛为每页 1–2 个入口
4. 最后 SW：manifest `"background": {"type": "module"}`，`importScripts` → `import`

**关键策略**
- 每个文件转换时保留 `window.X = X` 兼容垫片，全部消费方切完后统一摘除（单独一个收尾 PR）
- i18n 字典文件转 module 时顺带消灭动态 script 注入（变成静态 import，两套字典本就都会加载）
- **detect ↔ detect-ai 解耦**：双向 window 调用（DetectPageContext / DetectAIContext）改为显式接口——detect.js 导出 context 对象，detect-ai 导入；反向的 `isChatContextStale` 探询改为 detect-ai 监听 `snapshot-updated` CustomEvent
- 每转一个模块：补该模块单测 + `node --check` + 手测对应页面

**收益**：载入顺序脆弱性消除；依赖图显式化；死代码可静态分析；为阶段 5 拆分解锁。
**可选附加**：`tsc --checkJs` + JSDoc 类型标注（零运行时成本的类型检查），在垫片摘除后引入。

## 阶段 4：状态与消息架构收紧（2–3 天，依赖阶段 1）

**内容**
1. **用 `chrome.storage.onChanged` 取代 `AUTO_SWITCH_UI_UPDATE` 广播**：background 写存储即天然广播，删掉一个自定义消息类型 + popup/debug 两处接收分支 + sendResponse 噪音（idiomatic MV3 模式）
2. SW 瞬态状态（初始化标志、锁）评估迁入 `chrome.storage.session`（minimum_chrome_version 已是 120，门槛已清）
3. domain-rules-manager 微优化：`customDomainRules` 首读后内存缓存 + `storage.onChanged` 失效（消除每次未命中的存储 IPC）；FIFO → LRU（命中时 delete+set，3 行改动）
4. `GET_STORAGE_DATA`/`SET_STORAGE_DATA` 万能通道收窄：页面对扩展状态的读取统一走语义化消息或 storage 直读（选一种，消灭混用）

## 阶段 5：单体文件拆分（3–5 天，依赖阶段 3）

| 文件 | 拆分方向 |
|---|---|
| debug-ui.js (1573) | safe-dom 助手 / 日志面板 / 规则查看 / 请求头测试 / 缓存管理 / 自定义语言，各自模块 |
| popup.js (1319) | UI 同步 / 更新检查（含防抖）/ 语言应用 / 消息接线 |
| detect.js (1170) | collectors/（每检测项一个）/ renderers / snapshot 组装 |
| detect-ai.js (1257) | 配置存储 / 会话状态机 / 聊天 UI / 导出 |

纯文件移动 + import，零行为；顺带统一 ResourceManager 使用（detect-ai 的 9 处裸监听、popup 的 4 处）。

## 阶段 6：i18n 收敛与资产优化（3–5 天，可与 4/5 并行）

1. **i18n 文件结构收敛**：每组件单文件双语 `{ en: {...}, zh: {...} }`（15 文件 → 6），动态注入消亡（阶段 3 已做则此处只剩合并）
2. **声明式 DOM 翻译**：HTML 加 `data-i18n` 属性，`_applyTranslations` 的 ~150 行 querySelector 命令式代码换成一个 15 行通用扫描器；运行时切换语言能力不变
3. **兜底字典去重**：shared-utils 的 91 键 fallback 与正式字典合并来源
4. **bootstrap 裁剪**：npm script 跑 PurgeCSS 产出裁剪版（预计 263KB → ~30KB）入库，CI 校验产物与源同步
5. detect 页功能项：`navigator.userAgentData` 高熵值对照展示；getBrowserInfo 中扩展页不可达的 Firefox/Safari/IE 分支清理

---

## 依赖关系与排序依据

```
阶段0(基线) → 阶段1(契约) → 阶段3(模块化) ⇄ 阶段2(测试,交错)
                  ↘ 阶段4(状态收紧)        ↘ 阶段5(拆分)
阶段6 在阶段3后随时可插入；其中 bootstrap 裁剪仅依赖阶段0
```

排序依据：**可逆性递减、依赖前置**。0/1/2 全部可单 commit 回滚且互不阻塞后续；3 是唯一"大手术"，故置于安全网（CI+常量+测试）齐备之后；4/5/6 都因 3 而变便宜。

## 明确不做（评估后否决）

- domain 查找上 trie/前缀树：129 条规则量级下是过度工程
- 引入前端框架或 TypeScript 全量重写：与"无构建、可直读"的项目气质冲突，JSDoc+checkJs 已够
- chrome.i18n/_locales 统一替代自定义 i18n：会失去运行时切换语言能力（刻意设计）
- 单消费者 shared 模块（update-checker、ai-chat-client 等）回收进页面：按页面拆分语义它们留在 shared 更对
