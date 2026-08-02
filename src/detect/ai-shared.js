import { DetectPageContext } from "./detect.js";

export const translate = (key, params = {}) => DetectPageContext.translate(key, params);

export const getUiLanguage = () => DetectPageContext.getUiLanguage();

export const aiSessionState = {
	messages: [],
	activeSnapshotVersion: "",
	isRequestInFlight: false,
	abortController: null,
	hasStarted: false,
};

// AI 面板元素均为静态 DOM 且脚本在 body 末尾加载，首次查询后缓存引用，避免重复 getElementById
let cachedAiElements = null;
export const getAiElements = () => {
	if (!cachedAiElements) {
		cachedAiElements = {
			configDetails: document.getElementById("aiConfigDetails"),
			providerSelect: document.getElementById("aiProviderSelect"),
			providerDescription: document.getElementById("aiProviderDescription"),
			baseUrlInput: document.getElementById("aiBaseUrlInput"),
			apiKeyInput: document.getElementById("aiApiKeyInput"),
			apiKeyToggle: document.getElementById("aiApiKeyToggle"),
			modelInput: document.getElementById("aiModelInput"),
			configHint: document.getElementById("aiConfigHint"),
			startButton: document.getElementById("aiStartButton"),
			stopButton: document.getElementById("aiStopButton"),
			clearButton: document.getElementById("aiClearButton"),
			exportStructuredButton: document.getElementById("aiExportStructuredButton"),
			messagesContainer: document.getElementById("aiChatMessages"),
			status: document.getElementById("aiChatStatus"),
			userInput: document.getElementById("aiUserInput"),
			sendButton: document.getElementById("aiSendButton"),
			exportButton: document.getElementById("aiExportButton"),
		};
	}
	return cachedAiElements;
};

export const getVisibleChatMessages = () => aiSessionState.messages.filter((message) => message.visible !== false);

export const getMessageById = (messageId) =>
	aiSessionState.messages.find((message) => message.id === messageId) || null;

export const setStatusToneClass = (element, tone) => {
	if (!element) {
		return;
	}

	element.classList.remove("text-muted", "text-success", "text-warning", "text-danger", "text-info");
	element.classList.add(
		tone === "success"
			? "text-success"
			: tone === "warning"
				? "text-warning"
				: tone === "danger"
					? "text-danger"
					: tone === "info"
						? "text-info"
						: "text-muted",
	);
};

export const setAIConfigHint = (key, tone = "muted", params = {}) => {
	const { configHint } = getAiElements();
	if (!configHint) {
		return;
	}

	configHint.textContent = key ? translate(key, params) : "";
	setStatusToneClass(configHint, tone);
};

export const setAIStatus = (key, tone = "muted", params = {}) => {
	const { status } = getAiElements();
	if (!status) {
		return;
	}

	status.textContent = key ? translate(key, params) : "";
	setStatusToneClass(status, tone);
};

export const canRenderMarkdown = () =>
	typeof (/** @type {any} */ (window).marked?.parse) === "function" &&
	typeof (/** @type {any} */ (window).DOMPurify?.sanitize) === "function";

export const escapeHtml = (value) =>
	String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

export const copyTextToClipboard = async (text) => {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}

	const tempTextArea = document.createElement("textarea");
	tempTextArea.value = text;
	tempTextArea.setAttribute("readonly", "readonly");
	tempTextArea.style.position = "absolute";
	tempTextArea.style.left = "-9999px";
	document.body.appendChild(tempTextArea);
	tempTextArea.select();
	document.execCommand("copy");
	document.body.removeChild(tempTextArea);
};
