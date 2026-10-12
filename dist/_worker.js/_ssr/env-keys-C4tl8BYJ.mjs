import { t as SERVICE_ENV } from "./sheet-keys-BStVnMff.mjs";
import { n as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CN-evIEF.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/env-keys-C4tl8BYJ.js
async function envBag() {
	const bag = {};
	for (const [name, value] of Object.entries(processModule.env)) if (typeof value === "string" && value) bag[name] = value;
	return bag;
}
var loadEnvKeys_createServerFn_handler = createServerRpc({
	id: "8ff78e516a6c63ce079cabdeecfd0d70ebfa59af2acfadbbf0ec00ceb4e95bf2",
	name: "loadEnvKeys",
	filename: "src/lib/lifeos/env-keys.ts"
}, (opts) => loadEnvKeys.__executeServer(opts));
var loadEnvKeys = createServerFn({ method: "GET" }).handler(loadEnvKeys_createServerFn_handler, async () => {
	const bag = await envBag();
	const rows = [];
	for (const [name, aliases] of Object.entries(SERVICE_ENV)) {
		const value = aliases.map((alias) => bag[alias]?.trim() || "").find(Boolean);
		if (value) rows.push({
			name,
			value: value.slice(0, 400)
		});
	}
	return rows;
});
var pullWithKey_createServerFn_handler = createServerRpc({
	id: "bc9410430ad17d721e558e93ff8e59fefa97da3dc3f5561ab58987406761e1be",
	name: "pullWithKey",
	filename: "src/lib/lifeos/env-keys.ts"
}, (opts) => pullWithKey.__executeServer(opts));
var pullWithKey = createServerFn({ method: "POST" }).validator((input) => ({
	name: String(input?.name || "").slice(0, 40),
	key: String(input?.key || "").trim().slice(0, 400)
})).handler(pullWithKey_createServerFn_handler, async ({ data }) => {
	if (!data.key) return {
		ok: false,
		text: "No key saved."
	};
	try {
		if (data.name === "Stripe") {
			const response = await fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${data.key}` } });
			const body = await response.json();
			if (!response.ok) return {
				ok: false,
				text: body.error?.message || "Stripe refused the key."
			};
			const row = body.available?.[0];
			return {
				ok: true,
				text: row ? `${row.currency.toUpperCase()} ${(row.amount / 100).toFixed(2)} available` : "Stripe connected. No available balance.",
				balance: row ? row.amount / 100 : 0
			};
		}
		if (data.name === "Nylas") {
			const grants = await fetch("https://api.us.nylas.com/v3/grants?limit=5", { headers: {
				Authorization: `Bearer ${data.key}`,
				Accept: "application/json"
			} });
			const body = await grants.json();
			if (!grants.ok) return {
				ok: false,
				text: body.error?.message || "Nylas refused the key."
			};
			const grant = body.data?.[0];
			if (!grant) return {
				ok: true,
				text: "Nylas key accepted. No grant is connected."
			};
			const mail = await (await fetch(`https://api.us.nylas.com/v3/grants/${grant.id}/messages?limit=5`, { headers: {
				Authorization: `Bearer ${data.key}`,
				Accept: "application/json"
			} })).json();
			return {
				ok: true,
				text: `${grant.email || "Grant"} · ${mail.data?.length || 0} recent messages`,
				messages: (mail.data || []).map((row) => ({
					title: row.subject || "No subject",
					body: row.snippet || "",
					at: row.date ? (/* @__PURE__ */ new Date(row.date * 1e3)).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
				}))
			};
		}
		if (data.name === "YouTube") {
			const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=atlanta&key=${encodeURIComponent(data.key)}`);
			const body = await response.json();
			if (!response.ok) return {
				ok: false,
				text: body.error?.message || "YouTube refused the key."
			};
			return {
				ok: true,
				text: `${body.items?.length || 0} videos`,
				videos: (body.items || []).map((row) => ({
					title: row.snippet?.title || "Video",
					href: `https://www.youtube.com/watch?v=${row.id?.videoId || ""}`
				})).filter((row) => row.href.includes("v="))
			};
		}
		if (data.name === "ElevenLabs") {
			const response = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": data.key } });
			const body = await response.json();
			if (!response.ok) return {
				ok: false,
				text: body.detail?.message || "ElevenLabs refused the key."
			};
			return {
				ok: true,
				text: (body.voices || []).slice(0, 6).map((row) => row.name).join(", ") || "No voices"
			};
		}
		return {
			ok: true,
			text: "Key is loaded. This service has no live pull yet."
		};
	} catch (error) {
		return {
			ok: false,
			text: error instanceof Error ? error.message : "Pull failed."
		};
	}
});
function asTrack(row) {
	return {
		id: row.id || "",
		title: row.name || "Track",
		artist: (row.artists || []).map((item) => item.name || "").filter(Boolean).join(", "),
		album: row.album?.name || "",
		url: row.external_urls?.spotify || "",
		preview: row.preview_url || "",
		art: row.album?.images?.[0]?.url || ""
	};
}
var spotifyHub_createServerFn_handler = createServerRpc({
	id: "28d925ed35b526718e29db73e934d0ddcffcda58fd4999b33c529493bb08712c",
	name: "spotifyHub",
	filename: "src/lib/lifeos/env-keys.ts"
}, (opts) => spotifyHub.__executeServer(opts));
var spotifyHub = createServerFn({ method: "POST" }).validator((input) => ({
	token: String(input?.token || "").trim().slice(0, 4e3),
	action: input?.action === "search" ? "search" : "home",
	query: String(input?.query || "").trim().slice(0, 120)
})).handler(spotifyHub_createServerFn_handler, async ({ data }) => {
	const empty = {
		ok: false,
		error: "",
		tracks: [],
		playlists: [],
		now: ""
	};
	if (!data.token && data.action !== "search") return {
		...empty,
		error: "Connect Spotify in Integrations."
	};
	let token = data.token;
	if (!token) {
		const bag = await envBag();
		const id = bag.SPOTIFY_CLIENT_ID || bag.VITE_SPOTIFY_CLIENT_ID || "";
		const secret = bag.SPOTIFY_CLIENT_SECRET || "";
		if (id && secret) token = (await (await fetch("https://accounts.spotify.com/api/token", {
			method: "POST",
			headers: {
				Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
				"Content-Type": "application/x-www-form-urlencoded"
			},
			body: "grant_type=client_credentials"
		})).json()).access_token || "";
	}
	if (!token && data.action === "search") return {
		ok: true,
		error: "Spotify search needs a connected account or Spotify client keys. Showing previews instead.",
		tracks: ((await (await fetch(`https://itunes.apple.com/search?entity=song&limit=12&term=${encodeURIComponent(data.query || "music")}`)).json()).results || []).map((row) => ({
			id: String(row.trackId || ""),
			title: row.trackName || "Track",
			artist: row.artistName || "",
			album: row.collectionName || "",
			url: row.trackViewUrl || "",
			preview: row.previewUrl || "",
			art: row.artworkUrl100 || ""
		})),
		playlists: [],
		now: ""
	};
	if (!token) return {
		...empty,
		error: "Connect Spotify in Integrations."
	};
	const headers = { Authorization: `Bearer ${token}` };
	const pull = async (path) => {
		const response = await fetch(`https://api.spotify.com/v1${path}`, { headers });
		const body = await response.json();
		return {
			ok: response.ok,
			body
		};
	};
	if (data.action === "search") {
		const result = await pull(`/search?type=track,album&limit=12&market=US&q=${encodeURIComponent(data.query || "music")}`);
		if (!result.ok) return {
			...empty,
			error: result.body.error?.message || "Spotify refused the search. Reconnect it in Integrations."
		};
		const body = result.body;
		const tracks = (body.tracks?.items || []).map(asTrack);
		const albums = (body.albums?.items || []).map((row) => ({
			id: row.id || "",
			title: row.name || "Album",
			artist: (row.artists || []).map((item) => item.name || "").filter(Boolean).join(", "),
			album: "Album",
			url: row.external_urls?.spotify || "",
			preview: "",
			art: row.images?.[0]?.url || ""
		}));
		return {
			ok: true,
			error: tracks.length || albums.length ? "Spotify results" : "No Spotify matches.",
			tracks: [...tracks, ...albums],
			playlists: [],
			now: ""
		};
	}
	const [lists, top, recent, playing] = await Promise.all([
		pull("/me/playlists?limit=20"),
		pull("/me/top/tracks?limit=8"),
		pull("/me/player/recently-played?limit=8"),
		pull("/me/player/currently-playing")
	]);
	if (!lists.ok && !top.ok) return {
		...empty,
		error: lists.body.error?.message || "Reconnect Spotify in Integrations so the library can load."
	};
	const playlists = (lists.body.items || []).map((row) => ({
		id: row.id || "",
		name: row.name || "Playlist",
		url: row.external_urls?.spotify || ""
	}));
	const topTracks = (top.body.items || []).map(asTrack);
	const recentTracks = (recent.body.items || []).map((row) => asTrack(row.track || {}));
	const current = playing.body.item;
	const now = current ? `${current.name || "Track"} · ${(current.artists || []).map((item) => item.name).filter(Boolean).join(", ")}` : "";
	const seen = /* @__PURE__ */ new Set();
	return {
		ok: true,
		error: "",
		tracks: [
			...current ? [asTrack(current)] : [],
			...recentTracks,
			...topTracks
		].filter((row) => {
			if (!row.title || seen.has(row.id || row.title)) return false;
			seen.add(row.id || row.title);
			return true;
		}),
		playlists,
		now
	};
});
var pullProvider_createServerFn_handler = createServerRpc({
	id: "254a50e3b12d7bcd8fb6becd187b92a02964cdeff36ea7e10abb329713a1080c",
	name: "pullProvider",
	filename: "src/lib/lifeos/env-keys.ts"
}, (opts) => pullProvider.__executeServer(opts));
var pullProvider = createServerFn({ method: "POST" }).validator((input) => ({
	provider: String(input?.provider || "").slice(0, 20),
	token: String(input?.token || "").trim().slice(0, 4e3)
})).handler(pullProvider_createServerFn_handler, async ({ data }) => {
	if (!data.token) return {
		ok: false,
		text: "Not connected."
	};
	const headers = { Authorization: `Bearer ${data.token}` };
	try {
		if (data.provider === "google") {
			const [who, calendar] = await Promise.all([fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers }), fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=5&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent((/* @__PURE__ */ new Date()).toISOString())}`, { headers })]);
			const profile = await who.json();
			const events = await calendar.json();
			if (!who.ok) return {
				ok: false,
				text: profile.error?.message || "Google refused the session."
			};
			return {
				ok: true,
				text: `${profile.name || profile.email || "Google"} · ${events.items?.length || 0} upcoming events`,
				events: (events.items || []).map((item) => ({
					title: item.summary || "Event",
					when: item.start?.dateTime || item.start?.date || ""
				}))
			};
		}
		if (data.provider === "discord") {
			const response = await fetch("https://discord.com/api/users/@me", { headers });
			const profile = await response.json();
			if (!response.ok) return {
				ok: false,
				text: profile.message || "Discord refused the session."
			};
			return {
				ok: true,
				text: [profile.global_name || profile.username, profile.email].filter(Boolean).join(" · ") || "Discord connected"
			};
		}
		if (data.provider === "facebook") {
			const response = await fetch("https://graph.facebook.com/me?fields=id,name,email", { headers });
			const profile = await response.json();
			if (!response.ok) return {
				ok: false,
				text: profile.error?.message || "Facebook refused the session."
			};
			return {
				ok: true,
				text: [profile.name, profile.email].filter(Boolean).join(" · ") || "Facebook connected"
			};
		}
		const [me, top] = await Promise.all([fetch("https://api.spotify.com/v1/me", { headers }), fetch("https://api.spotify.com/v1/me/top/tracks?limit=5", { headers })]);
		const profile = await me.json();
		const tracks = await top.json();
		if (!me.ok) return {
			ok: false,
			text: profile.error?.message || "Spotify refused the session."
		};
		return {
			ok: true,
			text: `${profile.display_name || profile.email || "Spotify"} · ${tracks.items?.length || 0} top tracks`,
			tracks: (tracks.items || []).map((item) => ({
				title: item.name,
				url: item.external_urls?.spotify || ""
			}))
		};
	} catch (error) {
		return {
			ok: false,
			text: error instanceof Error ? error.message : "Pull failed."
		};
	}
});
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
var connectAccount_createServerFn_handler = createServerRpc({
	id: "243ef87da392b13a51419654ed3183f34813a44c2f8a6d45d6171eff96ad90c0",
	name: "connectAccount",
	filename: "src/lib/lifeos/env-keys.ts"
}, (opts) => connectAccount.__executeServer(opts));
var connectAccount = createServerFn({ method: "POST" }).validator((input) => ({
	service: String(input?.service || "").slice(0, 40),
	token: String(input?.token || "").slice(0, 4e3),
	key: String(input?.key || "").trim().slice(0, 400),
	secret: String(input?.secret || "").trim().slice(0, 400),
	site: String(input?.site || "").trim().slice(0, 200)
})).handler(connectAccount_createServerFn_handler, async ({ data }) => runAccount(data));
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
var probeKey_createServerFn_handler = createServerRpc({
	id: "e4c56ba0b714b6c7066344894e4bcef8177cf2d3647e2c1b6fdb6aeb0188f52e",
	name: "probeKey",
	filename: "src/lib/lifeos/env-keys.ts"
}, (opts) => probeKey.__executeServer(opts));
var probeKey = createServerFn({ method: "POST" }).validator((input) => ({
	name: String(input?.name || "").slice(0, 80),
	key: String(input?.key || "").trim().slice(0, 2e3),
	email: String(input?.email || "").slice(0, 300)
})).handler(probeKey_createServerFn_handler, async ({ data }) => runProbe(data));
function nylasFolder(folders) {
	const names = folders.map((name) => name.toUpperCase());
	if (names.some((name) => name.includes("TRASH") || name.includes("DELETED"))) return "trash";
	if (names.some((name) => name.includes("SPAM") || name.includes("JUNK"))) return "spam";
	if (names.some((name) => name.includes("DRAFT"))) return "drafts";
	if (names.some((name) => name.includes("SENT"))) return "sent";
	if (names.some((name) => name === "INBOX" || name.endsWith("/INBOX"))) return "inbox";
	if (names.some((name) => name.includes("ARCHIVE"))) return "archive";
	return "inbox";
}
function gmailFolder(labels) {
	const starred = labels.includes("STARRED");
	if (labels.includes("TRASH")) return {
		folder: "trash",
		starred
	};
	if (labels.includes("SPAM")) return {
		folder: "spam",
		starred
	};
	if (labels.includes("DRAFT")) return {
		folder: "drafts",
		starred
	};
	if (labels.includes("SENT")) return {
		folder: "sent",
		starred
	};
	return {
		folder: "inbox",
		starred
	};
}
var pullInbox_createServerFn_handler = createServerRpc({
	id: "0e9cb9427dceee9f6c009b65d1eb1bddceda05330892c5f594a5b7dccdda7ff1",
	name: "pullInbox",
	filename: "src/lib/lifeos/env-keys.ts"
}, (opts) => pullInbox.__executeServer(opts));
var pullInbox = createServerFn({ method: "POST" }).validator((input) => ({
	nylasKey: String(input?.nylasKey || "").trim().slice(0, 400),
	googleToken: String(input?.googleToken || "").trim().slice(0, 4e3),
	googleTokens: Array.isArray(input?.googleTokens) ? input.googleTokens.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3) : []
})).handler(pullInbox_createServerFn_handler, async ({ data }) => {
	const messages = [];
	const accounts = [];
	const notes = [];
	const bag = await envBag();
	const apiKey = (data.nylasKey.startsWith("nyk_") ? data.nylasKey : "") || bag.NYLAS_API_KEY || "";
	const grants = [...new Set([
		bag.NYLAS_GRANT_KEY_CEOGPS,
		bag.NYLAS_GRANT_KEY_CAGEDNREALITY,
		bag.NYLAS_GRANT_KEY_CHRISGR33NINC,
		data.nylasKey && !data.nylasKey.startsWith("nyk_") ? data.nylasKey : ""
	].map((id) => String(id || "").trim()).filter(Boolean))];
	if (apiKey) {
		const headers = {
			Authorization: `Bearer ${apiKey}`,
			Accept: "application/json"
		};
		let ids = grants;
		if (!ids.length) {
			const listed = await fetch("https://api.us.nylas.com/v3/grants?limit=8", { headers });
			const body = await listed.json();
			if (!listed.ok) notes.push(body.error?.message || "Nylas refused the key.");
			else ids = (body.data || []).map((row) => row.id);
		}
		for (const id of ids.slice(0, 6)) {
			const response = await fetch(`https://api.us.nylas.com/v3/grants/${encodeURIComponent(id)}/messages?limit=20`, { headers });
			const body = await response.json();
			if (!response.ok) {
				notes.push(body.error?.message || `Nylas grant ${id.slice(0, 8)} refused.`);
				continue;
			}
			const owner = (body.data || []).map((row) => (row.to || []).map((item) => item.email).find(Boolean) || "").find(Boolean) || "";
			if (owner) accounts.push({
				email: owner,
				name: owner,
				provider: "imap"
			});
			for (const row of body.data || []) {
				const from = (row.from || []).map((item) => item.email || item.name || "").filter(Boolean).join(", ");
				const to = (row.to || []).map((item) => item.email || item.name || "").filter(Boolean).join(", ");
				messages.push({
					id: `nylas:${row.id || `${id}:${row.date || row.subject}`}`,
					title: row.subject || "No subject",
					body: row.snippet || "",
					at: row.date ? (/* @__PURE__ */ new Date(row.date * 1e3)).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
					folder: nylasFolder(row.folders || []),
					from,
					to,
					starred: (row.folders || []).some((name) => name.toUpperCase().includes("STAR")),
					account: owner || to || from
				});
			}
		}
		notes.push(ids.length ? `Nylas ${ids.length} mailbox${ids.length === 1 ? "" : "es"}.` : "Nylas key is set, but no grant is connected.");
	} else notes.push("Nylas key is not on the server.");
	const googleTokens = [...new Set([data.googleToken, ...data.googleTokens].map((item) => item.trim()).filter(Boolean))];
	if (!googleTokens.length) notes.push("Google is not connected. Connect chrisgr33ninc@gmail.com.");
	for (const googleToken of googleTokens) {
		const headers = { Authorization: `Bearer ${googleToken}` };
		const who = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers });
		const profile = await who.json();
		if (!who.ok) notes.push(profile.error?.message || "Google refused the session. Reconnect it in Integrations.");
		else {
			const email = (profile.email || "").toLowerCase();
			if (!["chrisgr33ninc@gmail.com"].includes(email)) notes.push(`Google is signed in as ${profile.email || "another account"}. Use chrisgr33ninc@gmail.com.`);
			else {
				if (profile.email) accounts.push({
					email: profile.email,
					name: profile.name || profile.email,
					provider: "gmail"
				});
				const list = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20", { headers });
				const listed = await list.json();
				if (!list.ok) notes.push(listed.error?.message || "Gmail refused the session. Reconnect Google so mail can be read.");
				else {
					const rows = await Promise.all((listed.messages || []).map(async (item) => {
						const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=To`, { headers });
						if (!response.ok) return null;
						const mail = await response.json();
						const header = (name) => mail.payload?.headers?.find((row) => row.name.toLowerCase() === name.toLowerCase())?.value || "";
						const place = gmailFolder(mail.labelIds || []);
						return {
							id: `gmail:${email}:${mail.id || item.id}`,
							title: header("Subject") || "No subject",
							body: mail.snippet || "",
							at: mail.internalDate ? new Date(Number(mail.internalDate)).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
							folder: place.folder,
							from: header("From"),
							to: header("To") || profile.email || "",
							starred: place.starred,
							account: profile.email || "Gmail"
						};
					}));
					messages.push(...rows.filter((row) => Boolean(row)));
					notes.push(`Gmail ${rows.filter(Boolean).length} messages.`);
				}
			}
		}
	}
	return {
		ok: messages.length > 0,
		text: notes.join(" "),
		messages,
		accounts
	};
});
//#endregion
export { connectAccount_createServerFn_handler, loadEnvKeys_createServerFn_handler, probeKey_createServerFn_handler, pullInbox_createServerFn_handler, pullProvider_createServerFn_handler, pullWithKey_createServerFn_handler, spotifyHub_createServerFn_handler };
