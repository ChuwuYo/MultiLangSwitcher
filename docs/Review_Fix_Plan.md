# 六轴复审修复计划

> 来源：review-swarm 四轴（意图回归/安全隐私/性能可靠/契约覆盖）+ code-review 双轴（规范/规格）+ Chrome 官方文档时效核对。
> 排序原则：安全优先 → 契约正确 → 死代码清理 → 一致性 → 测试补齐 → 文档收尾。
> 状态截至 2026-08-01；改动尚未提交，全部完成后统一验证再提交。

## 安全

- [x] **F1** sanitizer 补 `compatibility.browser.userAgent` 脱敏（UA 此前经快照泄漏给 AI）+ 对应测试 — `detect-ai.js`, `tests/sanitize-snapshot.test.js`
- [x] **F2** `softprops/action-gh-release` pin 到 commit SHA（其余 action 已 pin，release 是唯一漏网且跑在 contents:write 岗位）— `.github/workflows/ci.yml`
- [x] **F3** `popup/update-check.js` 的 `releaseUrl` 赋 href 前校验 `https:` 协议（两处，:181/:245）

## 契约正确性

- [x] **F4** 补 background-dict 缺失的 21 个日志键（en+zh）；debug-dict / detect-dict 补 `theme_toggle`、`reset_accept_language_tooltip`（此前按钮 tooltip 显示原始键名）
- [ ] **F5** i18n 键完备性测试入 vitest（脚本交叉核对 `.t()` / `translateDetect` / `data-i18n*` 引用 vs 各组件字典，used-but-missing 必须为零）— 防复发
- [x] **F6** `DetectPageContext` 恢复为真实边界：detect-ai 各模块（ai-shared/ai-session/ai-ui）改经 `DetectPageContext` 消费快照与工具，不再直接 import `detect/snapshot.js` / `detect/shared.js`（文档承诺的解耦契约）
- [x] **F7** `shared/storage-keys.js` 增加 `UPDATE_CHECKER_CACHE_PREFIX` 常量，`shared-update-checker.js:30` 动态键改引用

## 死代码清理

- [x] **F8** 删除 domain-manager i18n 全链（实例/Ready/dict 5 键/`ensureI18n`），`i18nReady` 简化为单实例 — `domain-rules-manager.js`, `background/shared.js`，已删 `i18n/domain-manager-{i18n,dict}.js`
- [x] **F9a** dispatch 由 14 分支 if-else 改为 `MESSAGE_HANDLERS` 映射表 — `background/message-handlers.js`
- [x] **F9b** 删除已无引用的 `handleUpdateCheckRequest` / `handleGetManifestInfoRequest` 函数及 `MessageTypes.UPDATE_CHECK` / `GET_MANIFEST_INFO` 常量（无发送方，spec 目标协议收窄）；随之孤儿化的 7 个 background-dict 键一并清除
- [x] **F10** `detect/ai-shared.js` 去中转：`translate` / `getUiLanguage` 改为直接 re-export `detect/shared.js`，不再包一层
- [x] **F11** `popup/shared.js` 孤儿 JSDoc 删除；`getEl` 在 popup 内统一使用（language-apply.js 两处 raw getElementById）

## 一致性与可靠性

- [x] **F12** 三个页面 i18n 模块的 `DOMContentLoaded` 改走 `ResourceManager.addEventListener`（roadmap 声称已统一，代码要兑现）— `i18n/{popup,debug,detect}-i18n.js`
- [x] **F13** `debug/auto-switch.js` `checkI18nAndLog` 轮询条件由 `translations` 非空改为 `isReady`（现分支在字典加载失败时永不终止）

## 类型与测试

- [ ] **F14** `detect/snapshot.js` 加 `@typedef DetectionSnapshot`；`shared-actions.js` 加消息信封 `@typedef`（跨上下文契约）
- [ ] **F15** `requestBackground` 信封 round-trip 测试（ok→resolve / ok:false→抛错且字段保真 / 旧格式→告警透传）
- [ ] **F16** `_applyDataAttributes` 扫描器测试（jsdom：四种属性填充、缺键行为、嵌套约束文档符合性）

## 收尾

- [ ] **F17** 文档数字修正：roadmap 执行状态（MessageTypes 实际数量、i18n 文件数口径、detect 页 script 标签说明）；Project_Structure 与 DetectPageContext 契约描述对齐 F6 结果
- [ ] **F18** 全量验证（biome/tsc/syntax/manifest/tests/purge-css 同步）+ 分组提交 + CodeGraph sync

## 明确不做（评估记录）

- theme-init.js 的 `"theme"` 字面量：classic 预渲染脚本无法 import ESM 常量，结构性约束，已有注释说明
- SW 瞬态状态迁 `chrome.storage.session`：模块级 Promise 已去重，DNR 规则即真相源，无收益
- 每检测项一个 collector 文件：129 条规则量级下过度碎片化
- customRulesCache 与 TEST_DOMAIN_CACHE 的理论竞态：Chrome onChanged 与 set 广播同序，实践中不成立
- API 时效核对结论：DNR `modifyHeaders`/`getMatchedRules`、UA-CH `fullVersionList`（非已废弃的 `Full-Version`）、`storage.session`、module SW 全部符合当前文档；`domains` 等废弃字段未使用；vendor 库 DOMPurify 3.4.9 / marked 18.0.5 均为近期版本
