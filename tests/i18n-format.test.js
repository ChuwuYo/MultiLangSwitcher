import { describe, expect, it } from "vitest";
import { BaseI18n } from "../src/shared/shared-i18n-base.js";
const format = (str, params) => BaseI18n.prototype._formatString.call({}, str, params);

describe("BaseI18n._formatString", () => {
	it("replaces a single placeholder", () => {
		expect(format("hello {name}", { name: "world" })).toBe("hello world");
	});

	it("replaces every occurrence of a repeated placeholder", () => {
		expect(format("{x} and {x}", { x: "v" })).toBe("v and v");
	});

	it("replaces multiple distinct placeholders", () => {
		expect(format("{a}-{b}-{c}", { a: 1, b: 2, c: 3 })).toBe("1-2-3");
	});

	it("returns original string when params missing or not an object", () => {
		expect(format("hi {name}")).toBe("hi {name}");
		expect(format("hi {name}", null)).toBe("hi {name}");
		expect(format("hi {name}", "nope")).toBe("hi {name}");
	});

	it("leaves unknown placeholders untouched", () => {
		expect(format("{known} {unknown}", { known: "k" })).toBe("k {unknown}");
	});

	it("stringifies non-string values", () => {
		expect(format("{n}", { n: 42 })).toBe("42");
		expect(format("{n}", { n: false })).toBe("false");
	});
});
