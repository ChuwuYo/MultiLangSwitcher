import { describe, expect, it } from "vitest";
import { UpdateChecker } from "../src/shared/shared-update-checker.js";
const isNewerVersion = (current, latest) => UpdateChecker.prototype.isNewerVersion.call({}, current, latest);

describe("UpdateChecker.isNewerVersion", () => {
	it("detects newer major/minor/patch", () => {
		expect(isNewerVersion("2.1.1", "3.0.0")).toBe(true);
		expect(isNewerVersion("2.1.1", "2.2.0")).toBe(true);
		expect(isNewerVersion("2.1.1", "2.1.2")).toBe(true);
	});

	it("returns false for equal or older versions", () => {
		expect(isNewerVersion("2.1.1", "2.1.1")).toBe(false);
		expect(isNewerVersion("2.1.1", "2.1.0")).toBe(false);
		expect(isNewerVersion("2.1.1", "1.9.9")).toBe(false);
	});

	it("strips v prefix", () => {
		expect(isNewerVersion("v2.1.1", "v2.1.2")).toBe(true);
		expect(isNewerVersion("2.1.1", "v2.1.1")).toBe(false);
	});

	it("ignores prerelease tags and build metadata", () => {
		expect(isNewerVersion("2.1.1", "2.1.2-beta")).toBe(true);
		expect(isNewerVersion("2.1.1", "2.1.2-rc.1+build5")).toBe(true);
		expect(isNewerVersion("2.1.1-beta", "2.1.1")).toBe(false);
	});

	it("zero-pads missing segments", () => {
		expect(isNewerVersion("1.2", "1.2.3")).toBe(true);
		expect(isNewerVersion("1.2.3", "1.2")).toBe(false);
		expect(isNewerVersion("1.2", "1.2.0")).toBe(false);
		expect(isNewerVersion("2.0", "1.9.9")).toBe(false);
	});

	it("returns false on non-numeric segments instead of throwing", () => {
		expect(isNewerVersion("abc", "1.0.0")).toBe(false);
		expect(isNewerVersion("1.0.0", "x.2.0")).toBe(false);
	});

	it("treats empty current version as 0.0.0 (update available)", () => {
		expect(isNewerVersion("", "1.0.0")).toBe(true);
	});
});
