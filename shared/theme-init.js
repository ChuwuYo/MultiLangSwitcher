(() => {
	try {
		const savedTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.THEME);
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		const theme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : prefersDark ? "dark" : "light";
		document.documentElement.setAttribute("data-bs-theme", theme);
	} catch (e) {
		console.error("Theme initialization failed:", e);
	}
})();
