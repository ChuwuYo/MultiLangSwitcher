import { AIChatClient } from "../shared/ai-chat-client.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
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
import { DetectPageContext } from "./detect.js";

let activeRequestToken = 0;

export const isChatContextStale = () =>
	!!(
		aiSessionState.hasStarted &&
		aiSessionState.activeSnapshotVersion &&
		DetectPageContext.getLatestSnapshotVersion() &&
		aiSessionState.activeSnapshotVersion !== DetectPageContext.getLatestSnapshotVersion()
	);

const getSystemPrompt = () => {
	if (getUiLanguage() === "zh") {
		return [
			"# 角色与目标",
			"你是 MultiLangSwitcher 的浏览器环境与指纹一致性诊断专家。你的任务是把当前检测页采集的脱敏快照，翻译成普通用户一眼能懂的「网站视角画像 + 跨层一致性诊断 + 可执行建议」。",
			"",
			"# 领域事实与防误报规则（必须遵守）",
			"1. **扩展职责边界**：MultiLangSwitcher 只修改 HTTP `Accept-Language` 请求头，不会修改 `navigator.language`、`Intl` 区域、系统时区或硬件指纹。因此 `http.acceptLanguage` 与 `jsEnv`/`intl`/`timezone` 不同属于**扩展正常工作产生的预期差异**，绝不能误判为配置损坏；但在涉及强风控/地区校验站点时，需客观说明这种跨层反差会被网站识别。",
			"2. **脱敏边界（严禁脑补）**：快照已由本地脱敏，以下字段为 `[redacted]` 或仅保留概要：`http.headers`（仅键名）、`webrtc.ips`（仅数量与 `ipLeakDetected`）、`userAgent`/`fullVersion`、`ipTimezone.ip/city/organization`、`uaData`（仅 `mobile`）、Canvas/WebGL/Audio 哈希及 GPU vendor/renderer。禁止猜测或编造任何已脱敏或缺失的字段（如具体城市、运营商、显卡型号、具体 IP）。",
			"3. **真实证据优先**：只基于快照中实际存在且非空的字段做推断；若某项采集状态为失败/跳过/缺失，直接标为「信息不足」，不夸大普通浏览器行为（如 Canvas/WebGL/Audio API 可用属于常规浏览器能力，不等于已被追踪或存在漏洞）。",
			"4. **环境前提**：快照来自扩展内置 detect 页，仅反映当前浏览器环境信号本身，不直接等同于某个目标网站的真实风控判定。",
			"",
			"# 跨层核验矩阵（内部推理清单）",
			"- 规则生效性：`http.acceptLanguage` 是否与 `extension.currentLanguage` 一致（自动切换模式下允许按域名不同）。",
			"- 语言与区域自洽：`http.acceptLanguage` vs `jsEnv.language`/`languages` vs `intl`（DateTimeFormat/NumberFormat）vs `localeFormatting`（Collator/Plural/RelativeTime/样本）vs `browserFingerprint.speechVoices.languages`（系统自带 TTS 语音包常反映真实 OS 语言包）。",
			"- 时区与地理自洽：`jsEnv.timezone`/`timezoneOffset` vs `ipTimezone.timezone`/`country`/`region`（若差异明显，提示可能是代理/VPN 或系统时区未对齐）。",
			"- 暴露面与设备信号：`webrtc.ipLeakDetected` 及候选数、`compatibility.browser`（浏览器/主版本/OS）+ `uaData.mobile` + `browserFingerprint.screen`（含 `devicePixelRatio`）+ `browserFingerprint.device`（核数/内存/触控/`webdriver`）+ `browserFingerprint.preferences`（深浅色/色域/DNT/GPC）+ 硬件指纹 API 状态。",
			"",
			"# 输出风格",
			"- 简洁、克制、直接说人话，不照抄 JSON，不用官话或吓唬用户的措辞。",
			"- 除非用户明确要求其他语言，否则始终使用中文回答。",
		].join("\n");
	}

	return [
		"# Role & Goal",
		"You are MultiLangSwitcher's browser environment and fingerprint consistency analyst. Turn the sanitized detect-page snapshot into a clear website's-eye profile, cross-layer consistency check, and practical next steps.",
		"",
		"# Domain Rules & Anti-Hallucination Guardrails (Strict)",
		"1. **Extension scope**: MultiLangSwitcher only modifies the HTTP `Accept-Language` header. It does NOT spoof `navigator.language`, `Intl` locales, system timezone, or hardware fingerprints. A mismatch between `http.acceptLanguage` and `jsEnv`/`intl`/timezone is **expected behavior**, not a broken setup—note it as an expected header-only difference while objectively mentioning that strict geo/anti-fraud sites may notice the contrast.",
		"2. **Redaction boundary (never guess)**: The snapshot is locally sanitized before sending. `http.headers` (names only), `webrtc.ips` (count & `ipLeakDetected` only), `userAgent`/`fullVersion`, `ipTimezone.ip/city/organization`, `uaData` (`mobile` only), and Canvas/WebGL/Audio hashes & GPU vendor/renderer are intentionally `[redacted]`. Never invent or guess redacted or missing details (exact city, ISP, GPU model, or IP).",
		"3. **Evidence first**: Infer only from non-empty fields actually present in the snapshot. Mark failed or missing collectors as 'Insufficient data'. Do not exaggerate normal browser capabilities (e.g., Canvas/WebGL/Audio APIs being available is normal browser behavior, not automatically a vulnerability).",
		"4. **Context limit**: Observations come from the extension's detect page and reflect browser signals themselves, not a specific production site's risk engine.",
		"",
		"# Cross-Layer Verification Matrix",
		"- Rule effectiveness: Does `http.acceptLanguage` match `extension.currentLanguage` (accounting for `autoSwitchEnabled`)?",
		"- Language & locale alignment: `http.acceptLanguage` vs `jsEnv.language`/`languages` vs `intl` vs `localeFormatting` vs `browserFingerprint.speechVoices.languages` (OS TTS voice packs often reveal the underlying OS locale).",
		"- Timezone & geo alignment: `jsEnv.timezone`/`timezoneOffset` vs `ipTimezone.timezone`/`country`/`region`.",
		"- Exposure & device profile: `webrtc.ipLeakDetected` (and redacted IP count), `compatibility.browser` + `uaData.mobile` + `browserFingerprint.screen` (incl. `devicePixelRatio`) + `browserFingerprint.device` (cores/memory/touch/`webdriver`) + `browserFingerprint.preferences` (colorScheme/gamut/DNT/GPC) + hardware API statuses.",
		"",
		"# Output Style",
		"- Direct, calm, and human-readable. Never dump raw JSON or use fear-mongering.",
		"- Unless the user asks otherwise, respond in English.",
	].join("\n");
};

const buildInitialPrompt = (snapshot, sanitizeSnapshot) => {
	const sanitizedSnapshot = sanitizeSnapshot(snapshot);

	if (getUiLanguage() === "zh") {
		return [
			"请基于下面这份脱敏检测快照，按以下 4 个部分输出精炼诊断：",
			"",
			"### 1. 网站视角画像",
			"用 2–3 句自然语言，以“假如我是一个你刚打开的网站”的视角，概括仅凭快照里**实际可见字段**能看出你大概是什么设备/系统形态、语言与时区特征、以及当前是否处于“请求头语言与底层环境分离”的状态（不编造任何 `[redacted]` 字段）。最后给出一句总体评级：`正常` / `正常（含扩展预期差异）` / `存在需关注信号` / `信息不足`。",
			"",
			"### 2. 跨层一致性核验",
			"用一张 4 行紧凑 Markdown 表格（列：`维度 | 当前信号 | 状态`）核验：",
			"- HTTP 请求头层（`http.acceptLanguage` 与扩展设置）",
			"- JS 与 Intl 区域层（`jsEnv` / `intl` / `localeFormatting`）",
			"- 时区与网络层（浏览器时区 vs `ipTimezone`）",
			"- WebRTC 与指纹面（`webrtc.ipLeakDetected` 与硬件 API 可采集状态）",
			"",
			"### 3. 值得关注的点与建议",
			"只列出真正值得关注的项（若无明显异常就直接说明“当前无明显异常”），每项按「现象 → 网站可能如何解读 → 具体怎么做」一行讲清。",
			"",
			"### 4. 观测边界",
			"用 1–2 句话简述哪些项因本地脱敏或采集失败未纳入判断。",
			"",
			JSON.stringify(sanitizedSnapshot, null, 2),
		].join("\n");
	}

	return [
		"Analyze the sanitized detection snapshot below and respond in 4 concise sections:",
		"",
		"### 1. Website's-Eye Profile",
		"In 2–3 natural sentences from the perspective of a website you just visited, summarize what is visible **strictly from non-redacted fields** (device/OS form, language & timezone profile, and whether the HTTP header language differs from the underlying browser locale—never guess `[redacted]` fields). End with one overall status: `Normal` / `Normal (expected extension difference)` / `Needs attention` / `Insufficient data`.",
		"",
		"### 2. Cross-Layer Consistency Check",
		"Use a compact 4-row Markdown table (`Layer | Observed Signal | Status`) covering:",
		"- HTTP Header (`http.acceptLanguage` vs extension setting)",
		"- JS & Intl Locale (`jsEnv` / `intl` / `localeFormatting`)",
		"- Timezone & Region (browser timezone vs `ipTimezone`)",
		"- WebRTC & Fingerprint Surface (`webrtc.ipLeakDetected` & hardware API status)",
		"",
		"### 3. Points to Watch & Actionable Steps",
		"List only genuine items worth attention (or state clearly that nothing looks abnormal). For each item: what it shows -> how a site may interpret it -> concrete next step.",
		"",
		"### 4. Observation Limits",
		"Briefly note in 1–2 sentences which signals were redacted locally or unavailable.",
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

	const snapshot = DetectPageContext.getLatestSnapshot();
	if (!snapshot) {
		setAIStatus("ai_detection_pending", "warning");
		return;
	}

	if (firstTurn) {
		aiSessionState.messages = [
			{
				id: DetectPageContext.createMessageId(),
				role: "system",
				content: getSystemPrompt(),
				visible: false,
			},
			{
				id: DetectPageContext.createMessageId(),
				role: "user",
				content: buildInitialPrompt(snapshot, sanitizeSnapshot),
				visible: false,
			},
		];
	} else {
		appendChatMessage({
			id: DetectPageContext.createMessageId(),
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
		id: DetectPageContext.createMessageId(),
		role: "assistant",
		content: "",
		visible: true,
		rendered: false,
	});

	const controller = ResourceManager.createController();
	const requestToken = ++activeRequestToken;
	aiSessionState.isRequestInFlight = true;
	aiSessionState.abortController = controller;
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
			signal: controller.signal,
			onDelta: (_delta, fullContent) => {
				if (requestToken !== activeRequestToken) return;
				assistantMessage.content = fullContent;
				updateChatMessageElement(assistantMessage, { finalize: false });
			},
		});

		if (requestToken !== activeRequestToken) {
			return;
		}
		assistantMessage.content = (result.content || "").trim();
		if (!assistantMessage.content) {
			throw new Error(translate("ai_empty_reply"));
		}

		finalizeAssistantMessage(assistantMessage.id);
		setAIStatus("ai_ready_for_followup", "success");
	} catch (error) {
		// 若会话已在请求期间被重置，忽略过期请求的错误状态覆写
		if (requestToken !== activeRequestToken) {
			return;
		}
		const aborted = controller.signal.aborted && error?.name !== "TimeoutError";
		if (!assistantMessage.content) {
			removeMessageById(assistantMessage.id);
			if (firstTurn) {
				aiSessionState.hasStarted = false;
				aiSessionState.messages = [];
				renderVisibleChatMessages();
			}
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
		ResourceManager.abortController(controller);
		if (requestToken === activeRequestToken) {
			aiSessionState.isRequestInFlight = false;
			aiSessionState.abortController = null;
			updateAIControls();
		}
	}
};

export const startAIDiagnosis = async (sanitizeSnapshot) => {
	if (DetectPageContext.isDetectionRunning()) {
		setAIStatus("ai_detection_pending", "warning");
		return;
	}

	const snapshot = DetectPageContext.getLatestSnapshot();
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
	ResourceManager.abortController(aiSessionState.abortController);
};

export const resetAISession = ({ statusKey = "ai_chat_cleared" } = {}) => {
	activeRequestToken++;
	if (aiSessionState.abortController) {
		ResourceManager.abortController(aiSessionState.abortController);
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
	const hasSnapshot = !!DetectPageContext.getLatestSnapshot();
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
