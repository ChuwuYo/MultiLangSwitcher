// 统一的资源管理器 - 仅管理确实需要手动清理的资源
// 1) 定时器/AbortController 需要显式清理
// 2) 事件与消息监听依赖浏览器生命周期自动清理
// 3) RTCPeerConnection 需要显式 close，但不做额外统计

const createResourceManager = () => {
  const trackedTimers = new Set();
  const trackedControllers = new Set();
  const trackedPeerConnections = new Set();

  const trackTimer = (id) => {
    if (id !== null && id !== undefined) {
      trackedTimers.add(id);
      return id;
    }
    return null;
  };

  const clearTimer = (id) => {
    clearTimeout(id);
    clearInterval(id);
    trackedTimers.delete(id);
  };

  const addController = (controller) => {
    if (controller) {
      trackedControllers.add(controller);
      return controller;
    }
    return null;
  };

  const createController = () => addController(new AbortController());

  const abortController = (controller) => {
    if (!controller || typeof controller.abort !== 'function') {
      return;
    }
    if (controller.signal && controller.signal.aborted) {
      return;
    }
    try {
      controller.abort();
    } catch (error) {
      // 静默处理
    }
    trackedControllers.delete(controller);
  };

  const getRTCPeerConnectionClass = () => {
    if (typeof RTCPeerConnection !== 'undefined') {
      return RTCPeerConnection;
    }
    if (typeof webkitRTCPeerConnection !== 'undefined') {
      return webkitRTCPeerConnection;
    }
    return null;
  };

  const createRTCPeerConnection = (configuration) => {
    const RTCPeerConnectionClass = getRTCPeerConnectionClass();
    if (!RTCPeerConnectionClass) {
      throw new Error('RTCPeerConnection not supported');
    }

    const peerConnection = new RTCPeerConnectionClass(configuration);
    trackedPeerConnections.add(peerConnection);

    // 添加自动清理
    peerConnection.addEventListener('connectionstatechange', () => {
      if (peerConnection.connectionState === 'closed' || peerConnection.connectionState === 'failed') {
        trackedPeerConnections.delete(peerConnection);
      }
    });

    return peerConnection;
  };

  const closeRTCPeerConnection = (peerConnection) => {
    if (peerConnection && typeof peerConnection.close === 'function') {
      try {
        peerConnection.close();
      } catch (error) {
        // 静默处理
      }
      trackedPeerConnections.delete(peerConnection);
    }
  };

  // 页面特有资源创建方法 - 用于指纹检测
  const createCanvasElement = () => {
    if (typeof document !== 'undefined') {
      return document.createElement('canvas');
    }
    throw new Error('Canvas creation not supported in this environment');
  };

  // 创建离线音频上下文 - 用于音频指纹检测
  const createOfflineAudioContext = (numberOfChannels, length, sampleRate) => {
    // 安全地检查 OfflineAudioContext 是否可用（在 service worker 中不可用）
    // 支持标准 API 和 webkit 前缀版本
    const OfflineAudioContext = window?.OfflineAudioContext || window?.webkitOfflineAudioContext;
    if (!OfflineAudioContext) {
      throw new Error('OfflineAudioContext not supported');
    }
    
    return new OfflineAudioContext(numberOfChannels, length, sampleRate);
  };

  // 清理方法 - 仅清理确实需要手动清理的资源
  const cleanup = () => {
    // 清理定时器
    trackedTimers.forEach((id) => {
      clearTimeout(id);
      clearInterval(id);
    });
    trackedTimers.clear();

    // 清理控制器
    trackedControllers.forEach((controller) => {
      if (typeof controller.abort === 'function' && (!controller.signal || !controller.signal.aborted)) {
        try {
          controller.abort();
        } catch (error) {
          // 静默处理已abort的控制器
        }
      }
    });
    trackedControllers.clear();

    // 清理 RTCPeerConnection
    trackedPeerConnections.forEach((peerConnection) => {
      if (typeof peerConnection.close === 'function') {
        try {
          peerConnection.close();
        } catch (error) {
          // 静默处理
        }
      }
    });
    trackedPeerConnections.clear();
  };

  return {
    // 定时器管理 - 跟踪需要手动清理的定时器
    setTimeout: (callback, delay, ...args) => trackTimer(setTimeout(callback, delay, ...args)),
    setInterval: (callback, delay, ...args) => trackTimer(setInterval(callback, delay, ...args)),
    clearTimeout: (id) => clearTimer(id),
    clearInterval: (id) => clearTimer(id),

    // 向后兼容方法 - 确保资源被正确跟踪
    addTimer: (timerId) => trackTimer(timerId),
    addController,
    createController,
    createAbortController: createController,
    abortController,

    // RTCPeerConnection 管理 - 需要手动关闭
    createRTCPeerConnection,
    closeRTCPeerConnection,

    // 事件监听器管理 - 依赖浏览器自动清理，仅提供统一接口
    addEventListener: (element, event, handler, options = null) => {
      if (element && typeof element.addEventListener === 'function') {
        element.addEventListener(event, handler, options);
      }
      // 不再跟踪，因为浏览器会自动清理
      return null;
    },

    // 消息监听器管理 - 依赖浏览器自动清理，仅提供兼容性接口
    addMessageListener: (callback) => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(callback);
        return { type: 'messageListener', callback, addedAt: Date.now() };
      }
      return null;
    },

    createCanvasElement,
    createOfflineAudioContext,

    cleanup
  };
};

const ResourceManager = createResourceManager();

// 根据环境导出为全局对象
if (typeof window !== 'undefined') {
  // 页面环境（如popup、debug页面）
  window.ResourceManager = ResourceManager;
} else {
  // background script环境
  globalThis.ResourceManager = ResourceManager;
}
