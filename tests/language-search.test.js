import { describe, expect, it } from "vitest";
import {
	LANGUAGE_OPTIONS,
	filterLanguageOptions,
	formatLanguageOption,
	scoreLanguageMatch,
} from "../src/shared/shared-language-options.js";

const allFormatted = LANGUAGE_OPTIONS.map((opt) => formatLanguageOption(opt.value, opt.label));

describe("language fuzzy search", () => {
	it("returns all options in original order for empty query", () => {
		const results = filterLanguageOptions(allFormatted, "   ");
		expect(results).toHaveLength(allFormatted.length);
		expect(results[0].option.value).toBe("zh-CN");
	});

	it("prioritizes exact language code and hyphenless code", () => {
		const exactJa = filterLanguageOptions(allFormatted, "ja");
		expect(exactJa[0].option.value).toBe("ja");

		const compactZhHk = filterLanguageOptions(allFormatted, "zhhk");
		expect(compactZhHk[0].option.value).toBe("zh-HK");
	});

	it("matches Chinese aliases, English names, and pinyin keywords", () => {
		expect(filterLanguageOptions(allFormatted, "日语")[0].option.value).toBe("ja");
		expect(filterLanguageOptions(allFormatted, "riyu")[0].option.value).toBe("ja");
		expect(filterLanguageOptions(allFormatted, "japan")[0].option.value).toBe("ja");
		expect(filterLanguageOptions(allFormatted, "香港")[0].option.value).toBe("zh-HK");
		expect(filterLanguageOptions(allFormatted, "韩国")[0].option.value).toBe("ko");
	});

	it("supports diacritic folding and multi-token queries", () => {
		const french = filterLanguageOptions(allFormatted, "francais");
		expect(french.some((r) => r.option.value === "fr-FR")).toBe(true);

		const multi = filterLanguageOptions(allFormatted, "en uk");
		expect(multi[0].option.value).toBe("en-GB");

		const multiZh = filterLanguageOptions(allFormatted, "繁 台湾");
		expect(multiZh[0].option.value).toBe("zh-TW");
	});

	it("supports subsequence fuzzy matching for compact codes", () => {
		const esmx = filterLanguageOptions(allFormatted, "esmx");
		expect(esmx[0].option.value).toBe("es-MX");

		const ptbr = filterLanguageOptions(allFormatted, "ptbr");
		expect(ptbr[0].option.value).toBe("pt-BR");
	});

	it("formats custom dynamic language options gracefully", () => {
		const custom = formatLanguageOption("fr-CH", "fr-CH (自定义)");
		expect(custom.value).toBe("fr-CH");
		expect(custom.code).toBe("fr-CH");
		expect(scoreLanguageMatch(custom, "frch").matched).toBe(true);
	});
});
