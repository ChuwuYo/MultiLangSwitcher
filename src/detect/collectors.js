import { fetchHeadersFromEndpoints } from "../shared/header-check-utils.js";
import { md5 } from "../shared/md5.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import { STORAGE_KEYS } from "../shared/storage-keys.js";
import { translateDetect } from "./shared.js";

const getBrowserInfo = () => {
	// 扩展页面必然运行在 Chromium 系浏览器，仅保留 Chromium 家族解析；
	// 历史上用于 Firefox/Safari/IE 的 UA 分支在本上下文不可达，已移除
	const ua = navigator.userAgent;
	let browserName = "Chrome";
	let browserVersion = "";
	let fullVersion = "";

	const chromeMatch = ua.match(/(?:^|\W)(?:Headless)?Chrome\/([\d.]+)/);
	if (chromeMatch) {
		fullVersion = chromeMatch[1];
		browserVersion = fullVersion.split(".")[0];
	}

	// Edge / Opera 均在 UA 中附带自有标识
	const variantMatch = ua.match(/\b(OPR|Edge|Edg)\/([\d.]+)/);
	if (variantMatch != null) {
		const browserParts = [variantMatch[1], variantMatch[2].split(".")[0]];
		// 先精确匹配 "Edge"（EdgeHTML），再用前缀匹配兜住 "Edg"（Chromium）；
		// 顺序不能反："Edge".startsWith("Edg") 为 true，会吞掉 Legacy 分支
		if (browserParts[0] === "Edge") {
			browserParts[0] = "Edge (Legacy)";
		} else if (browserParts[0].startsWith("Edg")) {
			browserParts[0] = "Edge (Chromium)";
		}
		browserName = browserParts.join(" ").replace("OPR", "Opera");
		browserVersion = browserParts[1];
		fullVersion = variantMatch[2];
	}

	let os = translateDetect("unknown_os");
	if (ua.indexOf("Windows") !== -1) os = "Windows";
	if (ua.indexOf("Mac") !== -1) os = "MacOS";
	if (ua.indexOf("X11") !== -1) os = "UNIX";
	if (ua.indexOf("Linux") !== -1) os = "Linux";

	return {
		name: browserName,
		version: browserVersion,
		fullVersion,
		os,
		userAgent: ua,
	};
};

/**
 * 采集 User-Agent Client Hints 高熵值（与 UA 字符串解析结果对照展示）
 * @returns {Promise<Object|null>} 高熵值对象；API 不可用时为 null
 */
const collectUserAgentData = async () => {
	// @types 环境未含 UA-CH 类型，最小化声明所需形状
	const uaData = /** @type {any} */ (navigator).userAgentData;
	if (!uaData) {
		return null;
	}

	const result = {
		brands: (uaData.brands || []).map((brand) => `${brand.brand} ${brand.version}`),
		mobile: uaData.mobile,
		platform: uaData.platform || "",
	};

	if (typeof uaData.getHighEntropyValues === "function") {
		try {
			const highEntropy = await uaData.getHighEntropyValues([
				"fullVersionList",
				"platformVersion",
				"architecture",
				"bitness",
				"model",
			]);
			result.fullVersionList = (highEntropy.fullVersionList || []).map((brand) => `${brand.brand} ${brand.version}`);
			result.platformVersion = highEntropy.platformVersion || "";
			result.architecture = highEntropy.architecture || "";
			result.bitness = highEntropy.bitness || "";
			result.model = highEntropy.model || "";
		} catch (error) {
			console.warn("Failed to collect UA-CH high entropy values:", error);
		}
	}

	return result;
};

const checkApiSupport = () => [
	{ name: "localStorage", supported: typeof localStorage !== "undefined" },
	{
		name: "sessionStorage",
		supported: typeof sessionStorage !== "undefined",
	},
	{ name: "IndexedDB", supported: !!window.indexedDB },
	{ name: "WebSockets", supported: "WebSocket" in window },
	{
		name: "Promises",
		supported: typeof Promise !== "undefined" && Promise.toString().indexOf("[native code]") !== -1,
	},
	{ name: "fetch API", supported: typeof fetch === "function" },
	{ name: "Service Workers", supported: "serviceWorker" in navigator },
	{
		name: "Intl (Internationalization)",
		supported: typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function",
	},
	{
		name: "URL API (URLSearchParams)",
		supported: typeof URL !== "undefined" && typeof URLSearchParams !== "undefined",
	},
	{ name: "Beacon API", supported: "sendBeacon" in navigator },
	{
		name: "WebRTC (RTCPeerConnection)",
		supported: !!window.RTCPeerConnection,
	},
	{
		name: "WebGL",
		supported: (() => {
			try {
				const canvas = ResourceManager.createCanvasElement();
				return !!(
					window.WebGLRenderingContext &&
					(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
				);
			} catch (_error) {
				return false;
			}
		})(),
	},
];

export const collectHeaderInfo = async () => {
	try {
		const result = await fetchHeadersFromEndpoints();
		if (!result.success) {
			return {
				status: "error",
				endpoint: "",
				acceptLanguage: null,
				headers: {},
				error: result.error || translateDetect("detection_failed_all_services"),
				attemptedEndpoints: result.attemptedEndpoints || [],
			};
		}

		return {
			status: "ok",
			endpoint: result.endpoint || "",
			acceptLanguage: result.acceptLanguage || null,
			headers: result.headers || {},
			error: "",
			attemptedEndpoints: result.attemptedEndpoints || [],
		};
	} catch (error) {
		console.error(translateDetect("all_attempts_failed"), error);
		return {
			status: "error",
			endpoint: "",
			acceptLanguage: null,
			headers: {},
			error: error?.message || String(error),
			attemptedEndpoints: [],
		};
	}
};

export const collectJsLanguageInfo = () => {
	try {
		return {
			status: "ok",
			language: navigator.language || "N/A",
			languages: Array.isArray(navigator.languages)
				? navigator.languages
				: navigator.languages
					? [navigator.languages]
					: [],
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "N/A",
			timezoneOffset: new Date().getTimezoneOffset(),
			error: "",
		};
	} catch (error) {
		console.error(translateDetect("js_language_detection_failed"), error);
		return {
			status: "error",
			language: "N/A",
			languages: [],
			timezone: "N/A",
			timezoneOffset: 0,
			error: error?.message || String(error),
		};
	}
};

export const collectCanvasFingerprintInfo = () => {
	try {
		const canvas = ResourceManager.createCanvasElement();
		const ctx = canvas.getContext("2d");
		const text = "BrowserLeaks,com <canvas> 1.0";
		ctx.textBaseline = "top";
		ctx.font = "14px 'Arial'";
		ctx.textBaseline = "alphabetic";
		ctx.fillStyle = "#f60";
		ctx.fillRect(125, 1, 62, 20);
		ctx.fillStyle = "#069";
		ctx.fillText(text, 2, 15);
		ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
		ctx.fillText(text, 4, 17);

		const dataUrl = canvas.toDataURL();
		return {
			status: "ok",
			hash: md5(dataUrl),
			error: "",
		};
	} catch (error) {
		console.error(translateDetect("canvas_fingerprint_detection_failed"), error);
		return {
			status: "error",
			hash: "",
			error: error?.message || String(error),
		};
	}
};

export const collectWebglFingerprintInfo = () => {
	try {
		const canvas = ResourceManager.createCanvasElement();
		const gl = /** @type {WebGLRenderingContext | null} */ (
			canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
		);
		if (!gl) {
			return {
				status: "unsupported",
				hash: "",
				vendor: "",
				renderer: "",
				version: "",
				shadingLanguageVersion: "",
				error: translateDetect("webgl_not_supported"),
			};
		}

		const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
		const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "N/A" : "N/A";
		const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "N/A" : "N/A";
		const version = gl.getParameter(gl.VERSION) || "N/A";
		const shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || "N/A";

		const extensions = gl.getSupportedExtensions() || [];
		const fingerprintData = `${vendor} | ${renderer} | ${version} | ${shadingLanguageVersion}`;
		return {
			status: "ok",
			hash: md5(fingerprintData),
			vendor,
			renderer,
			version,
			shadingLanguageVersion,
			extensionsCount: extensions.length,
			error: "",
		};
	} catch (error) {
		console.error(translateDetect("webgl_fingerprint_detection_failed"), error);
		return {
			status: "error",
			hash: "",
			vendor: "",
			renderer: "",
			version: "",
			shadingLanguageVersion: "",
			error: error?.message || String(error),
		};
	}
};

export const collectAudioFingerprintInfo = async () => {
	try {
		if (
			typeof window === "undefined" ||
			(!window.OfflineAudioContext && !(/** @type {any} */ (window).webkitOfflineAudioContext))
		) {
			return {
				status: "unsupported",
				hash: "",
				error: translateDetect("audio_not_supported"),
			};
		}

		const context = ResourceManager.createOfflineAudioContext(1, 44100, 44100);
		const oscillator = context.createOscillator();
		oscillator.type = "triangle";
		oscillator.frequency.setValueAtTime(10000, context.currentTime);

		const compressor = context.createDynamicsCompressor();
		compressor.threshold.setValueAtTime(-50, context.currentTime);
		compressor.knee.setValueAtTime(40, context.currentTime);
		compressor.ratio.setValueAtTime(12, context.currentTime);
		compressor.attack.setValueAtTime(0, context.currentTime);
		compressor.release.setValueAtTime(0.25, context.currentTime);

		oscillator.connect(compressor);
		compressor.connect(context.destination);
		oscillator.start(0);

		const renderedBuffer = await context.startRendering();
		const bufferData = renderedBuffer.getChannelData(0);
		let sum = 0;
		for (let i = 4500; i < 5000; i++) {
			if (bufferData[i]) {
				sum += Math.abs(bufferData[i]);
			}
		}

		return {
			status: "ok",
			hash: md5(sum.toString()),
			error: "",
		};
	} catch (error) {
		console.error(translateDetect("audio_fingerprint_detection_failed"), error);
		return {
			status: "error",
			hash: "",
			error: error?.message || String(error),
		};
	}
};

export const collectIntlInfo = () => {
	try {
		return {
			status: "ok",
			dateTimeLocale: Intl.DateTimeFormat().resolvedOptions().locale || "N/A",
			numberFormatLocale: Intl.NumberFormat().resolvedOptions().locale || "N/A",
			error: "",
		};
	} catch (error) {
		console.error(translateDetect("intl_api_detection_failed"), error);
		return {
			status: "error",
			dateTimeLocale: "N/A",
			numberFormatLocale: "N/A",
			error: error?.message || String(error),
		};
	}
};

const collectWebRtcIps = async () =>
	new Promise((resolve) => {
		const ips = [];

		try {
			if (typeof ResourceManager.createRTCPeerConnection !== "function") {
				resolve({
					unsupported: true,
					error: translateDetect("webrtc_not_supported"),
				});
				return;
			}

			const pc = ResourceManager.createRTCPeerConnection({ iceServers: [] });
			if (!pc) {
				resolve({
					unsupported: true,
					error: translateDetect("webrtc_not_supported"),
				});
				return;
			}

			pc.createDataChannel("");

			pc.onicecandidate = (event) => {
				if (!event?.candidate?.candidate) return;

				const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/i;
				const ipMatch = ipRegex.exec(event.candidate.candidate);

				if (ipMatch && !ips.includes(ipMatch[1])) {
					ips.push(ipMatch[1]);
				}
			};

			pc.createOffer()
				.then((offer) => pc.setLocalDescription(offer))
				.catch((error) => {
					console.error(translateDetect("webrtc_setlocaldescription_failed"), error);
				});

			ResourceManager.setTimeout(() => {
				ResourceManager.closeRTCPeerConnection(pc);
				resolve({ ips, unsupported: false, error: "" });
			}, 1000);
		} catch (error) {
			console.error("WebRTC collection error:", error);
			resolve({
				unsupported: true,
				error: error?.message || String(error),
			});
		}
	});

export const collectWebRtcInfo = async () => {
	try {
		const result = await collectWebRtcIps();
		if (result?.unsupported) {
			return {
				status: "unsupported",
				ips: [],
				ipLeakDetected: false,
				error: result.error || translateDetect("webrtc_not_supported"),
			};
		}

		const ips = result?.ips || [];
		return {
			status: ips.length > 0 ? "ok" : "none",
			ips,
			ipLeakDetected: ips.length > 0,
			error: "",
		};
	} catch (error) {
		console.error(translateDetect("webrtc_detection_failed"), error);
		return {
			status: "error",
			ips: [],
			ipLeakDetected: false,
			error: error?.message || String(error),
		};
	}
};

export const collectFingerprintInfo = async () => {
	try {
		const screenInfo = {
			width: screen.width || 0,
			height: screen.height || 0,
			colorDepth: screen.colorDepth || 0,
			availWidth: screen.availWidth || 0,
			availHeight: screen.availHeight || 0,
			pixelRatio: window.devicePixelRatio || 1,
			orientation: screen.orientation?.type || "N/A",
		};

		const hardware = {
			cores: navigator.hardwareConcurrency || 0,
			// @ts-expect-error deviceMemory 为非标准但 Chromium 支持的指纹面
			memory: navigator.deviceMemory || 0,
			maxTouchPoints: navigator.maxTouchPoints || 0,
		};

		const media = (query) => (typeof matchMedia === "function" && matchMedia(query).matches) || false;
		const display = {
			colorGamut: media("(color-gamut: rec2020)") ? "rec2020" : media("(color-gamut: p3)") ? "p3" : "srgb",
			dynamicRange: media("(dynamic-range: high)") ? "high" : "standard",
			prefersColorScheme: media("(prefers-color-scheme: dark)") ? "dark" : "light",
			prefersReducedMotion: media("(prefers-reduced-motion: reduce)"),
			prefersContrast: media("(prefers-contrast: more)") ? "more" : "no-preference",
		};

		// @ts-expect-error NetworkInformation 为非标准但 Chromium 支持
		const connection = navigator.connection
			? {
					// @ts-expect-error 同上
					effectiveType: navigator.connection.effectiveType || "N/A",
					// @ts-expect-error 同上
					downlink: navigator.connection.downlink ?? null,
					// @ts-expect-error 同上
					rtt: navigator.connection.rtt ?? null,
					// @ts-expect-error 同上
					saveData: !!navigator.connection.saveData,
				}
			: null;

		let storage = null;
		if (navigator.storage?.estimate) {
			try {
				const estimate = await navigator.storage.estimate();
				storage = { quota: estimate.quota ?? 0, usage: estimate.usage ?? 0 };
			} catch (_error) {}
		}

		let voices = null;
		if (typeof speechSynthesis !== "undefined") {
			try {
				voices = speechSynthesis.getVoices().length;
			} catch (_error) {}
		}

		return {
			status: "ok",
			userAgent: navigator.userAgent || "N/A",
			screen: screenInfo,
			hardware,
			display,
			connection,
			storage,
			voices,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "N/A",
			timezoneOffset: new Date().getTimezoneOffset(),
			error: "",
		};
	} catch (error) {
		console.error(translateDetect("fingerprint_detection_failed"), error);
		return {
			status: "error",
			userAgent: "N/A",
			screen: { width: 0, height: 0, colorDepth: 0 },
			hardware: null,
			display: null,
			connection: null,
			storage: null,
			voices: null,
			timezone: "N/A",
			timezoneOffset: 0,
			error: error?.message || String(error),
		};
	}
};

export const collectCompatibilityInfo = async () => ({
	status: "ok",
	browser: getBrowserInfo(),
	uaData: await collectUserAgentData(),
	apiSupport: checkApiSupport(),
});

export const collectExtensionContext = async () => {
	let currentLanguage = "";
	let autoSwitchEnabled = false;

	try {
		if (chrome?.storage?.local?.get) {
			const result = /** @type {{ currentLanguage?: string, autoSwitchEnabled?: boolean }} */ (
				await chrome.storage.local.get([STORAGE_KEYS.CURRENT_LANGUAGE, STORAGE_KEYS.AUTO_SWITCH_ENABLED])
			);
			currentLanguage = result.currentLanguage || "";
			autoSwitchEnabled = !!result.autoSwitchEnabled;
		}
	} catch (error) {
		console.warn("Failed to read extension context:", error);
	}

	let extensionVersion = "unknown";
	try {
		extensionVersion = chrome?.runtime?.getManifest?.().version || "unknown";
	} catch (_error) {}

	return {
		currentLanguage,
		autoSwitchEnabled,
		extensionVersion,
	};
};
