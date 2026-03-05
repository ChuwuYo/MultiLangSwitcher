(() => {
	const AI_CONFIG_STORAGE_KEY = "aiDiagnosisConfig";
	const DEFAULT_PROVIDER_KEY = "openrouter";
	const AI_PROVIDER_PRESETS = window.AIProviderPresets || {};
	const AI_PROVIDER_PRESET_ORDER =
		window.AIProviderPresetOrder || Object.keys(AI_PROVIDER_PRESETS);
	let aiConfigStore = {
		selectedProvider: DEFAULT_PROVIDER_KEY,
		providers: {},
	};

	const aiSessionState = {
		messages: [],
		activeSnapshotVersion: "",
		isRequestInFlight: false,
		abortController: null,
		hasStarted: false,
	};

	window.aiSessionState = aiSessionState;

	const translate = (key, params = {}) =>
		window.DetectPageContext?.translate
			? window.DetectPageContext.translate(key, params)
			: key;

	const getUiLanguage = () =>
		window.DetectPageContext?.getUiLanguage?.() === "zh" ? "zh" : "en";

	const getProviderPreset = (providerKey) =>
		AI_PROVIDER_PRESETS[providerKey] ||
		AI_PROVIDER_PRESETS[DEFAULT_PROVIDER_KEY] ||
		{};

	const ensureProviderOptions = (providerSelect) => {
		if (!providerSelect || providerSelect.options.length > 0) {
			return;
		}

		AI_PROVIDER_PRESET_ORDER.forEach((providerKey) => {
			const preset = getProviderPreset(providerKey);
			const option = document.createElement("option");
			option.value = providerKey;
			option.textContent = preset.labelKey
				? translate(preset.labelKey)
				: providerKey;
			providerSelect.appendChild(option);
		});
	};

	const getAiElements = () => ({
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
		messagesContainer: document.getElementById("aiChatMessages"),
		status: document.getElementById("aiChatStatus"),
		userInput: document.getElementById("aiUserInput"),
		sendButton: document.getElementById("aiSendButton"),
		exportButton: document.getElementById("aiExportButton"),
	});

	const getVisibleChatMessages = () =>
		aiSessionState.messages.filter((message) => message.visible !== false);

	const setStatusToneClass = (element, tone) => {
		if (!element) {
			return;
		}

		element.classList.remove(
			"text-muted",
			"text-success",
			"text-warning",
			"text-danger",
			"text-info",
		);
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

	const setAIConfigHint = (key, tone = "muted", params = {}) => {
		const { configHint } = getAiElements();
		if (!configHint) {
			return;
		}

		configHint.textContent = key ? translate(key, params) : "";
		setStatusToneClass(configHint, tone);
	};

	const setAIStatus = (key, tone = "muted", params = {}) => {
		const { status } = getAiElements();
		if (!status) {
			return;
		}

		status.textContent = key ? translate(key, params) : "";
		setStatusToneClass(status, tone);
	};

	const normalizeConfig = (config = {}) => {
		const provider = AI_PROVIDER_PRESETS[config.provider]
			? config.provider
			: DEFAULT_PROVIDER_KEY;
		const preset = getProviderPreset(provider);

		return {
			provider,
			baseUrl:
				typeof config.baseUrl === "string" && config.baseUrl.trim()
					? config.baseUrl.trim()
					: preset.baseUrl || "",
			apiKey:
				typeof config.apiKey === "string" && config.apiKey.trim()
					? config.apiKey.trim()
					: "",
			model:
				typeof config.model === "string" && config.model.trim()
					? config.model.trim()
					: preset.model || "",
			authHeader:
				typeof config.authHeader === "string" && config.authHeader.trim()
					? config.authHeader.trim()
					: preset.authHeader || "Authorization",
			updatedAt: config.updatedAt || 0,
		};
	};

	const normalizeConfigStore = (storedConfig = null) => {
		const normalizedStore = {
			selectedProvider: DEFAULT_PROVIDER_KEY,
			providers: {},
		};

		AI_PROVIDER_PRESET_ORDER.forEach((providerKey) => {
			normalizedStore.providers[providerKey] = normalizeConfig({
				provider: providerKey,
			});
		});

		if (storedConfig?.providers && typeof storedConfig.providers === "object") {
			AI_PROVIDER_PRESET_ORDER.forEach((providerKey) => {
				normalizedStore.providers[providerKey] = normalizeConfig({
					provider: providerKey,
					...(storedConfig.providers[providerKey] || {}),
				});
			});
			normalizedStore.selectedProvider = AI_PROVIDER_PRESETS[
				storedConfig.selectedProvider
			]
				? storedConfig.selectedProvider
				: DEFAULT_PROVIDER_KEY;
			return normalizedStore;
		}

		if (storedConfig && typeof storedConfig === "object") {
			const legacyProvider = guessProviderFromConfig(storedConfig);
			normalizedStore.providers[legacyProvider] = normalizeConfig({
				provider: legacyProvider,
				...storedConfig,
			});
			normalizedStore.selectedProvider = legacyProvider;
		}

		return normalizedStore;
	};

	const getStoredProviderConfig = (providerKey) =>
		aiConfigStore.providers[providerKey] ||
		normalizeConfig({ provider: providerKey });

	const serializeConfigStore = () => {
		const providers = {};
		AI_PROVIDER_PRESET_ORDER.forEach((providerKey) => {
			const providerConfig = getStoredProviderConfig(providerKey);
			providers[providerKey] = {
				provider: providerKey,
				baseUrl: providerConfig.baseUrl,
				apiKey: providerConfig.apiKey,
				model: providerConfig.model,
				authHeader: providerConfig.authHeader,
				updatedAt: providerConfig.updatedAt || 0,
			};
		});

		return {
			selectedProvider: aiConfigStore.selectedProvider || DEFAULT_PROVIDER_KEY,
			providers,
		};
	};

	const readAIConfigFromInputs = (providerOverride = "") => {
		const elements = getAiElements();
		const provider =
			providerOverride ||
			elements.providerSelect?.value ||
			DEFAULT_PROVIDER_KEY;
		const preset = getProviderPreset(provider);

		return normalizeConfig({
			provider,
			baseUrl: elements.baseUrlInput?.value || "",
			apiKey: elements.apiKeyInput?.value || "",
			model: elements.modelInput?.value || "",
			authHeader: preset.authHeader || "Authorization",
		});
	};

	const fillAIConfigInputs = (config) => {
		const elements = getAiElements();
		const normalized = normalizeConfig(config);

		ensureProviderOptions(elements.providerSelect);
		if (elements.providerSelect) {
			elements.providerSelect.value = normalized.provider;
		}
		if (elements.baseUrlInput) {
			elements.baseUrlInput.value = normalized.baseUrl;
		}
		if (elements.apiKeyInput) {
			elements.apiKeyInput.value = normalized.apiKey;
			elements.apiKeyInput.type = "password";
		}
		if (elements.modelInput) {
			elements.modelInput.value = normalized.model;
		}
		if (elements.apiKeyToggle) {
			elements.apiKeyToggle.textContent = translate("ai_api_key_toggle_show");
		}

		updateAIProviderDescription(normalized.provider);
		return normalized;
	};

	const updateAIProviderDescription = (providerKey) => {
		const { providerDescription } = getAiElements();
		if (!providerDescription) {
			return;
		}

		const preset = getProviderPreset(providerKey);
		providerDescription.textContent = preset.descriptionKey
			? translate(preset.descriptionKey)
			: "";
	};

	const guessProviderFromConfig = (config = {}) => {
		const baseUrl = String(config.baseUrl || "").trim().toLowerCase();
		if (!baseUrl) {
			return DEFAULT_PROVIDER_KEY;
		}

		const directMatch = AI_PROVIDER_PRESET_ORDER.find((providerKey) => {
			const presetBaseUrl = String(getProviderPreset(providerKey).baseUrl || "")
				.trim()
				.toLowerCase();
			return presetBaseUrl && baseUrl.startsWith(presetBaseUrl);
		});

		return directMatch || config.provider || DEFAULT_PROVIDER_KEY;
	};

	const validateAIConfig = (config) => {
		if (!config.baseUrl || !config.apiKey || !config.model) {
			return { valid: false, messageKey: "ai_config_incomplete" };
		}

		if (String(config.baseUrl).includes("YOUR-RESOURCE-NAME")) {
			return { valid: false, messageKey: "ai_config_replace_template" };
		}

		return { valid: true, messageKey: "ai_config_ready" };
	};

	const persistAIConfig = async () => {
		const config = readAIConfigFromInputs();
		aiConfigStore.selectedProvider = config.provider;
		aiConfigStore.providers[config.provider] = {
			...config,
			updatedAt: Date.now(),
		};
		const validation = validateAIConfig(config);

		try {
			await chrome.storage.local.set({
				[AI_CONFIG_STORAGE_KEY]: serializeConfigStore(),
			});
		} catch (error) {
			console.warn("Failed to persist AI config:", error);
		}

		setAIConfigHint(
			validation.messageKey,
			validation.valid ? "success" : "warning",
		);
		updateAIControls();
		return config;
	};

	const loadAIConfig = async () => {
		let storedConfig = null;
		try {
			const result = await chrome.storage.local.get(AI_CONFIG_STORAGE_KEY);
			storedConfig = result?.[AI_CONFIG_STORAGE_KEY] || null;
		} catch (error) {
			console.warn("Failed to load AI config:", error);
		}

		aiConfigStore = normalizeConfigStore(storedConfig);
		const normalized = getStoredProviderConfig(aiConfigStore.selectedProvider);

		fillAIConfigInputs(normalized);
		const validation = validateAIConfig(normalized);
		setAIConfigHint(
			validation.messageKey,
			validation.valid ? "success" : "warning",
		);
		return normalized;
	};

	const isChatContextStale = () =>
		!!(
			aiSessionState.hasStarted &&
			aiSessionState.activeSnapshotVersion &&
			window.DetectPageContext?.getLatestSnapshotVersion?.() &&
			aiSessionState.activeSnapshotVersion !==
				window.DetectPageContext.getLatestSnapshotVersion()
		);

	const canRenderMarkdown = () =>
		typeof window.marked?.parse === "function" &&
		typeof window.DOMPurify?.sanitize === "function";

	const escapeHtml = (value) =>
		String(value || "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");

	const renderChatPlaceholder = () => {
		const { messagesContainer } = getAiElements();
		if (!messagesContainer || getVisibleChatMessages().length > 0) {
			return;
		}

		messagesContainer.innerHTML = `<div class="text-muted small">${escapeHtml(
			translate("ai_chat_placeholder"),
		)}</div>`;
	};

	const copyTextToClipboard = async (text) => {
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

	const getMessageById = (messageId) =>
		aiSessionState.messages.find((message) => message.id === messageId) || null;

	const createChatMessageElement = (message) => {
		const element = document.createElement("div");
		element.className = `ai-chat-message ai-chat-message-${message.role}`;
		element.dataset.messageId = message.id;

		const roleLabel = document.createElement("div");
		roleLabel.className = "small text-muted mb-2";
		roleLabel.textContent =
			message.role === "user"
				? translate("ai_role_user")
				: translate("ai_role_assistant");
		element.appendChild(roleLabel);

		const copyButton = window.CopyButton?.create({
			className: "ai-chat-message-copy",
			messageId: message.id,
			tooltipInitial: translate("ai_copy_tooltip"),
			tooltipEnd: translate("ai_copied_tooltip"),
			onClick: () => handleCopyMessage(message.id),
		});
		if (copyButton) {
			element.appendChild(copyButton);
		}

		const content = document.createElement("div");
		content.className = "ai-chat-message-content";
		element.appendChild(content);

		return element;
	};

	const updateChatMessageElement = (message, options = {}) => {
		const { messagesContainer } = getAiElements();
		if (!messagesContainer) {
			return;
		}

		let messageElement = messagesContainer.querySelector(
			`[data-message-id="${message.id}"]`,
		);
		if (!messageElement) {
			if (
				messagesContainer.children.length === 1 &&
				!messagesContainer.firstElementChild?.dataset?.messageId
			) {
				messagesContainer.innerHTML = "";
			}

			messageElement = createChatMessageElement(message);
			messagesContainer.appendChild(messageElement);
		}

		const copyButton = messageElement.querySelector(".ai-chat-message-copy");
		if (copyButton) {
			window.CopyButton?.setDisabled(copyButton, !message.content);
			window.CopyButton?.setCopiedState(copyButton, false);
		}

		const contentElement = messageElement.querySelector(".ai-chat-message-content");
		if (!contentElement) {
			return;
		}

		if (message.role === "assistant" && options.finalize && canRenderMarkdown()) {
			const rawHtml = window.marked.parse(message.content || "");
			contentElement.innerHTML = window.DOMPurify.sanitize(rawHtml);
		} else {
			contentElement.textContent = message.content || "";
		}

		messagesContainer.scrollTop = messagesContainer.scrollHeight;
	};

	const renderVisibleChatMessages = () => {
		const { messagesContainer } = getAiElements();
		if (!messagesContainer) {
			return;
		}

		messagesContainer.innerHTML = "";
		const visibleMessages = getVisibleChatMessages();
		if (visibleMessages.length === 0) {
			renderChatPlaceholder();
			return;
		}

		visibleMessages.forEach((message) => {
			updateChatMessageElement(message, {
				finalize: message.role === "assistant" && !!message.rendered,
			});
		});
	};

	const buildExportMarkdown = () => {
		const visibleMessages = getVisibleChatMessages();
		if (visibleMessages.length === 0) {
			return "";
		}

		return visibleMessages
			.map((message) => {
				const roleLabel =
					message.role === "user"
						? translate("ai_role_user")
						: translate("ai_role_assistant");
				return `## ${roleLabel}\n\n${message.content || ""}`.trim();
			})
			.join("\n\n");
	};

	const exportChatAsMarkdown = () => {
		const markdown = buildExportMarkdown();
		if (!markdown) {
			setAIStatus("ai_export_empty", "warning");
			return;
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
		const downloadUrl = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = downloadUrl;
		anchor.download = `detect-ai-chat-${timestamp}.md`;
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
		URL.revokeObjectURL(downloadUrl);
		setAIStatus("ai_export_success", "success");
	};

	const removeMessageById = (messageId) => {
		aiSessionState.messages = aiSessionState.messages.filter(
			(message) => message.id !== messageId,
		);
		renderVisibleChatMessages();
	};

	const resetAISession = ({ statusKey = "ai_chat_cleared" } = {}) => {
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

	const updateAIControls = () => {
		const elements = getAiElements();
		const config = readAIConfigFromInputs();
		const validation = validateAIConfig(config);
		const hasSnapshot = !!window.DetectPageContext?.getLatestSnapshot?.();
		const stale = isChatContextStale();
		const canFollowUp =
			aiSessionState.hasStarted &&
			!stale &&
			!aiSessionState.isRequestInFlight &&
			validation.valid &&
			hasSnapshot;

		if (elements.startButton) {
			elements.startButton.disabled =
				aiSessionState.isRequestInFlight || !validation.valid || !hasSnapshot;
		}
		if (elements.stopButton) {
			elements.stopButton.disabled = !aiSessionState.isRequestInFlight;
		}
		if (elements.clearButton) {
			elements.clearButton.disabled = aiSessionState.isRequestInFlight;
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

	const buildInitialPrompt = (snapshot) => {
		if (getUiLanguage() === "zh") {
			return [
				"请基于下面这份浏览器环境检测快照做一次中性的结果解读。",
				"先给出总体判断：正常 / 基本正常但有可疑点 / 存在明显风险 / 信息不足。",
				"然后按“正常信号”“需要关注的点”“建议操作”“判断边界”四部分输出。",
				"如果某些信号在检测页里属于常见现象，请明确写出“这是常见现象，不代表真实网站一定存在问题”。",
				"不要重复整段 JSON，只提炼真正重要的点。",
				"",
				JSON.stringify(snapshot, null, 2),
			].join("\n");
		}

		return [
			"Please interpret the following browser environment detection snapshot in a neutral way.",
			"Start with an overall assessment: normal / mostly normal with a few suspicious signals / clear risk / insufficient evidence.",
			"Then structure the answer as: normal signals, points worth attention, actionable suggestions, and limits of the assessment.",
			"If a signal is common on a detect page, explicitly say it is common and does not automatically mean a real website problem.",
			"Do not repeat the full JSON; extract only the important points.",
			"",
			JSON.stringify(snapshot, null, 2),
		].join("\n");
	};

	const ensureAIClientAvailable = () => {
		if (!window.AIChatClient?.createChatCompletion) {
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
			url: window.AIChatClient.normalizeChatCompletionsUrl(config.baseUrl),
		};
	};

	const handleProviderChange = async () => {
		const elements = getAiElements();
		const previousProvider =
			aiConfigStore.selectedProvider || DEFAULT_PROVIDER_KEY;
		const nextProvider = elements.providerSelect?.value || DEFAULT_PROVIDER_KEY;

		aiConfigStore.providers[previousProvider] = {
			...readAIConfigFromInputs(previousProvider),
			updatedAt: Date.now(),
		};
		aiConfigStore.selectedProvider = nextProvider;

		fillAIConfigInputs(getStoredProviderConfig(nextProvider));
		const validation = validateAIConfig(getStoredProviderConfig(nextProvider));
		setAIConfigHint(
			validation.messageKey,
			validation.valid ? "success" : "warning",
		);

		try {
			await chrome.storage.local.set({
				[AI_CONFIG_STORAGE_KEY]: serializeConfigStore(),
			});
		} catch (error) {
			console.warn("Failed to persist AI config:", error);
		}

		updateAIProviderDescription(nextProvider);
		updateAIControls();
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

	const requestAssistantMessage = async ({ userMessage = "", firstTurn = false }) => {
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

		const snapshot = window.DetectPageContext?.getLatestSnapshot?.();
		if (!snapshot) {
			setAIStatus("ai_detection_pending", "warning");
			return;
		}

		if (firstTurn) {
			aiSessionState.messages = [
				{
					id: window.DetectPageContext.createMessageId(),
					role: "system",
					content: getSystemPrompt(),
					visible: false,
				},
				{
					id: window.DetectPageContext.createMessageId(),
					role: "user",
					content: buildInitialPrompt(snapshot),
					visible: false,
				},
			];
		} else {
			appendChatMessage({
				id: window.DetectPageContext.createMessageId(),
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
			id: window.DetectPageContext.createMessageId(),
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
			const result = await window.AIChatClient.createChatCompletion({
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
			const aborted =
				error?.name === "AbortError" ||
				/cancel|abort/i.test(String(error?.message || ""));
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

	const startAIDiagnosis = async () => {
		if (window.DetectPageContext?.isDetectionRunning?.()) {
			setAIStatus("ai_detection_pending", "warning");
			return;
		}

		const snapshot = window.DetectPageContext?.getLatestSnapshot?.();
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
		await requestAssistantMessage({ firstTurn: true });
	};

	const sendFollowupMessage = async () => {
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
		await requestAssistantMessage({ userMessage, firstTurn: false });
	};

	const stopAIRequest = () => {
		if (!aiSessionState.abortController) {
			return;
		}

		try {
			aiSessionState.abortController.abort();
		} catch (_error) {}
	};

	const handleApiKeyToggle = () => {
		const { apiKeyInput, apiKeyToggle } = getAiElements();
		if (!apiKeyInput || !apiKeyToggle) {
			return;
		}

		const nextVisible = apiKeyInput.type === "password";
		apiKeyInput.type = nextVisible ? "text" : "password";
		apiKeyToggle.textContent = translate(
			nextVisible ? "ai_api_key_toggle_hide" : "ai_api_key_toggle_show",
		);
	};

	const handleCopyMessage = async (messageId) => {
		const message = getMessageById(messageId);
		if (!message?.content) {
			return;
		}

		const { messagesContainer } = getAiElements();
		const button = messagesContainer?.querySelector(
			`.ai-chat-message-copy[data-message-id="${messageId}"]`,
		);

		try {
			await copyTextToClipboard(message.content);
			if (button) {
				window.CopyButton?.setCopiedState(button, true);
				window.setTimeout(() => {
					window.CopyButton?.setCopiedState(button, false);
				}, 1200);
			}
		} catch (_error) {
			setAIStatus("ai_copy_failed", "danger");
		}
	};

	const bindConfigPersistence = () => {
		const elements = getAiElements();
		[
			elements.baseUrlInput,
			elements.apiKeyInput,
			elements.modelInput,
		].forEach((input) => {
			if (!input) {
				return;
			}

			input.addEventListener("change", persistAIConfig);
			input.addEventListener("blur", persistAIConfig);
		});
	};

	const initializeAIUi = async () => {
		const elements = getAiElements();
		ensureProviderOptions(elements.providerSelect);
		renderChatPlaceholder();
		await loadAIConfig();
		updateAIControls();

		elements.providerSelect?.addEventListener("change", handleProviderChange);
		elements.apiKeyToggle?.addEventListener("click", handleApiKeyToggle);
		elements.startButton?.addEventListener("click", startAIDiagnosis);
		elements.stopButton?.addEventListener("click", stopAIRequest);
		elements.clearButton?.addEventListener("click", () => resetAISession());
		elements.sendButton?.addEventListener("click", sendFollowupMessage);
		elements.exportButton?.addEventListener("click", exportChatAsMarkdown);
		elements.userInput?.addEventListener("keydown", (event) => {
			if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
				event.preventDefault();
				sendFollowupMessage();
			}
		});

		bindConfigPersistence();
	};

	window.DetectAIContext = {
		isChatContextStale,
		setAIStatus,
		updateAIControls,
	};

	ResourceManager.addEventListener(window, "DOMContentLoaded", () => {
		initializeAIUi();
	});
})();
