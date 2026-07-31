import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SKIP_DIRS = new Set(["node_modules", ".git", ".codegraph", "coverage", "vendor"]);
const files = [];

function walk(dir) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (!SKIP_DIRS.has(entry)) walk(full);
		} else if (entry.endsWith(".js") || entry.endsWith(".mjs")) {
			files.push(full);
		}
	}
}

walk(".");

let failed = 0;
for (const file of files) {
	const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
	if (result.status !== 0) {
		failed++;
		console.error(result.stderr.trim());
	}
}

if (failed > 0) {
	console.error(`${failed}/${files.length} files failed syntax check`);
	process.exit(1);
}
console.log(`${files.length} files passed syntax check`);
