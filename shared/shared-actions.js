/**
 * 共享操作函数模块
 * 提供与后台脚本通信的标准化接口
 */

/**
 * 向后台脚本发送重置 Accept-Language 设置的请求
 * 使用 Promise 封装 chrome.runtime.sendMessage API，符合项目异步处理规范
 * @returns {Promise<Object>} 返回后台脚本的成功响应对象
 * @throws {Error} 当消息发送失败或后台脚本返回错误状态时抛出错误
 */
const resetAcceptLanguage = async () => {
  try {
    // 检查 Chrome API 可用性
    if (!chrome?.runtime?.sendMessage) {
      throw new Error('Chrome runtime API is not available');
    }

    // 发送重置请求到后台脚本
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'RESET_ACCEPT_LANGUAGE' }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });

    // 验证响应状态
    if (response?.status === 'success') {
      // 记录成功日志
      if (typeof sendDebugLog === 'function') {
        sendDebugLog('Accept-Language settings reset successfully', 'success');
      }
      return response;
    }

    // 处理非成功响应
    const errorMessage = response?.message || 'Background script returned non-success status without error message';
    throw new Error(errorMessage);

  } catch (error) {
    // 集中化错误处理和日志记录
    const errorMsg = `Failed to reset Accept-Language: ${error.message}`;
    if (typeof sendDebugLog === 'function') {
      sendDebugLog(errorMsg, 'error');
    }
    throw new Error(errorMsg);
  }
};