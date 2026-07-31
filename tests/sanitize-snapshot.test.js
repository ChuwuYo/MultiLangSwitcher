import { describe, expect, it } from "vitest";
import { extractFunction } from "./helpers/global-loader.js";

const sanitizeSnapshotForAI = extractFunction("detect-ai.js", "sanitizeSnapshotForAI");

const fullSnapshot = () => ({
	http: {
		url: "https://example.com",
		headers: { "accept-language": "en-US", cookie: "secret-session" },
	},
	webrtc: { ips: ["192.168.1.5", "203.0.113.9"], supported: true },
	browserFingerprint: { userAgent: "Mozilla/5.0 real-agent", language: "en-US" },
	hardwareFingerprint: {
		canvas: { hash: "abc123", supported: true },
		webgl: { hash: "def456", vendor: "Intel", renderer: "Iris Xe" },
		audio: { hash: "ghi789" },
	},
	screen: { width: 1920, height: 1080 },
});

describe("sanitizeSnapshotForAI (security-sensitive)", () => {
	it("returns input unchanged when null/undefined", () => {
		expect(sanitizeSnapshotForAI(null)).toBeNull();
		expect(sanitizeSnapshotForAI(undefined)).toBeUndefined();
	});

	it("redacts header values but keeps header names", () => {
		const result = sanitizeSnapshotForAI(fullSnapshot());
		expect(result.http.headers.redacted).toBe(true);
		expect(result.http.headers.headerNames).toEqual(["accept-language", "cookie"]);
		expect(JSON.stringify(result.http.headers)).not.toContain("secret-session");
	});

	it("redacts every WebRTC IP", () => {
		const result = sanitizeSnapshotForAI(fullSnapshot());
		expect(result.webrtc.ips).toEqual(["[redacted]", "[redacted]"]);
		expect(JSON.stringify(result)).not.toContain("192.168.1.5");
		expect(result.webrtc.supported).toBe(true);
	});

	it("redacts user agent", () => {
		const result = sanitizeSnapshotForAI(fullSnapshot());
		expect(result.browserFingerprint.userAgent).toBe("[redacted]");
		expect(JSON.stringify(result)).not.toContain("real-agent");
	});

	it("redacts canvas/webgl/audio fingerprint hashes and webgl vendor+renderer", () => {
		const result = sanitizeSnapshotForAI(fullSnapshot());
		expect(result.hardwareFingerprint.canvas.hash).toBe("[redacted]");
		expect(result.hardwareFingerprint.webgl).toEqual({
			hash: "[redacted]",
			vendor: "[redacted]",
			renderer: "[redacted]",
		});
		expect(result.hardwareFingerprint.audio.hash).toBe("[redacted]");
		const serialized = JSON.stringify(result);
		for (const sensitive of ["abc123", "def456", "ghi789", "Intel", "Iris Xe"]) {
			expect(serialized).not.toContain(sensitive);
		}
	});

	it("keeps non-sensitive fields intact", () => {
		const result = sanitizeSnapshotForAI(fullSnapshot());
		expect(result.screen).toEqual({ width: 1920, height: 1080 });
		expect(result.http.url).toBe("https://example.com");
		expect(result.hardwareFingerprint.canvas.supported).toBe(true);
	});

	it("does not mutate the original snapshot", () => {
		const snapshot = fullSnapshot();
		sanitizeSnapshotForAI(snapshot);
		expect(snapshot.http.headers.cookie).toBe("secret-session");
		expect(snapshot.webrtc.ips[0]).toBe("192.168.1.5");
	});

	it("handles missing sections gracefully", () => {
		const result = sanitizeSnapshotForAI({ screen: { width: 1 } });
		expect(result.screen).toEqual({ width: 1 });
		expect(result.http).toBeUndefined();
	});

	it("handles partial hardwareFingerprint sections", () => {
		const result = sanitizeSnapshotForAI({ hardwareFingerprint: { canvas: { hash: "x" } } });
		expect(result.hardwareFingerprint.canvas.hash).toBe("[redacted]");
		expect(result.hardwareFingerprint.webgl).toBeUndefined();
	});

	it("handles non-array webrtc.ips", () => {
		const result = sanitizeSnapshotForAI({ webrtc: { ips: "not-an-array" } });
		expect(result.webrtc.ips).toEqual([]);
	});

	it("handles http section without headers", () => {
		const result = sanitizeSnapshotForAI({ http: { url: "https://example.com" } });
		expect(result.http.headers).toEqual({ redacted: true, headerNames: [] });
	});

	it("redacts UA-CH high entropy values but keeps mobile flag", () => {
		const result = sanitizeSnapshotForAI({
			compatibility: {
				uaData: {
					brands: ["Chromium 131"],
					fullVersionList: ["Chromium 131.0.6778.86"],
					platform: "macOS",
					platformVersion: "15.1.0",
					architecture: "arm",
					bitness: "64",
					model: "",
					mobile: false,
				},
			},
		});
		expect(result.compatibility.uaData).toEqual({ redacted: true, mobile: false });
		expect(JSON.stringify(result)).not.toContain("131.0.6778.86");
		expect(JSON.stringify(result)).not.toContain("macOS");
	});
});
