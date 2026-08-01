import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHeadersFromEndpoints } from "../shared/header-check-utils.js";

const jsonResponse = (payload, status = 200) =>
	new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("fetchHeadersFromEndpoints", () => {
	it("extracts Accept-Language from httpbin-style flat headers", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ headers: { "Accept-Language": "zh-CN", Host: "httpbin.org" } })),
		);
		const result = await fetchHeadersFromEndpoints();
		expect(result.success).toBe(true);
		expect(result.acceptLanguage).toBe("zh-CN");
	});

	it("normalizes httpbingo-style array-valued headers to strings", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse({ headers: { "Accept-Language": ["zh-CN"], Host: ["httpbingo.org"] } })),
		);
		const result = await fetchHeadersFromEndpoints();
		expect(result.success).toBe(true);
		expect(result.acceptLanguage).toBe("zh-CN");
		expect(result.headers.Host).toBe("httpbingo.org");
	});

	it("falls through to the next endpoint on failure", async () => {
		let call = 0;
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				call++;
				if (call === 1) throw new Error("network down");
				return jsonResponse({ headers: { "accept-language": "en-US" } });
			}),
		);
		const result = await fetchHeadersFromEndpoints();
		expect(result.success).toBe(true);
		expect(result.acceptLanguage).toBe("en-US");
		expect(result.attemptedEndpoints.length).toBe(2);
	});

	it("returns failure when every endpoint fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("network down");
			}),
		);
		const result = await fetchHeadersFromEndpoints(500);
		expect(result.success).toBe(false);
		expect(result.error).toBeTruthy();
	});
});
