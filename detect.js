let latestDetectionSnapshot = null;
let latestSnapshotVersion = "";
let detectionRunInFlight = null;

window.latestDetectionSnapshot = latestDetectionSnapshot;

const getUiLanguage = () => (detectI18n?.currentLang === "zh" ? "zh" : "en");

const translateDetect = (key, params = {}) =>
	detectI18n?.t ? detectI18n.t(key, params) : key;

const createMessageId = () =>
	`msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getBrowserInfo = () => {
	const ua = navigator.userAgent;
	let browserName = translateDetect("unknown_browser");
	let browserVersion = translateDetect("unknown_version");
	let fullVersion = "";

	let tem;
	const M =
		ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) ||
		[];

	if (/trident/i.test(M[1])) {
		tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
		browserName = "Internet Explorer";
		browserVersion = tem[1] || "";
		fullVersion = browserVersion;
	} else if (M[1] === "Chrome") {
		tem = ua.match(/\b(OPR|Edge|Edg)\/(\d+)/);
		if (tem != null) {
			const browserParts = tem.slice(1);
			if (browserParts[0].startsWith("Edg")) {
				browserParts[0] = "Edge (Chromium)";
			} else if (browserParts[0] === "Edge") {
				browserParts[0] = "Edge (Legacy)";
			}
			browserName = browserParts.join(" ").replace("OPR", "Opera");
			browserVersion = browserParts.length > 1 ? browserParts[1] : "";
			fullVersion = ua.match(/\b(OPR|Edge|Edg)\/([\d.]+)/)
				? ua.match(/\b(OPR|Edge|Edg)\/([\d.]+)/)[2]
				: browserVersion;
		} else {
			browserName = "Chrome";
			browserVersion = M[2];
			fullVersion = ua.match(/\bChrome\/([\d.]+)/)
				? ua.match(/\bChrome\/([\d.]+)/)[1]
				: browserVersion;
		}
	} else if (M[1] === "Firefox") {
		browserName = "Firefox";
		browserVersion = M[2];
		fullVersion = ua.match(/\bFirefox\/([\d.]+)/)
			? ua.match(/\bFirefox\/([\d.]+)/)[1]
			: browserVersion;
	} else if (M[1] === "Safari") {
		tem = ua.match(/version\/(\d+)/i);
		browserName = "Safari";
		browserVersion = tem ? tem[1] : M[2];
		fullVersion = ua.match(/version\/([\d.]+)/i)
			? ua.match(/version\/([\d.]+)/i)[1]
			: browserVersion;
	} else if (M[1] === "MSIE") {
		browserName = "Internet Explorer";
		browserVersion = M[2];
		fullVersion = browserVersion;
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
		supported:
			typeof Promise !== "undefined" &&
			Promise.toString().indexOf("[native code]") !== -1,
	},
	{ name: "fetch API", supported: typeof fetch === "function" },
	{ name: "Service Workers", supported: "serviceWorker" in navigator },
	{
		name: "Intl (Internationalization)",
		supported:
			typeof Intl !== "undefined" &&
			typeof Intl.DateTimeFormat === "function",
	},
	{
		name: "URL API (URLSearchParams)",
		supported:
			typeof URL !== "undefined" && typeof URLSearchParams !== "undefined",
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
					(canvas.getContext("webgl") ||
						canvas.getContext("experimental-webgl"))
				);
			} catch (_error) {
				return false;
			}
		})(),
	},
];

const collectHeaderInfo = async () => {
	try {
		const result = await window.HeaderCheckUtils.fetchHeadersFromEndpoints();
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

const renderHeaderInfo = (headerInfo) => {
	const headerInfoElement = document.getElementById("headerInfo");
	const headerLanguageInfo = document.getElementById("headerLanguageInfo");
	if (!headerInfoElement || !headerLanguageInfo) return;

	if (headerInfo.status === "ok") {
		headerInfoElement.textContent = JSON.stringify(headerInfo.headers, null, 2);
		const existingAlertInfoP =
			headerInfoElement.parentElement.querySelector("p.mt-2");
		if (existingAlertInfoP) {
			existingAlertInfoP.remove();
		}

		headerLanguageInfo.innerHTML = "";
		const fragment = document.createDocumentFragment();

		if (headerInfo.acceptLanguage) {
			const titleP = document.createElement("p");
			titleP.className = "mb-1";
			const strong = document.createElement("strong");
			strong.textContent = translateDetect("current_value");
			titleP.appendChild(strong);
			fragment.appendChild(titleP);

			const valP = document.createElement("p");
			valP.className = "text-success fw-bold";
			valP.textContent = headerInfo.acceptLanguage;
			fragment.appendChild(valP);

			if (headerInfo.endpoint) {
				const endpointP = document.createElement("p");
				endpointP.className = "small text-muted mb-0";
				endpointP.textContent = headerInfo.endpoint;
				fragment.appendChild(endpointP);
			}

			const footerP = document.createElement("p");
			footerP.className = "mb-0 mt-2 small text-muted";
			footerP.textContent = translateDetect("detected_via").replace(
				"{method}",
				translateDetect("request_header_method"),
			);
			fragment.appendChild(footerP);
		} else {
			const warningP = document.createElement("p");
			warningP.className = "text-warning";
			warningP.textContent = translateDetect("not_detected_accept_language");
			fragment.appendChild(warningP);

			const linkP = document.createElement("p");
			linkP.className = "mt-2";
			linkP.appendChild(
				window.HeaderCheckUtils.createExternalCheckLinks({
					prefix: translateDetect("external_check_prefix"),
					or: translateDetect("external_check_or"),
					suffix: translateDetect("external_check_suffix"),
				}),
			);
			fragment.appendChild(linkP);
		}

		headerLanguageInfo.appendChild(fragment);
		return;
	}

	let combinedErrorMessage = translateDetect("fetch_failed_all_services");
	if (headerInfo.error) {
		combinedErrorMessage += ` ${headerInfo.error}`;
	}

	headerInfoElement.textContent = combinedErrorMessage;
	headerLanguageInfo.innerHTML = "";

	const fragment = document.createDocumentFragment();
	const errorP = document.createElement("p");
	errorP.className = "text-danger";
	errorP.textContent = translateDetect("detection_failed_all_services");
	fragment.appendChild(errorP);

	const detailP = document.createElement("p");
	detailP.className = "small text-muted";
	detailP.textContent = headerInfo.error || combinedErrorMessage;
	fragment.appendChild(detailP);

	const linkP = document.createElement("p");
	linkP.className = "mt-2";
	linkP.appendChild(
		window.HeaderCheckUtils.createExternalCheckLinks({
			prefix: translateDetect("external_check_prefix"),
			or: translateDetect("external_check_or"),
			suffix: translateDetect("external_check_suffix"),
		}),
	);
	fragment.appendChild(linkP);

	headerLanguageInfo.appendChild(fragment);
};

const collectJsLanguageInfo = () => {
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

const renderJsLanguageInfo = (jsLanguageInfo) => {
	const jsLanguageInfoElement = document.getElementById("jsLanguageInfo");
	if (!jsLanguageInfoElement) return;

	jsLanguageInfoElement.innerHTML = "";
	if (jsLanguageInfo.status !== "ok") {
		const errorP = document.createElement("p");
		errorP.className = "text-danger";
		errorP.textContent = `${translateDetect("detection_failed")}: ${jsLanguageInfo.error}`;
		jsLanguageInfoElement.appendChild(errorP);
		return;
	}

	const fragment = document.createDocumentFragment();

	const langTitleP = document.createElement("p");
	langTitleP.className = "mb-1";
	const strongLang = document.createElement("strong");
	strongLang.textContent = "navigator.language:";
	langTitleP.appendChild(strongLang);
	fragment.appendChild(langTitleP);

	const langValP = document.createElement("p");
	langValP.className = "text-info fw-bold";
	langValP.textContent = jsLanguageInfo.language;
	fragment.appendChild(langValP);

	const langsTitleP = document.createElement("p");
	langsTitleP.className = "mb-1 mt-2";
	const strongLangs = document.createElement("strong");
	strongLangs.textContent = "navigator.languages:";
	langsTitleP.appendChild(strongLangs);
	fragment.appendChild(langsTitleP);

	const langsValP = document.createElement("p");
	langsValP.className = "text-info fw-bold";
	langsValP.textContent =
		jsLanguageInfo.languages.length > 0
			? jsLanguageInfo.languages.join(", ")
			: "N/A";
	fragment.appendChild(langsValP);

	const footerP = document.createElement("p");
	footerP.className = "mb-0 mt-2 small text-muted";
	footerP.textContent = translateDetect("detected_via").replace(
		"{method}",
		translateDetect("javascript_method"),
	);
	fragment.appendChild(footerP);

jsLanguageInfoElement.appendChild(fragment);
};

const collectCanvasFingerprintInfo = () => {
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

const renderCanvasFingerprintInfo = (canvasFingerprintInfo) => {
	const canvasInfoElement = document.getElementById("canvasFingerprintInfo");
	if (!canvasInfoElement) return;

	canvasInfoElement.innerHTML = "";
	if (canvasFingerprintInfo.status !== "ok") {
		const errorP = document.createElement("p");
		errorP.className = "text-danger";
		errorP.textContent = `${translateDetect("detection_failed")}: ${canvasFingerprintInfo.error}`;
		canvasInfoElement.appendChild(errorP);
		return;
	}

	const fragment = document.createDocumentFragment();
	const hashTitleP = document.createElement("p");
	hashTitleP.className = "mb-1";
	const strongHash = document.createElement("strong");
	strongHash.textContent = "Canvas hash:";
	hashTitleP.appendChild(strongHash);
	fragment.appendChild(hashTitleP);

	const hashValP = document.createElement("p");
	hashValP.className = "text-dark fw-bold small";
	hashValP.textContent = canvasFingerprintInfo.hash;
	fragment.appendChild(hashValP);

	const footerP = document.createElement("p");
	footerP.className = "mb-0 mt-2 small text-muted";
	footerP.textContent = translateDetect("detected_via").replace(
		"{method}",
		translateDetect("canvas_method"),
	);
	fragment.appendChild(footerP);

	canvasInfoElement.appendChild(fragment);
};

const collectWebglFingerprintInfo = () => {
	try {
		const canvas = ResourceManager.createCanvasElement();
		const gl =
			canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
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
		const vendor = debugInfo
			? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "N/A"
			: "N/A";
		const renderer = debugInfo
			? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "N/A"
			: "N/A";
		const version = gl.getParameter(gl.VERSION) || "N/A";
		const shadingLanguageVersion =
			gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || "N/A";

		const fingerprintData = `${vendor} | ${renderer} | ${version} | ${shadingLanguageVersion}`;
		return {
			status: "ok",
			hash: md5(fingerprintData),
			vendor,
			renderer,
			version,
			shadingLanguageVersion,
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

const renderWebglFingerprintInfo = (webglFingerprintInfo) => {
	const webglInfoElement = document.getElementById("webglFingerprintInfo");
	if (!webglInfoElement) return;

	webglInfoElement.innerHTML = "";
	if (webglFingerprintInfo.status === "unsupported") {
		const warningP = document.createElement("p");
		warningP.className = "text-warning";
		warningP.textContent = translateDetect("webgl_not_supported");
		webglInfoElement.appendChild(warningP);
		return;
	}

	if (webglFingerprintInfo.status !== "ok") {
		const errorP = document.createElement("p");
		errorP.className = "text-danger";
		errorP.textContent = `${translateDetect("detection_failed")}: ${webglFingerprintInfo.error}`;
		webglInfoElement.appendChild(errorP);
		return;
	}

	const fragment = document.createDocumentFragment();
	const addDetail = (title, value, isBold = false, mt = "mt-2") => {
		const titleP = document.createElement("p");
		titleP.className = `mb-1 ${mt}`;
		const strongTitle = document.createElement("strong");
		strongTitle.textContent = title;
		titleP.appendChild(strongTitle);
		fragment.appendChild(titleP);

		const valP = document.createElement("p");
		valP.className = `text-dark small${isBold ? " fw-bold" : ""}`;
		valP.textContent = value;
		fragment.appendChild(valP);
	};

	addDetail("WebGL hash:", webglFingerprintInfo.hash, true, "");
	addDetail("WebGL unmasked vendor:", webglFingerprintInfo.vendor);
	addDetail("WebGL unmasked renderer:", webglFingerprintInfo.renderer);
	addDetail("WebGL version:", webglFingerprintInfo.version);
	addDetail(
		"Shading Language Version:",
		webglFingerprintInfo.shadingLanguageVersion,
	);

	const footerP = document.createElement("p");
	footerP.className = "mb-0 mt-2 small text-muted";
	footerP.textContent = translateDetect("detected_via").replace(
		"{method}",
		translateDetect("webgl_method"),
	);
	fragment.appendChild(footerP);

	webglInfoElement.appendChild(fragment);
};

const collectAudioFingerprintInfo = async () => {
	try {
		if (
			typeof window === "undefined" ||
			(!window.OfflineAudioContext && !window.webkitOfflineAudioContext)
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

const renderAudioFingerprintInfo = (audioFingerprintInfo) => {
	const audioInfoElement = document.getElementById("audioFingerprintInfo");
	if (!audioInfoElement) return;

	audioInfoElement.innerHTML = "";
	if (audioFingerprintInfo.status === "unsupported") {
		const warningP = document.createElement("p");
		warningP.className = "text-warning";
		warningP.textContent = translateDetect("audio_not_supported");
		audioInfoElement.appendChild(warningP);
		return;
	}

	if (audioFingerprintInfo.status !== "ok") {
		const errorP = document.createElement("p");
		errorP.className = "text-danger";
		errorP.textContent = `${translateDetect("detection_failed")}: ${audioFingerprintInfo.error}`;
		audioInfoElement.appendChild(errorP);
		return;
	}

	const fragment = document.createDocumentFragment();
	const hashTitleP = document.createElement("p");
	hashTitleP.className = "mb-1";
	const strongHash = document.createElement("strong");
	strongHash.textContent = "AudioContext hash:";
	hashTitleP.appendChild(strongHash);
	fragment.appendChild(hashTitleP);

	const hashValP = document.createElement("p");
	hashValP.className = "text-dark fw-bold small";
	hashValP.textContent = audioFingerprintInfo.hash;
	fragment.appendChild(hashValP);

	const footerP = document.createElement("p");
	footerP.className = "mb-0 mt-2 small text-muted";
	footerP.textContent = translateDetect("detected_via").replace(
		"{method}",
		translateDetect("audio_method"),
	);
	fragment.appendChild(footerP);

	audioInfoElement.appendChild(fragment);
};

const collectIntlInfo = () => {
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

const renderIntlInfo = (intlInfo) => {
	const intlApiInfoElement = document.getElementById("intlApiInfo");
	if (!intlApiInfoElement) return;

	intlApiInfoElement.innerHTML = "";
	if (intlInfo.status !== "ok") {
		const errorP = document.createElement("p");
		errorP.className = "text-danger";
		errorP.textContent = `${translateDetect("detection_failed")}: ${intlInfo.error}`;
		intlApiInfoElement.appendChild(errorP);
		return;
	}

	const fragment = document.createDocumentFragment();

	const dtTitleP = document.createElement("p");
	dtTitleP.className = "mb-1";
	const strongDt = document.createElement("strong");
	strongDt.textContent = "DateTimeFormat Locale:";
	dtTitleP.appendChild(strongDt);
	fragment.appendChild(dtTitleP);

	const dtValP = document.createElement("p");
	dtValP.className = "text-secondary fw-bold";
	dtValP.textContent = intlInfo.dateTimeLocale;
	fragment.appendChild(dtValP);

	const nfTitleP = document.createElement("p");
	nfTitleP.className = "mb-1 mt-2";
	const strongNf = document.createElement("strong");
	strongNf.textContent = "NumberFormat Locale:";
	nfTitleP.appendChild(strongNf);
	fragment.appendChild(nfTitleP);

	const nfValP = document.createElement("p");
	nfValP.className = "text-secondary fw-bold";
	nfValP.textContent = intlInfo.numberFormatLocale;
	fragment.appendChild(nfValP);

	const footerP = document.createElement("p");
	footerP.className = "mb-0 mt-2 small text-muted";
	footerP.textContent = translateDetect("detected_via").replace(
		"{method}",
		translateDetect("intl_method"),
	);
	fragment.appendChild(footerP);

	intlApiInfoElement.appendChild(fragment);
};

const collectWebRtcIps = async () =>
	new Promise((resolve) => {
		const ips = [];

		try {
			const pc = ResourceManager.createRTCPeerConnection({ iceServers: [] });
			pc.createDataChannel("");

			pc.onicecandidate = (event) => {
				if (!event?.candidate?.candidate) return;

				const ipRegex =
					/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/i;
				const ipMatch = ipRegex.exec(event.candidate.candidate);

				if (ipMatch && !ips.includes(ipMatch[1])) {
					ips.push(ipMatch[1]);
				}
			};

			pc.createOffer()
				.then((offer) => pc.setLocalDescription(offer))
				.catch((error) => {
					console.error(
						translateDetect("webrtc_setlocaldescription_failed"),
						error,
					);
				});

			ResourceManager.setTimeout(() => {
				ResourceManager.closeRTCPeerConnection(pc);
				resolve(ips);
			}, 1000);
		} catch (error) {
			console.error("WebRTC collection error:", error);
			resolve([]);
		}
	});

const collectWebRtcInfo = async () => {
	try {
		const ips = await collectWebRtcIps();
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

const renderWebRtcInfo = (webRtcInfo) => {
	const webRtcInfoElement = document.getElementById("webRtcInfo");
	if (!webRtcInfoElement) return;

	webRtcInfoElement.innerHTML = "";
	const fragment = document.createDocumentFragment();

	if (webRtcInfo.status === "error") {
		const errorP = document.createElement("p");
		errorP.className = "text-danger";
		errorP.textContent = `${translateDetect("webrtc_not_supported")}: ${webRtcInfo.error}`;
		webRtcInfoElement.appendChild(errorP);
		return;
	}

	if (webRtcInfo.ips.length > 0) {
		const titleP = document.createElement("p");
		titleP.className = "mb-1";
		const strongTitle = document.createElement("strong");
		strongTitle.textContent = translateDetect("webrtc_local_ip");
		titleP.appendChild(strongTitle);
		fragment.appendChild(titleP);

		const descP = document.createElement("p");
		descP.className = "small text-muted mb-1";
		descP.textContent = translateDetect("webrtc_description");
		fragment.appendChild(descP);

		const list = document.createElement("ul");
		list.className = "list-unstyled mb-0";
		webRtcInfo.ips.forEach((ip) => {
			const item = document.createElement("li");
			item.className = "text-info fw-bold";
			item.textContent = ip;
			list.appendChild(item);
		});
		fragment.appendChild(list);
	} else {
		const successP = document.createElement("p");
		successP.className = "text-success";
		successP.textContent = translateDetect("webrtc_no_ip_detected");
		fragment.appendChild(successP);
	}

	const footerP = document.createElement("p");
	footerP.className = "mb-0 mt-2 small text-muted";
	footerP.textContent = translateDetect("detected_via").replace(
		"{method}",
		translateDetect("webrtc_method"),
	);
	fragment.appendChild(footerP);

	webRtcInfoElement.appendChild(fragment);
};

const collectFingerprintInfo = () => {
	try {
		const screenInfo = {
			width: screen.width || 0,
			height: screen.height || 0,
			colorDepth: screen.colorDepth || 0,
		};

		return {
			status: "ok",
			userAgent: navigator.userAgent || "N/A",
			screen: screenInfo,
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
			timezone: "N/A",
			timezoneOffset: 0,
			error: error?.message || String(error),
		};
	}
};

const renderFingerprintInfo = (fingerprintInfo) => {
	const fingerprintInfoElement = document.getElementById("fingerprintInfo");
	if (!fingerprintInfoElement) return;

	fingerprintInfoElement.innerHTML = "";
	if (fingerprintInfo.status !== "ok") {
		const errorP = document.createElement("p");
		errorP.className = "text-danger";
		errorP.textContent = `${translateDetect("browser_fingerprint")} ${translateDetect("detection_failed")}: ${fingerprintInfo.error}`;
		fingerprintInfoElement.appendChild(errorP);
		return;
	}

	const fragment = document.createDocumentFragment();
	const addDetail = (
		title,
		value,
		isBold = false,
		mt = "mt-2",
		isSmall = false,
	) => {
		const titleP = document.createElement("p");
		titleP.className = `mb-1 ${mt}`;
		const strongTitle = document.createElement("strong");
		strongTitle.textContent = title;
		titleP.appendChild(strongTitle);
		fragment.appendChild(titleP);

		const valP = document.createElement("p");
		valP.className = `text-success${isBold ? " fw-bold" : ""}${isSmall ? " small" : ""}`;
		valP.textContent = value;
		fragment.appendChild(valP);
	};

	addDetail("User Agent:", fingerprintInfo.userAgent, false, "", true);
	addDetail(
		"Screen information:",
		`${fingerprintInfo.screen.width}x${fingerprintInfo.screen.height}x${fingerprintInfo.screen.colorDepth}`,
		true,
	);
	addDetail(
		"Timezone:",
		`${fingerprintInfo.timezone} (Offset: ${fingerprintInfo.timezoneOffset})`,
		true,
	);

	const footerP = document.createElement("p");
	footerP.className = "mb-0 mt-2 small text-muted";
	footerP.textContent = translateDetect("partial_fingerprint");
	fragment.appendChild(footerP);

	fingerprintInfoElement.appendChild(fragment);
};

const collectCompatibilityInfo = () => ({
	status: "ok",
	browser: getBrowserInfo(),
	apiSupport: checkApiSupport(),
});

const renderCompatibilityInfo = (compatibilityInfo) => {
	const browserInfoEl = document.getElementById("browserInfoDisplay");
	const apiListEl = document.getElementById("apiCompatibilityList");
	if (!browserInfoEl || !apiListEl) return;

	browserInfoEl.textContent = `${compatibilityInfo.browser.name} ${compatibilityInfo.browser.fullVersion} on ${compatibilityInfo.browser.os}`;
	apiListEl.innerHTML = "";

	compatibilityInfo.apiSupport.forEach((api) => {
		const listItem = document.createElement("li");
		listItem.className = `list-group-item d-flex justify-content-between align-items-center ${api.supported ? "list-group-item-success" : "list-group-item-danger"}`;

		const apiNameSpan = document.createElement("span");
		apiNameSpan.textContent = api.name;

		const badgeSpan = document.createElement("span");
		badgeSpan.className = `badge ${api.supported ? "bg-success" : "bg-danger"}`;
		badgeSpan.textContent = api.supported
			? translateDetect("supported")
			: translateDetect("not_supported");

		listItem.appendChild(apiNameSpan);
		listItem.appendChild(badgeSpan);
		apiListEl.appendChild(listItem);
	});
};

const collectExtensionContext = async () => {
	let currentLanguage = "";
	let autoSwitchEnabled = false;

	try {
		if (chrome?.storage?.local?.get) {
			const result = await chrome.storage.local.get([
				"currentLanguage",
				"autoSwitchEnabled",
			]);
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

const buildDetectionSnapshot = (results) => {
	const snapshotVersion = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	return {
		meta: {
			generatedAt: new Date().toISOString(),
			snapshotVersion,
			uiLanguage: getUiLanguage(),
			extensionVersion: results.extensionContext.extensionVersion,
		},
		extension: {
			currentLanguage: results.extensionContext.currentLanguage,
			autoSwitchEnabled: results.extensionContext.autoSwitchEnabled,
		},
		http: {
			status: results.headerInfo.status,
			endpoint: results.headerInfo.endpoint,
			acceptLanguage: results.headerInfo.acceptLanguage,
			headers: results.headerInfo.headers,
			error: results.headerInfo.error,
		},
		jsEnv: {
			language: results.jsLanguageInfo.language,
			languages: results.jsLanguageInfo.languages,
			timezone: results.jsLanguageInfo.timezone,
			timezoneOffset: results.jsLanguageInfo.timezoneOffset,
		},
		intl: {
			dateTimeLocale: results.intlInfo.dateTimeLocale,
			numberFormatLocale: results.intlInfo.numberFormatLocale,
		},
		webrtc: {
			status: results.webRtcInfo.status,
			ips: results.webRtcInfo.ips,
			ipLeakDetected: results.webRtcInfo.ipLeakDetected,
			error: results.webRtcInfo.error,
		},
		browserFingerprint: {
			userAgent: results.fingerprintInfo.userAgent,
			screen: results.fingerprintInfo.screen,
			timezone: results.fingerprintInfo.timezone,
			timezoneOffset: results.fingerprintInfo.timezoneOffset,
		},
		hardwareFingerprint: {
			canvas: {
				status: results.canvasFingerprintInfo.status,
				hash: results.canvasFingerprintInfo.hash,
				error: results.canvasFingerprintInfo.error,
			},
			webgl: {
				status: results.webglFingerprintInfo.status,
				hash: results.webglFingerprintInfo.hash,
				vendor: results.webglFingerprintInfo.vendor,
				renderer: results.webglFingerprintInfo.renderer,
				version: results.webglFingerprintInfo.version,
				shadingLanguageVersion:
					results.webglFingerprintInfo.shadingLanguageVersion,
				error: results.webglFingerprintInfo.error,
			},
			audio: {
				status: results.audioFingerprintInfo.status,
				hash: results.audioFingerprintInfo.hash,
				error: results.audioFingerprintInfo.error,
			},
		},
		compatibility: {
			browser: results.compatibilityInfo.browser,
			apiSupport: results.compatibilityInfo.apiSupport,
		},
	};
};

window.DetectPageContext = {
	getUiLanguage,
	translate: translateDetect,
	createMessageId,
	getLatestSnapshot: () => latestDetectionSnapshot,
	getLatestSnapshotVersion: () => latestSnapshotVersion,
	isDetectionRunning: () => !!detectionRunInFlight,
	runAllDetections: () => runAllDetections(),
};

const addRefreshButton = () => {
	if (document.getElementById("detectRefreshButton")) return;

	const refreshButton = document.createElement("button");
	refreshButton.id = "detectRefreshButton";
	refreshButton.className = "btn btn-primary mt-3";
	refreshButton.textContent = translateDetect("Refresh detection");
	refreshButton.onclick = () => {
		runAllDetections();
	};

	const headerInfoDiv = document.querySelector(".header-info.mt-4");
	if (headerInfoDiv) {
		headerInfoDiv.appendChild(refreshButton);
		return;
	}

	const container = document.querySelector(".container");
	if (container) {
		const allHeaderInfoDivs = container.querySelectorAll(".header-info");
		if (allHeaderInfoDivs.length > 0) {
			allHeaderInfoDivs[allHeaderInfoDivs.length - 1].appendChild(
				refreshButton,
			);
			return;
		}

		container.appendChild(refreshButton);
	}
};

const runAllDetections = async () => {
	if (detectionRunInFlight) {
		return detectionRunInFlight;
	}

	detectionRunInFlight = (async () => {
		const extensionContextPromise = collectExtensionContext();
		const headerInfoPromise = collectHeaderInfo();
		const webRtcInfoPromise = collectWebRtcInfo();
		const audioFingerprintInfoPromise = collectAudioFingerprintInfo();

		const jsLanguageInfo = collectJsLanguageInfo();
		const intlInfo = collectIntlInfo();
		const fingerprintInfo = collectFingerprintInfo();
		const canvasFingerprintInfo = collectCanvasFingerprintInfo();
		const webglFingerprintInfo = collectWebglFingerprintInfo();
		const compatibilityInfo = collectCompatibilityInfo();

		const [
			extensionContext,
			headerInfo,
			webRtcInfo,
			audioFingerprintInfo,
		] = await Promise.all([
			extensionContextPromise,
			headerInfoPromise,
			webRtcInfoPromise,
			audioFingerprintInfoPromise,
		]);

		renderHeaderInfo(headerInfo);
		renderJsLanguageInfo(jsLanguageInfo);
		renderIntlInfo(intlInfo);
		renderWebRtcInfo(webRtcInfo);
		renderFingerprintInfo(fingerprintInfo);
		renderCanvasFingerprintInfo(canvasFingerprintInfo);
		renderWebglFingerprintInfo(webglFingerprintInfo);
		renderAudioFingerprintInfo(audioFingerprintInfo);
		renderCompatibilityInfo(compatibilityInfo);

		const snapshot = buildDetectionSnapshot({
			extensionContext,
			headerInfo,
			jsLanguageInfo,
			intlInfo,
			webRtcInfo,
			fingerprintInfo,
			canvasFingerprintInfo,
			webglFingerprintInfo,
			audioFingerprintInfo,
			compatibilityInfo,
		});

		latestDetectionSnapshot = snapshot;
		latestSnapshotVersion = snapshot.meta.snapshotVersion;
		window.latestDetectionSnapshot = latestDetectionSnapshot;

		if (window.DetectAIContext?.isChatContextStale?.()) {
			window.DetectAIContext.setAIStatus?.("ai_session_expired", "warning");
		}

		window.DetectAIContext?.updateAIControls?.();
		return snapshot;
	})()
		.catch((error) => {
			console.error("Detection run failed:", error);
			throw error;
		})
		.finally(() => {
			detectionRunInFlight = null;
			window.DetectAIContext?.updateAIControls?.();
		});

	return detectionRunInFlight;
};

ResourceManager.addEventListener(window, "DOMContentLoaded", () => {
	addRefreshButton();
	ResourceManager.setTimeout(runAllDetections, 1000);
});
