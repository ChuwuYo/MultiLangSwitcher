import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

// i18n 键完备性：代码引用的每个键必须存在于对应组件的字典中（en+zh 双侧）。
// 防复发：历史上出现过 35 个 used-but-missing 键（tooltip/日志显示原始键名）。

const COMPONENTS = {
	popup: { dict: "i18n/popup-dict.js", en: "popupEn", zh: "popupZh" },
	debug: { dict: "i18n/debug-dict.js", en: "debugEn", zh: "debugZh" },
	detect: { dict: "i18n/detect-dict.js", en: "detectEn", zh: "detectZh" },
	background: { dict: "i18n/background-dict.js", en: "backgroundEn", zh: "backgroundZh" },
};

const loadDict = async (path) => await import(`../${path}`);

const dicts = {};
for (const [name, meta] of Object.entries(COMPONENTS)) {
	dicts[name] = await loadDict(meta.dict);
}

// 组件 → 引用该组件字典的源码文件（i18n 实例 + 直接使用方）
const CONSUMERS = {
	popup: ["i18n/popup-i18n.js", "popup.js", "popup/**/*.js"],
	debug: ["i18n/debug-i18n.js", "debug-ui.js", "debug-headers.js", "debug/**/*.js"],
	detect: ["i18n/detect-i18n.js", "detect.js", "detect-ai.js", "detect/**/*.js"],
	background: ["background.js", "background/**/*.js", "domain-rules-manager.js"],
};

const INSTANCES = { popup: "popupI18n", debug: "debugI18n", detect: "detectI18n", background: "backgroundI18n" };

const expand = (patterns) => patterns.flatMap((p) => (p.includes("*") ? globSync(p) : [p]));

const extractKeys = (component) => {
	const keys = new Set();
	const instance = INSTANCES[component];
	for (const file of expand(CONSUMERS[component])) {
		const code = readFileSync(file, "utf8");
		// .t("key") 调用（i18n 实例与共享 translate 包装）
		for (const match of code.matchAll(/\.t\("([a-z0-9_]+)"/g)) keys.add(match[1]);
		// translateDetect("key") / translate("key")
		for (const match of code.matchAll(/(?:translateDetect|translate)\("([a-z0-9_]+)"/g)) keys.add(match[1]);
		// data-i18n 属性仅存在于 HTML；HTML 在下方单独扫描
	}
	// HTML 静态声明
	const htmlFiles = { popup: "popup.html", debug: "debug.html", detect: "detect.html" }[component];
	if (htmlFiles) {
		const html = readFileSync(htmlFiles, "utf8");
		for (const match of html.matchAll(/data-i18n(?:-title|-placeholder|-alt)?="([a-z0-9_]+)"/g)) keys.add(match[1]);
	}
	return keys;
};

describe("i18n key completeness", () => {
	for (const component of Object.keys(COMPONENTS)) {
		it(`${component}: every referenced key exists in en and zh dicts`, () => {
			const { [COMPONENTS[component].en]: en, [COMPONENTS[component].zh]: zh } = dicts[component];
			const missing = [];
			for (const key of extractKeys(component)) {
				if (!(key in en)) missing.push(`${key} (en)`);
				if (!(key in zh)) missing.push(`${key} (zh)`);
			}
			expect(missing).toEqual([]);
		});
	}
});
