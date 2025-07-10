/**
 * 向后台脚本发送请求以重置 Accept-Language 设置。
 * 此函数是 chrome.runtime.sendMessage API 的一个基于 Promise 的封装。
 * @returns {Promise<object>} 一个解析为后台脚本成功响应的 Promise。
 * @throws {Error} 如果消息发送失败或后台脚本返回错误状态，则抛出错误。
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