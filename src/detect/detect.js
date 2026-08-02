import { registerI18nInstance } from "../shared/shared-utils.js";
import { detectI18n } from "../i18n/detect-i18n.js";
import { ResourceManager } from "../shared/shared-resource-manager.js";
import {
	collectAudioFingerprintInfo,
	collectCanvasFingerprintInfo,
	collectCompatibilityInfo,
	collectExtensionContext,
	collectFingerprintInfo,
	collectHeaderInfo,
	collectIpTimezoneInfo,
	collectLocaleFormattingInfo,
	collectIntlInfo,
	collectJsLanguageInfo,
	collectWebglFingerprintInfo,
	collectWebRtcInfo,
} from "./collectors.js";
import {
	addRefreshButton,
	renderAudioFingerprintInfo,
	renderCanvasFingerprintInfo,
	renderCompatibilityInfo,
	renderFingerprintInfo,
	renderLocaleFormattingInfo,
	renderHeaderInfo,
	renderIntlInfo,
	renderJsLanguageInfo,
	renderWebglFingerprintInfo,
	renderWebRtcInfo,
} from "./renderers.js";
import { createMessageId, getUiLanguage, translateDetect } from "./shared.js";
import {
	buildDetectionSnapshot,
	commitDetectionSnapshot,
	finishDetectionRun,
	getDetectionRunInFlight,
	getLatestDetectionSnapshot,
	getLatestSnapshotVersion,
	isDetectionRunning,
	setDetectionRunInFlight,
} from "./snapshot.js";

registerI18nInstance("detect", detectI18n);

export const DetectPageContext = {
	getUiLanguage,
	translate: translateDetect,
	createMessageId,
	getLatestSnapshot: getLatestDetectionSnapshot,
	getLatestSnapshotVersion,
	isDetectionRunning,
	runAllDetections: () => runAllDetections(),
};

const runAllDetections = async () => {
	const inFlight = getDetectionRunInFlight();
	if (inFlight) {
		return inFlight;
	}

	const runPromise = (async () => {
		const extensionContextPromise = collectExtensionContext();
		const headerInfoPromise = collectHeaderInfo();
		const webRtcInfoPromise = collectWebRtcInfo();
		const audioFingerprintInfoPromise = collectAudioFingerprintInfo();

		const jsLanguageInfo = collectJsLanguageInfo();
		const intlInfo = collectIntlInfo();
		const fingerprintInfo = collectFingerprintInfo();
		const localeFormattingInfo = collectLocaleFormattingInfo();
		const ipTimezoneInfoPromise = collectIpTimezoneInfo();
		const canvasFingerprintInfo = collectCanvasFingerprintInfo();
		const webglFingerprintInfo = collectWebglFingerprintInfo();
		const compatibilityInfoPromise = collectCompatibilityInfo();

		const [extensionContext, headerInfo, webRtcInfo, audioFingerprintInfo, compatibilityInfo, ipTimezoneInfo] =
			await Promise.all([
				extensionContextPromise,
				headerInfoPromise,
				webRtcInfoPromise,
				audioFingerprintInfoPromise,
				compatibilityInfoPromise,
				ipTimezoneInfoPromise,
			]);

		renderHeaderInfo(headerInfo);
		renderJsLanguageInfo(jsLanguageInfo);
		renderIntlInfo(intlInfo);
		renderWebRtcInfo(webRtcInfo);
		renderFingerprintInfo(fingerprintInfo, ipTimezoneInfo);
		renderLocaleFormattingInfo(localeFormattingInfo);
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
			localeFormattingInfo,
			ipTimezoneInfo,
			canvasFingerprintInfo,
			webglFingerprintInfo,
			audioFingerprintInfo,
			compatibilityInfo,
		});

		return commitDetectionSnapshot(snapshot);
	})()
		.catch((error) => {
			console.error("Detection run failed:", error);
			throw error;
		})
		.finally(() => {
			finishDetectionRun();
		});

	setDetectionRunInFlight(runPromise);
	return runPromise;
};

ResourceManager.addEventListener(window, "DOMContentLoaded", () => {
	addRefreshButton(runAllDetections);
	ResourceManager.setTimeout(runAllDetections, 1000);
});
