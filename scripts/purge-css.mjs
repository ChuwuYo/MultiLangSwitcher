import { PurgeCSS } from "purgecss";

// bootstrap 类可能经 JS 字符串/模板动态拼接，safelist 宁宽勿缺：
// 保证零视觉回归优先于极限体积
const result = await new PurgeCSS().purge({
	content: ["src/**/*.html", "src/**/*.js"],
	css: ["src/shared/vendor/bootstrap.min.css"],
	safelist: {
		// 内容扫描已覆盖 HTML/JS 字面量；此处仅保底运行时经 JS setAttribute 注入的
		// data-bs-theme 主题选择器（PurgeCSS 无法静态确认属性值）
		standard: ["show", "active", "disabled", "collapse", "collapsed", "fade"],
		deep: [/data-bs-theme/],
	},
});

const output = result[0]?.css ?? "";
await import("node:fs").then((fs) => fs.writeFileSync("src/shared/vendor/bootstrap.purged.css", output));
console.log(`src/shared/vendor/bootstrap.purged.css: ${(output.length / 1024).toFixed(1)}KB`);
