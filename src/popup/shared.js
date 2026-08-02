// popup/shared.js - 弹窗页面跨模块共享辅助函数

import { sendDebugLog } from "../shared/shared-utils.js";
import { popupI18n } from "../i18n/popup-i18n.js";

// 使用统一的资源管理器

export const getEl = (id) => document.getElementById(id);

/**
 * 安全执行DOM更新操作，捕获并记录错误
 * @param {Function} updateFn - 要执行的DOM更新函数
 */
export const runDOMUpdate = (updateFn) => {
	if (typeof updateFn !== "function") return;
	try {
		updateFn();
	} catch (error) {
		sendDebugLog(popupI18n.t("dom_update_error", { message: error.message }), "error");
	}
};
