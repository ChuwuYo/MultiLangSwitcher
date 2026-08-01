/**
 * 请求头检测工具模块
 * 提供统一的 Accept-Language 请求头检测功能
 *
 * 使用方法:
 * import { HEADER_CHECK_ENDPOINTS, fetchHeadersFromEndpoints } from './shared/header-check-utils.js';
 *
 * const result = await fetchHeadersFromEndpoints();
 * if (result.success) {
 *   console.log('Headers:', result.data);
 *   console.log('Accept-Language:', result.acceptLanguage);
 * }
 */

/**
 * 统一的请求头检测端点配置
 * 按优先级顺序排列，系统将依次尝试直到成功
 */
export const HEADER_CHECK_ENDPOINTS = [
	"https://httpbin.org/headers",
	"https://postman-echo.com/headers",
	"https://httpbingo.org/headers",
];

/**
 * 从检测端点获取请求头信息
 * 会依次尝试所有配置的端点，返回第一个成功的结果
 *
 * @param {number} timeout - 每个请求的超时时间（毫秒），默认10秒
 * @returns {Promise<Object>} 返回包含以下字段的对象:
 *   - success: boolean - 是否成功获取到请求头
 *   - data: Object - 完整的响应数据（如果成功）
 *   - headers: Object - 请求头对象（如果成功）
 *   - acceptLanguage: string|null - Accept-Language 头部值（如果存在）
 *   - endpoint: string - 成功的端点URL（如果成功）
 *   - error: string - 错误信息（如果失败）
 *   - attemptedEndpoints: Array - 尝试过的所有端点
 */
export const fetchHeadersFromEndpoints = async (timeout = 10000) => {
	const timestamp = Date.now();
	const attemptedEndpoints = [];
	const errors = [];

	// 依次尝试每个端点
	for (const baseEndpoint of HEADER_CHECK_ENDPOINTS) {
		// 添加时间戳防止缓存
		const endpoint = `${baseEndpoint}${baseEndpoint.includes("?") ? "&" : "?"}_=${timestamp}`;
		attemptedEndpoints.push(endpoint);

		try {
			// 创建 AbortController 用于超时控制
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeout);

			try {
				const response = await fetch(endpoint, {
					cache: "no-store",
					credentials: "omit",
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				// 检查响应状态
				if (!response.ok) {
					const error = `HTTP ${response.status} from ${baseEndpoint}`;
					errors.push(error);
					continue;
				}

				// 解析响应数据
				const data = await response.json();

				// 提取请求头（httpbingo 等端点将值包成数组，归一化为字符串）
				const rawHeaders = data.headers || {};
				const headers = Object.fromEntries(
					Object.entries(rawHeaders).map(([key, value]) => [key, Array.isArray(value) ? (value[0] ?? "") : value]),
				);

				// 查找 Accept-Language 头部（不区分大小写，支持多种变体）
				let acceptLanguage = null;
				// 首先尝试常见的大小写形式
				if (headers["Accept-Language"]) {
					acceptLanguage = headers["Accept-Language"];
				} else if (headers["accept-language"]) {
					acceptLanguage = headers["accept-language"];
				} else {
					// 如果都没找到，在所有键中查找（完全不区分大小写）
					const headerKeys = Object.keys(headers);
					const languageKey = headerKeys.find((key) => key.toLowerCase() === "accept-language");
					if (languageKey) {
						acceptLanguage = headers[languageKey];
					}
				}

				return {
					success: true,
					data: data,
					headers: headers,
					acceptLanguage: acceptLanguage,
					endpoint: endpoint,
					attemptedEndpoints: attemptedEndpoints,
				};
			} catch (fetchError) {
				clearTimeout(timeoutId);
				throw fetchError;
			}
		} catch (error) {
			let errorMessage;
			if (error.name === "AbortError") {
				errorMessage = `Timeout (${timeout}ms) from ${baseEndpoint}`;
			} else {
				errorMessage = `${error.message} from ${baseEndpoint}`;
			}
			errors.push(errorMessage);
		}
	}

	// 所有端点都失败
	const errorMessage = `All ${HEADER_CHECK_ENDPOINTS.length} endpoints failed. Errors: ${errors.join("; ")}`;

	return {
		success: false,
		error: errorMessage,
		attemptedEndpoints: attemptedEndpoints,
		errors: errors,
	};
};

/**
 * 创建外部检查链接的 DOM 片段
 * 用于在检测失败时提供手动检查的选项
 *
 * @param {{ prefix?: string, or?: string, suffix?: string }} [texts] - 文本对象,包含国际化文本
 *   - prefix: 链接前缀文本 (如: "请访问" / "Please visit")
 *   - or: "或"的翻译 (如: "或" / "or")
 *   - suffix: "进行查看"的翻译 (如: "进行查看" / "to view")
 * @returns {DocumentFragment} 包含链接的文档片段
 */
export const createExternalCheckLinks = (texts = {}) => {
	const prefix = texts.prefix || "Please visit";
	const or = texts.or || "or";
	const suffix = texts.suffix || "to view";

	const fragment = document.createDocumentFragment();

	fragment.appendChild(document.createTextNode(`${prefix} `));

	const link1 = document.createElement("a");
	link1.href = "https://pixelscan.net/fingerprint-check";
	link1.target = "_blank";
	link1.textContent = "https://pixelscan.net/fingerprint-check";
	fragment.appendChild(link1);

	fragment.appendChild(document.createTextNode(` ${or} `));

	const link2 = document.createElement("a");
	link2.href = "https://www.browserscan.net/zh";
	link2.target = "_blank";
	link2.textContent = "https://www.browserscan.net/zh";
	fragment.appendChild(link2);

	fragment.appendChild(document.createTextNode(` ${suffix}`));

	return fragment;
};

/**
 * 使用统一翻译键构建本地化的外部检查链接
 * popup/debug/detect 三个页面共用同一组翻译键，由此避免各页面重复拼装文本对象
 *
 * @param {Function} translate - 翻译函数，接收翻译键返回对应文案
 * @returns {DocumentFragment} 包含链接的文档片段
 */
export const createLocalizedExternalCheckLinks = (translate) =>
	createExternalCheckLinks({
		prefix: translate("external_check_prefix"),
		or: translate("external_check_or"),
		suffix: translate("external_check_suffix"),
	});
