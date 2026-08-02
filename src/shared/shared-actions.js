/**
 * 共享操作函数模块
 * 提供与后台脚本通信的标准化接口
 */

/**
 * 消息响应信封（background 统一经 sendOk/sendErr 产出）
 * @typedef {Object} MessageEnvelope
 * @property {boolean} ok - 成功为 true，失败为 false
 * @property {*} [data] - ok=true 时的业务数据
 * @property {{ message: string, type?: string, errorType?: string, retryable?: boolean, userMessage?: string }} [error] - ok=false 时的错误
 */
import { MessageTypes } from "./message-types.js";
import { sendDebugLog } from "./shared-utils.js";

export /**
 * 统一与后台通信的入口
 * @param {string} type - MessageTypes 成员
 * @param {Object} [payload={}] - 附加到消息体的字段
 * @returns {Promise<*>} 成功时返回信封 data，失败时抛出保留信封字段的 Error
 */
const requestBackground = async (type, payload = {}) => {
	// 统一与后台通信的入口：将各种历史响应格式收敛为“成功返回数据 / 失败抛错”
	if (!type) {
		throw new Error("Message type is required");
	}
	if (!chrome?.runtime?.sendMessage) {
		throw new Error("Chrome runtime API is not available");
	}

	let response;
	try {
		response = await chrome.runtime.sendMessage({ type, ...payload });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(message);
	}

	if (!response) {
		throw new Error("No response from background script");
	}

	// 新协议：{ ok: true, data } / { ok: false, error }
	if (response.ok === true) {
		return response.data;
	}
	if (response.ok === false) {
		const message = response?.error?.message || response?.message || "Background error";
		const err = new Error(message);
		if (response?.error && typeof response.error === "object") {
			Object.assign(err, response.error);
		}
		throw err;
	}

	// 协议格式不符：返回原始响应但记警告
	console.warn("requestBackground: unexpected response format", response);
	return response;
};

/**
 * 向后台脚本发送重置 Accept-Language 设置的请求
 * 使用 Promise 封装 chrome.runtime.sendMessage API，符合项目异步处理规范
 * @returns {Promise<Object>} 返回后台脚本的成功响应对象
 * @throws {Error} 当消息发送失败或后台脚本返回错误状态时抛出错误
 */
export const resetAcceptLanguage = async () => {
	try {
		const response = await requestBackground(MessageTypes.RESET_ACCEPT_LANGUAGE);
		sendDebugLog("Accept-Language settings reset successfully", "success");
		return response;
	} catch (error) {
		// 集中化错误处理和日志记录
		const errorMsg = `Failed to reset Accept-Language: ${error.message}`;
		sendDebugLog(errorMsg, "error");
		throw new Error(errorMsg);
	}
};
