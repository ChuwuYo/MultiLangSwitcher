import { getUiLanguage } from "./shared.js";

/**
 * 检测快照结构（AI 诊断输入；sanitizeSnapshotForAI 依赖本形状，改动需同步）
 * @typedef {Object} DetectionSnapshot
 * @property {{ generatedAt: string, snapshotVersion: string, uiLanguage: string, extensionVersion: string }} meta
 * @property {{ currentLanguage: string, autoSwitchEnabled: boolean }} extension
 * @property {Object} http - 请求头信息（headers 值脱敏后仅保留名称）
 * @property {Object} jsEnv - JS 环境信息
 * @property {Object} intl - Intl API 信息
 * @property {Object} webrtc - WebRTC 信息（ips 脱敏）
 * @property {Object} browserFingerprint - 浏览器指纹（userAgent 脱敏）
 * @property {Object} hardwareFingerprint - 硬件指纹（canvas/webgl/audio hash 脱敏）
 * @property {{ browser: Object, uaData: Object|null, apiSupport: Array }} compatibility
 */

/** @type {DetectionSnapshot|null} */
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

/**
 * 组装检测快照
 * @param {Object} results - 各 collector 的采集结果
 * @returns {DetectionSnapshot}
 */
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
			hardware: results.fingerprintInfo.hardware,
			display: results.fingerprintInfo.display,
			connection: results.fingerprintInfo.connection,
			storage: results.fingerprintInfo.storage,
			voices: results.fingerprintInfo.voices,
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
				extensionsCount: results.webglFingerprintInfo.extensionsCount,
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
