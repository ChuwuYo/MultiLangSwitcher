// 后台脚本，确保扩展在浏览器启动时就能应用语言设置
// 入口仅保留统一响应辅助函数与模块装配，业务逻辑位于 background/ 目录下的各模块

import { registerI18nInstance } from "../shared/shared-utils.js";
import { backgroundI18n } from "../i18n/background-i18n.js";
import { setupMessageListener } from "./message-handlers.js";

registerI18nInstance("background", backgroundI18n);

const normalizeMessageError = (error) => {
	// 统一错误输出格式：保证 message 存在，并尽量透传可用字段
	if (error && typeof error === "object") {
		const message = typeof error.message === "string" ? error.message : String(error);
		const type = typeof error.type === "string" ? error.type : undefined;
		const retryable = typeof error.retryable === "boolean" ? error.retryable : undefined;
		const userMessage = typeof error.userMessage === "string" ? error.userMessage : undefined;
		const errorType = typeof error.errorType === "string" ? error.errorType : undefined;
		return {
			message,
			...(type ? { type } : {}),
			...(errorType ? { errorType } : {}),
			...(typeof retryable === "boolean" ? { retryable } : {}),
			...(userMessage ? { userMessage } : {}),
		};
	}
	return { message: String(error) };
};

const sendOk = (sendResponse, data = {}) => {
	// 统一成功响应：前端只需要关心 ok/data 两个字段
	if (typeof sendResponse === "function") {
		sendResponse({ ok: true, data });
	}
};

const sendErr = (sendResponse, error) => {
	// 统一失败响应：避免前端到处写 response.success/status/error 判断
	if (typeof sendResponse === "function") {
		sendResponse({ ok: false, error: normalizeMessageError(error) });
	}
};

// 模块装配：注册消息监听（其余监听器随各功能模块的导入完成注册）
setupMessageListener({ sendOk, sendErr });
