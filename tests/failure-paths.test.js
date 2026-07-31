import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAcceptLanguage } from "../shared/shared-actions.js";
import { UpdateChecker } from "../shared/shared-update-checker.js";

const chromeStub = {
	runtime: {
		sendMessage: vi.fn(),
	},
	storage: {
		local: {
			get: vi.fn(async () => ({})),
			set: vi.fn(async () => {}),
			remove: vi.fn(async () => {}),
		},
	},
};

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("resetAcceptLanguage (failure-path smoke)", () => {
	it("sends RESET_ACCEPT_LANGUAGE and resolves with data", async () => {
		chromeStub.runtime.sendMessage.mockResolvedValue({ ok: true, data: { reset: true } });
		vi.stubGlobal("chrome", chromeStub);

		const result = await resetAcceptLanguage();
		expect(result).toEqual({ reset: true });
		expect(chromeStub.runtime.sendMessage).toHaveBeenCalledWith({ type: "RESET_ACCEPT_LANGUAGE" });
	});

	it("throws wrapped error when background reports failure", async () => {
		chromeStub.runtime.sendMessage.mockResolvedValue({ ok: false, error: { message: "no rules" } });
		vi.stubGlobal("chrome", chromeStub);

		await expect(resetAcceptLanguage()).rejects.toThrow("Failed to reset Accept-Language: no rules");
	});
});

describe("UpdateChecker.checkForUpdates (failure path)", () => {
	it("rethrows typed error (not ReferenceError) when fetch fails", async () => {
		vi.stubGlobal("chrome", chromeStub);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("network down");
			}),
		);

		const checker = new UpdateChecker("owner", "repo", "2.1.1");
		const failure = await checker.checkForUpdates().catch((error) => error);
		expect(failure).toBeInstanceOf(Error);
		expect(failure.message).toBe("network down");
		expect(failure.type).toBe("NETWORK_ISSUE");
	});
});
