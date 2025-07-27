/**
 * 向后台脚本发送重置 Accept-Language 设置的请求
 * 这是对 chrome.runtime.sendMessage API 的 Promise 封装
 * @returns {Promise<object>} 返回后台脚本的成功响应
 * @throws {Error} 当消息发送失败或后台脚本返回错误状态时抛出错误
 */
async function resetAcceptLanguage() {
  const response = await chrome.runtime.sendMessage({ type: 'RESET_ACCEPT_LANGUAGE' });

  if (response?.status === 'success') {
    return response;
  } else {
      const errorMessage = response?.message || 'Background script returned a non-success status without providing an error message.';
    throw new Error(errorMessage);
  }
}