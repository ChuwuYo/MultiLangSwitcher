import { describe, expect, it } from "vitest";
import { DomainRulesManager } from "../domain-rules-manager.js";

const builtinRules = {
	"example.com": "en",
	"co.jp": "ja",
	fr: "fr",
};

const createManager = () => {
	const manager = new DomainRulesManager();
	manager.rules = builtinRules;
	return manager;
};

describe("DomainRulesManager._parseDomain", () => {
	const manager = createManager();

	it("splits full domain into parts, second-level and top-level", () => {
		expect(manager._parseDomain("www.example.com")).toEqual({
			parts: ["www", "example", "com"],
			secondLevel: "example.com",
			topLevel: "com",
		});
	});

	it("returns null secondLevel for single-label domain", () => {
		expect(manager._parseDomain("localhost")).toEqual({
			parts: ["localhost"],
			secondLevel: null,
			topLevel: "localhost",
		});
	});

	it("handles two-label domain", () => {
		expect(manager._parseDomain("example.com").secondLevel).toBe("example.com");
	});
});

describe("DomainRulesManager._findMatchingRule lookup chain", () => {
	it("matches full domain first", () => {
		const manager = createManager();
		expect(manager._findMatchingRule("example.com", {})).toEqual({ language: "en", source: "default-full" });
	});

	it("custom rule wins over builtin for same target", () => {
		const manager = createManager();
		expect(manager._findMatchingRule("example.com", { "example.com": "de-DE" })).toEqual({
			language: "de-DE",
			source: "custom-full",
		});
	});

	it("falls back to second-level domain", () => {
		const manager = createManager();
		expect(manager._findMatchingRule("www.co.jp", {})).toEqual({ language: "ja", source: "default-second" });
	});

	it("falls back to top-level domain", () => {
		const manager = createManager();
		expect(manager._findMatchingRule("www.example.fr", {})).toEqual({ language: "fr", source: "default-top" });
	});

	it("returns null when nothing matches", () => {
		const manager = createManager();
		expect(manager._findMatchingRule("www.unknown.xyz", {})).toBeNull();
	});

	it("returns null for single-label domain without full match", () => {
		const manager = createManager();
		expect(manager._findMatchingRule("intranet", {})).toBeNull();
	});

	it("caches lookup result in domainCache", () => {
		const manager = createManager();
		const result = manager._findMatchingRule("example.com", {});
		expect(manager.domainCache.get("example.com")).toEqual(result);
	});

	it("evicts least-recently-used entry when cache is full", async () => {
		const manager = createManager();
		manager.MAX_CACHE_SIZE = 3;
		manager.customRulesCache = {}; // 跳过 chrome.storage 读取
		await manager.getLanguageForDomain("example.com");
		await manager.getLanguageForDomain("www.co.jp");
		await manager.getLanguageForDomain("example.com"); // 命中并刷新热度
		await manager.getLanguageForDomain("www.example.fr"); // 占满
		await manager.getLanguageForDomain("intranet"); // 触发淘汰
		expect(manager.domainCache.has("example.com")).toBe(true); // 热条目保留
		expect(manager.domainCache.has("www.co.jp")).toBe(false); // 最久未用被淘汰
	});
});
