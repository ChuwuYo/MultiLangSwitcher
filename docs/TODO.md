# 技术债务与后续优化清单

> 已于 2026-11 按最新代码架构重整，移除了重构前已失效的根目录路径及已完成的动态脚本加载 / `appI18n` 历史项。

## 已完成（2026-11 全量审查与最佳实践优化）

- [x] MV3 Service Worker 懒唤醒与异常恢复安全化（`src/background/lifecycle.js`）
- [x] DNR 动态规则全链路加锁、迭代重试与白名单校验（`src/background/rule-engine.js`、`src/background/message-handlers.js`）
- [x] 权限最小化：`tabs` 移出、`host_permissions` 收窄为 `http/https`、`declarativeNetRequestFeedback` 迁至 `optional_permissions`（`manifest.json`）
- [x] `md5.js` UTF-8 编码修复（符合 RFC 1321）、`ResourceManager` 定时器与控制器泄漏修复、`toggle.js` 系统主题跟随修复
- [x] AI 诊断增强：快照脱敏补齐 `ipTimezone.city`/`organization` 与 `fullVersion`、DOMPurify 升级至 3.5.0 并改白名单、支持会话级 API Key 与一键清除
- [x] 语言标签 BCP 47 规范化（`tl`→`fil`、`no`→`nb` 兼容映射）与 AI 默认模型预设更新

## 待后续在本地开发环境推进

- [ ] 在 Node 22 环境升级 `@biomejs/biome` 至 2.x 并同步更新 `biome.json` schema
- [ ] 渐进式开启 `tsconfig.json` 的 `strictNullChecks` 并补齐 `background/`、`popup/`、`debug/` Vitest 单元测试
- [ ] 定期同步 `src/shared/vendor/marked.umd.min.js` 至最新稳定版
