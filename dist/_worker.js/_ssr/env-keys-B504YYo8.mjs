import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { n as sheetKeys } from "./sheet-keys-BStVnMff.mjs";
import { i as getServerFnById, n as createServerFn, r as TSS_SERVER_FUNCTION } from "./ssr.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/env-keys-B504YYo8.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var env_keys_exports = /* @__PURE__ */ __exportAll({
	connectAccount: () => connectAccount,
	envValue: () => envValue,
	loadEnvKeys: () => loadEnvKeys,
	probeKey: () => probeKey,
	pullInbox: () => pullInbox,
	pullProvider: () => pullProvider,
	pullWithKey: () => pullWithKey,
	runAccount: () => runAccount,
	runProbe: () => runProbe,
	sheetKeys: () => sheetKeys,
	spotifyHub: () => spotifyHub
});
async function envBag() {
	const bag = {};
	for (const [name, value] of Object.entries(processModule.env)) if (typeof value === "string" && value) bag[name] = value;
	return bag;
}
async function envValue(name) {
	return (processModule.env[name] || "").trim();
}
var loadEnvKeys = createServerFn({ method: "GET" }).handler(createSsrRpc("8ff78e516a6c63ce079cabdeecfd0d70ebfa59af2acfadbbf0ec00ceb4e95bf2"));
var pullWithKey = createServerFn({ method: "POST" }).validator((input) => ({
	name: String(input?.name || "").slice(0, 40),
	key: String(input?.key || "").trim().slice(0, 400)
})).handler(createSsrRpc("bc9410430ad17d721e558e93ff8e59fefa97da3dc3f5561ab58987406761e1be"));
var spotifyHub = createServerFn({ method: "POST" }).validator((input) => ({
	token: String(input?.token || "").trim().slice(0, 4e3),
	action: input?.action === "search" ? "search" : "home",
	query: String(input?.query || "").trim().slice(0, 120)
})).handler(createSsrRpc("28d925ed35b526718e29db73e934d0ddcffcda58fd4999b33c529493bb08712c"));
var pullProvider = createServerFn({ method: "POST" }).validator((input) => ({
	provider: String(input?.provider || "").slice(0, 20),
	token: String(input?.token || "").trim().slice(0, 4e3)
})).handler(createSsrRpc("254a50e3b12d7bcd8fb6becd187b92a02964cdeff36ea7e10abb329713a1080c"));
async function runAccount(data) {
	try {
		if (data.service === "search-console") {
			if (!data.token) return {
				ok: false,
				text: "Connect Google first.",
				site: ""
			};
			const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
				headers: { Authorization: `Bearer ${data.token}` },
				signal: AbortSignal.timeout(1e4)
			});
			const body = await response.json();
			if (!response.ok) return {
				ok: false,
				text: body.error?.message || "Search Console refused this Google login. Reconnect Google.",
				site: ""
			};
			const sites = (body.siteEntry || []).map((row) => row.siteUrl || "").filter(Boolean);
			const site = sites.find((row) => row.includes("ceogps.com")) || sites[0] || "";
			return {
				ok: true,
				text: sites.length ? sites.slice(0, 4).join(" · ") : "No Search Console sites are on this Google login.",
				site
			};
		}
		if (data.service === "google-analytics") {
			if (!data.token) return {
				ok: false,
				text: "Connect Google as chrisgr33ninc@gmail.com and allow Analytics.",
				site: ""
			};
			const property = data.key.replace(/\D/g, "");
			if (property) {
				const report = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${data.token}`,
						"Content-Type": "application/json"
					},
					body: JSON.stringify({
						dateRanges: [{
							startDate: "7daysAgo",
							endDate: "today"
						}],
						metrics: [{ name: "sessions" }]
					}),
					signal: AbortSignal.timeout(1e4)
				});
				const raw = await report.text();
				let body = {};
				try {
					body = raw ? JSON.parse(raw) : {};
				} catch {
					body = { error: { message: raw.slice(0, 180) } };
				}
				if (!report.ok) return {
					ok: false,
					text: body.error?.message || `Google Analytics refused property ${property} (HTTP ${report.status}).`,
					site: ""
				};
				return {
					ok: true,
					text: `Connected · property ${property}`,
					site: property
				};
			}
			const response = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
				headers: { Authorization: `Bearer ${data.token}` },
				signal: AbortSignal.timeout(1e4)
			});
			const raw = await response.text();
			let body = {};
			try {
				body = raw ? JSON.parse(raw) : {};
			} catch {
				body = { error: { message: raw.slice(0, 180) } };
			}
			if (!response.ok) return {
				ok: false,
				text: body.error?.message || "Google Analytics refused this login. Paste the GA4 property ID, or reconnect Google and allow Analytics.",
				site: ""
			};
			const properties = (body.accountSummaries || []).flatMap((account) => account.propertySummaries || []);
			const match = properties.find((row) => /ceogps|ceo gps/i.test(row.displayName || "")) || properties[0];
			const site = (match?.property || "").replace("properties/", "");
			return {
				ok: true,
				text: site ? `Connected · ${match?.displayName || "Property"} · ${site}` : "No GA4 properties are on this Google login. Paste the property ID.",
				site
			};
		}
		if (data.service === "godaddy") {
			if (!data.key) return {
				ok: false,
				text: "Paste the GoDaddy key.",
				site: ""
			};
			const auth = data.secret ? `sso-key ${data.key}:${data.secret}` : data.key.startsWith("gd_pat_") ? `sso-key ${data.key}` : `Bearer ${data.key}`;
			const response = await fetch("https://api.godaddy.com/v1/domains?statuses=ACTIVE&limit=20", {
				headers: {
					Authorization: auth,
					Accept: "application/json"
				},
				signal: AbortSignal.timeout(1e4)
			});
			const body = await response.json();
			if (!response.ok || !Array.isArray(body)) return {
				ok: false,
				text: body.message || "GoDaddy refused the key.",
				site: ""
			};
			const names = body.map((row) => row.domain).filter(Boolean).slice(0, 3);
			return {
				ok: true,
				text: names.length ? `${body.length} domains · ${names.join(", ")}` : "GoDaddy connected. No active domains.",
				site: ""
			};
		}
		if (data.service === "brilliant") {
			if (!data.key || !data.site) return {
				ok: false,
				text: "Paste the site and the API key.",
				site: ""
			};
			const site = (/^https?:/i.test(data.site) ? data.site : `https://${data.site}`).replace(/\/$/, "");
			let host = "";
			try {
				host = new URL(site).hostname;
			} catch {
				return {
					ok: false,
					text: "That site address is not valid.",
					site: ""
				};
			}
			if (host !== "ceogps.com" && !host.endsWith(".ceogps.com")) return {
				ok: false,
				text: "Only ceogps.com can be checked from here.",
				site: ""
			};
			const paths = ["/api/v2/data_categories/get", "/api/v2/user/count"];
			let last = "Brilliant Directories did not answer.";
			for (const path of paths) {
				const response = await fetch(`${site}${path}`, {
					headers: {
						"X-Api-Key": data.key,
						Accept: "application/json"
					},
					signal: AbortSignal.timeout(1e4)
				});
				const raw = await response.text();
				let message = "";
				try {
					message = textOf(JSON.parse(raw));
				} catch {
					message = raw.slice(0, 180);
				}
				if (response.ok) return {
					ok: true,
					text: "The key was accepted.",
					site
				};
				last = message || `Brilliant Directories refused the key (HTTP ${response.status}).`;
				if (/does not have permission/i.test(last)) return {
					ok: true,
					text: "The key is valid. This key is not allowed to list members, so the check used a lighter endpoint.",
					site
				};
			}
			return {
				ok: false,
				text: last,
				site
			};
		}
		return {
			ok: false,
			text: "Unknown account.",
			site: ""
		};
	} catch (error) {
		return {
			ok: false,
			text: error instanceof Error ? error.message : "That account did not answer.",
			site: ""
		};
	}
}
var connectAccount = createServerFn({ method: "POST" }).validator((input) => ({
	service: String(input?.service || "").slice(0, 40),
	token: String(input?.token || "").slice(0, 4e3),
	key: String(input?.key || "").trim().slice(0, 400),
	secret: String(input?.secret || "").trim().slice(0, 400),
	site: String(input?.site || "").trim().slice(0, 200)
})).handler(createSsrRpc("243ef87da392b13a51419654ed3183f34813a44c2f8a6d45d6171eff96ad90c0"));
function textOf(value) {
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join("; ");
	if (value && typeof value === "object") {
		const row = value;
		return textOf(row.message || row.msg || row.error || row.detail || "");
	}
	return "";
}
async function readBody(response) {
	const raw = await response.text();
	let message = "";
	try {
		const body = JSON.parse(raw.slice(0, 4e3));
		message = textOf(body.error) || textOf(body.message) || textOf(body.detail) || textOf(body.errors);
	} catch {
		message = raw.slice(0, 160);
	}
	const text = response.ok ? "The service accepted the key." : message || `Refused (HTTP ${response.status}).`;
	return {
		ok: response.ok,
		checked: true,
		text: String(text).slice(0, 240)
	};
}
function cleanKey(value) {
	return value.trim().replace(/^['"]|['"]$/g, "").replace(/^(bearer|token)\s+/i, "").trim();
}
function timed(work) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(/* @__PURE__ */ new Error("The service did not answer in time.")), 8e3);
		work.then((value) => {
			clearTimeout(timer);
			resolve(value);
		}, (error) => {
			clearTimeout(timer);
			reject(error);
		});
	});
}
async function runProbe(data) {
	const aliases = {
		"Grok (xAI)": "xAI",
		"NVIDIA NIM": "NVIDIA"
	};
	data = {
		...data,
		name: aliases[data.name] || data.name
	};
	let key = cleanKey(data.key);
	const cloudflareName = data.name === "Cloudflare" || data.name === "Cloudflare Token" || data.name === "Cloudflare Account";
	if (!key && !cloudflareName) return {
		ok: false,
		checked: false,
		text: "No key is saved for this service."
	};
	const auth = { Authorization: `Bearer ${key}` };
	try {
		if (data.name === "OpenAI") return readBody(await timed(fetch("https://api.openai.com/v1/models", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Anthropic") return readBody(await timed(fetch("https://api.anthropic.com/v1/models", {
			headers: {
				"x-api-key": key,
				"anthropic-version": "2023-06-01"
			},
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "xAI") return readBody(await timed(fetch("https://api.x.ai/v1/models", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "NVIDIA") return readBody(await timed(fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
			method: "POST",
			headers: {
				...auth,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				model: "openai/gpt-oss-20b",
				messages: [{
					role: "user",
					content: "hi"
				}],
				max_tokens: 1
			}),
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Groq") return readBody(await timed(fetch("https://api.groq.com/openai/v1/models", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "OpenRouter") return readBody(await timed(fetch("https://openrouter.ai/api/v1/key", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "DeepSeek") return readBody(await timed(fetch("https://api.deepseek.com/models", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Mistral") return readBody(await timed(fetch("https://api.mistral.ai/v1/models", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "ElevenLabs") return readBody(await timed(fetch("https://api.elevenlabs.io/v1/user", {
			headers: { "xi-api-key": key },
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "YouTube" || data.name === "Google Maps") {
			const path = data.name === "YouTube" ? `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=music&key=${encodeURIComponent(key)}` : `https://maps.googleapis.com/maps/api/geocode/json?address=Atlanta&key=${encodeURIComponent(key)}`;
			const response = await timed(fetch(path, {
				headers: {
					Referer: "https://ceogps.com/",
					Origin: "https://ceogps.com"
				},
				signal: AbortSignal.timeout(7e3)
			}));
			const raw = await response.text();
			if (data.name === "Google Maps") {
				let body = {};
				try {
					body = JSON.parse(raw);
				} catch {}
				if (body.status === "OK" || body.status === "ZERO_RESULTS") return {
					ok: true,
					checked: true,
					text: "The service accepted the key."
				};
				return {
					ok: false,
					checked: true,
					text: body.error_message || "Google Maps refused the key."
				};
			}
			const checked = await readBody(new Response(raw, {
				status: response.status,
				headers: response.headers
			}));
			if (checked.ok || !/referer/i.test(checked.text)) return checked;
			return {
				ok: false,
				checked: true,
				text: "Google refused this key for chrisgr33ninc@gmail.com. In Google Cloud, on that account, allow https://ceogps.com/* for this key."
			};
		}
		if (data.name === "Stripe") return readBody(await timed(fetch("https://api.stripe.com/v1/balance", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Replicate") return readBody(await timed(fetch("https://api.replicate.com/v1/account", {
			headers: { Authorization: `Token ${key}` },
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Luma") {
			const headers = {
				Authorization: `Bearer ${key}`,
				Accept: "application/json"
			};
			const agents = await readBody(await timed(fetch("https://agents.lumalabs.ai/v1/generations/00000000-0000-0000-0000-000000000000", {
				headers,
				signal: AbortSignal.timeout(8e3)
			})));
			if (agents.ok || /generation not found/i.test(agents.text)) return {
				ok: true,
				checked: true,
				text: "The service accepted the key."
			};
			if ((await readBody(await timed(fetch("https://api.lumalabs.ai/dream-machine/v1/generations?limit=1", {
				headers,
				signal: AbortSignal.timeout(8e3)
			})))).ok) return {
				ok: true,
				checked: true,
				text: "The service accepted the key."
			};
			return {
				ok: false,
				checked: true,
				text: agents.text || "Luma refused the key."
			};
		}
		if (data.name === "Telegram") return readBody(await timed(fetch(`https://api.telegram.org/bot${key}/getMe`, { signal: AbortSignal.timeout(8e3) })));
		if (data.name === "SendGrid") return readBody(await timed(fetch("https://api.sendgrid.com/v3/scopes", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Hugging Face") return readBody(await timed(fetch("https://huggingface.co/api/whoami-v2", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Nylas") return readBody(await timed(fetch("https://api.us.nylas.com/v3/grants?limit=1", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Google AI (Gemini)") return readBody(await timed(fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(8e3) })));
		if (data.name === "GitHub") return readBody(await timed(fetch("https://api.github.com/user", {
			headers: {
				...auth,
				"User-Agent": "LifeOS",
				Accept: "application/vnd.github+json"
			},
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Vercel") return readBody(await timed(fetch("https://api.vercel.com/v2/user", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Cloudflare Account" && /^[a-f0-9]{32}$/i.test(key)) return {
			ok: true,
			checked: true,
			text: "Account id saved."
		};
		if (data.name === "Cloudflare Token" || data.name === "Cloudflare" || data.name === "Cloudflare Account") {
			const bag = await envBag();
			const accountId = bag.CLOUDFLARE_ACCOUNT_ID || "4cb5c0d8553b8c0c9156ee4f2bad9e6f";
			const candidates = [...new Set([
				key,
				bag.CLOUDFLARE_ACCOUNT_API_TOKEN,
				bag.CLOUDFLARE_API_TOKEN
			].map((item) => (item || "").trim()).filter(Boolean))];
			let last = "Cloudflare refused the token.";
			for (const candidate of candidates) {
				const verified = await readBody(await timed(fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
					headers: { Authorization: `Bearer ${candidate}` },
					signal: AbortSignal.timeout(7e3)
				})));
				if (verified.ok) return {
					...verified,
					text: "The Cloudflare token was accepted."
				};
				const account = await readBody(await timed(fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}`, {
					headers: { Authorization: `Bearer ${candidate}` },
					signal: AbortSignal.timeout(7e3)
				})));
				if (account.ok) return {
					ok: true,
					checked: true,
					text: "Connected to the CEO GPS Cloudflare account."
				};
				last = account.text || verified.text;
			}
			return {
				ok: false,
				checked: true,
				text: last
			};
		}
		if (data.name === "Airtable") return readBody(await timed(fetch("https://api.airtable.com/v0/meta/whoami", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Brevo") return readBody(await timed(fetch("https://api.brevo.com/v3/account", {
			headers: { "api-key": key },
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Browserbase") return readBody(await timed(fetch("https://api.browserbase.com/v1/projects", {
			headers: { "X-BB-API-Key": key },
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "ClickUp") return readBody(await timed(fetch("https://api.clickup.com/api/v2/user", {
			headers: { Authorization: key },
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Dropbox") return readBody(await timed(fetch("https://api.dropboxapi.com/2/users/get_current_account", {
			method: "POST",
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Notion") return readBody(await timed(fetch("https://api.notion.com/v1/users/me", {
			headers: {
				...auth,
				"Notion-Version": "2022-06-28"
			},
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Linear") return readBody(await timed(fetch("https://api.linear.app/graphql", {
			method: "POST",
			headers: {
				...auth,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ query: "{ viewer { id } }" }),
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Stability AI") return readBody(await timed(fetch("https://api.stability.ai/v1/user/account", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Slack") return readBody(await timed(fetch("https://slack.com/api/auth.test", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "X") return readBody(await timed(fetch("https://api.x.com/2/users/me", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Jotform") return readBody(await timed(fetch(`https://api.jotform.com/user?apiKey=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(8e3) })));
		if (data.name === "Ollama (local)") return readBody(await timed(fetch("https://ollama.com/api/tags", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Qwen") return readBody(await timed(fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/models", {
			headers: auth,
			signal: AbortSignal.timeout(8e3)
		})));
		if (data.name === "Runwav") return readBody(await timed(fetch("https://api.dev.runwayml.com/v1/tasks?pageSize=1", {
			headers: {
				...auth,
				"X-Runway-Version": "2024-11-06"
			},
			signal: AbortSignal.timeout(8e3)
		})));
		return {
			ok: true,
			checked: false,
			text: "Saved. This service has no public check."
		};
	} catch (error) {
		return {
			ok: false,
			checked: true,
			text: error instanceof Error ? error.message : "The service did not answer."
		};
	}
}
var probeKey = createServerFn({ method: "POST" }).validator((input) => ({
	name: String(input?.name || "").slice(0, 80),
	key: String(input?.key || "").trim().slice(0, 2e3),
	email: String(input?.email || "").slice(0, 300)
})).handler(createSsrRpc("e4c56ba0b714b6c7066344894e4bcef8177cf2d3647e2c1b6fdb6aeb0188f52e"));
var pullInbox = createServerFn({ method: "POST" }).validator((input) => ({
	nylasKey: String(input?.nylasKey || "").trim().slice(0, 400),
	googleToken: String(input?.googleToken || "").trim().slice(0, 4e3),
	googleTokens: Array.isArray(input?.googleTokens) ? input.googleTokens.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3) : []
})).handler(createSsrRpc("0e9cb9427dceee9f6c009b65d1eb1bddceda05330892c5f594a5b7dccdda7ff1"));
//#endregion
export { createSsrRpc as a, runProbe as i, env_keys_exports as n, runAccount as r, envValue as t };
