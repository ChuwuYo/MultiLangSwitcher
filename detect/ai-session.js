import { AIChatClient } from "../shared/ai-chat-client.js";
import { readAIConfigFromInputs, validateAIConfig } from "./ai-config.js";
import {
	aiSessionState,
	canRenderMarkdown,
	getAiElements,
	getMessageById,
	getUiLanguage,
	getVisibleChatMessages,
	setAIConfigHint,
	setAIStatus,
	translate,
} from "./ai-shared.js";
import { renderVisibleChatMessages, updateChatMessageElement } from "./ai-ui.js";
import { createMessageId } from "./shared.js";
import { getLatestDetectionSnapshot, getLatestSnapshotVersion, isDetectionRunning } from "./snapshot.js";

export const isChatContextStale = () =>
	!!(
		aiSessionState.hasStarted &&
		aiSessionState.activeSnapshotVersion &&
		getLatestSnapshotVersion() &&
		aiSessionState.activeSnapshotVersion !== getLatestSnapshotVersion()
	);

const getSystemPrompt = () => {
	if (getUiLanguage() === "zh") {
		return [
			"你是浏览器环境检测结果解读专家，擅长解释语言设置、时区、WebRTC 与浏览器指纹信号。",
			"当前上下文来自浏览器扩展 MultiLangSwitcher 的 detect 检测/诊断页面，不是用户正在访问的真实生产网页环境。",
			"你解读的是检测信号本身，不要把检测页观测结果直接等同于某个网站的真实业务环境，也不要默认用户一定存在风险。",
			"请优先区分：正常现象、轻微可疑信号、明确风险、信息不足。只有证据充分时才判断为风险。",
			"如果没有明显异常，要明确告诉用户整体基本正常；如果信息不足，也要直接说明，不要脑补缺失数据。",
			"重点分析 Accept-Language、navigator.language、navigator.languages、Intl locale、时区是否一致，以及 WebRTC、本地 IP、Canvas/WebGL/Audio 指纹暴露情况。",
			"默认输出结构：1. 总体结论 2. 正常信号 3. 需要关注的点 4. 建议操作 5. 判断边界或信息不足。",
			"建议必须具体、保守、可执行，避免把常见浏览器行为夸大成严重漏洞。",
			"除非用户明确要求切换语言，否则必须使用中文回答。",
		].join("\n");
	}

	return [
		"You are an expert in interpreting browser environment diagnostics, especially language settings, timezone signals, WebRTC, and fingerprinting indicators.",
		"This context comes from MultiLangSwitcher, an extension detect/diagnostic page, not from the user's actual production website environment.",
		"You are interpreting diagnostic signals themselves. Do not treat detect-page observations as if they were the full context of a real website, and do not assume the user is necessarily at risk.",
		"Distinguish among normal behavior, mildly suspicious signals, clear risks, and insufficient evidence. Only label something as a risk when the evidence is strong.",
		"If there is no obvious issue, say so explicitly. If the data is incomplete, say that directly instead of guessing.",
		"Focus on consistency across Accept-Language, navigator.language, navigator.languages, Intl locale, and timezone, plus WebRTC, local IP exposure, and Canvas/WebGL/Audio fingerprinting signals.",
		"Default response structure: 1. Overall assessment 2. Normal signals 3. Points worth attention 4. Actionable suggestions 5. Limits or missing information.",
		"Keep the answer user-friendly, measured, and actionable without overstating conclusions or turning common browser behavior into severe vulnerability claims.",
		"Unless the user explicitly asks to switch languages, respond in English.",
	].join("\n");
};

const buildInitialPrompt = (snapshot, sanitizeSnapshot) => {
	const sanitizedSnapshot = sanitizeSnapshot(snapshot);

	if (getUiLanguage() === "zh") {
		return [
			"请基于下面这份浏览器环境检测快照做一次中性的结果解读。",
			"先给出总体判断：正常 / 基本正常但有可疑点 / 存在明显风险 / 信息不足。",
			"然后按“正常信号”“需要关注的点”“建议操作”“判断边界”四部分输出。",
			"如果某些信号在检测页里属于常见现象，请明确写出“这是常见现象，不代表真实网站一定存在问题”。",
			"不要重复整段 JSON，只提炼真正重要的点。",
			"",
			JSON.stringify(sanitizedSnapshot, null, 2),
		].join("\n");
	}

	return [
		"Please interpret the following browser environment detection snapshot in a neutral way.",
		"Start with an overall assessment: normal / mostly normal with a few suspicious signals / clear risk / insufficient evidence.",
		"Then structure the answer as: normal signals, points worth attention, actionable suggestions, and limits of the assessment.",
		"If a signal is common on a detect page, explicitly say it is common and does not automatically mean a real website problem.",
		"Do not repeat the full JSON; extract only the important points.",
		"",
		JSON.stringify(sanitizedSnapshot, null, 2),
	].join("\n");
};

const ensureAIClientAvailable = () => {
	if (!AIChatClient?.createChatCompletion) {
		setAIStatus("ai_config_missing_runtime", "danger");
		return false;
	}

	return true;
};

const getNormalizedAIConfig = () => {
	const config = readAIConfigFromInputs();
	const validation = validateAIConfig(config);

	if (!validation.valid) {
		setAIConfigHint(validation.messageKey, "warning");
		setAIStatus(validation.messageKey, "warning");
		return null;
	}

	return {
		...config,
		url: AIChatClient.normalizeChatCompletionsUrl(config.baseUrl),
	};
};

const appendChatMessage = (message) => {
	aiSessionState.messages.push(message);
	if (message.visible !== false) {
		updateChatMessageElement(message, { finalize: !!message.rendered });
		updateAIControls();
	}
	return message;
};

const finalizeAssistantMessage = (messageId) => {
	const message = getMessageById(messageId);
	if (!message) {
		return;
	}

	message.rendered = true;
	updateChatMessageElement(message, { finalize: true });
	if (!canRenderMarkdown()) {
		setAIStatus("ai_render_fallback", "warning");
	}
};

const removeMessageById = (messageId) => {
	aiSessionState.messages = aiSessionState.messages.filter((message) => message.id !== messageId);
	renderVisibleChatMessages();
};

const requestAssistantMessage = async ({ userMessage = "", firstTurn = false, sanitizeSnapshot = null }) => {
	if (!ensureAIClientAvailable()) {
		return;
	}

	const config = getNormalizedAIConfig();
	if (!config) {
		return;
	}

	if (isChatContextStale()) {
		setAIStatus("ai_restart_required", "warning");
		updateAIControls();
		return;
	}

	const snapshot = getLatestDetectionSnapshot();
	if (!snapshot) {
		setAIStatus("ai_detection_pending", "warning");
		return;
	}

	if (firstTurn) {
		aiSessionState.messages = [
			{
				id: createMessageId(),
				role: "system",
				content: getSystemPrompt(),
				visible: false,
			},
			{
				id: createMessageId(),
				role: "user",
				content: buildInitialPrompt(snapshot, sanitizeSnapshot),
				visible: false,
			},
		];
	} else {
		appendChatMessage({
			id: createMessageId(),
			role: "user",
			content: userMessage,
			visible: true,
			rendered: false,
		});
	}

	const transportMessages = aiSessionState.messages.map((message) => ({
		role: message.role,
		content: message.content,
	}));

	const assistantMessage = appendChatMessage({
		id: createMessageId(),
		role: "assistant",
		content: "",
		visible: true,
		rendered: false,
	});

	aiSessionState.isRequestInFlight = true;
	aiSessionState.abortController = new AbortController();
	setAIStatus("ai_request_in_progress", "info");
	updateAIControls();

	try {
		const result = await AIChatClient.createChatCompletion({
			url: config.url,
			apiKey: config.apiKey,
			authHeader: config.authHeader,
			model: config.model,
			messages: transportMessages,
			temperature: 0.2,
			stream: true,
			signal: aiSessionState.abortController.signal,
			onDelta: (_delta, fullContent) => {
				assistantMessage.content = fullContent;
				updateChatMessageElement(assistantMessage, { finalize: false });
			},
		});

		assistantMessage.content = (result.content || "").trim();
		if (!assistantMessage.content) {
			throw new Error(translate("ai_empty_reply"));
		}

		finalizeAssistantMessage(assistantMessage.id);
		setAIStatus("ai_ready_for_followup", "success");
	} catch (error) {
		const aborted = error?.name === "AbortError" || /cancel|abort/i.test(String(error?.message || ""));
		if (!assistantMessage.content) {
			removeMessageById(assistantMessage.id);
		} else {
			finalizeAssistantMessage(assistantMessage.id);
		}

		if (aborted) {
			setAIStatus("ai_request_stopped", "warning");
		} else {
			setAIStatus("ai_request_failed", "danger", {
				error: error?.message || String(error),
			});
		}
	} finally {
		aiSessionState.isRequestInFlight = false;
		aiSessionState.abortController = null;
		updateAIControls();
	}
};

export const startAIDiagnosis = async (sanitizeSnapshot) => {
	if (isDetectionRunning()) {
		setAIStatus("ai_detection_pending", "warning");
		return;
	}

	const snapshot = getLatestDetectionSnapshot();
	if (!snapshot) {
		setAIStatus("ai_detection_pending", "warning");
		return;
	}

	const config = getNormalizedAIConfig();
	if (!config) {
		return;
	}

	aiSessionState.messages = [];
	aiSessionState.activeSnapshotVersion = snapshot.meta.snapshotVersion;
	aiSessionState.hasStarted = true;
	renderVisibleChatMessages();
	setAIStatus("ai_starting", "info");
	updateAIControls();
	await requestAssistantMessage({ firstTurn: true, sanitizeSnapshot });
};

export const sendFollowupMessage = async (sanitizeSnapshot) => {
	if (aiSessionState.isRequestInFlight) {
		return;
	}

	if (isChatContextStale()) {
		setAIStatus("ai_restart_required", "warning");
		updateAIControls();
		return;
	}

	if (!aiSessionState.hasStarted) {
		setAIStatus("ai_chat_placeholder", "muted");
		return;
	}

	const { userInput } = getAiElements();
	const userMessage = userInput?.value?.trim() || "";
	if (!userMessage) {
		setAIStatus("ai_waiting_for_question", "warning");
		return;
	}

	userInput.value = "";
	await requestAssistantMessage({ userMessage, firstTurn: false, sanitizeSnapshot });
};

export const stopAIRequest = () => {
	if (!aiSessionState.abortController) {
		return;
	}

	try {
		aiSessionState.abortController.abort();
	} catch (_error) {}
};

export const resetAISession = ({ statusKey = "ai_chat_cleared" } = {}) => {
	if (aiSessionState.abortController) {
		try {
			aiSessionState.abortController.abort();
		} catch (_error) {}
	}

	aiSessionState.messages = [];
	aiSessionState.activeSnapshotVersion = "";
	aiSessionState.isRequestInFlight = false;
	aiSessionState.abortController = null;
	aiSessionState.hasStarted = false;

	renderVisibleChatMessages();
	updateAIControls();
	if (statusKey) {
		setAIStatus(statusKey, "muted");
	}
};

export const updateAIControls = () => {
	const elements = getAiElements();
	const config = readAIConfigFromInputs();
	const validation = validateAIConfig(config);
	const hasSnapshot = !!getLatestDetectionSnapshot();
	const stale = isChatContextStale();
	const canFollowUp =
		aiSessionState.hasStarted && !stale && !aiSessionState.isRequestInFlight && validation.valid && hasSnapshot;

	if (elements.startButton) {
		elements.startButton.disabled = aiSessionState.isRequestInFlight || !validation.valid || !hasSnapshot;
	}
	if (elements.stopButton) {
		elements.stopButton.disabled = !aiSessionState.isRequestInFlight;
	}
	if (elements.clearButton) {
		elements.clearButton.disabled = aiSessionState.isRequestInFlight;
	}
	if (elements.exportStructuredButton) {
		elements.exportStructuredButton.disabled = aiSessionState.isRequestInFlight || !hasSnapshot;
	}
	if (elements.sendButton) {
		elements.sendButton.disabled = !canFollowUp;
	}
	if (elements.userInput) {
		elements.userInput.disabled = !canFollowUp;
	}
	if (elements.exportButton) {
		elements.exportButton.disabled = getVisibleChatMessages().length === 0;
	}
};
