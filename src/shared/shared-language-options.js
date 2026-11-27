/**
 * 共享的语言选项列表与模糊搜索工具
 * 包含常用的语言代码、清晰展示名、兼容标签及多语种搜索关键词
 */
export const LANGUAGE_OPTIONS = [
	// 中文圈
	{
		value: "zh-CN",
		name: "简体中文",
		label: "简体中文 (zh-CN)",
		keywords: "chinese simplified china mainland cn sc zhongwen jianti 中国 大陆 新加坡 中文 简中",
	},
	{
		value: "zh-HK",
		name: "繁體中文 · 香港",
		label: "繁體中文 (香港) (zh-HK)",
		keywords: "chinese traditional hong kong hongkong hk tc fanti xianggang cantonese 中国 香港 繁体 繁中 粤语",
	},
	{
		value: "zh-TW",
		name: "繁體中文 · 台湾",
		label: "繁體中文 (台湾) (zh-TW)",
		keywords: "chinese traditional taiwan tw tc fanti 中国 台湾 台灣 繁体 繁中",
	},

	// 英语主流变体
	{
		value: "en-US",
		name: "English · US",
		label: "English (US) (en-US)",
		keywords: "english united states america usa us 英语 英文 美式 美国 yingyu",
	},
	{
		value: "en-GB",
		name: "English · UK",
		label: "English (UK) (en-GB)",
		keywords: "english united kingdom britain british uk gb 英语 英文 英式 英国 yingyu",
	},
	{
		value: "en-AU",
		name: "English · Australia",
		label: "English (Australia) (en-AU)",
		keywords: "english australia aussie au 英语 英文 澳大利亚 澳洲",
	},
	{
		value: "en-IE",
		name: "English · Ireland",
		label: "English (Ireland) (en-IE)",
		keywords: "english ireland irish ie 英语 英文 爱尔兰",
	},
	{
		value: "en-NZ",
		name: "English · New Zealand",
		label: "English (New Zealand) (en-NZ)",
		keywords: "english new zealand nz 英语 英文 新西兰",
	},
	{
		value: "en-CA",
		name: "English · Canada",
		label: "English (Canada) (en-CA)",
		keywords: "english canada canadian ca 英语 英文 加拿大",
	},
	{
		value: "en-IN",
		name: "English · India",
		label: "English (India) (en-IN)",
		keywords: "english india indian in 英语 英文 印度",
	},
	{
		value: "en-SG",
		name: "English · Singapore",
		label: "English (Singapore) (en-SG)",
		keywords: "english singapore sg 英语 英文 新加坡",
	},

	// 西班牙语
	{
		value: "es-ES",
		name: "Español · España",
		label: "Español (Spain) (es-ES)",
		keywords: "spanish spain espana es 西班牙语 西语 西班牙 xiyu",
	},
	{
		value: "es-AR",
		name: "Español · Argentina",
		label: "Español (Argentina) (es-AR)",
		keywords: "spanish argentina ar 西班牙语 西语 阿根廷",
	},
	{
		value: "es-MX",
		name: "Español · México",
		label: "Español (México) (es-MX)",
		keywords: "spanish mexico mx 西班牙语 西语 墨西哥",
	},

	// 法语
	{
		value: "fr-FR",
		name: "Français · France",
		label: "Français (France) (fr-FR)",
		keywords: "french france fr 法语 法文 法国 fayu",
	},
	{
		value: "fr-CA",
		name: "Français · Canada",
		label: "Français (Canada) (fr-CA)",
		keywords: "french canada quebec ca 法语 加拿大 魁北克",
	},
	{
		value: "fr-BE",
		name: "Français · Belgique",
		label: "Français (Belgique) (fr-BE)",
		keywords: "french belgium belgique be 法语 比利时",
	},

	// 德语
	{
		value: "de-DE",
		name: "Deutsch · Deutschland",
		label: "Deutsch (Germany) (de-DE)",
		keywords: "german germany deutschland de 德语 德文 德国 deyu",
	},
	{
		value: "de-AT",
		name: "Deutsch · Österreich",
		label: "Deutsch (Österreich) (de-AT)",
		keywords: "german austria osterreich at 德语 奥地利",
	},
	{
		value: "de-CH",
		name: "Deutsch · Schweiz",
		label: "Deutsch (Schweiz) (de-CH)",
		keywords: "german switzerland schweiz swiss ch 德语 瑞士",
	},

	// 亚洲高频语种
	{
		value: "ja",
		name: "日本語",
		label: "日本語 (ja)",
		keywords: "japanese japan jp jpn nihongo 日语 日文 日本 riyu riben",
	},
	{
		value: "ko",
		name: "한국어",
		label: "한국어 (ko)",
		keywords: "korean korea kr kor hangul 韩语 韩文 韩国 朝鲜语 hanyu",
	},
	{
		value: "ms",
		name: "Bahasa Melayu",
		label: "Bahasa Melayu (ms)",
		keywords: "malay malaysia my ms 马来语 马来西亚",
	},
	{
		value: "id",
		name: "Bahasa Indonesia",
		label: "Bahasa Indonesia (id)",
		keywords: "indonesian indonesia id 印尼语 印度尼西亚",
	},
	{
		value: "vi",
		name: "Tiếng Việt",
		label: "Tiếng Việt (vi)",
		keywords: "vietnamese vietnam vn vi 越南语 越南",
	},
	{
		value: "th",
		name: "ไทย",
		label: "ไทย (th)",
		keywords: "thai thailand th 泰语 泰文 泰国",
	},
	{
		value: "fil",
		name: "Filipino",
		label: "Filipino (fil)",
		keywords: "filipino tagalog philippines ph tl 菲律宾语 菲律宾",
	},

	// 葡萄牙语
	{
		value: "pt-PT",
		name: "Português · Portugal",
		label: "Português (Portugal) (pt-PT)",
		keywords: "portuguese portugal pt 葡萄牙语 葡语 葡萄牙",
	},
	{
		value: "pt-BR",
		name: "Português · Brasil",
		label: "Português (Brasil) (pt-BR)",
		keywords: "portuguese brazil brasil br 葡萄牙语 葡语 巴西",
	},

	// 俄语及东欧高频语种
	{
		value: "ru",
		name: "Русский",
		label: "Русский (ru)",
		keywords: "russian russia ru 俄语 俄文 俄罗斯 eyu",
	},
	{
		value: "uk",
		name: "Українська",
		label: "Українська (uk)",
		keywords: "ukrainian ukraine ua uk 乌克兰语 乌克兰",
	},
	{
		value: "pl",
		name: "Polski",
		label: "Polski (pl)",
		keywords: "polish poland pl 波兰语 波兰",
	},
	{
		value: "ro",
		name: "Română",
		label: "Română (ro)",
		keywords: "romanian romania ro 罗马尼亚语 罗马尼亚",
	},
	{
		value: "hu",
		name: "Magyar",
		label: "Magyar (hu)",
		keywords: "hungarian hungary hu 匈牙利语 匈牙利",
	},
	{
		value: "cs",
		name: "Čeština",
		label: "Čeština (cs)",
		keywords: "czech czechia cz cs 捷克语 捷克",
	},
	{
		value: "el",
		name: "Ελληνικά",
		label: "Ελληνικά (el)",
		keywords: "greek greece gr el 希腊语 希腊",
	},

	// 北欧
	{
		value: "sv",
		name: "Svenska",
		label: "Svenska (sv)",
		keywords: "swedish sweden se sv 瑞典语 瑞典",
	},
	{
		value: "fi",
		name: "Suomi",
		label: "Suomi (fi)",
		keywords: "finnish finland fi 芬兰语 芬兰",
	},
	{
		value: "nb",
		name: "Norsk Bokmål",
		label: "Norsk Bokmål (nb)",
		keywords: "norwegian norway bokmal no nb 挪威语 挪威",
	},
	{
		value: "da",
		name: "Dansk",
		label: "Dansk (da)",
		keywords: "danish denmark dk da 丹麦语 丹麦",
	},

	// 中东和西亚
	{
		value: "tr",
		name: "Türkçe",
		label: "Türkçe (tr)",
		keywords: "turkish turkey turkiye tr 土耳其语 土耳其",
	},
	{
		value: "ar",
		name: "العربية",
		label: "العربية (ar)",
		keywords: "arabic saudi uae ar 阿拉伯语 阿语 沙特 阿联酋",
	},
	{
		value: "he",
		name: "עברית",
		label: "עברית (he)",
		keywords: "hebrew israel il he iw 希伯来语 以色列",
	},

	// 印度次大陆
	{
		value: "hi",
		name: "हिन्दी",
		label: "हिन्दी (hi)",
		keywords: "hindi india in hi 印地语 印度",
	},
	{
		value: "ta",
		name: "தமிழ்",
		label: "தமிழ் (ta)",
		keywords: "tamil india sri lanka ta 泰米尔语 印度 斯里兰卡",
	},
	{
		value: "bn",
		name: "বাংলা",
		label: "বাংলা (bn)",
		keywords: "bengali bangla bangladesh bd bn 孟加拉语 孟加拉国",
	},

	// 波罗的海
	{
		value: "lt",
		name: "Lietuvių",
		label: "Lietuvių (lt)",
		keywords: "lithuanian lithuania lt 立陶宛语 立陶宛",
	},

	// 较高频的小语种
	{
		value: "nl",
		name: "Nederlands",
		label: "Nederlands (nl)",
		keywords: "dutch netherlands holland belgium nl 荷兰语 荷兰 比利时",
	},
	{
		value: "sl",
		name: "Slovenščina",
		label: "Slovenščina (sl)",
		keywords: "slovenian slovene slovenia si sl 斯洛文尼亚语 斯洛文尼亚",
	},
	{
		value: "ca",
		name: "Català",
		label: "Català (ca)",
		keywords: "catalan catalonia spain ca 加泰罗尼亚语",
	},
	{
		value: "sr",
		name: "Српски",
		label: "Српски (sr)",
		keywords: "serbian serbia rs sr 塞尔维亚语 塞尔维亚",
	},
	{
		value: "hr",
		name: "Hrvatski",
		label: "Hrvatski (hr)",
		keywords: "croatian croatia hr 克罗地亚语 克罗地亚",
	},
	{
		value: "et",
		name: "Eesti",
		label: "Eesti (et)",
		keywords: "estonian estonia ee et 爱沙尼亚语 爱沙尼亚",
	},
	{
		value: "lv",
		name: "Latviešu",
		label: "Latviešu (lv)",
		keywords: "latvian latvia lv 拉脱维亚语 拉脱维亚",
	},
	{
		value: "sk",
		name: "Slovenčina",
		label: "Slovenčina (sk)",
		keywords: "slovak slovakia sk 斯洛伐克语 斯洛伐克",
	},
	{
		value: "fa",
		name: "فارسی",
		label: "فارسی (fa)",
		keywords: "persian farsi iran ir fa 波斯语 伊朗",
	},
];

const LANGUAGE_OPTION_BY_VALUE = new Map(LANGUAGE_OPTIONS.map((opt) => [opt.value, opt]));

// 缓存生成的HTML，避免重复计算
let cachedLanguageOptionsHTML = null;

/**
 * 生成语言选项HTML字符串
 * @param {string|null} selectedValue - 选中的语言值，为null时不选中任何选项
 * @returns {string} 生成的option元素HTML字符串
 */
export const generateLanguageOptions = (selectedValue = null) => {
	// 早期返回 - 如果没有选中值且已有缓存，直接返回缓存结果
	if (!selectedValue && cachedLanguageOptionsHTML) {
		return cachedLanguageOptionsHTML;
	}

	const html = LANGUAGE_OPTIONS.map((option) => {
		const selected = selectedValue === option.value ? " selected" : "";
		return `<option value="${option.value}"${selected}>${option.label}</option>`;
	}).join("");

	// 只在没有选中值时进行缓存
	if (!selectedValue) {
		cachedLanguageOptionsHTML = html;
	}

	return html;
};

export const LEGACY_LANGUAGE_CODE_MAP = Object.freeze({
	tl: "fil",
	no: "nb",
});

export const normalizeLanguageOptionValue = (value) => {
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	return Object.hasOwn(LEGACY_LANGUAGE_CODE_MAP, trimmed) ? LEGACY_LANGUAGE_CODE_MAP[trimmed] : trimmed;
};

const getDefaultCustomSuffix = () => {
	const lang = typeof navigator !== "undefined" ? String(navigator.language || "").toLowerCase() : "";
	return lang.startsWith("zh") ? "自定义" : "Custom";
};

/**
 * 将原始语言值与回退文案解析为结构化展示项（兼容预设项与动态自定义项）
 * @param {string} value - 语言代码
 * @param {string} [fallbackText=""] - option 文本（用于自定义项）
 * @returns {{ value: string, name: string, code: string, keywords: string }}
 */
export const formatLanguageOption = (value, fallbackText = "") => {
	const preset = LANGUAGE_OPTION_BY_VALUE.get(value);
	if (preset) {
		return {
			value: preset.value,
			name: preset.name,
			code: preset.value,
			keywords: preset.keywords,
		};
	}

	const trimmedText = String(fallbackText || "").trim();
	const trimmedValue = String(value || "").trim();
	if (trimmedText && trimmedValue && trimmedText !== trimmedValue) {
		const match = trimmedText.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
		if (match?.[1] && match[2] === trimmedValue) {
			return { value: trimmedValue, name: match[1].trim(), code: trimmedValue, keywords: "" };
		}
		return { value: trimmedValue, name: trimmedText, code: trimmedValue, keywords: "" };
	}

	return {
		value: trimmedValue,
		name: trimmedText || trimmedValue,
		code: trimmedValue,
		keywords: "",
	};
};

const foldDiacritics = (str) =>
	String(str || "")
		.normalize("NFD")
		.replace(/\p{Mn}/gu, "")
		.toLowerCase();

const compactText = (str) => foldDiacritics(str).replace(/[\s\-_·()（）]+/g, "");

/**
 * 字符级子序列匹配：返回原始字符串中命中的字符索引数组，未命中返回 null
 * 仅对长度 >= 2 的查询启用，避免单字符误命中无关项
 */
const matchSubsequenceIndices = (source, query) => {
	if (!query || query.length < 2) return null;
	const indices = [];
	let qi = 0;
	for (let si = 0; si < source.length && qi < query.length; si++) {
		const ch = foldDiacritics(source[si]);
		if (!ch) continue;
		if (ch === query[qi]) {
			indices.push(si);
			qi++;
		}
	}
	return qi === query.length ? indices : null;
};

/**
 * 查找连续子串在原字符串中的字符索引范围（忽略大小写与重音符号）
 */
const findSubstringIndices = (source, query) => {
	if (!query) return null;
	const foldedChars = [];
	const origIndexMap = [];
	for (let i = 0; i < source.length; i++) {
		const folded = foldDiacritics(source[i]);
		for (let j = 0; j < folded.length; j++) {
			foldedChars.push(folded[j]);
			origIndexMap.push(i);
		}
	}
	const foldedSource = foldedChars.join("");
	const pos = foldedSource.indexOf(query);
	if (pos === -1) return null;

	const indices = [];
	for (let k = pos; k < pos + query.length; k++) {
		const origIdx = origIndexMap[k];
		if (indices[indices.length - 1] !== origIdx) {
			indices.push(origIdx);
		}
	}
	return indices;
};

const scoreSingleToken = (option, rawToken) => {
	const token = foldDiacritics(rawToken);
	const compactToken = compactText(rawToken);
	if (!token) return { score: 0, nameIndices: [], codeIndices: [] };

	const codeFolded = foldDiacritics(option.code);
	const codeCompact = compactText(option.code);
	const nameFolded = foldDiacritics(option.name);
	const keywordTokens = foldDiacritics(option.keywords || "")
		.split(/\s+/)
		.filter(Boolean);

	// 1. 语言码精确匹配（含忽略连字符，如 zhcn -> zh-CN）
	if (codeFolded === token || (compactToken && codeCompact === compactToken)) {
		return {
			score: 1000,
			nameIndices: [],
			codeIndices: Array.from({ length: option.code.length }, (_, i) => i),
		};
	}

	// 2. 语言码前缀匹配
	if (codeFolded.startsWith(token)) {
		return {
			score: 860 - Math.min(codeFolded.length, 20),
			nameIndices: [],
			codeIndices: findSubstringIndices(option.code, token) || [],
		};
	}

	// 3. 展示名开头匹配
	if (nameFolded.startsWith(token)) {
		return {
			score: 740,
			nameIndices: findSubstringIndices(option.name, token) || [],
			codeIndices: [],
		};
	}

	// 4. 关键词前缀匹配（如 日 -> ja、jp -> ja、hk -> zh-HK、riyu -> ja）
	for (const kw of keywordTokens) {
		if (kw === token) {
			return { score: 680, nameIndices: [], codeIndices: [] };
		}
		if (kw.startsWith(token)) {
			return { score: 620, nameIndices: [], codeIndices: [] };
		}
	}

	// 5. 展示名或语言码包含子串
	const nameSub = findSubstringIndices(option.name, token);
	if (nameSub) {
		return { score: 500, nameIndices: nameSub, codeIndices: [] };
	}

	const codeSub = findSubstringIndices(option.code, token);
	if (codeSub) {
		return { score: 460, nameIndices: [], codeIndices: codeSub };
	}

	// 6. 关键词包含子串
	for (const kw of keywordTokens) {
		if (kw.includes(token)) {
			return { score: 360, nameIndices: [], codeIndices: [] };
		}
	}

	// 7. 模糊子序列匹配（如 esmx -> es-MX、engus -> English · US、jpn -> japan）
	if (compactToken.length >= 2) {
		const codeSeq = matchSubsequenceIndices(option.code, compactToken);
		if (codeSeq) {
			const span = codeSeq[codeSeq.length - 1] - codeSeq[0] + 1;
			return {
				score: 260 + Math.max(0, 40 - (span - compactToken.length) * 6),
				nameIndices: [],
				codeIndices: codeSeq,
			};
		}

		const nameSeq = matchSubsequenceIndices(option.name, compactToken);
		if (nameSeq) {
			const span = nameSeq[nameSeq.length - 1] - nameSeq[0] + 1;
			// 仅接受紧密度合理的子序列，防止长字符串跨太多字符误命中
			if (span <= compactToken.length * 3 + 2) {
				return {
					score: 200 + Math.max(0, 30 - (span - compactToken.length) * 4),
					nameIndices: nameSeq,
					codeIndices: [],
				};
			}
		}

		for (const kw of keywordTokens) {
			if (kw.length < compactToken.length) continue;
			const kwSeq = matchSubsequenceIndices(kw, compactToken);
			if (kwSeq) {
				const span = kwSeq[kwSeq.length - 1] - kwSeq[0] + 1;
				if (span <= compactToken.length * 2 + 2) {
					return { score: 170, nameIndices: [], codeIndices: [] };
				}
			}
		}
	}

	return null;
};

/**
 * 计算单个语言项对搜索词的模糊匹配分值与高亮索引
 * 支持多词组合查询（例如 "en uk"、"繁 港"）
 * @param {{ value: string, name: string, code: string, keywords?: string }} option
 * @param {string} rawQuery
 * @returns {{ matched: boolean, score: number, nameIndices: number[], codeIndices: number[] }}
 */
export const scoreLanguageMatch = (option, rawQuery) => {
	const trimmed = String(rawQuery || "").trim();
	if (!trimmed) {
		return { matched: true, score: 0, nameIndices: [], codeIndices: [] };
	}

	const tokens = trimmed.split(/\s+/).filter(Boolean);
	let totalScore = 0;
	const nameIndexSet = new Set();
	const codeIndexSet = new Set();

	for (const token of tokens) {
		const res = scoreSingleToken(option, token);
		if (!res) {
			return { matched: false, score: 0, nameIndices: [], codeIndices: [] };
		}
		totalScore += res.score;
		for (const idx of res.nameIndices) nameIndexSet.add(idx);
		for (const idx of res.codeIndices) codeIndexSet.add(idx);
	}

	return {
		matched: true,
		score: totalScore,
		nameIndices: Array.from(nameIndexSet).sort((a, b) => a - b),
		codeIndices: Array.from(codeIndexSet).sort((a, b) => a - b),
	};
};

/**
 * 过滤并按匹配度排序语言列表（同分保持原序）
 * @param {Array<{ value: string, name: string, code: string, keywords?: string }>} options
 * @param {string} rawQuery
 * @returns {Array<{ option: { value: string, name: string, code: string, keywords?: string }, score: number, nameIndices: number[], codeIndices: number[] }>}
 */
export const filterLanguageOptions = (options, rawQuery) => {
	const trimmed = String(rawQuery || "").trim();
	if (!trimmed) {
		return options.map((option) => ({
			option,
			score: 0,
			nameIndices: [],
			codeIndices: [],
		}));
	}

	const matched = [];
	for (let i = 0; i < options.length; i++) {
		const option = options[i];
		const res = scoreLanguageMatch(option, trimmed);
		if (res.matched) {
			matched.push({
				option,
				score: res.score,
				nameIndices: res.nameIndices,
				codeIndices: res.codeIndices,
				order: i,
			});
		}
	}

	matched.sort((a, b) => b.score - a.score || a.order - b.order);
	return matched.map(({ option, score, nameIndices, codeIndices }) => ({
		option,
		score,
		nameIndices,
		codeIndices,
	}));
};

/**
 * 填充语言选择框元素
 * @param {HTMLSelectElement} selectElement - 要填充的select元素
 * @param {string|null} selectedValue - 要选中的语言值
 * @param {string|null} [customSuffix=null] - 自定义选项后缀
 */
export const populateLanguageSelect = (selectElement, selectedValue = null, customSuffix = null) => {
	// 验证必需参数和类型
	if (!selectElement || !(selectElement instanceof HTMLElement)) return;

	const normalizedValue = selectedValue ? normalizeLanguageOptionValue(selectedValue) : null;
	selectElement.innerHTML = generateLanguageOptions(normalizedValue);

	// 如果指定了选中值但在预定义选项中没有找到，添加自定义选项
	if (normalizedValue && !LANGUAGE_OPTIONS.find((opt) => opt.value === normalizedValue)) {
		const customOption = document.createElement("option");
		customOption.value = normalizedValue;
		const suffix = customSuffix || getDefaultCustomSuffix();
		customOption.textContent = `${normalizedValue} (${suffix})`;
		customOption.selected = true;
		selectElement.insertBefore(customOption, selectElement.firstChild);
	}
};
