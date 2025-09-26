// 统一的简单资源管理器 - 减少代码重复
// 适用于浏览器扩展的各种页面类型

const ResourceManager = {
  // 定时器管理 - 直接使用原生API
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  setInterval: (callback, delay) => setInterval(callback, delay),
  clearTimeout: (id) => { if (id) clearTimeout(id); },
  clearInterval: (id) => { if (id) clearInterval(id); },

  // 兼容性方法 - 保持API兼容性
  addTimer: (timerId) => timerId, // 直接返回定时器ID
  removeTimer: (timerId) => {
    if (timerId) {
      clearTimeout(timerId);
      clearInterval(timerId);
    }
  },

  // 控制器管理
  createController: () => new AbortController(),
  createAbortController: () => new AbortController(), // 别名
  addController: (controller) => controller, // 直接返回控制器
  removeController: (controller) => {
    if (controller && !controller.signal.aborted) {
      try {
        controller.abort();
      } catch (error) {
        // 静默处理已abort的控制器
      }
    }
  },
  abortController: (controller) => {
    if (controller && !controller.signal.aborted) {
      try {
        controller.abort();
      } catch (error) {
        // 静默处理已abort的控制器
      }
    }
  },

  // 页面特有资源创建方法 - 用于指纹检测
  createCanvasElement: () => document.createElement('canvas'),
  createAudioContext: (numberOfChannels, length, sampleRate) => {
    if (typeof AudioContext !== 'undefined') {
      return new AudioContext({ numberOfChannels, length, sampleRate });
    } else if (typeof webkitAudioContext !== 'undefined') {
      return new webkitAudioContext({ numberOfChannels, length, sampleRate });
    } else {
      throw new Error('AudioContext not supported');
    }
  },
  createRTCPeerConnection: (configuration) => {
    if (typeof RTCPeerConnection !== 'undefined') {
      return new RTCPeerConnection(configuration);
    } else if (typeof webkitRTCPeerConnection !== 'undefined') {
      return new webkitRTCPeerConnection(configuration);
    } else {
      throw new Error('RTCPeerConnection not supported');
    }
  },
  closeRTCPeerConnection: (peerConnection) => {
    if (peerConnection && typeof peerConnection.close === 'function') {
      peerConnection.close();
    }
  },

  // 事件监听器管理
  addEventListener: (element, event, handler) => {
    element.addEventListener(event, handler);
    return { element, event, handler };
  },

  removeEventListener: (element, event, handler) => {
    if (element && element.removeEventListener) {
      element.removeEventListener(event, handler);
    }
  },

  // 消息监听器管理
  addMessageListener: (callback) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(callback);
      return { type: 'messageListener', callback };
    } else {
      console.warn('chrome.runtime.onMessage not available');
      return null;
    }
  },

  // 资源清理 - 空操作，浏览器会自动清理
  cleanup: () => {
    // 浏览器会自动管理这些资源的生命周期
    // 短期页面（如popup、debug页面）关闭时自动清理
    // 长期页面（如background script）需要时手动清理
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