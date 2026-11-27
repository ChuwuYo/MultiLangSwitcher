// shared/language-picker.js - 共享可搜索浮层语言选择器（Popup 与 Debug 共用）
// 以渐进增强方式挂载在原生 <select> 上，保持 <select> 为唯一状态真相源

import { filterLanguageOptions, formatLanguageOption } from "./shared-language-options.js";
import { ResourceManager } from "./shared-resource-manager.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * 显式声明实例接口，避免 activePickers 与 createPickerInstance 相互推导触发 TS2502
 * @typedef {object} LanguagePickerInstance
 * @property {() => void} sync - 同步原生 <select> 的值与禁用态
 * @property {() => void} open - 展开浮层
 * @property {(restoreFocus?: boolean) => void} close - 收起浮层
 * @property {(labels: { searchPlaceholder?: string, emptyText?: string, placeholderText?: string }) => void} updateLabels - 原地更新文案
 */

/** @type {WeakMap<HTMLSelectElement, LanguagePickerInstance>} */
const pickerRegistry = new WeakMap();
/** @type {Set<LanguagePickerInstance>} */
const activePickers = new Set();
let nextPickerUid = 0;

const createSvgIcon = (paths, className = "") => {
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("viewBox", "0 0 16 16");
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", "currentColor");
	svg.setAttribute("stroke-width", "1.75");
	svg.setAttribute("stroke-linecap", "round");
	svg.setAttribute("stroke-linejoin", "round");
	svg.setAttribute("aria-hidden", "true");
	if (className) svg.setAttribute("class", className);

	for (const d of paths) {
		const path = document.createElementNS(SVG_NS, "path");
		path.setAttribute("d", d);
		svg.appendChild(path);
	}
	return svg;
};

const appendHighlightedText = (parent, text, indices) => {
	if (!indices || indices.length === 0) {
		parent.textContent = text;
		return;
	}
	const highlightSet = new Set(indices);
	let buffer = "";
	let inMark = false;

	const flush = () => {
		if (!buffer) return;
		if (inMark) {
			const mark = document.createElement("mark");
			mark.className = "mls-lang-mark";
			mark.textContent = buffer;
			parent.appendChild(mark);
		} else {
			parent.appendChild(document.createTextNode(buffer));
		}
		buffer = "";
	};

	for (let i = 0; i < text.length; i++) {
		const shouldMark = highlightSet.has(i);
		if (shouldMark !== inMark) {
			flush();
			inMark = shouldMark;
		}
		buffer += text[i];
	}
	flush();
};

const createPickerInstance = (selectElement, options = {}) => {
	const uid = ++nextPickerUid;
	const triggerId = `${selectElement.id || `mlsLang${uid}`}Trigger`;
	const listId = `${selectElement.id || `mlsLang${uid}`}List`;

	let searchPlaceholder = options.searchPlaceholder || "Search language or code...";
	let emptyText = options.emptyText || "No matching language";
	let placeholderText = options.placeholderText || "—";

	// 保留原生 <select> 作为单一真相源，视觉隐藏
	selectElement.classList.add("visually-hidden");
	selectElement.tabIndex = -1;
	selectElement.setAttribute("aria-hidden", "true");

	// 将关联的 <label for="..."> 重绑到触发按钮，保持点击标签正常交互
	if (selectElement.id) {
		const label = document.querySelector(`label[for="${CSS.escape(selectElement.id)}"]`);
		if (label) {
			label.setAttribute("for", triggerId);
		}
	}

	// 构建组件 DOM（挂载在 <select> 紧邻容器内）
	const root = document.createElement("div");
	root.className = "mls-lang-picker";

	const triggerBtn = document.createElement("button");
	triggerBtn.type = "button";
	triggerBtn.id = triggerId;
	triggerBtn.className = "mls-lang-trigger";
	triggerBtn.setAttribute("role", "combobox");
	triggerBtn.setAttribute("aria-haspopup", "listbox");
	triggerBtn.setAttribute("aria-expanded", "false");
	triggerBtn.setAttribute("aria-controls", listId);

	const triggerName = document.createElement("span");
	triggerName.className = "mls-lang-trigger-name";

	const triggerMeta = document.createElement("span");
	triggerMeta.className = "mls-lang-trigger-meta";

	const triggerCode = document.createElement("span");
	triggerCode.className = "mls-lang-trigger-code d-none";

	const chevron = createSvgIcon(["M4 6l4 4 4-4"], "mls-lang-chevron");
	triggerMeta.append(triggerCode, chevron);
	triggerBtn.append(triggerName, triggerMeta);

	const menu = document.createElement("div");
	menu.className = "mls-lang-menu d-none";

	const searchWrap = document.createElement("div");
	searchWrap.className = "mls-lang-search-wrap";

	const searchIcon = createSvgIcon(
		["M11.5 11.5L14 14", "M7 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z"],
		"mls-lang-search-icon",
	);

	const searchInput = document.createElement("input");
	searchInput.type = "search";
	searchInput.className = "mls-lang-search";
	searchInput.autocomplete = "off";
	searchInput.spellcheck = false;
	searchInput.placeholder = searchPlaceholder;
	searchInput.setAttribute("aria-label", searchPlaceholder);

	const clearBtn = document.createElement("button");
	clearBtn.type = "button";
	clearBtn.className = "mls-lang-search-clear d-none";
	clearBtn.tabIndex = -1;
	clearBtn.setAttribute("aria-label", "Clear");
	clearBtn.appendChild(createSvgIcon(["M4.5 4.5l7 7", "M11.5 4.5l-7 7"]));

	searchWrap.append(searchIcon, searchInput, clearBtn);

	const optionList = document.createElement("ul");
	optionList.id = listId;
	optionList.className = "mls-lang-list";
	optionList.setAttribute("role", "listbox");

	menu.append(searchWrap, optionList);
	root.append(triggerBtn, menu);
	selectElement.insertAdjacentElement("afterend", root);

	let isOpen = false;
	let activeIndex = -1;
	/** @type {ReturnType<typeof filterLanguageOptions>} */
	let filteredEntries = [];

	const readSelectOptions = () =>
		Array.from(selectElement.options).map((opt) => formatLanguageOption(opt.value, opt.textContent || ""));

	const updateClearButton = () => {
		clearBtn.classList.toggle("d-none", searchInput.value.length === 0);
	};

	const scrollActiveIntoView = () => {
		if (activeIndex < 0) return;
		const activeEl = optionList.children[activeIndex];
		if (activeEl instanceof HTMLElement) {
			activeEl.scrollIntoView({ block: "nearest" });
		}
	};

	const setActiveIndex = (nextIndex, shouldScroll = false) => {
		if (filteredEntries.length === 0) {
			activeIndex = -1;
			return;
		}
		const prevEl = activeIndex >= 0 ? optionList.children[activeIndex] : null;
		if (prevEl instanceof HTMLElement) prevEl.classList.remove("is-active");

		const clamped = Math.max(0, Math.min(nextIndex, filteredEntries.length - 1));
		activeIndex = clamped;

		const nextEl = optionList.children[activeIndex];
		if (nextEl instanceof HTMLElement) {
			nextEl.classList.add("is-active");
			if (shouldScroll) {
				nextEl.scrollIntoView({ block: "nearest" });
			}
		}
	};

	const renderList = (query = "") => {
		const allOptions = readSelectOptions();
		filteredEntries = filterLanguageOptions(allOptions, query);
		const currentValue = selectElement.value;
		optionList.replaceChildren();

		if (filteredEntries.length === 0) {
			activeIndex = -1;
			const emptyLi = document.createElement("li");
			emptyLi.className = "mls-lang-empty";
			emptyLi.textContent = emptyText;
			optionList.appendChild(emptyLi);
			return;
		}

		const selectedIdx = filteredEntries.findIndex((item) => item.option.value === currentValue);
		// 有搜索词时默认高亮第一条最佳匹配；无搜索词时高亮当前已选项
		activeIndex = query.trim() ? 0 : selectedIdx >= 0 ? selectedIdx : 0;

		const fragment = document.createDocumentFragment();
		filteredEntries.forEach((entry, idx) => {
			const { option, nameIndices, codeIndices } = entry;
			const isSelected = option.value === currentValue;

			const li = document.createElement("li");
			li.className = "mls-lang-item";
			if (isSelected) li.classList.add("is-selected");
			if (idx === activeIndex) li.classList.add("is-active");
			li.setAttribute("role", "option");
			li.setAttribute("aria-selected", String(isSelected));
			li.dataset.value = option.value;
			li.dataset.index = String(idx);

			const nameSpan = document.createElement("span");
			nameSpan.className = "mls-lang-item-name";
			appendHighlightedText(nameSpan, option.name, nameIndices);

			const rightWrap = document.createElement("span");
			rightWrap.className = "mls-lang-item-right";

			const codeSpan = document.createElement("span");
			codeSpan.className = "mls-lang-item-code";
			appendHighlightedText(codeSpan, option.code, codeIndices);

			const checkSlot = document.createElement("span");
			checkSlot.className = "mls-lang-check";
			checkSlot.appendChild(createSvgIcon(["M3.5 8.5l3 3 6-6.5"]));

			rightWrap.append(codeSpan, checkSlot);
			li.append(nameSpan, rightWrap);
			fragment.appendChild(li);
		});

		optionList.appendChild(fragment);
	};

	const sync = () => {
		const disabled = !!selectElement.disabled;
		triggerBtn.disabled = disabled;
		if (disabled && isOpen) {
			close(false);
		}

		const selectedOption = selectElement.options[selectElement.selectedIndex];
		if (!selectedOption || !selectElement.value) {
			triggerName.textContent = placeholderText;
			triggerName.classList.add("is-placeholder");
			triggerCode.textContent = "";
			triggerCode.classList.add("d-none");
			return;
		}

		const parsed = formatLanguageOption(selectedOption.value, selectedOption.textContent || "");
		triggerName.textContent = parsed.name;
		triggerName.classList.remove("is-placeholder");
		if (parsed.code) {
			triggerCode.textContent = parsed.code;
			triggerCode.classList.remove("d-none");
		} else {
			triggerCode.textContent = "";
			triggerCode.classList.add("d-none");
		}

		if (isOpen) {
			renderList(searchInput.value);
		}
	};

	const close = (restoreFocus = false) => {
		if (!isOpen) return;
		isOpen = false;
		root.classList.remove("is-open");
		menu.classList.add("d-none");
		triggerBtn.setAttribute("aria-expanded", "false");
		searchInput.value = "";
		updateClearButton();
		if (restoreFocus && !triggerBtn.disabled) {
			triggerBtn.focus();
		}
	};

	const open = () => {
		if (isOpen || triggerBtn.disabled) return;
		// 关闭页面上其他已展开的选择器
		for (const other of activePickers) {
			if (other !== instance) other.close(false);
		}
		isOpen = true;
		root.classList.add("is-open");
		searchInput.value = "";
		updateClearButton();
		renderList("");
		menu.classList.remove("d-none");
		triggerBtn.setAttribute("aria-expanded", "true");
		// 用户主动展开浮层后聚焦内部搜索框，方便直接打字筛选（页面加载时不抢焦点）
		searchInput.focus({ preventScroll: true });
		scrollActiveIntoView();
	};

	const selectValue = (value) => {
		const changed = selectElement.value !== value;
		selectElement.value = value;
		sync();
		close(true);
		if (changed) {
			selectElement.dispatchEvent(new Event("change", { bubbles: true }));
		}
	};

	// --- 事件绑定（统一经由 ResourceManager 管理，页面卸载自动清理） ---
	ResourceManager.addEventListener(triggerBtn, "click", () => {
		if (isOpen) {
			close(true);
		} else {
			open();
		}
	});

	ResourceManager.addEventListener(triggerBtn, "keydown", (event) => {
		if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			open();
		}
	});

	ResourceManager.addEventListener(searchInput, "input", () => {
		updateClearButton();
		renderList(searchInput.value);
	});

	ResourceManager.addEventListener(clearBtn, "click", () => {
		searchInput.value = "";
		updateClearButton();
		renderList("");
		searchInput.focus();
	});

	ResourceManager.addEventListener(searchInput, "keydown", (event) => {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActiveIndex(activeIndex + 1, true);
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setActiveIndex(activeIndex - 1, true);
		} else if (event.key === "Enter") {
			event.preventDefault();
			const target = filteredEntries[activeIndex];
			if (target) selectValue(target.option.value);
		} else if (event.key === "Escape") {
			event.preventDefault();
			close(true);
		} else if (event.key === "Tab") {
			close(false);
		}
	});

	ResourceManager.addEventListener(optionList, "mousemove", (event) => {
		const target = event.target instanceof Element ? event.target.closest(".mls-lang-item") : null;
		if (!target) return;
		const idx = Number(target.dataset.index);
		if (Number.isInteger(idx) && idx !== activeIndex) {
			setActiveIndex(idx, false);
		}
	});

	ResourceManager.addEventListener(optionList, "click", (event) => {
		const target = event.target instanceof Element ? event.target.closest(".mls-lang-item") : null;
		if (!target?.dataset.value) return;
		selectValue(target.dataset.value);
	});

	ResourceManager.addEventListener(document, "mousedown", (event) => {
		if (isOpen && event.target instanceof Node && !root.contains(event.target)) {
			close(false);
		}
	});

	const updateLabels = (labels = {}) => {
		if (typeof labels.searchPlaceholder === "string") {
			searchPlaceholder = labels.searchPlaceholder;
			searchInput.placeholder = searchPlaceholder;
			searchInput.setAttribute("aria-label", searchPlaceholder);
		}
		if (typeof labels.emptyText === "string") {
			emptyText = labels.emptyText;
		}
		if (typeof labels.placeholderText === "string") {
			placeholderText = labels.placeholderText;
		}
		sync();
	};

	const instance = { sync, open, close, updateLabels };
	pickerRegistry.set(selectElement, instance);
	activePickers.add(instance);
	sync();
	return instance;
};

/**
 * 为任意原生 <select> 挂载共享的可搜索浮层语言选择器
 * @param {HTMLSelectElement|null} selectElement
 * @param {{ searchPlaceholder?: string, emptyText?: string, placeholderText?: string }} [options]
 */
export const createLanguagePicker = (selectElement, options = {}) => {
	if (!selectElement) return null;
	const existing = pickerRegistry.get(selectElement);
	if (existing) {
		existing.sync();
		return existing;
	}
	return createPickerInstance(selectElement, options);
};

/**
 * 同步 <select> 当前值与禁用态到浮层选择器
 * @param {HTMLSelectElement|null} selectElement
 */
export const syncLanguagePicker = (selectElement) => {
	if (!selectElement) return;
	pickerRegistry.get(selectElement)?.sync();
};

/**
 * 关闭指定或全部已展开的语言选择器
 * @param {HTMLSelectElement|null} [selectElement]
 */
export const closeLanguagePicker = (selectElement = null) => {
	if (selectElement) {
		pickerRegistry.get(selectElement)?.close(false);
		return;
	}
	for (const picker of activePickers) {
		picker.close(false);
	}
};

/**
 * 原地更新已挂载选择器的文案（用于无刷新语言切换）
 * @param {HTMLSelectElement|null} selectElement
 * @param {{ searchPlaceholder?: string, emptyText?: string, placeholderText?: string }} labels
 */
export const updateLanguagePickerLabels = (selectElement, labels) => {
	if (!selectElement || !labels) return;
	pickerRegistry.get(selectElement)?.updateLabels(labels);
};
