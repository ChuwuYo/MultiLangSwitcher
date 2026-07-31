(() => {
	try {
		// 键名字面量须与 shared/storage-keys.js 的 LOCAL_STORAGE_KEYS.THEME 保持一致
		// （本脚本需以 classic script 预渲染同步执行，无法使用 ESM import）
		const savedTheme = localStorage.getItem("theme");
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		const theme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : prefersDark ? "dark" : "light";
		document.documentElement.setAttribute("data-bs-theme", theme);
	} catch (e) {
		console.error("Theme initialization failed:", e);
	}
})();
