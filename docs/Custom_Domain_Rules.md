# 自定义域名规则（扩展点）

`domain-rules-manager.js` 在域名匹配时会优先读取 `chrome.storage.local` 中的
`customDomainRules` 键。该键**没有内置 UI**，是一个面向高级用户 / 开发调试的
手动注入扩展点：用于覆盖或补充内置的 `domain-rules.json` 映射。

## 数据结构

与 `domain-rules.json` 的 `domainLanguageRules` 相同：扁平的
`域名（或域名后缀）→ 语言代码` 映射。

```json
{
  "example.com": "de-DE",
  "co.jp": "ja",
  "internal": "zh-CN"
}
```

## 匹配优先级

对每个待匹配域名按以下顺序查找，自定义规则始终先于内置规则：

1. 自定义规则 完整域名 → 2. 内置规则 完整域名
3. 自定义规则 二级域名（如 `co.uk`）→ 4. 内置规则 二级域名
5. 自定义规则 顶级域名（如 `uk`）→ 6. 内置规则 顶级域名

## 注入方法

在扩展的 Service Worker 控制台（`chrome://extensions` → 检查视图）执行：

```js
await chrome.storage.local.set({
  customDomainRules: { "example.com": "fr-FR" }
});
```

清除：

```js
await chrome.storage.local.remove("customDomainRules");
```

## 缓存行为

自定义规则在首次读取后缓存于内存；对 `customDomainRules` 的任何
storage 写入会自动失效该缓存及域名查询结果缓存（`storage.onChanged`
监听），注入后立即生效，无需重启扩展。
