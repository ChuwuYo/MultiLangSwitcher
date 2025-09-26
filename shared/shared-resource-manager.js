// 统一的资源管理器 - 平衡自动清理和手动控制
// 适用于浏览器扩展的各种页面类型

const ResourceManager = {
  // 资源跟踪 - 跟踪需要手动清理的资源
  _trackedResources: {
    timers: new Set(),
    controllers: new Set(),
    messageListeners: new Set(),
    peerConnections: new Set(),
    eventListeners: new Set()
  },

  // 定时器管理 - 跟踪需要手动清理的定时器
  setTimeout: (callback, delay, ...args) => {
    const id = setTimeout(callback, delay, ...args);
    ResourceManager._trackedResources.timers.add(id);
    return id;
  },

  setInterval: (callback, delay, ...args) => {
    const id = setInterval(callback, delay, ...args);
    ResourceManager._trackedResources.timers.add(id);
    return id;
  },

  clearTimeout: (id) => {
    clearTimeout(id);
    ResourceManager._trackedResources.timers.delete(id);
  },

  clearInterval: (id) => {
    clearInterval(id);
    ResourceManager._trackedResources.timers.delete(id);
  },

  // 向后兼容方法 - 确保资源被正确跟踪
  addTimer: (timerId) => {
    if (timerId) {
      ResourceManager._trackedResources.timers.add(timerId);
      return timerId;
    }
    return null;
  },

  addController: (controller) => {
    if (controller) {
      ResourceManager._trackedResources.controllers.add(controller);
      return controller;
    }
    return null;
  },

  // 控制器管理 - 跟踪需要手动清理的控制器
  createController: () => {
    const controller = new AbortController();
    ResourceManager._trackedResources.controllers.add(controller);
    return controller;
  },

  createAbortController: () => ResourceManager.createController(),

  abortController: (controller) => {
    if (controller && !controller.signal.aborted) {
      try {
        controller.abort();
        ResourceManager._trackedResources.controllers.delete(controller);
      } catch (error) {
        // 静默处理已abort的控制器
      }
    }
  },

  // RTCPeerConnection 管理 - 需要手动关闭
  createRTCPeerConnection: (configuration) => {
    let RTCPeerConnectionClass;
    if (typeof RTCPeerConnection !== 'undefined') {
      RTCPeerConnectionClass = RTCPeerConnection;
    } else if (typeof webkitRTCPeerConnection !== 'undefined') {
      RTCPeerConnectionClass = webkitRTCPeerConnection;
    } else {
      throw new Error('RTCPeerConnection not supported');
    }

    const peerConnection = new RTCPeerConnectionClass(configuration);
    ResourceManager._trackedResources.peerConnections.add(peerConnection);

    // 添加自动清理
    peerConnection.addEventListener('connectionstatechange', () => {
      if (peerConnection.connectionState === 'closed' || peerConnection.connectionState === 'failed') {
        ResourceManager._trackedResources.peerConnections.delete(peerConnection);
      }
    });

    return peerConnection;
  },

  closeRTCPeerConnection: (peerConnection) => {
    if (peerConnection && typeof peerConnection.close === 'function') {
      peerConnection.close();
      ResourceManager._trackedResources.peerConnections.delete(peerConnection);
    }
  },

  // 事件监听器管理 - 跟踪需要手动清理的监听器
  addEventListener: (element, event, handler, options = null) => {
    if (element && typeof element.addEventListener === 'function') {
      element.addEventListener(event, handler, options);
      const listenerInfo = { element, event, handler, options };
      ResourceManager._trackedResources.eventListeners.add(listenerInfo);
      return listenerInfo;
    }
    return null;
  },

  removeEventListener: (element, event, handler, options = null) => {
    if (element && typeof element.removeEventListener === 'function') {
      element.removeEventListener(event, handler, options);
      // 遍历 Set 查找并移除匹配的监听器
      for (const listenerInfo of ResourceManager._trackedResources.eventListeners) {
        if (listenerInfo.element === element &&
            listenerInfo.event === event &&
            listenerInfo.handler === handler &&
            listenerInfo.options === options) {
          ResourceManager._trackedResources.eventListeners.delete(listenerInfo);
          break;
        }
      }
    }
  },

  // 消息监听器管理 - 某些情况下需要手动移除
  addMessageListener: (callback) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(callback);
      const listenerInfo = { type: 'messageListener', callback, addedAt: Date.now() };
      ResourceManager._trackedResources.messageListeners.add(listenerInfo);
      return listenerInfo;
    } else {
      console.warn('chrome.runtime.onMessage not available');
      return null;
    }
  },

  removeMessageListener: (listenerInfo) => {
    if (listenerInfo && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.removeListener(listenerInfo.callback);
      ResourceManager._trackedResources.messageListeners.delete(listenerInfo);
    }
  },

  // 页面特有资源创建方法 - 用于指纹检测
  createCanvasElement: () => document.createElement('canvas'),

  // 创建离线音频上下文 - 用于音频指纹检测
  createOfflineAudioContext: (numberOfChannels, length, sampleRate) => {
    const OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (OfflineAudioContext) {
      return new OfflineAudioContext(numberOfChannels, length, sampleRate);
    } else {
      throw new Error('OfflineAudioContext not supported');
    }
  },

  // 向后兼容方法 - 实际创建离线音频上下文
  createAudioContext: (numberOfChannels, length, sampleRate) => {
    return ResourceManager.createOfflineAudioContext(numberOfChannels, length, sampleRate);
  },

  // 清理方法 - 仅清理确实需要手动清理的资源
  cleanup: () => {
    const resources = ResourceManager._trackedResources;

    // 清理定时器
    resources.timers.forEach(id => {
      clearTimeout(id);
      clearInterval(id);
    });
    resources.timers.clear();

    // 清理控制器
    resources.controllers.forEach(controller => {
      if (!controller.signal.aborted) {
        try {
          controller.abort();
        } catch (error) {
          // 静默处理
        }
      }
    });
    resources.controllers.clear();

    // 清理 RTCPeerConnection
    resources.peerConnections.forEach(peerConnection => {
      if (typeof peerConnection.close === 'function') {
        peerConnection.close();
      }
    });
    resources.peerConnections.clear();

    // 清理消息监听器 - 在某些情况下需要手动清理
    resources.messageListeners.forEach(listenerInfo => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(listenerInfo.callback);
      }
    });
    resources.messageListeners.clear();

    // 清理事件监听器
    resources.eventListeners.forEach(listenerInfo => {
      if (listenerInfo.element && typeof listenerInfo.element.removeEventListener === 'function') {
        listenerInfo.element.removeEventListener(listenerInfo.event, listenerInfo.handler, listenerInfo.options);
      }
    });
    resources.eventListeners.clear();

    // 仅在调试模式下输出日志
    if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
      console.log('ResourceManager: Manual cleanup completed');
    }
  },

  // 获取资源统计信息
  getStats: () => {
    const resources = ResourceManager._trackedResources;
    return {
      timers: resources.timers.size,
      controllers: resources.controllers.size,
      peerConnections: resources.peerConnections.size,
      messageListeners: resources.messageListeners.size,
      eventListeners: resources.eventListeners.size
    };
  }
};

// 根据环境导出为全局对象
if (typeof window !== 'undefined') {
  // 页面环境（如popup、debug页面）
  window.ResourceManager = ResourceManager;
} else {
  // background script环境
  globalThis.ResourceManager = ResourceManager;
}