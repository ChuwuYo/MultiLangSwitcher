import { createLocalizedExternalCheckLinks } from "../shared/header-check-utils.js";
import { translateDetect } from "./shared.js";

export const renderHeaderInfo = (headerInfo) => {
	const headerInfoElement = document.getElementById("headerInfo");
	const headerLanguageInfo = document.getElementById("headerLanguageInfo");
	if (!headerInfoElement || !headerLanguageInfo) return;

	if (headerInfo.status === "ok") {
		headerInfoElement.textContent = JSON.stringify(headerInfo.headers, null, 2);
		const existingAlertInfoP = headerInfoElement.parentElement.querySelector("p.mt-2");
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
			linkP.appendChild(createLocalizedExternalCheckLinks(translateDetect));
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
	linkP.appendChild(createLocalizedExternalCheckLinks(translateDetect));
	fragment.appendChild(linkP);

	headerLanguageInfo.appendChild(fragment);
};

export const renderJsLanguageInfo = (jsLanguageInfo) => {
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
	strongLang.textContent = translateDetect("navigator_language_label");
	langTitleP.appendChild(strongLang);
	fragment.appendChild(langTitleP);

	const langValP = document.createElement("p");
	langValP.className = "text-info fw-bold";
	langValP.textContent = jsLanguageInfo.language;
	fragment.appendChild(langValP);

	const langsTitleP = document.createElement("p");
	langsTitleP.className = "mb-1 mt-2";
	const strongLangs = document.createElement("strong");
	strongLangs.textContent = translateDetect("navigator_languages_label");
	langsTitleP.appendChild(strongLangs);
	fragment.appendChild(langsTitleP);

	const langsValP = document.createElement("p");
	langsValP.className = "text-info fw-bold";
	langsValP.textContent = jsLanguageInfo.languages.length > 0 ? jsLanguageInfo.languages.join(", ") : "N/A";
	fragment.appendChild(langsValP);

	const footerP = document.createElement("p");
	footerP.className = "mb-0 mt-2 small text-muted";
	footerP.textContent = translateDetect("detected_via").replace("{method}", translateDetect("javascript_method"));
	fragment.appendChild(footerP);

	jsLanguageInfoElement.appendChild(fragment);
};

export const renderCanvasFingerprintInfo = (canvasFingerprintInfo) => {
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
	strongHash.textContent = translateDetect("canvas_hash_label");
	hashTitleP.appendChild(strongHash);
	fragment.appendChild(hashTitleP);

	const hashValP = document.createElement("p");
	hashValP.className = "text-dark fw-bold small";
	hashValP.textContent = canvasFingerprintInfo.hash;
	fragment.appendChild(hashValP);

	const footerP = document.createElement("p");
	footerP.className = "mb-0 mt-2 small text-muted";
	footerP.textContent = translateDetect("detected_via").replace("{method}", translateDetect("canvas_method"));
	fragment.appendChild(footerP);

	canvasInfoElement.appendChild(fragment);
};

export const renderWebglFingerprintInfo = (webglFingerprintInfo) => {
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

	addDetail(translateDetect("webgl_hash_label"), webglFingerprintInfo.hash, true, "");
	addDetail(translateDetect("webgl_unmasked_vendor_label"), webglFingerprintInfo.vendor);
	addDetail(translateDetect("webgl_unmasked_renderer_label"), webglFingerprintInfo.renderer);
	addDetail(translateDetect("webgl_version_label"), webglFingerprintInfo.version);
	addDetail(translateDetect("webgl_shading_language_version_label"), webglFingerprintInfo.shadingLanguageVersion);

	const footerP = document.createElement("p");
	footerP.className = "mb-0 mt-2 small text-muted";
	footerP.textContent = translateDetect("detected_via").replace("{method}", translateDetect("webgl_method"));
	fragment.appendChild(footerP);

	webglInfoElement.appendChild(fragment);
};

export const renderAudioFingerprintInfo = (audioFingerprintInfo) => {
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
	strongHash.textContent = translateDetect("audio_context_hash_label");
	hashTitleP.appendChild(strongHash);
	fragment.appendChild(hashTitleP);

	const hashValP = document.createElement("p");
	hashValP.className = "text-dark fw-bold small";
	hashValP.textContent = audioFingerprintInfo.hash;
	fragment.appendChild(hashValP);

	const footerP = document.createElement("p");
	footerP.className = "mb-0 mt-2 small text-muted";
	footerP.textContent = translateDetect("detected_via").replace("{method}", translateDetect("audio_method"));
	fragment.appendChild(footerP);

	audioInfoElement.appendChild(fragment);
};

export const renderIntlInfo = (intlInfo) => {
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
	strongDt.textContent = translateDetect("datetime_format_locale_label");
	dtTitleP.appendChild(strongDt);
	fragment.appendChild(dtTitleP);

	const dtValP = document.createElement("p");
	dtValP.className = "text-secondary fw-bold";
	dtValP.textContent = intlInfo.dateTimeLocale;
	fragment.appendChild(dtValP);

	const nfTitleP = document.createElement("p");
	nfTitleP.className = "mb-1 mt-2";
	const strongNf = document.createElement("strong");
	strongNf.textContent = translateDetect("number_format_locale_label");
	nfTitleP.appendChild(strongNf);
	fragment.appendChild(nfTitleP);

	const nfValP = document.createElement("p");
	nfValP.className = "text-secondary fw-bold";
	nfValP.textContent = intlInfo.numberFormatLocale;
	fragment.appendChild(nfValP);

	const footerP = document.createElement("p");
	footerP.className = "mb-0 mt-2 small text-muted";
	footerP.textContent = translateDetect("detected_via").replace("{method}", translateDetect("intl_method"));
	fragment.appendChild(footerP);

	intlApiInfoElement.appendChild(fragment);
};

export const renderWebRtcInfo = (webRtcInfo) => {
	const webRtcInfoElement = document.getElementById("webRtcInfo");
	if (!webRtcInfoElement) return;

	webRtcInfoElement.innerHTML = "";
	const fragment = document.createDocumentFragment();

	if (webRtcInfo.status === "error" || webRtcInfo.status === "unsupported") {
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
	footerP.textContent = translateDetect("detected_via").replace("{method}", translateDetect("webrtc_method"));
	fragment.appendChild(footerP);

	webRtcInfoElement.appendChild(fragment);
};

export const renderFingerprintInfo = (fingerprintInfo) => {
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
	const addDetail = (title, value, isBold = false, mt = "mt-2", isSmall = false) => {
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

	addDetail(translateDetect("user_agent_label"), fingerprintInfo.userAgent, false, "", true);
	addDetail(
		translateDetect("screen_information_label"),
		`${fingerprintInfo.screen.width}x${fingerprintInfo.screen.height}x${fingerprintInfo.screen.colorDepth}`,
		true,
	);
	addDetail(
		translateDetect("timezone_label"),
		`${fingerprintInfo.timezone} (${translateDetect("offset_label")} ${fingerprintInfo.timezoneOffset})`,
		true,
	);

	const footerP = document.createElement("p");
	footerP.className = "mb-0 mt-2 small text-muted";
	footerP.textContent = translateDetect("partial_fingerprint");
	fragment.appendChild(footerP);

	fingerprintInfoElement.appendChild(fragment);
};

export const renderCompatibilityInfo = (compatibilityInfo) => {
	const browserInfoEl = document.getElementById("browserInfoDisplay");
	const apiListEl = document.getElementById("apiCompatibilityList");
	if (!browserInfoEl || !apiListEl) return;

	browserInfoEl.textContent = `${compatibilityInfo.browser.name} ${compatibilityInfo.browser.fullVersion} ${translateDetect("on_connector")} ${compatibilityInfo.browser.os}`;

	// UA-CH 高熵值对照（userAgentData 可用时展示，便于比对 UA 解析与 Client Hints 差异）
	// 注：上方 textContent 赋值已清空子节点，无需手动移除旧的 #uaDataDisplay
	if (compatibilityInfo.uaData) {
		const uaData = compatibilityInfo.uaData;
		const container = document.createElement("div");
		container.id = "uaDataDisplay";
		container.className = "small text-muted mt-1";

		const lines = [];
		if (uaData.fullVersionList?.length) {
			lines.push(`${translateDetect("ua_ch_full_version_list")}: ${uaData.fullVersionList.join(", ")}`);
		} else if (uaData.brands?.length) {
			lines.push(`${translateDetect("ua_ch_brands")}: ${uaData.brands.join(", ")}`);
		}
		const platformParts = [uaData.platform, uaData.platformVersion, uaData.architecture, uaData.bitness, uaData.model]
			.filter(Boolean)
			.join(" / ");
		if (platformParts) {
			lines.push(`${translateDetect("ua_ch_platform")}: ${platformParts}`);
		}
		lines.push(`${translateDetect("ua_ch_mobile")}: ${uaData.mobile ? translateDetect("yes") : translateDetect("no")}`);

		for (const line of lines) {
			const p = document.createElement("p");
			p.className = "mb-0";
			p.textContent = line;
			container.appendChild(p);
		}
		browserInfoEl.appendChild(container);
	}

	apiListEl.innerHTML = "";

	compatibilityInfo.apiSupport.forEach((api) => {
		const listItem = document.createElement("li");
		listItem.className = `list-group-item d-flex justify-content-between align-items-center ${api.supported ? "list-group-item-success" : "list-group-item-danger"}`;

		const apiNameSpan = document.createElement("span");
		apiNameSpan.textContent = api.name;

		const badgeSpan = document.createElement("span");
		badgeSpan.className = `badge ${api.supported ? "bg-success" : "bg-danger"}`;
		badgeSpan.textContent = api.supported ? translateDetect("supported") : translateDetect("not_supported");

		listItem.appendChild(apiNameSpan);
		listItem.appendChild(badgeSpan);
		apiListEl.appendChild(listItem);
	});
};

export const addRefreshButton = (requestRerun) => {
	if (document.getElementById("detectRefreshButton")) return;

	const refreshButton = document.createElement("button");
	refreshButton.id = "detectRefreshButton";
	refreshButton.className = "btn btn-primary mt-3";
	refreshButton.textContent = translateDetect("Refresh detection");
	refreshButton.onclick = () => {
		requestRerun();
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
			allHeaderInfoDivs[allHeaderInfoDivs.length - 1].appendChild(refreshButton);
			return;
		}

		container.appendChild(refreshButton);
	}
};
