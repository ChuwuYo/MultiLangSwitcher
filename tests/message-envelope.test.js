import { afterEach, describe, expect, it, vi } from "vitest";
import { requestBackground } from "../shared/shared-actions.js";

const stubChrome = (response) => {
	const sendMessage = vi.fn(async () => response);
	vi.stubGlobal("chrome", { runtime: { sendMessage } });
	return sendMessage;
};

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("requestBackground envelope round-trip", () => {
	it("resolves with data on { ok: true, data }", async () => {
		const sendMessage = stubChrome({ ok: true, data: { language: "en" } });
		const result = await requestBackground("GET_CURRENT_LANG");
		expect(result).toEqual({ language: "en" });
		expect(sendMessage).toHaveBeenCalledWith({ type: "GET_CURRENT_LANG" });
	});

	it("throws Error with preserved envelope fields on { ok: false, error }", async () => {
		stubChrome({ ok: false, error: { message: "denied", type: "network", retryable: true } });
		const failure = await requestBackground("UPDATE_RULES", { language: "fr" }).catch((error) => error);
		expect(failure).toBeInstanceOf(Error);
		expect(failure.message).toBe("denied");
		expect(failure.type).toBe("network");
		expect(failure.retryable).toBe(true);
	});

	it("falls back to response.message when error object missing", async () => {
		stubChrome({ ok: false, message: "plain failure" });
		await expect(requestBackground("RESET_ACCEPT_LANGUAGE")).rejects.toThrow("plain failure");
	});

	it("warns and passes through legacy response shape", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const legacy = { status: "success", value: 1 };
		stubChrome(legacy);
		const result = await requestBackground("GET_DYNAMIC_RULES");
		expect(result).toEqual(legacy);
		expect(warn).toHaveBeenCalledOnce();
	});

	it("throws on empty response and on missing type", async () => {
		stubChrome(undefined);
		await expect(requestBackground("GET_DYNAMIC_RULES")).rejects.toThrow("No response from background script");
		await expect(requestBackground("")).rejects.toThrow("Message type is required");
	});

	it("throws when chrome runtime unavailable", async () => {
		vi.stubGlobal("chrome", undefined);
		await expect(requestBackground("GET_DYNAMIC_RULES")).rejects.toThrow("Chrome runtime API is not available");
	});
});
