import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const ROOT = resolve(import.meta.dirname, "../..");

/**
 * 在 vm 沙箱中加载全局脚本（模拟扩展的 script 标签 / importScripts 环境），
 * 返回可访问脚本内顶级绑定的上下文。
 */
export const loadGlobalScript = (relativePath, sandbox = {}) => {
	const code = readFileSync(resolve(ROOT, relativePath), "utf8");
	const context = vm.createContext({ console, ...sandbox });
	vm.runInContext(code, context, { filename: relativePath });
	return context;
};

export const evalInContext = (context, expression) => vm.runInContext(expression, context);

/**
 * 从源码中提取自包含的顶级/IIFE 内常量箭头函数（如 sanitizeSnapshotForAI），
 * 在干净沙箱中求值后返回该函数。仅用于无闭包依赖的纯函数。
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
