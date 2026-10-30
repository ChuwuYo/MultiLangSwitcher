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
		return payload?.error?.message || payload?.message || `${response.status} ${response.statusText}`.trim();
	} catch (_error) {
		return `${response.status} ${response.statusText}`.trim();
	}
};

// 明文 HTTP 会泄露 API Key；本机、局域网与 Tailscale 地址放行，以兼容 Ollama 等本地模型服务
const isLocalNetworkHost = (hostname) => {
	const host = hostname
		.replace(/^\[|\]$/g, "")
		.replace(/\.$/, "")
		.toLowerCase();
	if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "::1") {
		return true;
	}
	if (/^f[cd][0-9a-f]{0,2}:/.test(host)) {
		return true;
	}
	const octets = host.split(".").map(Number);
	if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
		return false;
	}
	const [a, b] = octets;
	return (
		a === 127 ||
		a === 10 ||
		(a === 192 && b === 168) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 100 && b >= 64 && b <= 127)
	);
};

/**
 * @param {string} url
 * @returns {"ok" | "invalid" | "insecure"}
 */
const checkEndpointSecurity = (url) => {
	let parsed;
	try {
		parsed = new URL(String(url || "").trim());
	} catch (_error) {
		return "invalid";
	}
	if (parsed.protocol === "https:") {
		return "ok";
	}
	if (parsed.protocol === "http:") {
		return isLocalNetworkHost(parsed.hostname) ? "ok" : "insecure";
	}
	return "invalid";
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
	if (checkEndpointSecurity(normalizedUrl) !== "ok") {
		throw new Error("Refusing to send API key to a non-HTTPS endpoint");
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
		// 重定向目标不经过 HTTPS 校验，自定义认证头和请求体可能被转发到明文地址
		redirect: "error",
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
	const isSse = stream && contentType.toLowerCase().includes("text/event-stream") && response.body;

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
	const content = payload?.choices?.[0]?.message?.content || payload?.choices?.[0]?.text || "";

	return { content, streamed: false };
};

const AIChatClient = {
	normalizeChatCompletionsUrl,
	checkEndpointSecurity,
	createChatCompletion,
};

export { AIChatClient };
