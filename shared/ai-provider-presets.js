(() => {
	const presets = {
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
			model: "deepseek-chat",
			authHeader: "Authorization",
			labelKey: "ai_provider_deepseek",
			descriptionKey: "ai_provider_deepseek_desc",
		},
		gemini: {
			baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
			model: "gemini-2.5-flash",
			authHeader: "Authorization",
			labelKey: "ai_provider_gemini",
			descriptionKey: "ai_provider_gemini_desc",
		},
		qwen: {
			baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
			model: "qwen3.5-plus",
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
			model: "glm-4.7",
			authHeader: "Authorization",
			labelKey: "ai_provider_glm",
			descriptionKey: "ai_provider_glm_desc",
		},
		kimi: {
			baseUrl: "https://api.moonshot.cn/v1",
			model: "kimi-k2-0905",
			authHeader: "Authorization",
			labelKey: "ai_provider_kimi",
			descriptionKey: "ai_provider_kimi_desc",
		},
		minimax: {
			baseUrl: "https://api.minimax.io/v1",
			model: "MiniMax-M2.5",
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

	window.AIProviderPresets = presets;
	window.AIProviderPresetOrder = [
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

	window.AIProviderPresetUtils = {
		populateSelectOptions(selectElement, translate) {
			if (!selectElement) {
				return;
			}

			const selectedValue = selectElement.value;
			selectElement.innerHTML = "";

			window.AIProviderPresetOrder.forEach((providerKey) => {
				const option = document.createElement("option");
				const preset = window.AIProviderPresets?.[providerKey];
				option.value = providerKey;
				option.textContent =
					typeof translate === "function" && preset?.labelKey
						? translate(preset.labelKey)
						: preset?.labelKey || providerKey;
				selectElement.appendChild(option);
			});

			if (
				selectedValue &&
				window.AIProviderPresetOrder.includes(selectedValue)
			) {
				selectElement.value = selectedValue;
			}
		},
	};
})();
