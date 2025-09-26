# 资源管理最佳实践指南

## 概述

本指南定义了 MultiLangSwitcher 项目中资源管理的最佳实践，确保浏览器扩展的内存安全性和性能稳定性。资源管理主要涉及事件监听器、定时器、消息监听器等浏览器资源的正确创建和使用。

## 核心原则

### 1. 统一资源管理
- **集中管理**：所有资源创建通过统一的 `ResourceManager` 对象进行
- **智能清理**：区分需要手动清理和自动清理的资源类型
- **平衡设计**：在自动清理和必要的手动控制之间取得平衡

### 2. 内存泄漏预防
- **自动清理为主**：浏览器自动清理页面关闭时的DOM事件监听器
- **手动清理为辅**：仅对确实需要手动清理的资源进行跟踪和清理
- **环境差异化**：针对不同环境采用不同的清理策略

### 3. 性能优化
- **精确跟踪**：仅跟踪需要手动清理的资源，减少开销
- **零影响**：资源管理不影响现有功能逻辑
- **环境适配**：根据运行环境优化资源管理策略

## 资源类型和实现

### 1. 事件监听器管理

#### ✅ 推荐做法
```javascript
// 使用 ResourceManager 统一管理事件监听器
ResourceManager.addEventListener(document.getElementById('button'), 'click', handleClick);

// 浏览器会自动清理DOM事件监听器，无需手动清理
ResourceManager.addEventListener(window, 'beforeunload', () => {
  // 仅清理确实需要手动清理的资源
  ResourceManager.cleanup();
});
```

#### ❌ 避免的做法
```javascript
// ❌ 直接使用原生 API，容易造成内存泄漏
document.getElementById('button').addEventListener('click', handleClick);

// ❌ 手动管理，容易遗漏
const listeners = [];
const addListener = (element, event, handler) => {
  element.addEventListener(event, handler);
  listeners.push({ element, event, handler });
};
```

### 2. 定时器管理

#### ✅ 推荐做法
```javascript
const resourceTracker = {
  timers: [],
  intervals: [],

  setTimeout: function(callback, delay) {
    const id = setTimeout(callback, delay);
    this.timers.push(id);
    return id;
  },

  setInterval: function(callback, delay) {
    const id = setInterval(callback, delay);
    this.intervals.push(id);
    return id;
  },

  clearTimeout: function(id) {
    clearTimeout(id);
    this.timers = this.timers.filter(timerId => timerId !== id);
  },

  clearInterval: function(id) {
    clearInterval(id);
    this.intervals = this.intervals.filter(intervalId => intervalId !== id);
  }
};

// 使用示例
const timeoutId = resourceTracker.setTimeout(() => {
  console.log('执行延时任务');
}, 1000);

const intervalId = resourceTracker.setInterval(() => {
  console.log('执行定期任务');
}, 5000);
```

### 3. 消息监听器管理（仅页面环境）

#### ✅ 推荐做法
```javascript
const resourceTracker = {
  messageListeners: [],

  addMessageListener: function(listener) {
    chrome.runtime.onMessage.addListener(listener);
    this.messageListeners.push(listener);
  },

  removeMessageListener: function(listener) {
    chrome.runtime.onMessage.removeListener(listener);
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
  }
};

// 使用示例（仅在页面环境中使用，如debug-ui.js）
const messageHandler = (request, sender, sendResponse) => {
  if (request.type === 'DEBUG_LOG') {
    console.log('Debug message:', request.message);
  }
};

resourceTracker.addMessageListener(messageHandler);
```

## 资源管理机制

### 1. 页面环境资源管理
```javascript
// 页面环境使用 ResourceManager 统一管理资源
// 浏览器自动处理页面关闭时的DOM事件监听器清理

// 事件监听器管理（浏览器自动清理）
ResourceManager.addEventListener(document.getElementById('button'), 'click', handleClick);

// 定时器管理（需要手动清理）
const timeoutId = ResourceManager.setTimeout(() => {
  console.log('执行延时任务');
}, 1000);

// 消息监听器管理（某些情况下需要手动清理）
const messageListener = ResourceManager.addMessageListener((request) => {
  if (request.type === 'DEBUG_LOG') {
    console.log('Debug message:', request.message);
  }
});

// 页面卸载时清理需要手动清理的资源
ResourceManager.addEventListener(window, 'beforeunload', () => {
  ResourceManager.cleanup(); // 仅清理定时器、控制器等需要手动清理的资源
  if (messageListener) {
    ResourceManager.removeMessageListener(messageListener); // 可选：手动清理消息监听器
  }
});
```

### 2. 组件资源管理
```javascript
// 对于需要动态创建和销毁的组件
class DebugUIComponent {
  constructor() {
    this.timers = [];
    this.initialize();
  }

  initialize() {
    // 使用 ResourceManager 管理资源
    this.timers.push(ResourceManager.setTimeout(() => {
      console.log('组件初始化完成');
    }, 100));
  }

  destroy() {
    // 清理定时器
    this.timers.forEach(id => ResourceManager.clearTimeout(id));
    this.timers = [];
  }
}
```

## 最佳实践

### 1. 资源创建原则
- **统一入口**：所有资源创建都通过 `resourceTracker` 进行
- **立即跟踪**：资源创建后立即添加到跟踪列表
- **参数一致**：确保移除时使用的参数与添加时完全一致

### 2. 错误处理
```javascript
// 安全的资源操作
const safeAddEventListener = (element, event, handler, options = null) => {
  try {
    if (element && typeof element.addEventListener === 'function') {
      resourceTracker.addEventListener(element, event, handler, options);
    } else {
      console.warn('Invalid element for event listener:', element);
    }
  } catch (error) {
    console.error('Failed to add event listener:', error);
  }
};
```

### 3. 资源使用统计
```javascript
// 获取当前资源使用统计
const getResourceStats = () => {
  const stats = {
    eventListeners: resourceTracker.eventListeners?.length || 0,
    timers: resourceTracker.timers?.length || 0,
    intervals: resourceTracker.intervals?.length || 0,
    messageListeners: resourceTracker.messageListeners?.length || 0,
    abortControllers: resourceTracker.abortControllers?.length || 0
  };

  console.log('Current resource usage:', stats);
  return stats;
};

// 手动检查资源使用情况（开发调试用）
getResourceStats();
```

## 实际应用示例

### 1. debug-ui.js 资源管理实现（页面环境）
```javascript
// 实际项目中的完整实现 - 适用于页面环境
const resourceTracker = {
  eventListeners: [],
  timers: [],
  intervals: [],
  messageListeners: [],

  addEventListener: function(element, event, handler, options = null) {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler, options });
  },

  setTimeout: function(callback, delay, ...args) {
    const id = setTimeout(callback, delay, ...args);
    this.timers.push(id);
    return id;
  },

  setInterval: function(callback, interval, ...args) {
    const id = setInterval(callback, interval, ...args);
    this.intervals.push(id);
    return id;
  },

  addMessageListener: function(listener) {
    chrome.runtime.onMessage.addListener(listener);
    this.messageListeners.push(listener);
  },

  cleanup: function() {
    // 移除所有事件监听器
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    this.eventListeners = [];

    // 清除所有定时器
    this.timers.forEach(id => clearTimeout(id));
    this.timers = [];

    // 清除所有间隔定时器
    this.intervals.forEach(id => clearInterval(id));
    this.intervals = [];

    // 移除所有消息监听器
    this.messageListeners.forEach(listener => {
      chrome.runtime.onMessage.removeListener(listener);
    });
    this.messageListeners = [];
  }
};

// 注册清理事件
resourceTracker.addEventListener(window, 'beforeunload', () => {
  resourceTracker.cleanup();
});
```

### 2. background.js 资源管理实现（Service Worker环境）
```javascript
// 实际项目中的简化实现 - 适用于Service Worker环境
// 使用 ResourceManager 统一管理资源，Service Worker 暂停时由系统自动处理

// 定时器管理
ResourceManager.setTimeout(() => {
  console.log('执行延时任务');
}, 1000);

ResourceManager.setInterval(() => {
  console.log('执行定期任务');
}, 5000);

// Service Worker 暂停时由 Chrome 运行时系统自动处理资源清理
// 无需手动清理，系统会自动管理
```

### 3. 环境差异对比

| 资源类型 | 页面环境 (debug-ui.js, popup.js, toggle.js, detect.js) | Service Worker环境 (background.js) |
|---------|---------------------------------------------------|----------------------------------|
| 事件监听器 | ✅ 浏览器自动清理（推荐） | ❌ 不需要管理（Chrome API监听器由系统管理） |
| 定时器 | ✅ 需要手动清理 | ✅ 需要手动清理 |
| 消息监听器 | ⚠️ 可选手动清理 | ❌ 不需要管理（Chrome API监听器由系统管理） |
| AbortController | ✅ 需要手动清理（仅detect.js） | ❌ 不需要管理 |
| RTCPeerConnection | ✅ 需要手动清理 | ❌ 不需要管理 |
| 清理机制 | 浏览器自动处理DOM资源 + 手动清理特定资源 | Chrome运行时系统自动处理 + 手动清理定时器 |
| 复杂度 | 中等（自动+手动混合） | 低（仅手动清理定时器） |

## 常见问题和解决方案

### 1. 资源清理策略选择
**问题**：不确定哪些资源需要手动清理，哪些可以依赖自动清理
**解决方案**：
- **自动清理**：DOM事件监听器、普通JavaScript对象
- **手动清理**：定时器、AbortController、RTCPeerConnection、WebRTC连接
- **可选手动清理**：消息监听器（通常不需要，但复杂场景下可能需要）
- 使用 ResourceManager.getStats() 检查当前资源使用情况

### 2. 事件监听器参数不匹配
**问题**：移除事件监听器时参数不匹配导致无法移除
**解决方案**：
- 确保移除时使用的参数与添加时完全一致
- 考虑使用函数引用而不是匿名函数
- 在添加时保存完整的参数对象用于后续移除
- 对于DOM事件监听器，通常不需要手动移除（浏览器自动处理）

### 3. 异步资源管理
**问题**：异步操作中的资源没有正确管理
**解决方案**：
- 在异步函数开始时通过ResourceManager创建需要手动清理的资源
- 依赖浏览器的自动清理机制处理DOM相关资源
- 使用 try-finally 结构确保异步操作的正确执行
- 页面关闭时调用 ResourceManager.cleanup() 清理剩余资源

### 4. 动态组件资源管理
**问题**：动态创建和销毁的组件资源管理复杂
**解决方案**：
- 使用ResourceManager统一管理需要手动清理的资源
- 依赖浏览器的自动清理机制处理DOM事件监听器
- 避免在组件间共享资源管理器实例
- 组件销毁时调用 ResourceManager.cleanup() 清理定时器等资源

## 代码审查检查清单

### ✅ 资源管理检查
- [ ] 所有需要手动清理的定时器都通过 `ResourceManager.setTimeout/setInterval` 创建
- [ ] AbortController 都通过 `ResourceManager.createAbortController` 创建（detect.js）
- [ ] RTCPeerConnection 都通过 `ResourceManager.createRTCPeerConnection` 创建
- [ ] 页面卸载时调用了 `ResourceManager.cleanup()` 清理需要手动清理的资源
- [ ] 没有直接使用原生 API 创建需要手动清理的资源

### ✅ 自动清理资源检查
- [ ] DOM事件监听器使用 `ResourceManager.addEventListener`（但不需要手动清理）
- [ ] 消息监听器使用 `ResourceManager.addMessageListener`（通常不需要手动清理）
- [ ] 避免对自动清理的资源进行不必要的跟踪

### ✅ 错误处理检查
- [ ] 资源操作都有适当的错误处理
- [ ] 异步资源操作有适当的错误处理机制
- [ ] 资源操作失败有适当的日志记录

### ✅ 性能检查
- [ ] 资源管理器仅跟踪需要手动清理的资源，避免过度跟踪
- [ ] 大量资源创建时有性能监控
- [ ] 平衡自动清理和手动清理，避免不必要的性能开销

## 工具和调试

### 1. 内存泄漏检测
```javascript
// 手动检查资源泄漏（开发调试用）
const detectMemoryLeaks = () => {
  console.log('=== 资源泄漏检测 ===');

  // 检查资源跟踪器中的资源数量
  const stats = getResourceStats();

  // 警告资源使用过多
  const totalResources = Object.values(stats).reduce((sum, count) => sum + count, 0);
  if (totalResources > 100) {
    console.warn('⚠️ 检测到大量资源，可能存在泄漏:', totalResources);
  } else {
    console.log('✅ 资源使用正常:', totalResources);
  }

  // 强制垃圾回收（仅在开发环境）
  if (window && window.gc) {
    window.gc();
    console.log('🧹 已执行垃圾回收');
  }

  return stats;
};

// 手动调用检测
// detectMemoryLeaks();
```

### 2. 资源使用监控
```javascript
// 简单的资源使用监控（开发调试用）
const monitorResourceUsage = () => {
  console.log('=== 资源使用监控 ===');

  const stats = getResourceStats();

  // 检查是否有资源持续增长的迹象
  const totalResources = Object.values(stats).reduce((sum, count) => sum + count, 0);

  if (totalResources > 50) {
    console.warn('⚠️ 资源使用较高，建议检查是否有泄漏:', stats);
  } else {
    console.log('✅ 资源使用正常:', stats);
  }

  return stats;
};

// 手动调用监控
// monitorResourceUsage();
```

## 更新历史

- **v1.8.75**：初始版本，基于 debug-ui.js 资源管理修复经验编写
- **v1.8.79**：完善资源类型覆盖，添加基本的资源统计功能
- **v1.8.84**：添加Service Worker环境资源管理策略，更新background.js简化实现示例，修正文档与实际代码实现的一致性
- **v1.8.90**：简化资源管理策略，移除手动cleanup方法，依赖浏览器自动资源管理机制，减少过度工程化
- **v1.8.95**：重新设计资源管理策略，实现自动清理和手动清理的平衡，区分不同资源类型的清理需求

---

*本指南是活文档，会随着项目的发展而持续更新。如有建议或问题，请提交 Issue 或 Pull Request。*