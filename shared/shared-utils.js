// 共享工具函数

/**
 * 发送调试日志消息
 * @param {string} message - 日志消息内容
 * @param {string} logType - 日志类型 (info, warning, error, success)
 */
function sendDebugLog(message, logType = 'info') {
  if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({
      type: 'DEBUG_LOG',
      message: message,
      logType: logType
    }).catch(() => {
      // 忽略发送消息的错误
    });
  }
}

/**
 * 检测浏览器界面语言 (在扩展环境中推荐使用此方法)
 * @returns {string} 'zh' 或 'en'
 */
function detectBrowserLanguage() {
  const browserLang = chrome.i18n.getUILanguage().toLowerCase();
  return browserLang.startsWith('zh') ? 'zh' : 'en';
}