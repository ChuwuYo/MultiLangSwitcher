import { CopyButton } from "../shared/copy-button.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import {
	canRenderMarkdown,
	copyTextToClipboard,
	escapeHtml,
	getAiElements,
	getMessageById,
	getVisibleChatMessages,
	setAIStatus,
	translate,
} from "./ai-shared.js";
import { getLatestDetectionSnapshot } from "./snapshot.js";

export const renderChatPlaceholder = () => {
	const { messagesContainer } = getAiElements();
	if (!messagesContainer || getVisibleChatMessages().length > 0) {
		return;
	}

	messagesContainer.innerHTML = `<div class="text-muted small">${escapeHtml(translate("ai_chat_placeholder"))}</div>`;
};

const createChatMessageElement = (message) => {
	const element = document.createElement("div");
	element.className = `ai-chat-message ai-chat-message-${message.role}`;
	element.dataset.messageId = message.id;

	const roleLabel = document.createElement("div");
	roleLabel.className = "small text-muted mb-2";
	roleLabel.textContent = message.role === "user" ? translate("ai_role_user") : translate("ai_role_assistant");
	element.appendChild(roleLabel);

	const copyButton = CopyButton?.create({
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

export const updateChatMessageElement = (message, options = {}) => {
	const { messagesContainer } = getAiElements();
	if (!messagesContainer) {
		return;
	}

	let messageElement = messagesContainer.querySelector(`[data-message-id="${message.id}"]`);
	if (!messageElement) {
		if (messagesContainer.children.length === 1 && !messagesContainer.firstElementChild?.dataset?.messageId) {
			messagesContainer.innerHTML = "";
		}

		messageElement = createChatMessageElement(message);
		messagesContainer.appendChild(messageElement);
	}

	const copyButton = messageElement.querySelector(".ai-chat-message-copy");
	if (copyButton) {
		CopyButton?.setDisabled(copyButton, !message.content);
		CopyButton?.setCopiedState(copyButton, false);
	}

	const contentElement = messageElement.querySelector(".ai-chat-message-content");
	if (!contentElement) {
		return;
	}

	if (message.role === "assistant" && options.finalize && canRenderMarkdown()) {
		const rawHtml = /** @type {any} */ (window).marked.parse(message.content || "");
		contentElement.innerHTML = /** @type {any} */ (window).DOMPurify.sanitize(rawHtml);
	} else {
		contentElement.textContent = message.content || "";
	}

	messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

export const renderVisibleChatMessages = () => {
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
			const roleLabel = message.role === "user" ? translate("ai_role_user") : translate("ai_role_assistant");
			return `## ${roleLabel}\n\n${message.content || ""}`.trim();
		})
		.join("\n\n");
};

const formatMarkdownValue = (value) => {
	if (value === null || value === undefined || value === "") {
		return "N/A";
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return "N/A";
		}

		const hasObjectItem = value.some((item) => item && typeof item === "object");
		if (hasObjectItem) {
			return {
				block: `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``,
			};
		}

		return value.join(", ");
	}

	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}

	if (typeof value === "object") {
		return {
			block: `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``,
		};
	}

	return String(value);
};

const buildMarkdownEntry = (label, value) => {
	const formattedValue = formatMarkdownValue(value);
	if (formattedValue && typeof formattedValue === "object") {
		return `- ${label}:\n\n${formattedValue.block}`;
	}

	return `- ${label}: ${formattedValue}`;
};

const getStructuredExportLabels = () => {
	return {
		title: translate("ai_export_structured"),
		generatedAt: translate("ai_export_label_generated_at"),
		snapshotVersion: translate("ai_export_label_snapshot_version"),
		uiLanguage: translate("ai_export_label_ui_language"),
		extensionVersion: translate("ai_export_label_extension_version"),
		extension: translate("ai_export_section_extension"),
		currentLanguage: translate("ai_export_label_current_language"),
		autoSwitchEnabled: translate("ai_export_label_auto_switch_enabled"),
		http: translate("ai_export_section_http"),
		status: translate("ai_export_label_status"),
		endpoint: translate("ai_export_label_endpoint"),
		acceptLanguage: translate("ai_export_label_accept_language"),
		error: translate("ai_export_label_error"),
		headers: translate("ai_export_label_headers"),
		jsEnv: translate("ai_export_section_js_env"),
		navigatorLanguage: translate("ai_export_label_navigator_language"),
		navigatorLanguages: translate("ai_export_label_navigator_languages"),
		timezone: translate("ai_export_label_timezone"),
		timezoneOffset: translate("ai_export_label_timezone_offset"),
		intl: translate("ai_export_section_intl"),
		dateTimeLocale: translate("ai_export_label_datetime_locale"),
		numberFormatLocale: translate("ai_export_label_number_locale"),
		webrtc: translate("ai_export_section_webrtc"),
		ipLeakDetected: translate("ai_export_label_ip_leak_detected"),
		ips: translate("ai_export_label_ips"),
		browserFingerprint: translate("ai_export_section_browser_fingerprint"),
		userAgent: translate("ai_export_label_user_agent"),
		screen: translate("ai_export_label_screen"),
		hardwareFingerprint: translate("ai_export_section_hardware_fingerprint"),
		canvas: translate("ai_export_label_canvas"),
		webgl: translate("ai_export_label_webgl"),
		audio: translate("ai_export_label_audio"),
		compatibility: translate("ai_export_section_compatibility"),
		browser: translate("ai_export_label_browser"),
		apiSupport: translate("ai_export_label_api_support"),
	};
};

const buildStructuredSnapshotMarkdown = (snapshot, sanitizeSnapshot) => {
	const sanitizedSnapshot = sanitizeSnapshot(snapshot);
	if (!sanitizedSnapshot) {
		return "";
	}

	const labels = getStructuredExportLabels();

	const sections = [
		`# ${labels.title}`,
		"",
		translate("ai_export_structured_notice"),
		"",
		buildMarkdownEntry(labels.generatedAt, sanitizedSnapshot.meta?.generatedAt),
		buildMarkdownEntry(labels.snapshotVersion, sanitizedSnapshot.meta?.snapshotVersion),
		buildMarkdownEntry(labels.uiLanguage, sanitizedSnapshot.meta?.uiLanguage),
		buildMarkdownEntry(labels.extensionVersion, sanitizedSnapshot.meta?.extensionVersion),
		"",
		`## ${labels.extension}`,
		"",
		buildMarkdownEntry(labels.currentLanguage, sanitizedSnapshot.extension?.currentLanguage),
		buildMarkdownEntry(labels.autoSwitchEnabled, sanitizedSnapshot.extension?.autoSwitchEnabled),
		"",
		`## ${labels.http}`,
		"",
		buildMarkdownEntry(labels.status, sanitizedSnapshot.http?.status),
		buildMarkdownEntry(labels.endpoint, sanitizedSnapshot.http?.endpoint),
		buildMarkdownEntry(labels.acceptLanguage, sanitizedSnapshot.http?.acceptLanguage),
		buildMarkdownEntry(labels.error, sanitizedSnapshot.http?.error),
		buildMarkdownEntry(labels.headers, sanitizedSnapshot.http?.headers),
		"",
		`## ${labels.jsEnv}`,
		"",
		buildMarkdownEntry(labels.navigatorLanguage, sanitizedSnapshot.jsEnv?.language),
		buildMarkdownEntry(labels.navigatorLanguages, sanitizedSnapshot.jsEnv?.languages),
		buildMarkdownEntry(labels.timezone, sanitizedSnapshot.jsEnv?.timezone),
		buildMarkdownEntry(labels.timezoneOffset, sanitizedSnapshot.jsEnv?.timezoneOffset),
		"",
		`## ${labels.intl}`,
		"",
		buildMarkdownEntry(labels.dateTimeLocale, sanitizedSnapshot.intl?.dateTimeLocale),
		buildMarkdownEntry(labels.numberFormatLocale, sanitizedSnapshot.intl?.numberFormatLocale),
		"",
		`## ${labels.webrtc}`,
		"",
		buildMarkdownEntry(labels.status, sanitizedSnapshot.webrtc?.status),
		buildMarkdownEntry(labels.ipLeakDetected, sanitizedSnapshot.webrtc?.ipLeakDetected),
		buildMarkdownEntry(labels.ips, sanitizedSnapshot.webrtc?.ips),
		buildMarkdownEntry(labels.error, sanitizedSnapshot.webrtc?.error),
		"",
		`## ${labels.browserFingerprint}`,
		"",
		buildMarkdownEntry(labels.userAgent, sanitizedSnapshot.browserFingerprint?.userAgent),
		buildMarkdownEntry(labels.screen, sanitizedSnapshot.browserFingerprint?.screen),
		buildMarkdownEntry(labels.timezone, sanitizedSnapshot.browserFingerprint?.timezone),
		buildMarkdownEntry(labels.timezoneOffset, sanitizedSnapshot.browserFingerprint?.timezoneOffset),
		"",
		`## ${labels.hardwareFingerprint}`,
		"",
		buildMarkdownEntry(labels.canvas, sanitizedSnapshot.hardwareFingerprint?.canvas),
		buildMarkdownEntry(labels.webgl, sanitizedSnapshot.hardwareFingerprint?.webgl),
		buildMarkdownEntry(labels.audio, sanitizedSnapshot.hardwareFingerprint?.audio),
		"",
		`## ${labels.compatibility}`,
		"",
		buildMarkdownEntry(labels.browser, sanitizedSnapshot.compatibility?.browser),
		buildMarkdownEntry(labels.apiSupport, sanitizedSnapshot.compatibility?.apiSupport),
	];

	return sections.join("\n");
};

const downloadMarkdownFile = (markdown, filenamePrefix) => {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
	const downloadUrl = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = downloadUrl;
	anchor.download = `${filenamePrefix}-${timestamp}.md`;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(downloadUrl);
};

export const exportChatAsMarkdown = () => {
	const markdown = buildExportMarkdown();
	if (!markdown) {
		setAIStatus("ai_export_empty", "warning");
		return;
	}

	downloadMarkdownFile(markdown, "detect-ai-chat");
	setAIStatus("ai_export_success", "success");
};

export const exportStructuredSnapshotAsMarkdown = (sanitizeSnapshot) => {
	const snapshot = getLatestDetectionSnapshot();
	const markdown = buildStructuredSnapshotMarkdown(snapshot, sanitizeSnapshot);
	if (!markdown) {
		setAIStatus("ai_export_structured_empty", "warning");
		return;
	}

	downloadMarkdownFile(markdown, "detect-structured");
	setAIStatus("ai_export_structured_success", "success");
};

const handleCopyMessage = async (messageId) => {
	const message = getMessageById(messageId);
	if (!message?.content) {
		return;
	}

	const { messagesContainer } = getAiElements();
	const button = messagesContainer?.querySelector(`.ai-chat-message-copy[data-message-id="${messageId}"]`);

	try {
		await copyTextToClipboard(message.content);
		if (button) {
			CopyButton?.setCopiedState(button, true);
			ResourceManager.setTimeout(() => {
				CopyButton?.setCopiedState(button, false);
			}, 1200);
		}
	} catch (_error) {
		setAIStatus("ai_copy_failed", "danger");
	}
};
