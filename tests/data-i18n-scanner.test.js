// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { BaseI18n } from "../shared/shared-i18n-base.js";

const createI18n = () => {
	const i18n = new BaseI18n("test", false, {
		en: { greeting: "Hello", hint: "Hint text", alt_text: "Alt text", ph: "Type here" },
	});
	i18n.translations = i18n.dictionaries.en;
	i18n.isReady = true;
	return i18n;
};

describe("BaseI18n._applyDataAttributes", () => {
	it("fills textContent/title/placeholder/alt from data attributes", () => {
		document.body.innerHTML = `
			<span id="a" data-i18n="greeting"></span>
			<button id="b" data-i18n-title="hint"></button>
			<input id="c" data-i18n-placeholder="ph">
			<img id="d" data-i18n-alt="alt_text">`;

		createI18n()._applyDataAttributes(document);

		expect(document.getElementById("a").textContent).toBe("Hello");
		expect(document.getElementById("b").title).toBe("Hint text");
		expect(document.getElementById("c").placeholder).toBe("Type here");
		expect(document.getElementById("d").alt).toBe("Alt text");
	});

	it("leaves elements without data attributes untouched", () => {
		document.body.innerHTML = `<span id="plain">keep</span>`;
		createI18n()._applyDataAttributes(document);
		expect(document.getElementById("plain").textContent).toBe("keep");
	});

	it("renders raw key when translation missing (t() fallback)", () => {
		document.body.innerHTML = `<span id="e" data-i18n="missing_key"></span>`;
		createI18n()._applyDataAttributes(document);
		expect(document.getElementById("e").textContent).toBe("missing_key");
	});
});
