import { describe, expect, it } from "vitest";
import { BaseI18n } from "../src/shared/shared-i18n-base.js";
const format = (str, params) => BaseI18n.prototype._formatString.call({}, str, params);

describe("BaseI18n._formatString", () => {
	it("replaces every occurrence of a repeated placeholder", () => {
		expect(format("{x} and {x}", { x: "v" })).toBe("v and v");
	});

	it("returns original string when params missing or not an object", () => {
		expect(format("hi {name}")).toBe("hi {name}");
		expect(format("hi {name}", null)).toBe("hi {name}");
		expect(format("hi {name}", "nope")).toBe("hi {name}");
	});

	it("leaves unknown placeholders untouched", () => {
		expect(format("{known} {unknown}", { known: "k" })).toBe("k {unknown}");
	});
});
