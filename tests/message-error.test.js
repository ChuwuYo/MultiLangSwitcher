import { describe, expect, it } from "vitest";
import { extractFunction } from "./helpers/global-loader.js";

const normalizeMessageError = extractFunction("src/background/background.js", "normalizeMessageError");

describe("normalizeMessageError", () => {
	it("passes through message from Error instance", () => {
		expect(normalizeMessageError(new Error("boom"))).toEqual({ message: "boom" });
	});

	it("stringifies non-object input", () => {
		expect(normalizeMessageError("plain")).toEqual({ message: "plain" });
		expect(normalizeMessageError(42)).toEqual({ message: "42" });
		expect(normalizeMessageError(undefined)).toEqual({ message: "undefined" });
		expect(normalizeMessageError(null)).toEqual({ message: "null" });
	});

	it("preserves optional fields when present with correct types", () => {
		const error = {
			message: "failed",
			type: "network",
			errorType: "NETWORK_ISSUE",
			retryable: true,
			userMessage: "try again",
		};
		expect(normalizeMessageError(error)).toEqual({
			message: "failed",
			type: "network",
			errorType: "NETWORK_ISSUE",
			retryable: true,
			userMessage: "try again",
		});
	});

	it("omits optional fields with wrong types", () => {
		const error = { message: "m", type: 5, retryable: "yes", userMessage: {}, errorType: null };
		expect(normalizeMessageError(error)).toEqual({ message: "m" });
	});

	it("handles object without message", () => {
		expect(normalizeMessageError({ code: 7 })).toEqual({ message: "[object Object]" });
	});
});
