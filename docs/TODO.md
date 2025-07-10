
## ⚠️ 需要注意的问题与建议

### 1\. **domain-rules.json 配置可同步化**

目前 `domain-rules.json` 与 `domain-rules-manager.js` 手动维护，建议：

-   在 `background.js` 启动阶段动态 load JSON，避免配置冗余。
    
-   可引入版本控制结构，让扩展自动检测 JSON 更新并热加载规则。
    

---

### 2\. **i18n 实现方式建议优化**

当前 i18n 通过 `i18n/` 目录 JSON +页面直接引用：

-   建议统一封装一个通用 `translate(key)` 函数，避免在多个文件中重复 `getLocale()`, `messages[key]`。
    

---

### 3\. **错误/异常日志统一**

各方式中 `console.error(...)` 分散，建议封装日志器：

或发送到 `debug-ui.js` 统一展示。

---

## 📌 总结建议

| 项目 | 建议优化 |
| --- | --- |
| **domain 配置** | 启动时自动 sync JSON & 规则 |
| **i18n** | 封装 `translate()` 简化多处代码 |
| **日志处理** | 统一 logger + UI 展示机制 |

---

## 📝 后续计划
