(() => {
	const normalizeChatCompletionsUrl = (baseUrl) => {
		const trimmed = String(baseUrl || "").trim();
		if (!trimmed) {
			return "";
		}

		const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
		if (/\/chat\/completions$/i.test(withoutTrailingSlash)) {
			return withoutTrailingSlash;
		}

		if (/\/v\d+$/i.test(withoutTrailingSlash)) {
			return `${withoutTrailingSlash}/chat/completions`;
		}

		return `${withoutTrailingSlash}/chat/completions`;
	};

	const extractErrorMessage = async (response) => {
		try {
			const payload = await response.json();
			return (
				payload?.error?.message ||
				payload?.message ||
				`${response.status} ${response.statusText}`.trim()
			);
		} catch (_error) {
			return `${response.status} ${response.statusText}`.trim();
		}
	};

	const createChatCompletion = async ({
		url,
		apiKey,
		authHeader = "Authorization",
		model,
		messages,
		temperature = 0.2,
		stream = true,
		signal,
		onDelta,
	}) => {
		const normalizedUrl = normalizeChatCompletionsUrl(url);
		if (!normalizedUrl) {
			throw new Error("Missing API URL");
		}

		const headers = {
			"Content-Type": "application/json",
		};
		if (authHeader.toLowerCase() === "authorization") {
			headers.Authorization = `Bearer ${apiKey}`;
		} else {
			headers[authHeader] = apiKey;
		}

		const response = await fetch(normalizedUrl, {
			method: "POST",
			headers,
			body: JSON.stringify({
				model,
				messages,
				temperature,
				stream,
			}),
			signal,
		});

		if (!response.ok) {
			throw new Error(await extractErrorMessage(response));
		}

		const contentType = response.headers.get("content-type") || "";
		const isSse =
			stream &&
			contentType.toLowerCase().includes("text/event-stream") &&
			response.body;

		if (isSse) {
			const reader = response.body.getReader();
			const decoder = new TextDecoder("utf-8");
			let content = "";
			let buffer = "";
			const processBuffer = (chunk, flush = false) => {
				buffer += chunk;
				const lines = buffer.split(/\r?\n/);
				buffer = flush ? "" : lines.pop() || "";

				for (const rawLine of lines) {
					const line = rawLine.trim();
					if (!line || !line.startsWith("data:")) {
						continue;
					}

					const data = line.slice(5).trim();
					if (!data) {
						continue;
					}

					if (data === "[DONE]") {
						return true;
					}

					try {
						const payload = JSON.parse(data);
						const delta = payload?.choices?.[0]?.delta?.content;
						if (typeof delta === "string" && delta.length > 0) {
							content += delta;
							if (typeof onDelta === "function") {
								onDelta(delta, content);
							}
						}
					} catch (_error) {
						// Ignore malformed chunks from providers that mix non-JSON SSE lines.
					}
				}

				return false;
			};

			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					if (processBuffer(decoder.decode(), true)) {
						return { content, streamed: true };
					}
					break;
				}

				if (processBuffer(decoder.decode(value, { stream: true }))) {
					return { content, streamed: true };
				}
			}

			return { content, streamed: true };
		}

		const payload = await response.json();
		const content =
			payload?.choices?.[0]?.message?.content ||
			payload?.choices?.[0]?.text ||
			"";

		return { content, streamed: false };
	};

	window.AIChatClient = {
		normalizeChatCompletionsUrl,
		createChatCompletion,
	};
})();
