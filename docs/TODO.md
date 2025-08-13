## ⚠️ 需要注意的问题与建议

1. 自定义规则的严格格式验证

---

## 🔄 代码重复问题修复计划

基于代码分析，发现以下代码重复问题需要重构：

### 🔴 **高重复度 - 立即需要重构**

#### 1. **错误处理模式重复**
**问题分析**:
以下错误处理模式在多个文件中重复出现：
```javascript
try {
  // 某些操作
} catch (error) {
  console.error('错误信息:', error);
  sendDebugLog('错误信息', 'error');
  return 默认值;
}
```

**重复文件**:
- **popup.js** - 10+处相同的错误处理模式
- **domain-rules-manager.js** - 4处类似的错误处理
- **shared-utils.js** - 翻译获取的错误处理
- **shared-update-checker.js** - 更新检查的错误处理
- **toggle.js** - 页面初始化的错误处理

**修复建议**: **创建通用的错误处理工具函数**

### 🟡 **中重复度 - 建议重构**

#### 2. **Chrome API调用模式重复**
**问题分析**:
Chrome Storage API调用模式在多个文件中重复：
```javascript
const result = await new Promise((resolve, reject) => {
  chrome.storage.local.get([key], (result) => {
    if (chrome.runtime.lastError) {
      reject(new Error(chrome.runtime.lastError.message));
      return;
    }
    resolve(result);
  });
});
```

**重复文件**:
- **popup.js** - 多处Storage API调用
- **background.js** - 类似的Storage API调用
- **domain-rules-manager.js** - getCustomRules方法
- **debug-ui.js** - 存储访问逻辑

**修复建议**: **抽象Chrome API调用为Promise化的工具函数**

### 🟢 **低重复度 - 可选重构**

#### 3. **日志记录模式重复**
**问题分析**:
类似的日志记录模式在多个文件中出现：
```javascript
sendDebugLog(`${i18n.t('message_key')} ${variable}`, 'logType');
```

**修复建议**: **标准化日志记录接口，支持模板化消息**

### 🚫 **不建议重构 - 保持现状**

#### 4. **翻译获取逻辑重复** - shared-utils.js:51-89
**问题分析**: 
- **shared-utils.js** 中有 `getFallbackTranslation()` 和 `getUpdateTranslation()`
- **shared-i18n-base.js** 中也有类似的 `getFallbackTranslation()` 方法  
- **shared-update-checker.js** 中有 `getLocalizedText()` 函数
- 多个文件都在重复实现语言检测和翻译回退逻辑

**不重构原因**:
- **核心功能稳定**: 翻译系统是多个组件的核心依赖
- **重构风险高**: 可能破坏现有的国际化功能
- **复杂度高**: 涉及多个组件间的复杂交互
- **测试成本高**: 需要全面测试所有语言切换场景

**维护策略**: **保持现有架构，仅在必要时进行局部优化**

---

## 🎯 代码重构优先级

### **立即重构** (本周内)
1. **错误处理标准化** - 提升代码质量和维护性，影响范围广

### **计划重构** (下周内)
2. **Chrome API调用抽象** - 减少样板代码，提升可靠性
3. **日志记录标准化** - 改善调试体验

### **重构策略**
- 建立标准化的错误处理工具
- 抽象Chrome API调用为Promise化工具
- 标准化日志记录接口
- 保持向后兼容性，渐进式重构
- **保持翻译系统现有架构不变**

### **预期收益**
- 🔧 **维护性提升**: 减少重复代码，统一修改点
- 🐛 **错误率降低**: 标准化处理减少边界情况遗漏  
- 📦 **包体积优化**: 消除重复代码，减少最终包大小
- 🚀 **开发效率**: 复用组件，加快新功能开发

---

## 🔧 资源管理修复计划

基于代码分析，以下组件需要实施类似popup.js的资源管理修复：

### 🔴 **高优先级 - 立即需要修复**

#### 1. **debug-ui.js** - 调试界面
**风险评估**: 🔴 **极高风险**
- **问题分析**:
  - 15个事件监听器未统一管理 (`addEventListener` 调用)
  - 1个定时器 (`setTimeout`) 用于延迟初始化
  - 1个定期检查间隔器 (`setInterval`) 用于缓存状态检查
  - 调试页面频繁打开关闭，资源泄漏累积严重
- **具体风险点**:
  - 按钮事件监听器: showRulesBtn, clearLogsBtn, testHeaderBtn, fixPriorityBtn等
  - 过滤器复选框事件监听器数组
  - 缓存管理相关按钮事件监听器 (6个)
  - setInterval定期检查未被清理
- **修复建议**: **立即实施resourceTracker系统**

### 🟡 **中优先级 - 建议修复**

#### 2. **background.js** - 后台服务
**风险评估**: 🟡 **中等风险**
- **问题分析**:
  - 1个定时器 (`setTimeout`) 用于重试机制
  - 1个防抖定时器 (`setTimeout`) 用于UI更新
  - Chrome标签页监听器 (`chrome.tabs.onUpdated`) 长期运行
  - Service Worker有内置生命周期管理，但手动管理更安全
- **具体风险点**:
  - 重试机制的定时器可能在Service Worker重启时泄漏
  - UI更新防抖定时器需要清理
  - 标签页监听器在Service Worker重启时需要重新注册
- **修复建议**: **实施轻量级资源管理**

#### 3. **detect.js** - 检测页面  
**风险评估**: 🟡 **中等风险**
- **问题分析**:
  - 2个定时器: 页面初始化延迟 + fetch超时控制
  - 1个页面加载事件监听器
  - 网络请求的AbortController管理
  - 页面相对简单但有网络请求资源管理需求
- **具体风险点**:
  - fetch请求的AbortController和超时定时器
  - 页面初始化的延迟定时器
  - WebRTC连接检测的异步资源
- **修复建议**: **重点关注网络请求资源管理**

### 🟢 **低优先级 - 可选修复**

#### 4. **toggle.js** - 切换功能
**风险评估**: 🟢 **低风险**
- **问题分析**:
  - 3个事件监听器: 语言切换按钮 + 主题切换按钮 + 系统主题变化
  - 代码结构简单，生命周期清晰
  - 主要是静态事件监听器，泄漏风险较低
- **具体风险点**:
  - 动态创建的语言切换按钮事件监听器
  - 系统主题变化监听器 (`matchMedia.addEventListener`)
- **修复建议**: **风险较低，可选择性修复**

#### 5. **domain-rules-manager.js** - 域名规则管理
**风险评估**: 🟢 **极低风险**
- **问题分析**:
  - 纯数据管理类，无事件监听器或定时器
  - 主要是缓存和规则处理逻辑
  - 资源管理风险几乎为零
- **修复建议**: **无需修复**

---

## 📌 修复优先级总结

### **立即行动** (本周内)
1. **debug-ui.js** - 15个事件监听器 + 定时器/间隔器管理

### **计划修复** (下周内)  
2. **background.js** - Service Worker资源管理优化
3. **detect.js** - 网络请求和定时器资源管理

### **可选修复** (有时间时)
4. **toggle.js** - 简单事件监听器管理
5. **domain-rules-manager.js** - 无需修复

### **修复策略**
- 复用popup.js的resourceTracker系统设计
- 针对不同组件的特点进行适配
- 重点关注频繁使用的调试界面
- Service Worker采用轻量级资源管理方案

---

## 📝 后续计划

### 资源管理标准化
- [ ] 创建可复用的resourceTracker模块
- [ ] 建立资源管理最佳实践文档  
- [ ] 实施代码审查检查清单
- [ ] 添加资源泄漏检测工具
