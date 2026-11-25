import { afterEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("chrome", {
	declarativeNetRequest: {
		getDynamicRules: vi.fn(async () => []),
		updateDynamicRules: vi.fn(async () => {}),
	},
	runtime: {
		getURL: (p) => `chrome-extension://test/${p}`,
		sendMessage: vi.fn(async () => ({})),
	},
	storage: {
		local: { get: vi.fn(async () => ({})), set: vi.fn(async () => {}) },
		session: { set: vi.fn(async () => {}) },
	},
});

const { clearAllDynamicRules, isValidHeaderLanguage, updateHeaderRules } = await import(
	"../src/background/rule-engine.js"
);

afterEach(() => {
	vi.clearAllMocks();
});

describe("rule-engine", () => {
	it("validates Accept-Language header values", () => {
		expect(isValidHeaderLanguage("en-US,en;q=0.9")).toBe(true);
		expect(isValidHeaderLanguage("")).toBe(false);
		expect(isValidHeaderLanguage("en-US\r\nX-Injected: 1")).toBe(false);
		expect(isValidHeaderLanguage(null)).toBe(false);
	});

	it("skips updateHeaderRules when RULE_ID already has matching language", async () => {
		chrome.declarativeNetRequest.getDynamicRules.mockResolvedValueOnce([
			{
				id: 1,
				action: {
					type: "modifyHeaders",
					requestHeaders: [{ header: "Accept-Language", operation: "set", value: "ja" }],
				},
			},
		]);

		const res = await updateHeaderRules("ja");
		expect(res).toEqual({ changed: false, language: "ja" });
		expect(chrome.declarativeNetRequest.updateDynamicRules).not.toHaveBeenCalled();
	});

	it("serializes concurrent clearAllDynamicRules calls under lock", async () => {
		let releaseFirst;
		const firstBlocked = new Promise((resolve) => {
			releaseFirst = resolve;
		});
		chrome.declarativeNetRequest.getDynamicRules
			.mockResolvedValueOnce([{ id: 1 }, { id: 1001 }])
			.mockResolvedValueOnce([{ id: 2 }]);
		chrome.declarativeNetRequest.updateDynamicRules
			.mockImplementationOnce(() => firstBlocked)
			.mockResolvedValueOnce(undefined);

		const firstCall = clearAllDynamicRules();
		const secondCall = clearAllDynamicRules();
		await Promise.resolve();
		await Promise.resolve();

		expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledTimes(1);
		expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenNthCalledWith(1, {
			removeRuleIds: [1, 1001],
		});

		releaseFirst();
		await Promise.all([firstCall, secondCall]);

		expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledTimes(2);
		expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenNthCalledWith(2, {
			removeRuleIds: [2],
		});
	});
});
