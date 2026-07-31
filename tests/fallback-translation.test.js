import { describe, expect, it } from "vitest";
import { getFallbackTranslation } from "../shared/shared-utils.js";

const REACHABLE_KEYS = [
	"no_release_notes",
	"update_check_failed",
	"version_comparison_failed",
	"failed_load_persistent_cache",
	"failed_cache_update_info",
	"failed_clear_persistent_cache",
	"github_api_failed_trying_fallback",
	"jsdelivr_fallback_failed",
	"debug_log_started",
];

describe("getFallbackTranslation", () => {
	it("covers every reachable fallback key (default lang en)", () => {
		for (const key of REACHABLE_KEYS) {
			const text = getFallbackTranslation(key);
			expect(text, key).not.toBe(key);
		}
	});

	it("substitutes params", () => {
		expect(getFallbackTranslation("update_check_failed", { error: "boom" })).toBe("Update check failed: boom");
	});

	it("returns key itself for unknown keys", () => {
		expect(getFallbackTranslation("nonexistent_key")).toBe("nonexistent_key");
	});
});
