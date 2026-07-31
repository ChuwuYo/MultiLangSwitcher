import { ResourceManager } from "./shared/shared-resource-manager.js";
import {
	ensureProviderOptions,
	handleApiKeyToggle,
	handleProviderChange,
	loadAIConfig,
	persistAIConfig,
} from "./detect/ai-config.js";
import { getAiElements, setAIStatus } from "./detect/ai-shared.js";
import {
	isChatContextStale,
	resetAISession,
	sendFollowupMessage,
	startAIDiagnosis,
	stopAIRequest,
	updateAIControls,
} from "./detect/ai-session.js";
import { exportChatAsMarkdown, exportStructuredSnapshotAsMarkdown, renderChatPlaceholder } from "./detect/ai-ui.js";
import "./detect.js";
import "./toggle.js";

const sanitizeSnapshotForAI = (snapshot) => {
	if (!snapshot) {
		return snapshot;
	}

	const sanitized = JSON.parse(JSON.stringify(snapshot));

	if (sanitized.http) {
		sanitized.http.headers = {
			redacted: true,
			headerNames: Object.keys(snapshot.http?.headers || {}),
		};
	}

	if (sanitized.webrtc) {
		sanitized.webrtc.ips = Array.isArray(snapshot.webrtc?.ips) ? snapshot.webrtc.ips.map(() => "[redacted]") : [];
	}

	if (sanitized.browserFingerprint) {
		sanitized.browserFingerprint.userAgent = "[redacted]";
	}

	// UA 字符串同等敏感：保留浏览器名/版本/OS，删除完整 UA
	if (sanitized.compatibility?.browser) {
		sanitized.compatibility.browser.userAgent = "[redacted]";
	}

	// UA-CH 高熵值与 User Agent 同等敏感：仅保留移动端布尔标志
	if (sanitized.compatibility?.uaData) {
		sanitized.compatibility.uaData = {
			redacted: true,
			mobile: !!snapshot.compatibility.uaData.mobile,
		};
	}

	if (sanitized.hardwareFingerprint?.canvas) {
		sanitized.hardwareFingerprint.canvas.hash = "[redacted]";
	}

	if (sanitized.hardwareFingerprint?.webgl) {
		sanitized.hardwareFingerprint.webgl.hash = "[redacted]";
		sanitized.hardwareFingerprint.webgl.vendor = "[redacted]";
		sanitized.hardwareFingerprint.webgl.renderer = "[redacted]";
	}

	if (sanitized.hardwareFingerprint?.audio) {
		sanitized.hardwareFingerprint.audio.hash = "[redacted]";
	}

	return sanitized;
};

const bindConfigPersistence = () => {
	const elements = getAiElements();
	[elements.baseUrlInput, elements.apiKeyInput, elements.modelInput].forEach((input) => {
		ResourceManager.addEventListener(input, "change", async () => {
			await persistAIConfig();
			updateAIControls();
		});
	});
};

const initializeAIUi = async () => {
	const elements = getAiElements();
	ensureProviderOptions(elements.providerSelect);
	renderChatPlaceholder();
	await loadAIConfig();
	updateAIControls();

	ResourceManager.addEventListener(elements.providerSelect, "change", async () => {
		await handleProviderChange();
		updateAIControls();
	});
	ResourceManager.addEventListener(elements.apiKeyToggle, "click", handleApiKeyToggle);
	ResourceManager.addEventListener(elements.startButton, "click", () => startAIDiagnosis(sanitizeSnapshotForAI));
	ResourceManager.addEventListener(elements.stopButton, "click", stopAIRequest);
	ResourceManager.addEventListener(elements.clearButton, "click", () => resetAISession());
	ResourceManager.addEventListener(elements.exportStructuredButton, "click", () =>
		exportStructuredSnapshotAsMarkdown(sanitizeSnapshotForAI),
	);
	ResourceManager.addEventListener(elements.sendButton, "click", () => sendFollowupMessage(sanitizeSnapshotForAI));
	ResourceManager.addEventListener(elements.exportButton, "click", exportChatAsMarkdown);
	ResourceManager.addEventListener(elements.userInput, "keydown", (event) => {
		if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			sendFollowupMessage(sanitizeSnapshotForAI);
		}
	});

	bindConfigPersistence();
};

ResourceManager.addEventListener(window, "detect:snapshot-updated", () => {
	if (isChatContextStale()) {
		setAIStatus("ai_session_expired", "warning");
	}
	updateAIControls();
});

ResourceManager.addEventListener(window, "detect:run-finished", () => {
	updateAIControls();
});

ResourceManager.addEventListener(window, "DOMContentLoaded", () => {
	initializeAIUi();
});
