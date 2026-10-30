import { describe, expect, it } from "vitest";
import { AIChatClient } from "../src/shared/ai-chat-client.js";
import { AIProviderPresets } from "../src/shared/ai-provider-presets.js";

const { checkEndpointSecurity } = AIChatClient;

describe("checkEndpointSecurity", () => {
	it("accepts every built-in provider preset", () => {
		for (const preset of Object.values(AIProviderPresets)) {
			if (preset.baseUrl && !preset.baseUrl.includes("YOUR-RESOURCE-NAME")) {
				expect(checkEndpointSecurity(preset.baseUrl)).toBe("ok");
			}
		}
	});

	it.each([
		"http://localhost:11434/v1",
		"http://127.0.0.1:1234/v1",
		"http://[::1]:8080/v1",
		"http://192.168.1.20:11434/v1",
		"http://10.0.0.5/v1",
		"http://172.20.0.2/v1",
		"http://100.100.1.1/v1",
		"http://ollama.local/v1",
		"http://[fd12:3456::1]/v1",
	])("allows plain HTTP on local address %s", (url) => {
		expect(checkEndpointSecurity(url)).toBe("ok");
	});

	it.each(["http://api.example.com/v1", "http://8.8.8.8/v1", "http://172.32.0.1/v1", "http://192.169.0.1/v1"])(
		"rejects plain HTTP on public address %s",
		(url) => {
			expect(checkEndpointSecurity(url)).toBe("insecure");
		},
	);

	it.each(["", "api.example.com/v1", "ftp://example.com", "javascript:alert(1)"])("rejects malformed URL %s", (url) => {
		expect(checkEndpointSecurity(url)).toBe("invalid");
	});
});
