import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));

const errors = [];
if (manifest.manifest_version !== 3) errors.push("manifest_version must be 3");
if (!manifest.name) errors.push("missing name");
if (!manifest.version) errors.push("missing version");
if (!/^\d+\.\d+\.\d+(\.\d+)?$/.test(manifest.version ?? "")) errors.push(`invalid version: ${manifest.version}`);
if (!manifest.background?.service_worker) errors.push("missing background.service_worker");
if (!Array.isArray(manifest.permissions) || manifest.permissions.length === 0) errors.push("missing permissions");

for (const locale of ["en", "zh"]) {
	const path = `_locales/${locale}/messages.json`;
	try {
		const messages = JSON.parse(readFileSync(path, "utf8"));
		if (typeof messages !== "object" || messages === null) errors.push(`${path}: not an object`);
	} catch (error) {
		errors.push(`${path}: ${error.message}`);
	}
}

if (errors.length > 0) {
	for (const error of errors) console.error(error);
	process.exit(1);
}
console.log("manifest.json and _locales valid");
