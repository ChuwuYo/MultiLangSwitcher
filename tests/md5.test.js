import { describe, expect, it } from "vitest";
import { md5 } from "../src/shared/md5.js";

describe("md5 (RFC 1321)", () => {
	it("computes standard hashes for empty and ASCII strings", () => {
		expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
		expect(md5("hello")).toBe("5d41402abc4b2a76b9719d911017c592");
	});

	it("encodes multi-byte UTF-8 characters accurately", () => {
		expect(md5("中文")).toBe("a7bac2239fcdcb3a067903d8077c4a07");
		expect(md5("café")).toBe("07117fe4a1ebd544965dc19573183da2");
		expect(md5("🚀🔥")).toBe("ed45593444f6839e981e61a2aabe1bbc");
	});
});
