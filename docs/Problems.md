1. 动态规则清理范围过宽

- 现状：
  - updateHeaderRules 使用 removeRuleIds = existingRules.map(rule => rule.id) 清理“本扩展”所有动态规则，而不仅是用于 Accept-Language 的 RULE_ID。
- 风险：未来若本扩展添加其他动态规则，会被误删，导致功能相互踩踏。
- 建议：仅移除与 RULE_ID 相关的旧规则；不要全量移除本扩展的所有动态规则。

2. 并发与竞态问题（缺少互斥/队列）

- 现状：
  - updateHeaderRules 可被 popup 和自动切换并发触发；未见锁/队列；rulesCache 仅用于“非自动切换”时的早退，且并不能避免并发 DNR 更新。
- 风险：并发更新可能导致重复 get/set 规则、状态抖动或日志噪声。
- 建议：为 updateHeaderRules 引入简单互斥（Promise 队列/信号量），或合并短时间内的重复请求；对相同语言的重复调用直接短路返回（自动切换也可安全短路，因为规则仅由本扩展管理）。

3. 初始化/存储 API 使用不一致

- 现状：
  - 代码中混用 Promise 风格 await chrome.storage.local.get(['key']) 与基于回调的 new Promise((resolve) => chrome.storage.local.get(...))。
- 风险：风格不一致增加维护成本，且更难统一错误处理/超时控制。
- 建议：统一使用 Promise 风格（MV3 已支持），并集中封装存取（带默认值、错误分类、日志记录）。

中优先级问题与建议 

4. 自动切换时的无效更新与性能浪费

- 现状：
  - 自动切换路径即使当前语言与目标相同，也会调用 updateHeaderRules 再走一遍 getDynamicRules 检查，最后返回“unchanged”。这在频繁 tab 更新时浪费一次 API 调用。
- 建议：若 lastAppliedLanguage === targetLanguage 则直接早退（自动切换也可安全早退）。如担心外部修改，可以增加“低频校验”。

5. DNR 资源类型与匹配范围

- 现状：
  - 规则 `condition.urlFilter: "*"`，`resourceTypes` 包含大量类型。
- 影响：
  - 接受所有 URL 类型的匹配，虽 DNR 性能尚可，但无谓扩大范围；也可能影响到“非必要请求类型”的 Accept-Language。
- 建议：
  - 收窄 `resourceTypes` 至会携带 Accept-Language 的类型：`main_frame`, `sub_frame`, `xmlhttprequest`（基本可覆盖 fetch/XHR），如需谨慎可保留 script/`image` 等是否冗余评估。
  - 如果能接受仅针对 http/https，可通过 `regexFilter` 或规则集合减少歧义（可选）。

6. SW 日志与 i18n 加载顺序

- 现状：
  - DomainRulesManager 依赖全局 domainManagerI18n，注释称 shared-i18n-base.js 已在 background.js 通过 importScripts 加载（未在审查片段中直接看到）。
- 风险：若加载顺序变更或未来重构为 ESM，可能造成 i18n 未就绪。
- 建议：在 background.js 顶部保证导入顺序：shared-i18n-base.js -> i18n/*-i18n.js -> 其他模块；或在 DomainRulesManager 内对 i18n 缺失做好降级处理（已有，但建议保证顺序）。

7. 域名规则加载的健壮性

- 现状：
  - domain-rules.json 使用 fetch(getURL(..))，无超时/重试；失败时返回空规则。
- 建议：
  - 为规则文件加载增加超时与有限重试；失败时可设置“只使用 TLD 兜底”或“直接走 fallback 语言，不自动切换”策略，避免误判。

8. 自定义规则变更的缓存失效

- 现状：
  - 存在自定义规则加载逻辑与缓存（domainCache、parsedDomainCache），但未见“自定义规则更新后自动清理/失效缓存”的路径。
- 建议：
  - 在写入/修改自定义规则后调用 clearCache(true) 或精细化失效，避免旧缓存导致匹配不生效。

9. 更新检查与网络权限

- 现状：
  - UpdateChecker 针对 GitHub Releases 有完善的超时/重试/降级；但对 host_permissions 声明不明（MV3 中 extension pages 跨域 fetch 通常允许，但建议最小权限）。
- 建议：
  - 若 manifest 中启用了 `host_permissions: ["https://api.github.com/*"]`，请确认最小化；若未声明但能正常工作，可在文档中注明“无需 host_permissions”。

低优先级/可读性与维护性 10) 消息处理 return true 一致性

- 现状：
  
  - onMessage 的分支大多 `return true` 以保持异步响应。请确保新增消息类型也保持一致，避免响应丢失。

11. 命名与常量集中
  

- 建议：
  
  - 将 RULE_ID、默认语言（DEFAULT_LANG_EN, DEFAULT_LANG_ZH）、重试常量、缓存大小等集中到 `shared/constants.js`，便于统一修改。

12. 统一日志接口
  

- 建议：
  
  - sendBackgroundLog 很好用；建议统一所有 console.log/warn/error 入口（尤其 Service Worker 侧），便于开关调试等级与搜集问题。

13. 文档与注释
  

- 建议：
  - 在 `README` 或 Wiki.md 增补 SW 生命周期与初始化流程图；标注“为何规则清理只清理 RULE_ID”。

MV3 合规检查（重点项）

- Service Worker：
  - 无长轮询/持久计时器；消息处理 return true；OK。
- 权限：
  - 使用 declarativeNetRequest（已在 debug 检查中校验），如果使用了 `declarativeNetRequestFeedback` 需确认是否实际使用，否则移除。
  - 读取 tab.url 需 tabs 权限或相应 host 权限；核对 manifest.json 是否已声明。
- CSP：
  - popup.html 未见内联脚本；使用外链脚本；OK。
- web_accessible_resources：
  - 确保仅暴露必要资源（字体/检测页/图片），避免扩大暴露面。
- messaging：
  - onMessage 使用模式正确；异步返回已 return true；OK。
- DNR 规则：
  - `modifyHeaders` 使用动态规则；OK。建议收窄资源类型（见问题 5）。

缓存正确性与性能

- LRU 实现正确（基于 Map 插入顺序；重复键先删后设；满容量淘汰首个）。
- maxCacheSize=100 保守，合理。可考虑曝光为设置或根据内存占用自适应。
- 命中率统计简洁；考虑在日志中周期性输出以便调优。
- 中枢路径上尽量减少 getDynamicRules 调用频率（见问题 4）。

i18n 与回退

- BaseI18n 提供了 SW/Popup 区分与回退；日志键覆盖较全。
- 建议：
  - 增加缺失键检测（构建或调试脚本），避免运行时 KeyError。
  - 对用户可见文本（Popup）务必保证双语覆盖；对日志键缺失可接受。

消息契约一致性

- Popup/Debug 与 background.js 的消息类型较一致：`UPDATE_RULES`/`GET_CURRENT_LANG`/`AUTO_SWITCH_TOGGLED`/`RESET_ACCEPT_LANGUAGE`/`GET_DOMAIN_RULES`/`UPDATE_CHECK`/缓存操作系列。
- 建议：
  - 建立一个共享的类型常量表和 TS 风格的 Payload 定义（即便项目是 JS，也可在 docs 中维护）。

安全性审查

- 广泛修改 Accept-Language（全站生效）是预期行为，但请确认：
  - 是否需要对特定域名白名单/黑名单处理（例如银行/支付站点）；
  - 是否需要在 Debug 页显式提示此行为范围。
- Host permissions 尽量最小化；不需要的权限移除（例如 `declarativeNetRequestFeedback` 如未用）。
- fetch 用于本地打包资源和 GitHub API；对远端请求建议统一加超时与错误分类（规则文件已打包则影响小）。

可操作修复清单（按优先级）

- 限定 DNR 清理与更新仅作用于 RULE_ID；不要全清本扩展的动态规则。
- 为 updateHeaderRules 增加互斥/队列；对相同语言更新进行短路（自动切换同样短路）。
- 统一 chrome.storage Promise 风格；封装读写方法。
- 收窄 DNR `resourceTypes`。
- 自定义规则更新后清理/失效缓存。
- 为 domain-rules.json 加超时/重试（或只在首次失败时 fallback 并上报日志）。
- 确认 manifest.json 权限最小化，并在 docs 中记录网络访问与安全边界。