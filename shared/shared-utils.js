// 共享工具函数

/**
 * 发送调试日志消息
 * @param {string} message - 日志消息内容
 * @param {string} logType - 日志类型 (info, warning, error, success)
 */
function sendDebugLog(message, logType = 'info') {
  if (!message) return;

  try {
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG',
        message: String(message),
        logType: logType
      }).catch(() => {
        // 静默处理消息发送失败
      });
    }
  } catch (error) {
    // Chrome API不可用时的降级处理
    console.warn('Debug log failed:', error);
  }
}

/**
 * 检测浏览器界面语言
 * @returns {string} 返回 'zh' 或 'en'
 */
function detectBrowserLanguage() {
  try {
    const browserLang = chrome.i18n.getUILanguage().toLowerCase();
    return browserLang.startsWith('zh') ? 'zh' : 'en';
  } catch (error) {
    // API不可用时默认返回英文
    return 'en';
  }
}