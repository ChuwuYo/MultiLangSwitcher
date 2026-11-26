import { ResourceManager } from "../shared/shared-resource-manager.js";
import {
	clearAllStoredAPIKeys,
	ensureProviderOptions,
	handleApiKeyToggle,
	handleProviderChange,
	isSanitizeSnapshotEnabled,
	loadAIConfig,
	persistAIConfig,
} from "./ai-config.js";
import { getAiElements, setAIStatus } from "./ai-shared.js";
import {
	isChatContextStale,
	resetAISession,
	sendFollowupMessage,
	startAIDiagnosis,
	stopAIRequest,
	updateAIControls,
} from "./ai-session.js";
import { exportChatAsMarkdown, exportStructuredSnapshotAsMarkdown, renderChatPlaceholder } from "./ai-ui.js";
import "./detect.js";
import "../shared/toggle.js";

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
		const rawIps = Array.isArray(snapshot.webrtc?.ips) ? snapshot.webrtc.ips : [];
		const ipSummary = { publicCount: 0, privateCount: 0, mdnsCount: 0, ipv6Count: 0 };
		for (const rawIp of rawIps) {
			const value = String(rawIp || "")
				.trim()
				.toLowerCase();
			if (!value) continue;
			if (value.endsWith(".local")) {
				ipSummary.mdnsCount++;
			} else if (value.includes(":")) {
				ipSummary.ipv6Count++;
			} else {
				const octets = value.split(".").map(Number);
				const isPrivate =
					octets.length === 4 &&
					(octets[0] === 10 ||
						octets[0] === 127 ||
						(octets[0] === 192 && octets[1] === 168) ||
						(octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
						(octets[0] === 169 && octets[1] === 254) ||
						(octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127));
				if (isPrivate) {
					ipSummary.privateCount++;
				} else {
					ipSummary.publicCount++;
				}
			}
		}
		sanitized.webrtc.ips = rawIps.map(() => "[redacted]");
		sanitized.webrtc.ipSummary = ipSummary;
	}

	if (sanitized.browserFingerprint) {
		sanitized.browserFingerprint.userAgent = "[redacted]";
	}

	// IP 时区检测的出口 IP、城市与组织/ISP 信息同等脱敏，仅保留时区与国家/地区用于一致性诊断
	if (sanitized.ipTimezone) {
		if ("ip" in sanitized.ipTimezone) sanitized.ipTimezone.ip = "[redacted]";
		if ("city" in sanitized.ipTimezone) sanitized.ipTimezone.city = "[redacted]";
		if ("organization" in sanitized.ipTimezone) sanitized.ipTimezone.organization = "[redacted]";
	}

	// UA 字符串与完整小版本号同等敏感：保留浏览器名/主版本/OS，脱敏完整 UA 与 fullVersion
	if (sanitized.compatibility?.browser) {
		sanitized.compatibility.browser.userAgent = "[redacted]";
		if ("fullVersion" in sanitized.compatibility.browser) {
			sanitized.compatibility.browser.fullVersion = "[redacted]";
		}
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
		const rawRendererText =
			`${snapshot.hardwareFingerprint?.webgl?.vendor || ""} ${snapshot.hardwareFingerprint?.webgl?.renderer || ""}`.trim();
		const rendererType = !rawRendererText
			? "unknown"
			: /swiftshader|llvmpipe|software|microsoft basic render|mesa offscreen/i.test(rawRendererText)
				? "software"
				: "hardware";
		sanitized.hardwareFingerprint.webgl.hash = "[redacted]";
		sanitized.hardwareFingerprint.webgl.vendor = "[redacted]";
		sanitized.hardwareFingerprint.webgl.renderer = "[redacted]";
		sanitized.hardwareFingerprint.webgl.rendererType = rendererType;
	}

	if (sanitized.hardwareFingerprint?.audio) {
		sanitized.hardwareFingerprint.audio.hash = "[redacted]";
	}

	return sanitized;
};

const prepareSnapshotForAI = (snapshot) => {
	if (!snapshot) return snapshot;
	const sanitizedMode = isSanitizeSnapshotEnabled();
	const prepared = sanitizedMode ? sanitizeSnapshotForAI(snapshot) : JSON.parse(JSON.stringify(snapshot));
	if (prepared && typeof prepared === "object") {
		prepared.meta = { ...(prepared.meta || {}), sanitized: sanitizedMode };
	}
	return prepared;
};

const bindConfigPersistence = () => {
	const elements = getAiElements();
	[elements.baseUrlInput, elements.apiKeyInput, elements.modelInput].forEach((input) => {
		ResourceManager.addEventListener(input, "input", () => {
			updateAIControls();
		});
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
	ResourceManager.addEventListener(elements.sessionOnlyKeyCheckbox, "change", async () => {
		await persistAIConfig();
		updateAIControls();
	});
	ResourceManager.addEventListener(elements.sanitizeSnapshotCheckbox, "change", async () => {
		await persistAIConfig();
		updateAIControls();
	});
	ResourceManager.addEventListener(elements.clearKeysButton, "click", async () => {
		await clearAllStoredAPIKeys();
		updateAIControls();
	});
	ResourceManager.addEventListener(elements.startButton, "click", () => startAIDiagnosis(prepareSnapshotForAI));
	ResourceManager.addEventListener(elements.stopButton, "click", stopAIRequest);
	ResourceManager.addEventListener(elements.clearButton, "click", () => resetAISession());
	ResourceManager.addEventListener(elements.exportStructuredButton, "click", () =>
		exportStructuredSnapshotAsMarkdown(prepareSnapshotForAI),
	);
	ResourceManager.addEventListener(elements.sendButton, "click", () => sendFollowupMessage(prepareSnapshotForAI));
	ResourceManager.addEventListener(elements.exportButton, "click", exportChatAsMarkdown);
	ResourceManager.addEventListener(elements.userInput, "keydown", (event) => {
		if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			sendFollowupMessage(prepareSnapshotForAI);
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
