const AIProviderPresets = {
	openrouter: {
		baseUrl: "https://openrouter.ai/api/v1",
		model: "openrouter/free",
		authHeader: "Authorization",
		labelKey: "ai_provider_openrouter",
		descriptionKey: "ai_provider_openrouter_desc",
	},
	openai: {
		baseUrl: "https://api.openai.com/v1",
		model: "gpt-5-mini",
		authHeader: "Authorization",
		labelKey: "ai_provider_openai",
		descriptionKey: "ai_provider_openai_desc",
	},
	deepseek: {
		baseUrl: "https://api.deepseek.com",
		model: "deepseek-v4-flash",
		authHeader: "Authorization",
		labelKey: "ai_provider_deepseek",
		descriptionKey: "ai_provider_deepseek_desc",
	},
	gemini: {
		baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
		model: "gemini-3.6-flash",
		authHeader: "Authorization",
		labelKey: "ai_provider_gemini",
		descriptionKey: "ai_provider_gemini_desc",
	},
	qwen: {
		baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
		model: "qwen3.7-plus",
		authHeader: "Authorization",
		labelKey: "ai_provider_qwen",
		descriptionKey: "ai_provider_qwen_desc",
	},
	siliconflow: {
		baseUrl: "https://api.siliconflow.com/v1",
		model: "Qwen/Qwen3.5-27B",
		authHeader: "Authorization",
		labelKey: "ai_provider_siliconflow",
		descriptionKey: "ai_provider_siliconflow_desc",
	},
	glm: {
		baseUrl: "https://open.bigmodel.cn/api/paas/v4",
		model: "glm-5.2",
		authHeader: "Authorization",
		labelKey: "ai_provider_glm",
		descriptionKey: "ai_provider_glm_desc",
	},
	kimi: {
		baseUrl: "https://api.moonshot.cn/v1",
		model: "kimi-k3",
		authHeader: "Authorization",
		labelKey: "ai_provider_kimi",
		descriptionKey: "ai_provider_kimi_desc",
	},
	minimax: {
		baseUrl: "https://api.minimax.io/v1",
		model: "MiniMax-M3",
		authHeader: "Authorization",
		labelKey: "ai_provider_minimax",
		descriptionKey: "ai_provider_minimax_desc",
	},
	custom: {
		baseUrl: "",
		model: "",
		authHeader: "Authorization",
		labelKey: "ai_provider_custom",
		descriptionKey: "ai_provider_custom_desc",
	},
};

const AIProviderPresetOrder = [
	"openrouter",
	"openai",
	"deepseek",
	"gemini",
	"qwen",
	"siliconflow",
	"glm",
	"kimi",
	"minimax",
	"custom",
];

const AIProviderPresetUtils = {
	populateSelectOptions(selectElement, translate) {
		if (!selectElement) {
			return;
		}

		const selectedValue = selectElement.value;
		selectElement.innerHTML = "";

		AIProviderPresetOrder.forEach((providerKey) => {
			const option = document.createElement("option");
			const preset = AIProviderPresets?.[providerKey];
			option.value = providerKey;
			option.textContent =
				typeof translate === "function" && preset?.labelKey
					? translate(preset.labelKey)
					: preset?.labelKey || providerKey;
			selectElement.appendChild(option);
		});

		if (selectedValue && AIProviderPresetOrder.includes(selectedValue)) {
			selectElement.value = selectedValue;
		}
	},
};

export { AIProviderPresets, AIProviderPresetOrder, AIProviderPresetUtils };
