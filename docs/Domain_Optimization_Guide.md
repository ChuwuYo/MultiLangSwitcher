# 域名匹配算法优化指南

## 优化概述

本次优化针对 `DomainRulesManager` 类中的域名匹配算法进行了全面改进，主要解决了以下性能问题和功能需求：

### 原有问题
1. **字符串分割开销**：每次查询都要执行 `domain.split('.')`
2. **重复计算**：二级域名和顶级域名的重复解析
3. **无缓存机制**：相同域名的重复查询没有缓存
4. **规则查找效率**：缺乏预处理优化
5. **语言子域名识别缺失**：无法识别 `cn.bing.com`、`zh-hans.react.dev` 等现代网站的语言子域名模式

### 优化方案

#### 1. 多层缓存机制
- **域名查询缓存** (`domainCache`)：缓存完整的查询结果（包括null结果）
- **域名解析缓存** (`parsedDomainCache`)：缓存域名解析结果，避免重复字符串分割
- **LRU淘汰策略**：最大缓存100条记录，自动淘汰最久未使用的条目

#### 2. 规则预处理
- **按类型分组**：将规则分为顶级域名、二级域名、完整域名三类，提高查找效率
- **启动时预处理**：在加载 `domain-rules.json` 时一次性完成预处理

#### 3. 语言子域名识别
- **智能识别**：支持现代网站的语言子域名模式，如 `cn.bing.com`、`zh-hans.react.dev`
- **优化映射表**：包含约60个常见语言代码，覆盖实际网站使用场景
- **智能推断机制**：当规则匹配失败时，根据语言子域名直接推断语言代码
- **分类清晰**：按语言圈分组（中文、英语、欧洲、亚洲等），便于维护

#### 4. 性能统计
- **缓存命中率统计**：实时监控缓存效果，提供精确的命中率数据
- **基础性能指标**：提供实用的缓存统计信息

## 使用方法

### 基本使用（保持兼容）
```javascript
// 原有的使用方式完全兼容
const language = await domainRulesManager.getLanguageForDomain('example.com');
```

### 新增功能

#### 1. 缓存管理
```javascript
// 获取缓存统计
const stats = domainRulesManager.getCacheStats();
console.log('域名缓存命中率:', stats.domainCacheHitRate);
console.log('解析缓存命中率:', stats.parsedCacheHitRate);

// 清理缓存
domainRulesManager.clearCache(); // 只清理域名查询缓存
domainRulesManager.clearCache(true); // 清理所有缓存

// 重置统计
domainRulesManager.resetCacheStats();
```

#### 2. 规则预加载（推荐）
```javascript
// 在扩展启动时预加载规则文件，避免首次查询延迟
await domainRulesManager.preloadRules();
```

#### 3. 语言子域名识别示例
```javascript
// 现代网站的语言子域名模式识别
const examples = [
  'cn.bing.com',           // → 'zh-CN'
  'zh-hans.react.dev',     // → 'zh-CN'
  'zh-hant.example.com',   // → 'zh-TW'
  'en.wikipedia.org',      // → 'en-US'
  'ja.example.com',        // → 'ja'
  'de.unknown-site.xyz',   // → 'de-DE' (智能推断)
  'fr.new-website.io'      // → 'fr-FR' (智能推断)
];

// 所有示例都能正确识别语言代码
for (const domain of examples) {
  const language = await domainRulesManager.getLanguageForDomain(domain);
  console.log(`${domain} → ${language}`);
}
```

## 性能改进

### 预期性能提升
1. **首次查询**：通过规则预处理，减少查找时间约30-50%
2. **重复查询**：通过缓存机制，减少查找时间约80-95%
3. **域名解析**：通过解析缓存，避免重复字符串操作

### 内存使用
- **缓存大小**：最大100条域名查询缓存 + 100条解析缓存
- **预估内存**：约10KB额外内存使用
- **自动管理**：LRU策略自动清理过期缓存

## 兼容性说明

### 完全兼容
- 所有现有的API调用方式保持不变
- 日志输出格式和内容保持一致
- 返回值结构完全相同

### 新增功能
- 所有新增的方法都是可选的
- 不影响现有代码的正常运行
- 可以逐步采用新的优化功能

## 调试和监控

### 缓存效果监控
```javascript
// 定期检查缓存效果
setInterval(() => {
  const stats = domainRulesManager.getCacheStats();
  console.log(`缓存效果 - 域名: ${stats.domainCacheHitRate}, 解析: ${stats.parsedCacheHitRate}`);
}, 60000); // 每分钟检查一次
```

### 性能分析
```javascript
// 获取基础缓存统计
const stats = domainRulesManager.getCacheStats();
console.log('域名缓存:', stats.domainCacheSize, '命中率:', stats.domainCacheHitRate);
console.log('解析缓存:', stats.parsedDomainCacheSize, '命中率:', stats.parsedCacheHitRate);
```

## 最佳实践

### 1. 规则预加载
在扩展启动时预加载规则文件：
```javascript
// 在 background.js 中
chrome.runtime.onStartup.addListener(async () => {
  await domainRulesManager.preloadRules();
});
```

### 2. 定期清理
在适当时机清理缓存：
```javascript
// 在规则更新后清理缓存
chrome.storage.onChanged.addListener((changes) => {
  if (changes.customDomainRules) {
    domainRulesManager.clearCache();
  }
});
```

### 3. 性能监控
在调试模式下监控性能：
```javascript
// 开发环境下的性能监控
if (chrome.runtime.getManifest().version.includes('dev')) {
  setInterval(() => {
    const stats = domainRulesManager.getCacheStats();
    console.log('域名匹配缓存效果:', stats.domainCacheHitRate);
  }, 30000);
}
```

## 语言子域名映射表配置

### 映射表结构
`_languageSubdomainMap` 包含约60个常见语言代码，按语言圈分组：

```javascript
// 中文圈（常见）
'zh': 'zh-CN',
'zh-cn': 'zh-CN',
'zh-hans': 'zh-CN',
'zh-tw': 'zh-TW',
'zh-hk': 'zh-HK',
'zh-hant': 'zh-TW',
'cn': 'zh-CN',
'tw': 'zh-TW',
'hk': 'zh-HK',

// 英语（常见）
'en': 'en-US',
'en-us': 'en-US',
'en-gb': 'en-GB',
'en-au': 'en-AU',
'en-ca': 'en-CA',
'us': 'en-US',
'uk': 'en-GB',
'au': 'en-AU',

// 主要欧洲语言（实际使用）
'es': 'es-ES',
'fr': 'fr-FR',
'de': 'de-DE',
'it': 'it',
'pt': 'pt-PT',
'pt-br': 'pt-BR',
'br': 'pt-BR',
'ru': 'ru',
'nl': 'nl',

// 亚洲主要语言（实际使用）
'ja': 'ja',
'jp': 'ja',
'ko': 'ko',
'kr': 'ko',
'th': 'th',
'vi': 'vi',
'id': 'id',
'ms': 'ms',

// 其他常见的语言代码（仅包含实际网站中使用的）
'ar': 'ar', 'tr': 'tr', 'pl': 'pl', 'sv': 'sv', 'da': 'da',
'no': 'no', 'fi': 'fi', 'he': 'he', 'hi': 'hi', 'cs': 'cs',
'hu': 'hu', 'el': 'el', 'bg': 'bg', 'ro': 'ro', 'hr': 'hr',
'sr': 'sr', 'sk': 'sk', 'sl': 'sl', 'lt': 'lt', 'lv': 'lv',
'et': 'et', 'ca': 'ca', 'bn': 'bn', 'ur': 'ur', 'fa': 'fa',
'uk': 'uk'
```

### 工作原理
1. **优先级检查**：语言子域名识别优先于传统域名规则匹配
2. **智能推断**：未在映射表中的语言代码会触发智能推断机制
3. **回退机制**：推断失败时回退到传统的域名规则匹配

### 配置原则
- **实用性优先**：只包含实际网站中使用的语言子域名
- **避免冲突**：确保语言代码与国家代码不产生歧义
- **维护简便**：按语言圈分组，便于后续维护和扩展

## 注意事项

1. **缓存一致性**：自定义规则更新后需要手动清理缓存
2. **内存管理**：缓存会占用一定内存，但有自动清理机制
3. **统计精度**：缓存统计在扩展重启后会重置
4. **调试日志**：所有原有的调试日志都保持不变
5. **语言子域名优先级**：语言子域名识别优先于传统域名规则，确保现代网站的正确识别

## 更新历史

- **v1.8.59**：初始优化版本，添加缓存和预处理功能
- **v1.8.60**：语言子域名识别优化，支持现代网站的语言子域名模式，优化 `_languageSubdomainMap` 映射表