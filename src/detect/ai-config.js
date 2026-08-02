import { AIProviderPresetOrder, AIProviderPresets, AIProviderPresetUtils } from "../shared/ai-provider-presets.js";
import { STORAGE_KEYS } from "../shared/storage-keys.js";
import { getAiElements, setAIConfigHint, translate } from "./ai-shared.js";

const AI_CONFIG_STORAGE_KEY = STORAGE_KEYS.AI_DIAGNOSIS_CONFIG;
const DEFAULT_PROVIDER_KEY = "openrouter";
const AI_PROVIDER_PRESETS = AIProviderPresets || {};
const AI_PROVIDER_PRESET_ORDER = AIProviderPresetOrder || Object.keys(AI_PROVIDER_PRESETS);
let aiConfigStore = {
	selectedProvider: DEFAULT_PROVIDER_KEY,
	providers: {},
};

const getProviderPreset = (providerKey) =>
	AI_PROVIDER_PRESETS[providerKey] || AI_PROVIDER_PRESETS[DEFAULT_PROVIDER_KEY] || {};

export const ensureProviderOptions = (providerSelect) => {
	if (!providerSelect || providerSelect.options.length > 0) {
		return;
	}

	AIProviderPresetUtils?.populateSelectOptions?.(providerSelect, translate);
};

const normalizeConfig = (config = {}) => {
	const provider = AI_PROVIDER_PRESETS[config.provider] ? config.provider : DEFAULT_PROVIDER_KEY;
	const preset = getProviderPreset(provider);

	return {
		provider,
		baseUrl: typeof config.baseUrl === "string" && config.baseUrl.trim() ? config.baseUrl.trim() : preset.baseUrl || "",
		apiKey: typeof config.apiKey === "string" && config.apiKey.trim() ? config.apiKey.trim() : "",
		model: typeof config.model === "string" && config.model.trim() ? config.model.trim() : preset.model || "",
		authHeader:
			typeof config.authHeader === "string" && config.authHeader.trim()
				? config.authHeader.trim()
				: preset.authHeader || "Authorization",
		updatedAt: config.updatedAt || 0,
	};
};

const normalizeConfigStore = (storedConfig = null) => {
	const normalizedStore = {
		selectedProvider: DEFAULT_PROVIDER_KEY,
		providers: {},
	};

	AI_PROVIDER_PRESET_ORDER.forEach((providerKey) => {
		normalizedStore.providers[providerKey] = normalizeConfig({
			provider: providerKey,
		});
	});

	if (storedConfig?.providers && typeof storedConfig.providers === "object") {
		AI_PROVIDER_PRESET_ORDER.forEach((providerKey) => {
			normalizedStore.providers[providerKey] = normalizeConfig({
				provider: providerKey,
				...(storedConfig.providers[providerKey] || {}),
			});
		});
		normalizedStore.selectedProvider = AI_PROVIDER_PRESETS[storedConfig.selectedProvider]
			? storedConfig.selectedProvider
			: DEFAULT_PROVIDER_KEY;
		return normalizedStore;
	}

	if (storedConfig && typeof storedConfig === "object") {
		const legacyProvider = guessProviderFromConfig(storedConfig);
		normalizedStore.providers[legacyProvider] = normalizeConfig({
			provider: legacyProvider,
			...storedConfig,
		});
		normalizedStore.selectedProvider = legacyProvider;
	}

	return normalizedStore;
};

const getStoredProviderConfig = (providerKey) =>
	aiConfigStore.providers[providerKey] || normalizeConfig({ provider: providerKey });

const serializeConfigStore = () => {
	const providers = {};
	AI_PROVIDER_PRESET_ORDER.forEach((providerKey) => {
		const providerConfig = getStoredProviderConfig(providerKey);
		providers[providerKey] = {
			provider: providerKey,
			baseUrl: providerConfig.baseUrl,
			apiKey: providerConfig.apiKey,
			model: providerConfig.model,
			authHeader: providerConfig.authHeader,
			updatedAt: providerConfig.updatedAt || 0,
		};
	});

	return {
		selectedProvider: aiConfigStore.selectedProvider || DEFAULT_PROVIDER_KEY,
		providers,
	};
};

export const readAIConfigFromInputs = (providerOverride = "") => {
	const elements = getAiElements();
	const provider = providerOverride || elements.providerSelect?.value || DEFAULT_PROVIDER_KEY;
	const preset = getProviderPreset(provider);

	return normalizeConfig({
		provider,
		baseUrl: elements.baseUrlInput?.value || "",
		apiKey: elements.apiKeyInput?.value || "",
		model: elements.modelInput?.value || "",
		authHeader: preset.authHeader || "Authorization",
	});
};

const fillAIConfigInputs = (config) => {
	const elements = getAiElements();
	const normalized = normalizeConfig(config);

	ensureProviderOptions(elements.providerSelect);
	if (elements.providerSelect) {
		elements.providerSelect.value = normalized.provider;
	}
	if (elements.baseUrlInput) {
		elements.baseUrlInput.value = normalized.baseUrl;
	}
	if (elements.apiKeyInput) {
		elements.apiKeyInput.value = normalized.apiKey;
		elements.apiKeyInput.type = "password";
	}
	if (elements.modelInput) {
		elements.modelInput.value = normalized.model;
	}
	if (elements.apiKeyToggle) {
		elements.apiKeyToggle.textContent = translate("ai_api_key_toggle_show");
	}

	updateAIProviderDescription(normalized.provider);
	return normalized;
};

const updateAIProviderDescription = (providerKey) => {
	const { providerDescription } = getAiElements();
	if (!providerDescription) {
		return;
	}

	const preset = getProviderPreset(providerKey);
	providerDescription.textContent = preset.descriptionKey ? translate(preset.descriptionKey) : "";
};

const guessProviderFromConfig = (config = {}) => {
	const baseUrl = String(config.baseUrl || "")
		.trim()
		.toLowerCase();
	if (!baseUrl) {
		return DEFAULT_PROVIDER_KEY;
	}

	const directMatch = AI_PROVIDER_PRESET_ORDER.find((providerKey) => {
		const presetBaseUrl = String(getProviderPreset(providerKey).baseUrl || "")
			.trim()
			.toLowerCase();
		return presetBaseUrl && baseUrl.startsWith(presetBaseUrl);
	});

	return directMatch || config.provider || DEFAULT_PROVIDER_KEY;
};

export const validateAIConfig = (config) => {
	if (!config.baseUrl || !config.apiKey || !config.model) {
		return { valid: false, messageKey: "ai_config_incomplete" };
	}

	if (String(config.baseUrl).includes("YOUR-RESOURCE-NAME")) {
		return { valid: false, messageKey: "ai_config_replace_template" };
	}

	return { valid: true, messageKey: "ai_config_ready" };
};

export const persistAIConfig = async () => {
	const config = readAIConfigFromInputs();
	aiConfigStore.selectedProvider = config.provider;
	aiConfigStore.providers[config.provider] = {
		...config,
		updatedAt: Date.now(),
	};
	const validation = validateAIConfig(config);

	try {
		await chrome.storage.local.set({
			[AI_CONFIG_STORAGE_KEY]: serializeConfigStore(),
		});
	} catch (error) {
		console.warn("Failed to persist AI config:", error);
	}

	setAIConfigHint(validation.messageKey, validation.valid ? "success" : "warning");
	return config;
};

export const loadAIConfig = async () => {
	let storedConfig = null;
	try {
		const result = await chrome.storage.local.get(AI_CONFIG_STORAGE_KEY);
		storedConfig = result?.[AI_CONFIG_STORAGE_KEY] || null;
	} catch (error) {
		console.warn("Failed to load AI config:", error);
	}

	aiConfigStore = normalizeConfigStore(storedConfig);
	const normalized = getStoredProviderConfig(aiConfigStore.selectedProvider);

	fillAIConfigInputs(normalized);
	const validation = validateAIConfig(normalized);
	setAIConfigHint(validation.messageKey, validation.valid ? "success" : "warning");
	return normalized;
};

export const handleProviderChange = async () => {
	const elements = getAiElements();
	const previousProvider = aiConfigStore.selectedProvider || DEFAULT_PROVIDER_KEY;
	const nextProvider = elements.providerSelect?.value || DEFAULT_PROVIDER_KEY;

	aiConfigStore.providers[previousProvider] = {
		...readAIConfigFromInputs(previousProvider),
		updatedAt: Date.now(),
	};
	aiConfigStore.selectedProvider = nextProvider;

	fillAIConfigInputs(getStoredProviderConfig(nextProvider));
	const validation = validateAIConfig(getStoredProviderConfig(nextProvider));
	setAIConfigHint(validation.messageKey, validation.valid ? "success" : "warning");

	try {
		await chrome.storage.local.set({
			[AI_CONFIG_STORAGE_KEY]: serializeConfigStore(),
		});
	} catch (error) {
		console.warn("Failed to persist AI config:", error);
	}

	updateAIProviderDescription(nextProvider);
};

export const handleApiKeyToggle = () => {
	const { apiKeyInput, apiKeyToggle } = getAiElements();
	if (!apiKeyInput || !apiKeyToggle) {
		return;
	}

	const nextVisible = apiKeyInput.type === "password";
	apiKeyInput.type = nextVisible ? "text" : "password";
	apiKeyToggle.textContent = translate(nextVisible ? "ai_api_key_toggle_hide" : "ai_api_key_toggle_show");
};
