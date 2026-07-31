import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const ROOT = resolve(import.meta.dirname, "../..");

/**
 * 从源码中提取自包含的顶级/IIFE 内常量箭头函数（如 sanitizeSnapshotForAI），
 * 在干净沙箱中求值后返回该函数。仅用于无闭包依赖的纯函数。
 * 限制：按花括号配平截取，函数体内的字符串/正则/模板字面量中不得含花括号，
 * 且 `const <name> =` 在文件内必须唯一（JSDoc 中也不得出现）。
 */
export const extractFunction = (relativePath, name) => {
	const code = readFileSync(resolve(ROOT, relativePath), "utf8");
	const startToken = `const ${name} =`;
	const start = code.indexOf(startToken);
	if (start === -1) {
		throw new Error(`extractFunction: ${name} not found in ${relativePath}`);
	}

	const bodyStart = code.indexOf("=>", start);
	const openBrace = code.indexOf("{", bodyStart);
	let depth = 0;
	let end = -1;
	for (let i = openBrace; i < code.length; i++) {
		const char = code[i];
		if (char === "{") depth++;
		else if (char === "}") {
			depth--;
			if (depth === 0) {
				end = i;
				break;
			}
		}
	}
	if (end === -1) {
		throw new Error(`extractFunction: unbalanced braces for ${name} in ${relativePath}`);
	}

	const source = code.slice(start, end + 1);
	const context = vm.createContext({ console });
	vm.runInContext(source, context, { filename: `${relativePath}#${name}` });
	return vm.runInContext(name, context);
};
