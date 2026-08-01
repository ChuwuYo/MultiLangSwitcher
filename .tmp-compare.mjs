import puppeteer from "puppeteer-core";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OUT = "/tmp/mls-compare";
const variants = { old: "/tmp/mls-old", new: process.cwd() };
const profile = mkdtempSync(join(tmpdir(), "mls-chrome-"));

const browser = await puppeteer.launch({
	executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	headless: "new",
	userDataDir: profile,
	ignoreDefaultArgs: ["--disable-extensions"],
	args: ["--no-first-run", "--hide-crash-restore-bubble"],
});

try {
	for (const [name, extPath] of Object.entries(variants)) {
		const browserCdp = await browser.target().createCDPSession();
		const result = await browserCdp.send("Extensions.loadUnpacked", { path: extPath });
		const extensionId = result.id;
		console.log(name, "id:", extensionId);

		const page = await browser.newPage();
		await page.setViewport({ width: 400, height: 700 });
		await page.evaluateOnNewDocument(() => {
			localStorage.setItem("theme", "light");
			localStorage.setItem("app-lang", "zh");
		});
		await page.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "networkidle0", timeout: 15000 });
		await new Promise((r) => setTimeout(r, 1200));
		await page.screenshot({ path: `${OUT}/popup-${name}.png`, fullPage: true });
		console.log("shot:", `${OUT}/popup-${name}.png`);
		await page.close();

		// 卸载，避免下个变体 ID 混淆
		await browserCdp.send("Extensions.uninstall", { id: extensionId }).catch(() => {});
	}
} finally {
	await browser.close();
	rmSync(profile, { recursive: true, force: true });
}
