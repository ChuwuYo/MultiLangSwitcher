import { getUiLanguage } from "./shared.js";

let latestDetectionSnapshot = null;
let latestSnapshotVersion = "";
let detectionRunInFlight = null;

export const getLatestDetectionSnapshot = () => latestDetectionSnapshot;

export const getLatestSnapshotVersion = () => latestSnapshotVersion;

export const getDetectionRunInFlight = () => detectionRunInFlight;

export const setDetectionRunInFlight = (runPromise) => {
	detectionRunInFlight = runPromise;
};

export const isDetectionRunning = () => !!detectionRunInFlight;

export const buildDetectionSnapshot = (results) => {
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
				shadingLanguageVersion: results.webglFingerprintInfo.shadingLanguageVersion,
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
			uaData: results.compatibilityInfo.uaData,
			apiSupport: results.compatibilityInfo.apiSupport,
		},
	};
};

export const commitDetectionSnapshot = (snapshot) => {
	latestDetectionSnapshot = snapshot;
	latestSnapshotVersion = snapshot.meta.snapshotVersion;

	window.dispatchEvent(new CustomEvent("detect:snapshot-updated"));
	return snapshot;
};

export const finishDetectionRun = () => {
	detectionRunInFlight = null;
	window.dispatchEvent(new CustomEvent("detect:run-finished"));
};
