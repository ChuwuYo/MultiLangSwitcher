# 域名匹配算法优化指南

## 优化概述

本次优化针对 `DomainRulesManager` 类中的域名匹配算法进行了全面改进，主要解决了以下性能问题：

### 原有问题
1. **字符串分割开销**：每次查询都要执行 `domain.split('.')`
2. **重复计算**：二级域名和顶级域名的重复解析
3. **无缓存机制**：相同域名的重复查询没有缓存
4. **规则查找效率**：缺乏预处理优化

### 优化方案

#### 1. 多层缓存机制
- **域名查询缓存** (`domainCache`)：缓存完整的查询结果（包括null结果）
- **域名解析缓存** (`parsedDomainCache`)：缓存域名解析结果，避免重复字符串分割
- **LRU淘汰策略**：最大缓存100条记录，自动淘汰最久未使用的条目

#### 2. 规则预处理
- **按类型分组**：将规则分为顶级域名、二级域名、完整域名三类，提高查找效率
- **启动时预处理**：在加载 `domain-rules.json` 时一次性完成预处理

#### 3. 性能统计
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

#### 2. 缓存预热（可选）
```javascript
// 使用默认常用域名预热缓存
domainRulesManager.preloadCache();

// 使用自定义域名列表预热
const customDomains = ['google.com', 'github.com'];
domainRulesManager.preloadCache(customDomains);
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

### 1. 缓存预热
在扩展启动时预热常用域名：
```javascript
// 在 background.js 中
chrome.runtime.onStartup.addListener(() => {
  domainRulesManager.preloadCache();
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

## 注意事项

1. **缓存一致性**：自定义规则更新后需要手动清理缓存
2. **内存管理**：缓存会占用一定内存，但有自动清理机制
3. **统计精度**：缓存统计在扩展重启后会重置
4. **调试日志**：所有原有的调试日志都保持不变

## 更新历史

- **v1.0**：初始优化版本，添加缓存和预处理功能
- 兼容原有的所有功能和API
- 新增性能监控和统计功能