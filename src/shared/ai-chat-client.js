const DEFAULT_REQUEST_TIMEOUT_MS = 60000;

const normalizeChatCompletionsUrl = (baseUrl) => {
	const trimmed = String(baseUrl || "").trim();
	if (!trimmed) {
		return "";
	}
	try {
		const parsed = new URL(trimmed);
		const cleanPath = parsed.pathname.replace(/\/+$/, "");
		if (!/\/chat\/completions$/i.test(cleanPath)) {
			parsed.pathname = `${cleanPath}/chat/completions`;
		} else {
			parsed.pathname = cleanPath;
		}
		return parsed.toString();
	} catch (_error) {
		const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
		return /\/chat\/completions$/i.test(withoutTrailingSlash)
			? withoutTrailingSlash
			: `${withoutTrailingSlash}/chat/completions`;
	}
};

const extractErrorMessage = async (response) => {
	const fallback = `${response.status} ${response.statusText}`.trim();
	try {
		const rawText = await response.text();
		if (!rawText) return fallback;
		try {
			const payload = JSON.parse(rawText);
			if (typeof payload?.error === "string" && payload.error.trim()) {
				return payload.error.trim();
			}
			return payload?.error?.message || payload?.message || fallback;
		} catch (_parseError) {
			return rawText.trim().slice(0, 200) || fallback;
		}
	} catch (_error) {
		return fallback;
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
	if (/^f[cd][0-9a-f]{2}:/.test(host)) {
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

const extractMappedIpv4Octets = (host) => {
	// 支持 ::ffff:169.254.169.254、::ffff:a9fe:a9fe 及完整前导 0 形式
	const dotted = /^(?:::ffff:|(?:0+:){5}ffff:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(host);
	if (dotted) {
		const octets = dotted[1].split(".").map(Number);
		if (octets.length === 4 && octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
			return octets;
		}
	}
	const hexPair = /^(?:::ffff:|(?:0+:){5}ffff:)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
	if (hexPair) {
		const hi = Number.parseInt(hexPair[1], 16);
		const lo = Number.parseInt(hexPair[2], 16);
		return [(hi >>> 8) & 0xff, hi & 0xff, (lo >>> 8) & 0xff, lo & 0xff];
	}
	return null;
};

const isLinkLocalOrMetadataHost = (hostname) => {
	const host = hostname
		.replace(/^\[|\]$/g, "")
		.replace(/\.$/, "")
		.toLowerCase();
	if (/^fe[89ab][0-9a-f]:/.test(host)) {
		return true;
	}
	const mappedOctets = extractMappedIpv4Octets(host);
	if (mappedOctets) {
		return mappedOctets[0] === 169 && mappedOctets[1] === 254;
	}
	const octets = host.split(".").map(Number);
	return octets.length === 4 && octets[0] === 169 && octets[1] === 254;
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
	if (parsed.username || parsed.password || isLinkLocalOrMetadataHost(parsed.hostname)) {
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
	timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
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
	const trimmedKey = String(apiKey || "").trim();
	const headerName = String(authHeader || "Authorization").trim() || "Authorization";
	if (trimmedKey) {
		if (headerName.toLowerCase() === "authorization") {
			headers.Authorization = `Bearer ${trimmedKey}`;
		} else {
			headers[headerName] = trimmedKey;
		}
	}

	const timeoutController = new AbortController();
	const onExternalAbort = () => timeoutController.abort();
	if (signal) {
		if (signal.aborted) {
			timeoutController.abort();
		} else {
			signal.addEventListener("abort", onExternalAbort, { once: true });
		}
	}
	let timeoutId = null;
	let timedOut = false;
	const createTimeoutError = () => {
		const timeoutErr = /** @type {Error & { code?: string }} */ (new Error("AI request timed out"));
		timeoutErr.name = "TimeoutError";
		timeoutErr.code = "REQUEST_TIMEOUT";
		return timeoutErr;
	};
	const resetIdleTimeout = () => {
		if (timeoutId) clearTimeout(timeoutId);
		if (timeoutMs > 0) {
			timeoutId = setTimeout(() => {
				timedOut = true;
				timeoutController.abort();
			}, timeoutMs);
		}
	};
	resetIdleTimeout();

	let response;
	try {
		response = await fetch(normalizedUrl, {
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
			signal: timeoutController.signal,
		});
	} catch (error) {
		if (timeoutId) clearTimeout(timeoutId);
		signal?.removeEventListener("abort", onExternalAbort);
		if (timedOut && !signal?.aborted) {
			throw createTimeoutError();
		}
		throw error;
	}

	if (!response.ok) {
		throw new Error(await extractErrorMessage(response));
	}

	const contentType = response.headers.get("content-type") || "";
	const isSse = stream && contentType.toLowerCase().includes("text/event-stream") && response.body;

	try {
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

					let payload;
					try {
						payload = JSON.parse(data);
					} catch (_error) {
						// Ignore malformed chunks from providers that mix non-JSON SSE lines.
						continue;
					}

					if (payload?.error) {
						const errMsg =
							typeof payload.error === "string" ? payload.error : payload.error?.message || "Upstream stream error";
						throw new Error(errMsg);
					}

					const delta = payload?.choices?.[0]?.delta?.content;
					if (typeof delta === "string" && delta.length > 0) {
						content += delta;
						if (typeof onDelta === "function") {
							onDelta(delta, content);
						}
					}
				}

				return false;
			};

			try {
				while (true) {
					const { done, value } = await reader.read();
					resetIdleTimeout();
					if (done) {
						processBuffer(decoder.decode(), true);
						break;
					}
					if (processBuffer(decoder.decode(value, { stream: true }))) {
						break;
					}
				}
			} finally {
				reader.cancel().catch(() => {});
				reader.releaseLock();
			}

			return { content, streamed: true };
		}

		const payload = await response.json();
		const content = payload?.choices?.[0]?.message?.content || payload?.choices?.[0]?.text || "";
		return { content, streamed: false };
	} finally {
		if (timeoutId) clearTimeout(timeoutId);
		signal?.removeEventListener("abort", onExternalAbort);
	}
};

const AIChatClient = {
	normalizeChatCompletionsUrl,
	checkEndpointSecurity,
	createChatCompletion,
};

export { AIChatClient };
