# 资源管理最佳实践指南

## 概述

本指南定义了 MultiLangSwitcher 项目中资源管理的最佳实践，确保浏览器扩展的内存安全性和性能稳定性。资源管理主要涉及事件监听器、定时器、消息监听器等浏览器资源的正确创建、跟踪和清理。

## 核心原则

### 1. 统一资源跟踪
- **集中管理**：所有资源创建和清理通过统一的 `resourceTracker` 对象进行
- **自动跟踪**：资源创建时自动添加到跟踪列表，无需手动管理
- **统一清理**：页面卸载时统一清理所有跟踪的资源

### 2. 内存泄漏预防
- **及时清理**：在页面卸载时立即清理所有资源
- **避免遗漏**：确保所有创建的资源都被正确跟踪
- **定期检查**：定期审查代码确保没有未跟踪的资源

### 3. 性能优化
- **轻量实现**：资源跟踪器本身占用最小的内存
- **高效清理**：批量清理操作减少性能开销
- **零影响**：资源管理不影响现有功能逻辑

## 资源类型和实现

### 1. 事件监听器管理

#### ✅ 推荐做法
```javascript
// 使用 resourceTracker 统一管理事件监听器
const resourceTracker = {
  eventListeners: [],

  addEventListener: function(element, event, handler, options = null) {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler, options });
  },

  removeEventListener: function(element, event, handler, options = null) {
    element.removeEventListener(event, handler, options);
    this.eventListeners = this.eventListeners.filter(
      listener => !(listener.element === element &&
                   listener.event === event &&
                   listener.handler === handler &&
                   listener.options === options)
    );
  }
};

// 使用示例
resourceTracker.addEventListener(document.getElementById('button'), 'click', handleClick);
resourceTracker.addEventListener(window, 'beforeunload', () => {
  resourceTracker.cleanup();
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

## 统一清理机制

### 1. 页面卸载时清理
```javascript
const resourceTracker = {
  // ... 资源跟踪方法

  cleanup: function() {
    // 清理事件监听器
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    this.eventListeners = [];

    // 清理定时器
    this.timers.forEach(id => clearTimeout(id));
    this.timers = [];
    this.intervals.forEach(id => clearInterval(id));
    this.intervals = [];

    // 清理消息监听器
    this.messageListeners.forEach(listener => {
      chrome.runtime.onMessage.removeListener(listener);
    });
    this.messageListeners = [];
  }
};

// 注册页面卸载事件
resourceTracker.addEventListener(window, 'beforeunload', () => {
  resourceTracker.cleanup();
});
```

### 2. 组件销毁时清理
```javascript
// 对于需要动态创建和销毁的组件
class DebugUIComponent {
  constructor() {
    this.resourceTracker = {
      eventListeners: [],
      timers: [],
      intervals: [],
      messageListeners: [],

      addEventListener: function(element, event, handler, options = null) {
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler, options });
      },

      cleanup: function() {
        // 清理逻辑同上
        this.eventListeners.forEach(({ element, event, handler, options }) => {
          element.removeEventListener(event, handler, options);
        });
        this.eventListeners = [];
        // ... 其他清理逻辑
      }
    };

    this.initialize();
  }

  destroy() {
    this.resourceTracker.cleanup();
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
const resourceTracker = {
  timers: [],
  intervals: [],

  // 定时器管理
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
  },

  // 统一清理方法
  cleanup: function() {
    // 清理定时器
    this.timers.forEach(id => clearTimeout(id));
    this.timers = [];
    this.intervals.forEach(id => clearInterval(id));
    this.intervals = [];
  }
};

// Service Worker 暂停时清理资源
chrome.runtime.onSuspend.addListener(() => {
  resourceTracker.cleanup();
});
```

### 3. 环境差异对比

| 资源类型 | 页面环境 (debug-ui.js, popup.js, toggle.js, detect.js) | Service Worker环境 (background.js) |
|---------|---------------------------------------------------|----------------------------------|
| 事件监听器 | ✅ 需要管理DOM事件监听器 | ❌ 不需要管理（Chrome API监听器由系统管理） |
| 定时器 | ✅ 需要管理 | ✅ 需要管理 |
| 消息监听器 | ✅ 需要管理 | ❌ 不需要管理（Chrome API监听器由系统管理） |
| AbortController | ✅ 需要管理（仅detect.js） | ❌ 不需要管理 |
| 清理时机 | `beforeunload` | `onSuspend` |
| 复杂度 | 高（多种资源类型） | 低（仅定时器） |

## 常见问题和解决方案

### 1. 资源清理时机
**问题**：页面卸载时资源没有完全清理
**解决方案**：
- 确保在 `beforeunload` 事件中调用 `cleanup()`
- 检查所有资源是否都被正确跟踪
- 使用浏览器的开发者工具检查内存泄漏

### 2. 事件监听器参数不匹配
**问题**：移除事件监听器时参数不匹配导致无法移除
**解决方案**：
- 确保移除时使用的参数与添加时完全一致
- 考虑使用函数引用而不是匿名函数
- 在添加时保存完整的参数对象

### 3. 异步资源清理
**问题**：异步操作中的资源没有正确清理
**解决方案**：
- 在异步函数开始时添加资源跟踪
- 在异步函数结束时（包括错误情况）清理资源
- 使用 try-finally 结构确保清理

### 4. 动态组件资源管理
**问题**：动态创建和销毁的组件资源管理复杂
**解决方案**：
- 为每个组件创建独立的 resourceTracker 实例
- 在组件销毁时调用 cleanup 方法
- 避免在组件间共享资源跟踪器

## 代码审查检查清单

### ✅ 资源管理检查
- [ ] 所有事件监听器都通过 `resourceTracker.addEventListener` 添加（页面环境）
- [ ] 所有定时器都通过 `resourceTracker.setTimeout/setInterval` 创建
- [ ] 所有消息监听器都通过 `resourceTracker.addMessageListener` 添加（页面环境）
- [ ] AbortController 都通过 `resourceTracker.createAbortController` 创建（detect.js）
- [ ] 页面卸载时调用了 `resourceTracker.cleanup()`
- [ ] 没有直接使用原生 API 创建资源

### ✅ 错误处理检查
- [ ] 资源操作都有适当的错误处理
- [ ] 异步资源操作有清理机制
- [ ] 资源清理失败有日志记录

### ✅ 性能检查
- [ ] 资源跟踪器本身没有造成性能问题
- [ ] 大量资源创建时有性能监控
- [ ] 资源清理操作不会阻塞UI

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

---

*本指南是活文档，会随着项目的发展而持续更新。如有建议或问题，请提交 Issue 或 Pull Request。*