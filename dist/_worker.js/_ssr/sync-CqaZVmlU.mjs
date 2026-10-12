import { n as createServerFn } from "./ssr.mjs";
import { n as getSql } from "./db-DLdCUXMr.mjs";
import { t as createServerRpc } from "./createServerRpc-CN-evIEF.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/sync-CqaZVmlU.js
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function device(value) {
	const id = String(value || "").trim();
	if (!UUID.test(id)) throw new Error("bad device");
	return id;
}
var pullBoard_createServerFn_handler = createServerRpc({
	id: "9cfd941d8bd78387fd8ebfd76a9afcdc28769fb6babc222e81c215898baad78d",
	name: "pullBoard",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => pullBoard.__executeServer(opts));
var pullBoard = createServerFn({ method: "POST" }).validator((id) => device(id)).handler(pullBoard_createServerFn_handler, async ({ data }) => {
	const rows = await (await getSql())`
      select payload, updated_at from life_board where user_id = ${data}
    `;
	if (!rows[0]) return null;
	return {
		payload: rows[0].payload,
		at: new Date(rows[0].updated_at).getTime()
	};
});
var pushBoard_createServerFn_handler = createServerRpc({
	id: "e9d0e0346919adc719a37f581ec9395ad24ad1eb656a639fc7e8b18935b9e094",
	name: "pushBoard",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => pushBoard.__executeServer(opts));
var pushBoard = createServerFn({ method: "POST" }).validator((input) => {
	const id = device(input?.device);
	const payload = String(input?.payload || "");
	if (payload.length > 9e5) throw new Error("Board is too large");
	const parsed = JSON.parse(payload);
	delete parsed.keys;
	delete parsed.vault;
	return {
		id,
		payload: JSON.stringify(parsed)
	};
}).handler(pushBoard_createServerFn_handler, async ({ data }) => {
	await (await getSql())`
      insert into life_board (user_id, payload, updated_at)
      values (${data.id}, ${data.payload}, now())
      on conflict (user_id) do update
      set payload = excluded.payload, updated_at = now()
    `;
	return {
		ok: true,
		at: Date.now()
	};
});
var askNyx_createServerFn_handler = createServerRpc({
	id: "be998f075e8d8075f9256b47a873c47f348a89d05e1a44a2b1d2fda9bdde3b96",
	name: "askNyx",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => askNyx.__executeServer(opts));
var askNyx = createServerFn({ method: "POST" }).validator((input) => {
	const question = String(input?.question || "").trim().slice(0, 4e3);
	const facts = String(input?.facts || "").slice(0, 96e3);
	if (!question) throw new Error("question required");
	return {
		question,
		facts,
		mind: input?.mind === "nvidia" || input?.mind === "openai" ? input.mind : "grok",
		name: String(input?.name || "Nyx").slice(0, 24),
		prompt: String(input?.prompt || "").slice(0, 2400),
		key: String(input?.key || "").trim().slice(0, 400),
		model: String(input?.model || "").trim().slice(0, 80)
	};
}).handler(askNyx_createServerFn_handler, async ({ data }) => {
	const messages = [{
		role: "system",
		content: data.prompt || `You are ${data.name}, the LifeOS assistant. Use only the facts given. If a fact is missing, say it is not on the board. Never invent names, balances, times, or lead statuses.`
	}, {
		role: "user",
		content: data.facts ? `Facts:\n${data.facts}\n\nQuestion: ${data.question}` : data.question
	}];
	if (data.key && data.model) {
		const keyed = await askKeyed(data.model, data.key, messages);
		if (keyed) return {
			ok: true,
			text: keyed.slice(0, 6e3),
			mind: data.model
		};
	}
	const order = [
		data.mind,
		"grok",
		"nvidia",
		"openai"
	].filter((mind, index, list) => list.indexOf(mind) === index);
	for (const mind of order) {
		const text = await askMind(mind, messages);
		if (text) return {
			ok: true,
			text: text.slice(0, 6e3),
			mind
		};
	}
	return {
		ok: false,
		text: "",
		mind: data.mind
	};
});
async function complete(url, headers, body) {
	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...headers
		},
		body: JSON.stringify(body)
	});
	if (!res.ok) return "";
	const json = await res.json();
	return json.choices?.[0]?.message?.content || json.content?.[0]?.text || json.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
async function askKeyed(model, key, messages) {
	try {
		const id = model.toLowerCase();
		const system = messages.find((row) => row.role === "system")?.content || "";
		const rest = messages.filter((row) => row.role !== "system");
		if (id.startsWith("claude")) return await complete("https://api.anthropic.com/v1/messages", {
			"x-api-key": key,
			"anthropic-version": "2023-06-01"
		}, {
			model,
			max_tokens: 600,
			system,
			messages: rest
		});
		if (id.startsWith("gemini")) return await complete(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {}, {
			system_instruction: { parts: [{ text: system }] },
			contents: rest.map((row) => ({
				role: row.role === "assistant" ? "model" : "user",
				parts: [{ text: row.content }]
			}))
		});
		const openai = (url, picked = model) => complete(url, { Authorization: `Bearer ${key}` }, {
			model: picked,
			max_tokens: 600,
			temperature: .4,
			messages
		});
		if (id.includes("grok")) return await openai("https://api.x.ai/v1/chat/completions");
		if (id.startsWith("gpt") || id.startsWith("o1") || id.startsWith("o3") || id.startsWith("o4")) return await openai("https://api.openai.com/v1/chat/completions");
		if (id.startsWith("llama") || id.includes("groq")) return await openai("https://api.groq.com/openai/v1/chat/completions", id.includes("/") ? model : "llama-3.3-70b-versatile");
		if (id.startsWith("deepseek")) return await openai("https://api.deepseek.com/chat/completions");
		if (id.startsWith("mistral")) return await openai("https://api.mistral.ai/v1/chat/completions");
		if (id.includes("nvidia") || id.includes("nemotron") || id.startsWith("openai/")) return await openai("https://integrate.api.nvidia.com/v1/chat/completions");
		if (id.includes("/")) return await openai("https://openrouter.ai/api/v1/chat/completions");
		return "";
	} catch {
		return "";
	}
}
async function askMind(mind, messages) {
	try {
		if (mind === "nvidia") {
			const key = processModule.env.NVIDIA_API_KEY || processModule.env.NVAPI_KEY || "";
			if (!key) return "";
			const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${key}`
				},
				body: JSON.stringify({
					model: "openai/gpt-oss-20b",
					max_tokens: 400,
					temperature: .3,
					messages
				})
			});
			if (!res.ok) return "";
			return (await res.json()).choices?.[0]?.message?.content || "";
		}
		if (mind === "openai") {
			const key = processModule.env.OPENAI_API_KEY || "";
			if (!key) return "";
			const res = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${key}`
				},
				body: JSON.stringify({
					model: "gpt-4o-mini",
					max_tokens: 400,
					temperature: .3,
					messages
				})
			});
			if (!res.ok) return "";
			return (await res.json()).choices?.[0]?.message?.content || "";
		}
		const key = processModule.env.XAI_API_KEY || processModule.env.GROK_API_KEY || "";
		if (!key) return "";
		const res = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${key}`
			},
			body: JSON.stringify({
				model: "grok-4.5",
				max_tokens: 400,
				temperature: .3,
				messages
			})
		});
		if (!res.ok) return "";
		return (await res.json()).choices?.[0]?.message?.content || "";
	} catch {
		return "";
	}
}
var speakVoice_createServerFn_handler = createServerRpc({
	id: "e58b3eddb041f4d9d956847f2ba9cb9d1a5fc19f8e2f9a60c18e299d98e7229c",
	name: "speakVoice",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => speakVoice.__executeServer(opts));
var speakVoice = createServerFn({ method: "POST" }).validator((input) => ({
	text: String(input?.text || "").trim().slice(0, 500),
	key: String(input?.key || "").trim().slice(0, 400),
	voice: String(input?.voice || "").trim().slice(0, 80)
})).handler(speakVoice_createServerFn_handler, async ({ data }) => {
	const key = data.key || processModule.env.ELEVENLABS_API_KEY || processModule.env.ELEVEN_API_KEY || "";
	const voice = data.voice || "EXAVITQu4vr4xnSDxMaL";
	if (!key || !data.text) return {
		ok: false,
		audio: ""
	};
	for (const model_id of [
		"eleven_turbo_v2_5",
		"eleven_multilingual_v2",
		"eleven_flash_v2_5"
	]) {
		const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
			method: "POST",
			headers: {
				"xi-api-key": key,
				"Content-Type": "application/json",
				Accept: "audio/mpeg"
			},
			body: JSON.stringify({
				text: data.text,
				model_id
			})
		});
		if (!res.ok) continue;
		const bytes = new Uint8Array(await res.arrayBuffer());
		let binary = "";
		for (let index = 0; index < bytes.length; index += 32768) binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
		return {
			ok: true,
			audio: btoa(binary)
		};
	}
	return {
		ok: false,
		audio: ""
	};
});
var cloneVoice_createServerFn_handler = createServerRpc({
	id: "73684b61ea46f70be74bae3b953b25b6a70fb4f2055e206dd4df709b737bc0e2",
	name: "cloneVoice",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => cloneVoice.__executeServer(opts));
var cloneVoice = createServerFn({ method: "POST" }).validator((input) => ({
	name: String(input?.name || "").trim().slice(0, 40),
	audio: String(input?.audio || "").slice(0, 8e6),
	type: String(input?.type || "audio/mpeg").slice(0, 60),
	key: String(input?.key || "").trim().slice(0, 400)
})).handler(cloneVoice_createServerFn_handler, async ({ data }) => {
	const key = data.key || processModule.env.ELEVENLABS_API_KEY || processModule.env.ELEVEN_API_KEY || "";
	if (!key) return {
		ok: false,
		id: "",
		text: "No ElevenLabs key is saved."
	};
	if (!data.name || data.audio.length < 1e3) return {
		ok: false,
		id: "",
		text: "Add a name and a clear audio sample."
	};
	const bytes = Uint8Array.from(atob(data.audio), (char) => char.charCodeAt(0));
	const form = new FormData();
	form.set("name", data.name);
	form.set("description", "LifeOS instant clone");
	const ext = data.type.includes("wav") ? "wav" : data.type.includes("mp4") || data.type.includes("m4a") ? "m4a" : "mp3";
	form.set("files", new Blob([bytes], { type: data.type || "audio/mpeg" }), `sample.${ext}`);
	const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
		method: "POST",
		headers: { "xi-api-key": key },
		body: form
	});
	const body = await res.json().catch(() => ({}));
	const detail = typeof body.detail === "string" ? body.detail : body.detail?.message;
	if (!res.ok || !body.voice_id) return {
		ok: false,
		id: "",
		text: detail || "ElevenLabs refused the clone. Instant cloning has to be on for this key."
	};
	return {
		ok: true,
		id: body.voice_id,
		text: "Clone ready."
	};
});
function songSections(lyrics, style) {
	const styles = style.split(",").map((part) => part.trim()).filter(Boolean).slice(0, 4);
	const positive = styles.length ? styles : ["studio recording", "clear lead vocal"];
	return lyrics.split(/\n(?=\[[^\]]+\])/).map((block) => block.trim()).filter(Boolean).slice(0, 6).map((block) => {
		const name = block.match(/^\[([^\]]+)\]/)?.[1] || "Verse";
		const lines = block.replace(/^\[[^\]]+\]\s*/, "").split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 10);
		return {
			section_name: name.slice(0, 40),
			positive_local_styles: positive,
			negative_local_styles: [
				"muddy mix",
				"off pitch",
				"spoken word"
			],
			duration_ms: /chorus|hook/i.test(name) ? 16e3 : 14e3,
			lines: lines.length ? lines : ["instrumental"]
		};
	});
}
var composeSong_createServerFn_handler = createServerRpc({
	id: "d73d2b54a81f1b75bc9256eb4ce9b725555d863cef2565a8e2a8aabfd4b7a040",
	name: "composeSong",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => composeSong.__executeServer(opts));
var composeSong = createServerFn({ method: "POST" }).validator((input) => ({
	title: String(input?.title || "").trim().slice(0, 80),
	style: String(input?.style || "").trim().slice(0, 240),
	lyrics: String(input?.lyrics || "").trim().slice(0, 2500),
	instrumental: Boolean(input?.instrumental),
	key: String(input?.key || "").trim().slice(0, 400),
	engine: input?.engine === "ace" ? "ace" : "eleven",
	replicate: String(input?.replicate || "").trim().slice(0, 400),
	job: String(input?.job || "").trim().slice(0, 80)
})).handler(composeSong_createServerFn_handler, async ({ data }) => {
	if (data.engine === "ace") return aceSong(data);
	return elevenSong(data);
});
async function audioBase64(url) {
	const file = await fetch(url, { signal: AbortSignal.timeout(2e4) });
	if (!file.ok) return "";
	const bytes = new Uint8Array(await file.arrayBuffer());
	if (bytes.length < 1e3 || bytes.length > 8e6) return "";
	let binary = "";
	for (let index = 0; index < bytes.length; index += 32768) binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
	return btoa(binary);
}
async function secret(name, ...alts) {
	for (const key of [name, ...alts]) {
		const live = processModule.env[key]?.trim();
		if (live) return live;
	}
	const { envValue } = await import("./env-keys-B504YYo8.mjs").then((n) => n.n);
	for (const key of [name, ...alts]) {
		const saved = (await envValue(key)).trim();
		if (saved) return saved;
	}
	return "";
}
async function aceSong(data) {
	const token = data.replicate || await secret("REPLICATE_API_TOKEN");
	if (!token) return {
		ok: false,
		audio: "",
		error: "Add a Replicate key. ACE-Step runs there.",
		job: ""
	};
	const headers = {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json"
	};
	const body = await (data.job ? await fetch(`https://api.replicate.com/v1/predictions/${data.job}`, {
		headers,
		signal: AbortSignal.timeout(2e4)
	}) : await fetch("https://api.replicate.com/v1/models/lucataco/ace-step/predictions", {
		method: "POST",
		headers: {
			...headers,
			Prefer: "wait=50"
		},
		signal: AbortSignal.timeout(55e3),
		body: JSON.stringify({ input: {
			tags: data.style || "modern pop, polished, studio",
			lyrics: data.instrumental ? "[instrumental]" : data.lyrics || "[instrumental]",
			duration: 48,
			number_of_steps: 36,
			seed: -1
		} })
	})).json().catch(() => ({}));
	const output = Array.isArray(body.output) ? body.output[0] : body.output;
	if (typeof output === "string" && /^https?:\/\//.test(output)) {
		const audio = await audioBase64(output);
		return audio ? {
			ok: true,
			audio,
			error: "",
			job: ""
		} : {
			ok: false,
			audio: "",
			error: "ACE-Step finished but the file could not be saved.",
			job: ""
		};
	}
	if (body.status === "starting" || body.status === "processing") return {
		ok: false,
		audio: "",
		error: "ACE-Step is still recording. Press Create again.",
		job: body.id || data.job
	};
	return {
		ok: false,
		audio: "",
		error: String(body.error || "ACE-Step did not make the song.").slice(0, 240),
		job: ""
	};
}
async function elevenSong(data) {
	const key = data.key || processModule.env.ELEVENLABS_API_KEY || processModule.env.ELEVEN_API_KEY || "";
	if (!key) return {
		ok: false,
		audio: "",
		error: "Add an ElevenLabs key. That is the song engine.",
		job: ""
	};
	const sections = data.instrumental ? [] : songSections(data.lyrics, data.style);
	const planned = !data.instrumental && sections.length ? { composition_plan: {
		positive_global_styles: [
			...data.style.split(",").map((part) => part.trim()).filter(Boolean),
			"polished studio mix",
			"radio vocal"
		].slice(0, 8),
		negative_global_styles: [
			"amateur recording",
			"muddy",
			"clipping",
			"monotone"
		],
		sections
	} } : {
		prompt: `${data.instrumental ? "Instrumental only, no vocals. " : "Full song with a lead vocal singing the words. "}Studio quality, tight arrangement, ${data.style || "modern pop"}. Title: ${data.title}. ${data.lyrics}`.slice(0, 4e3),
		music_length_ms: 48e3,
		force_instrumental: data.instrumental
	};
	async function call(body) {
		return fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
			method: "POST",
			headers: {
				"xi-api-key": key,
				"Content-Type": "application/json",
				Accept: "audio/mpeg"
			},
			body: JSON.stringify({
				model_id: "music_v2_5",
				...body
			}),
			signal: AbortSignal.timeout(55e3)
		});
	}
	let response = await call(planned);
	if (!response.ok && "composition_plan" in planned) response = await call({
		prompt: `Studio quality ${data.style || "pop"} song titled ${data.title}. A lead vocal sings these lyrics:\n${data.lyrics.slice(0, 1500)}`.slice(0, 4e3),
		music_length_ms: 48e3,
		force_instrumental: false
	});
	if (!response.ok) return {
		ok: false,
		audio: "",
		error: (await response.text().catch(() => "")).replace(/<[^>]+>/g, " ").slice(0, 240) || "ElevenLabs did not make the song.",
		job: ""
	};
	const bytes = new Uint8Array(await response.arrayBuffer());
	if (bytes.length < 1e3) return {
		ok: false,
		audio: "",
		error: "The song file came back empty.",
		job: ""
	};
	let binary = "";
	for (let index = 0; index < bytes.length; index += 32768) binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
	return {
		ok: true,
		audio: btoa(binary),
		error: "",
		job: ""
	};
}
var pullCalendar_createServerFn_handler = createServerRpc({
	id: "6e730b5e9c79d56d3084b2c9fd82075b3340881ff5d3c704b46fd5daecee1ed3",
	name: "pullCalendar",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => pullCalendar.__executeServer(opts));
var pullCalendar = createServerFn({ method: "GET" }).handler(pullCalendar_createServerFn_handler, async () => {
	return {
		events: [],
		note: "Calendar is not connected."
	};
});
var googleCalendar_createServerFn_handler = createServerRpc({
	id: "0b8b94a3630c6e896d2ee5afefdb6590d24dabd7c46648ea0170941be9bc7978",
	name: "googleCalendar",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => googleCalendar.__executeServer(opts));
var googleCalendar = createServerFn({ method: "POST" }).validator((input) => ({
	token: String(input?.token || "").trim().slice(0, 4e3),
	action: input?.action === "create" || input?.action === "update" || input?.action === "delete" ? input.action : "list",
	id: String(input?.id || "").replace(/^gcal:/, "").slice(0, 220),
	title: String(input?.title || "").trim().slice(0, 180),
	date: String(input?.date || "").slice(0, 10),
	start: String(input?.start || "09:00").slice(0, 5),
	end: String(input?.end || "10:00").slice(0, 5),
	where: String(input?.where || "").trim().slice(0, 180),
	who: String(input?.who || "").trim().slice(0, 180),
	remind: Boolean(input?.remind)
})).handler(googleCalendar_createServerFn_handler, async ({ data }) => {
	if (!data.token) return {
		ok: false,
		error: "Reconnect Google in Integrations so the calendar can be read and written.",
		events: [],
		id: ""
	};
	const headers = {
		Authorization: `Bearer ${data.token}`,
		"Content-Type": "application/json"
	};
	const base = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
	const refused = "Reconnect Google in Integrations. The old login can only read the calendar.";
	if (data.action === "list") {
		const min = (/* @__PURE__ */ new Date(Date.now() - 2592e6)).toISOString();
		const max = new Date(Date.now() + 15552e6).toISOString();
		const response = await fetch(`${base}?singleEvents=true&orderBy=startTime&maxResults=50&timeMin=${encodeURIComponent(min)}&timeMax=${encodeURIComponent(max)}`, { headers });
		const body = await response.json();
		if (!response.ok) return {
			ok: false,
			error: response.status === 403 ? refused : body.error?.message || "Google Calendar refused the session.",
			events: [],
			id: ""
		};
		return {
			ok: true,
			error: "",
			events: (body.items || []).map((item) => {
				const start = item.start?.dateTime || "";
				const end = item.end?.dateTime || "";
				return {
					id: `gcal:${item.id || ""}`,
					title: item.summary || "Event",
					date: (start || item.start?.date || "").slice(0, 10),
					start: start.slice(11, 16),
					end: end.slice(11, 16),
					where: item.location || "",
					who: item.description || ""
				};
			}).filter((item) => item.id !== "gcal:" && item.date),
			id: ""
		};
	}
	if (data.action === "delete") {
		if (!data.id) return {
			ok: false,
			error: "That event is only on this board.",
			events: [],
			id: ""
		};
		const response = await fetch(`${base}/${encodeURIComponent(data.id)}`, {
			method: "DELETE",
			headers
		});
		if (!response.ok && response.status !== 204 && response.status !== 410) {
			const body = await response.json().catch(() => ({}));
			return {
				ok: false,
				error: response.status === 403 ? refused : body.error?.message || "Google Calendar did not delete it.",
				events: [],
				id: ""
			};
		}
		return {
			ok: true,
			error: "",
			events: [],
			id: data.id
		};
	}
	const zone = "America/New_York";
	const payload = {
		summary: data.title,
		location: data.where,
		description: data.who,
		start: {
			dateTime: `${data.date}T${data.start || "09:00"}:00`,
			timeZone: zone
		},
		end: {
			dateTime: `${data.date}T${data.end || "10:00"}:00`,
			timeZone: zone
		},
		reminders: data.remind ? { useDefault: true } : { useDefault: false }
	};
	const update = data.action === "update" && data.id;
	const response = await fetch(update ? `${base}/${encodeURIComponent(data.id)}` : base, {
		method: update ? "PATCH" : "POST",
		headers,
		body: JSON.stringify(payload)
	});
	const body = await response.json();
	if (!response.ok || !body.id) return {
		ok: false,
		error: response.status === 403 ? refused : body.error?.message || "Google Calendar did not save it.",
		events: [],
		id: ""
	};
	return {
		ok: true,
		error: "",
		events: [],
		id: `gcal:${body.id}`
	};
});
var makePicture_createServerFn_handler = createServerRpc({
	id: "9c95b7f220d8c052f8115d09667283584724acc1b7aaa4c6ac7bde38dd268921",
	name: "makePicture",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => makePicture.__executeServer(opts));
var makePicture = createServerFn({ method: "POST" }).validator((input) => ({
	prompt: String(input?.prompt || "").trim().slice(0, 500),
	key: String(input?.key || "").trim().slice(0, 400)
})).handler(makePicture_createServerFn_handler, async ({ data }) => {
	const apiKey = data.key || processModule.env.XAI_API_KEY || processModule.env.GROK_API_KEY || "";
	if (!apiKey || !data.prompt) return {
		ok: false,
		url: "",
		error: apiKey ? "Prompt required." : "Add an xAI key in Integrations."
	};
	const res = await fetch("https://api.x.ai/v1/images/generations", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-2-image",
			prompt: data.prompt,
			n: 1
		})
	});
	if (!res.ok) return {
		ok: false,
		url: "",
		error: "xAI did not return an image."
	};
	const url = (await res.json()).data?.[0]?.url || "";
	return {
		ok: Boolean(url),
		url,
		error: url ? "" : "No image URL came back."
	};
});
var editPicture_createServerFn_handler = createServerRpc({
	id: "4a81d92ef559122cb98b92e0f843a426d96bacb759cc9bfff87727a19309c420",
	name: "editPicture",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => editPicture.__executeServer(opts));
var editPicture = createServerFn({ method: "POST" }).validator((input) => ({
	prompt: String(input?.prompt || "").trim().slice(0, 800),
	image: String(input?.image || "").trim().slice(0, 2e3),
	key: String(input?.key || "").trim().slice(0, 400),
	id: String(input?.id || "").trim().slice(0, 80)
})).handler(editPicture_createServerFn_handler, async ({ data }) => {
	const key = data.key || await secret("REPLICATE_API_TOKEN");
	if (!key) return {
		ok: false,
		url: "",
		id: "",
		state: "failed",
		error: "Add a Replicate key to edit an image from a prompt."
	};
	let id = data.id;
	if (!id) {
		if (!data.prompt) return {
			ok: false,
			url: "",
			id: "",
			state: "failed",
			error: "Write what should change."
		};
		if (!/^https:\/\//.test(data.image)) return {
			ok: false,
			url: "",
			id: "",
			state: "failed",
			error: "The image needs a public https link."
		};
		const started = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${key}`,
				"Content-Type": "application/json",
				Prefer: "wait=5"
			},
			body: JSON.stringify({ input: {
				prompt: data.prompt,
				input_image: data.image,
				aspect_ratio: "match_input_image",
				output_format: "jpg"
			} })
		});
		const created = await started.json().catch(() => null);
		if (!started.ok || !created?.id) return {
			ok: false,
			url: "",
			id: "",
			state: "failed",
			error: created?.error || created?.detail || "The image edit did not start."
		};
		id = created.id;
		if (created.status === "succeeded" && created.output) return {
			ok: true,
			url: String(created.output),
			id,
			state: "completed",
			error: ""
		};
	}
	for (let attempt = 0; attempt < 8; attempt += 1) {
		const job = await (await fetch(`https://api.replicate.com/v1/predictions/${id}`, { headers: { Authorization: `Bearer ${key}` } })).json().catch(() => null);
		const url = Array.isArray(job?.output) ? job.output[0] : job?.output || "";
		if (job?.status === "succeeded" && url) return {
			ok: true,
			url: String(url),
			id,
			state: "completed",
			error: ""
		};
		if (job?.status === "failed" || job?.status === "canceled") return {
			ok: false,
			url: "",
			id,
			state: "failed",
			error: job?.error || "The image edit failed."
		};
		await new Promise((resolve) => setTimeout(resolve, 2500));
	}
	return {
		ok: true,
		url: "",
		id,
		state: "dreaming",
		error: ""
	};
});
var freeImage_createServerFn_handler = createServerRpc({
	id: "007c72a4dbd468f7bb947acf662864cef1a2bfed12e93a8f5782a8621f07d6fb",
	name: "freeImage",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => freeImage.__executeServer(opts));
var freeImage = createServerFn({ method: "POST" }).validator((input) => ({
	prompt: String(input?.prompt || "").trim().slice(0, 500),
	account: String(input?.account || "").trim().slice(0, 40),
	token: String(input?.token || "").trim().slice(0, 200)
})).handler(freeImage_createServerFn_handler, async ({ data }) => {
	const account = data.account || processModule.env.CF_ACCOUNT_ID || processModule.env.CLOUDFLARE_ACCOUNT_ID || "";
	const token = data.token || processModule.env.CF_API_TOKEN || processModule.env.CLOUDFLARE_API_TOKEN || "";
	if (!account || !token || !data.prompt) return {
		ok: false,
		url: "",
		error: "no-cf"
	};
	const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({ prompt: data.prompt }),
		signal: AbortSignal.timeout(25e3)
	});
	const body = await res.json().catch(() => null);
	const image = body?.result?.image || "";
	if (!res.ok || !image) return {
		ok: false,
		url: "",
		error: body?.errors?.[0]?.message || "Workers AI did not return an image."
	};
	return {
		ok: true,
		url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`,
		error: ""
	};
});
var wanClip_createServerFn_handler = createServerRpc({
	id: "7cb23775ad14054a9572c492df202c42208a37e723293b4d3a20df7a50f030b9",
	name: "wanClip",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => wanClip.__executeServer(opts));
var wanClip = createServerFn({ method: "POST" }).validator((input) => ({
	prompt: String(input?.prompt || "").trim().slice(0, 500),
	image: String(input?.image || "").trim().slice(0, 2e3),
	key: String(input?.key || "").trim().slice(0, 400),
	id: String(input?.id || "").trim().slice(0, 80),
	aspect: [
		"16:9",
		"9:16",
		"1:1"
	].includes(String(input?.aspect || "")) ? String(input?.aspect) : "16:9"
})).handler(wanClip_createServerFn_handler, async ({ data }) => {
	const key = data.key || await secret("REPLICATE_API_TOKEN");
	if (!key) return {
		ok: false,
		url: "",
		id: "",
		state: "failed",
		error: "Add a Replicate key in Integrations. Wan runs there."
	};
	let id = data.id;
	if (!id) {
		if (!/^https:\/\//.test(data.image)) return {
			ok: false,
			url: "",
			id: "",
			state: "failed",
			error: "Wan needs an https image."
		};
		const started = await fetch("https://api.replicate.com/v1/models/wan-video/wan-2.2-i2v-fast/predictions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${key}`,
				"Content-Type": "application/json",
				Prefer: "wait=5"
			},
			body: JSON.stringify({ input: {
				prompt: data.prompt || "subtle natural motion",
				image: data.image,
				aspect_ratio: data.aspect,
				go_fast: true,
				num_frames: 81,
				resolution: "480p"
			} })
		});
		const created = await started.json().catch(() => null);
		if (!started.ok || !created?.id) return {
			ok: false,
			url: "",
			id: "",
			state: "failed",
			error: created?.error || created?.detail || "Wan did not start."
		};
		id = created.id;
		if (created.status === "succeeded" && created.output) return {
			ok: true,
			url: String(created.output),
			id,
			state: "completed",
			error: ""
		};
	}
	for (let attempt = 0; attempt < 8; attempt += 1) {
		const job = await (await fetch(`https://api.replicate.com/v1/predictions/${id}`, { headers: { Authorization: `Bearer ${key}` } })).json().catch(() => null);
		const url = Array.isArray(job?.output) ? job?.output[0] : job?.output || "";
		if (job?.status === "succeeded" && url) return {
			ok: true,
			url: String(url),
			id,
			state: "completed",
			error: ""
		};
		if (job?.status === "failed" || job?.status === "canceled") return {
			ok: false,
			url: "",
			id,
			state: "failed",
			error: job?.error || "Wan failed the clip."
		};
		await new Promise((resolve) => setTimeout(resolve, 3e3));
	}
	return {
		ok: true,
		url: "",
		id,
		state: "dreaming",
		error: ""
	};
});
async function lumaFetch(key, path, init) {
	return fetch(`https://api.lumalabs.ai/dream-machine/v1${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
			Accept: "application/json"
		}
	});
}
var makeClip_createServerFn_handler = createServerRpc({
	id: "9ad8776f168300649487079d53253432a6c42d6987f33a92cb55b9ea910f8e57",
	name: "makeClip",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => makeClip.__executeServer(opts));
var makeClip = createServerFn({ method: "POST" }).validator((input) => ({
	prompt: String(input?.prompt || "").trim().slice(0, 800),
	key: String(input?.key || "").trim().slice(0, 400),
	id: String(input?.id || "").trim().slice(0, 80),
	image: String(input?.image || "").trim().slice(0, 2e3),
	aspect: [
		"16:9",
		"9:16",
		"1:1",
		"4:3",
		"3:4"
	].includes(String(input?.aspect || "")) ? String(input?.aspect) : "16:9",
	model: String(input?.model || "") === "ray-flash-2" ? "ray-flash-2" : "ray-2",
	duration: String(input?.duration || "") === "5s" ? "5s" : "9s"
})).handler(makeClip_createServerFn_handler, async ({ data }) => {
	const key = data.key || await secret("LUMA_API_KEY", "VITE_LUMA_API_KEY");
	if (!key) return {
		ok: false,
		url: "",
		id: "",
		state: "failed",
		error: "Add a Luma key in Integrations."
	};
	let id = data.id;
	if (!id) {
		if (!data.prompt && !data.image) return {
			ok: false,
			url: "",
			id: "",
			state: "failed",
			error: "Prompt required."
		};
		const frame = /^https:\/\//.test(data.image) ? { keyframes: { frame0: {
			type: "image",
			url: data.image
		} } } : {};
		const started = await lumaFetch(key, "/generations", {
			method: "POST",
			body: JSON.stringify({
				prompt: data.prompt || "Cinematic motion, sharp detail, natural light.",
				model: data.model,
				resolution: "720p",
				duration: data.duration,
				aspect_ratio: data.aspect,
				...frame
			})
		});
		const created = await started.json();
		if (!started.ok || !created.id) return {
			ok: false,
			url: "",
			id: "",
			state: "failed",
			error: created.detail || created.failure_reason || "Luma did not start the video."
		};
		id = created.id;
	}
	for (let attempt = 0; attempt < 6; attempt += 1) {
		const job = await (await lumaFetch(key, `/generations/${id}`)).json();
		const url = job.assets?.video || "";
		if (job.state === "completed" && url) return {
			ok: true,
			url,
			id,
			state: "completed",
			error: ""
		};
		if (job.state === "failed") return {
			ok: false,
			url: "",
			id,
			state: "failed",
			error: job.failure_reason || "Luma failed the video."
		};
		await new Promise((resolve) => setTimeout(resolve, 3e3));
	}
	return {
		ok: true,
		url: "",
		id,
		state: "dreaming",
		error: ""
	};
});
function searchText(html) {
	return html.replace(/<[^>]+>/g, " ").replace(/&/g, "&").replace(/"/g, "\"").replace(/&#39;|'/g, "'").replace(/</g, "<").replace(/>/g, ">").replace(/\s+/g, " ").trim();
}
function duckLink(href) {
	const raw = href.replace(/&/g, "&");
	try {
		return new URL(raw, "https://duckduckgo.com").searchParams.get("uddg") || (raw.startsWith("http") ? raw : "");
	} catch {
		return "";
	}
}
async function readJson(url, headers) {
	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": "LifeOS/1.0",
				Accept: "application/json",
				...headers
			},
			signal: AbortSignal.timeout(7e3)
		});
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	}
}
async function duckResults(query, limit = 8) {
	try {
		const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
			headers: { "User-Agent": "Mozilla/5.0" },
			signal: AbortSignal.timeout(9e3)
		});
		if (!response.ok) return [];
		const html = await response.text();
		const snippets = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\//gi)].map((match) => searchText(match[1]));
		const hits = [];
		for (const match of html.matchAll(/<a\b([^>]*class="[^"]*result__a[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi)) {
			const href = duckLink(match[1].match(/href="([^"]+)"/i)?.[1] || "");
			const title = searchText(match[2]);
			if (!title || !/^https?:/i.test(href)) continue;
			hits.push({
				title: title.slice(0, 160),
				url: href.slice(0, 400),
				snippet: `DuckDuckGo · ${(snippets[hits.length] || "").slice(0, 180)}`
			});
			if (hits.length >= limit) break;
		}
		return hits;
	} catch {
		return [];
	}
}
async function engineHits(url, source, limit = 4) {
	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
				Accept: "text/html"
			},
			signal: AbortSignal.timeout(8e3)
		});
		if (!response.ok) return [];
		const html = await response.text();
		const hits = [];
		const seen = /* @__PURE__ */ new Set();
		for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
			let next = match[1].replace(/&/g, "&");
			try {
				const parsed = new URL(next, url);
				const wrapped = parsed.searchParams.get("uddg") || parsed.searchParams.get("RU") || parsed.searchParams.get("u") || parsed.searchParams.get("q") || "";
				if (/^https?:/i.test(wrapped) && !/bing\.com$/i.test(parsed.hostname)) next = decodeURIComponent(wrapped);
				else if (/bing\.com$/i.test(parsed.hostname) && parsed.searchParams.get("u")) {
					const coded = (parsed.searchParams.get("u") || "").replace(/^a1/, "");
					const decoded = atob(coded);
					next = decoded.startsWith("http") ? decoded : parsed.href;
				} else next = parsed.href;
			} catch {
				continue;
			}
			if (!/^https?:\/\//i.test(next) || /google\.[^/]+\/(search|sorry)|bing\.com|search\.yahoo|dogpile\.com|search\.brave|accounts\.google|gstatic|schema\.org/i.test(next)) continue;
			const title = searchText(match[2]);
			if (title.length < 6 || seen.has(next)) continue;
			seen.add(next);
			hits.push({
				title: title.slice(0, 160),
				url: next.slice(0, 400),
				snippet: source
			});
			if (hits.length >= limit) break;
		}
		return hits;
	} catch {
		return [];
	}
}
async function dogpileHits(query, key) {
	const { envValue } = await import("./env-keys-B504YYo8.mjs").then((n) => n.n);
	const token = key || processModule.env.DOGPILE_API_KEY || await envValue("DOGPILE_API_KEY");
	if (!token) return {
		hits: [],
		note: ""
	};
	const base = (processModule.env.DOGPILE_API_URL || "https://developer.dogpile.com").replace(/\/$/, "");
	try {
		const response = await fetch(`${base}/api/v1/search`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				query,
				depth: "basic"
			}),
			signal: AbortSignal.timeout(12e3)
		});
		const body = await response.json();
		if (!response.ok) return {
			hits: [],
			note: typeof body.error === "string" ? body.error : typeof body.message === "string" ? body.message : `Dogpile refused the key (${response.status}).`
		};
		const hits = ([
			body.results,
			body.organic_results,
			body.web?.results,
			body.data?.results
		].find(Array.isArray) || []).slice(0, 10).map((row) => {
			const title = String(row.title || row.name || "Result");
			const url = String(row.url || row.link || row.href || "");
			const snippet = String(row.snippet || row.description || row.content || row.text || "").replace(/\s+/g, " ").slice(0, 220);
			return {
				title: title.slice(0, 160),
				url: url.slice(0, 400),
				snippet: `Dogpile · ${snippet}`
			};
		}).filter((row) => /^https?:/i.test(row.url));
		return {
			hits,
			note: hits.length ? "" : "Dogpile answered, but there were no result links."
		};
	} catch {
		return {
			hits: [],
			note: "Dogpile did not answer."
		};
	}
}
function socialHits(query) {
	return Promise.all([
		["facebook.com", "Facebook"],
		["instagram.com", "Instagram"],
		["snapchat.com", "Snapchat"],
		["tiktok.com", "TikTok"],
		["linkedin.com", "LinkedIn"]
	].map(async ([site, name]) => (await duckResults(`${query} site:${site}`, 2)).map((row) => ({
		...row,
		snippet: `${name} · ${row.snippet.replace(/^DuckDuckGo · /, "")}`
	}))));
}
function keepHits(groups) {
	const seen = /* @__PURE__ */ new Set();
	const hits = [];
	for (const group of groups) for (const hit of group) {
		if (!hit.title || !hit.url || seen.has(hit.url)) continue;
		seen.add(hit.url);
		hits.push(hit);
		if (hits.length >= 40) return hits;
	}
	return hits;
}
async function searxHits(query, categories, base) {
	const root = (base || processModule.env.SEARXNG_URL || "http://127.0.0.1:8888").replace(/\/$/, "");
	try {
		const response = await fetch(`${root}/search?q=${encodeURIComponent(query)}&format=json&language=en&categories=${encodeURIComponent(categories)}`, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(12e3)
		});
		const raw = await response.text();
		if (!response.ok || raw.trim().startsWith("<")) return {
			hits: [],
			note: `SearXNG at ${root} did not return JSON.`
		};
		const hits = (JSON.parse(raw).results || []).slice(0, 20).map((row) => {
			const engines = (row.engines || []).filter(Boolean);
			const via = engines.length ? engines.slice(0, 3).join(", ") : row.engine || "SearXNG";
			return {
				title: String(row.title || "Result").slice(0, 160),
				url: String(row.url || "").slice(0, 400),
				snippet: `${via} · ${String(row.content || "").replace(/\s+/g, " ").slice(0, 180)}`
			};
		}).filter((row) => /^https?:/i.test(row.url));
		return {
			hits,
			note: hits.length ? `SearXNG · ${hits.length} results` : "SearXNG answered with no results."
		};
	} catch {
		return {
			hits: [],
			note: `SearXNG is not running at ${root}. Use port 8888. The dashboard already uses 8080.`
		};
	}
}
var lookup_createServerFn_handler = createServerRpc({
	id: "38f8f2a469e57d261180d3f0ea9ac7084e07cf1e7d439820a2e9770e37204b40",
	name: "lookup",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => lookup.__executeServer(opts));
var lookup = createServerFn({ method: "POST" }).validator((input) => {
	const raw = typeof input === "string" ? {
		query: input,
		kind: "web",
		key: "",
		brave: "",
		base: ""
	} : input;
	const kind = raw?.kind === "phone" || raw?.kind === "email" || raw?.kind === "image" ? raw.kind : "web";
	return {
		query: String(raw?.query || "").trim().slice(0, 180),
		kind,
		key: String(raw?.key || "").trim().slice(0, 400),
		brave: String(raw?.brave || "").trim().slice(0, 400),
		base: String(raw?.base || "").trim().slice(0, 200)
	};
}).handler(lookup_createServerFn_handler, async ({ data }) => {
	const query = data.query;
	if (!query) return {
		hits: [],
		note: ""
	};
	if (data.kind === "email" && !query.includes("@")) return {
		hits: [],
		note: "Enter a full email."
	};
	const digits = query.replace(/\D/g, "");
	if (data.kind === "phone" && digits.length < 7) return {
		hits: [],
		note: "Enter a full phone number."
	};
	const webQuery = data.kind === "phone" ? digits : query;
	const searx = await searxHits(webQuery, data.kind === "image" ? "images" : "general", data.base);
	if (searx.hits.length) return {
		hits: searx.hits,
		note: searx.note
	};
	const encoded = encodeURIComponent(webQuery);
	const dogpile = await dogpileHits(webQuery, data.key);
	const [duck, google, bing, yahoo, social, wiki, wikiData, reddit, news, archive, books, places, apple, code, answers] = await Promise.all([
		duckResults(data.kind === "web" ? query : `"${webQuery}"`, 6),
		engineHits(`https://www.google.com/search?q=${encoded}&gbv=1&hl=en`, "Google", 4),
		engineHits(`https://www.bing.com/search?q=${encoded}`, "Bing", 4),
		engineHits(`https://search.yahoo.com/search?p=${encoded}`, "Yahoo", 4),
		socialHits(webQuery),
		readJson(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=4&namespace=0&format=json`),
		readJson(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&format=json&limit=4`),
		readJson(`https://www.reddit.com/search.json?q=${encodeURIComponent(webQuery)}&limit=4&sort=relevance`, { "User-Agent": "LifeOS/1.0" }),
		readJson(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=4`),
		readJson(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier&fl[]=title&rows=3&page=1&output=json`),
		readJson(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=3`),
		readJson(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=2`, { "User-Agent": "LifeOS/1.0 (personal dashboard)" }),
		readJson(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=3`),
		readJson(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=3`, { Accept: "application/vnd.github+json" }),
		readJson(`https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=3`)
	]);
	const groups = [
		dogpile.hits,
		google,
		bing,
		yahoo,
		...social,
		duck,
		(wiki?.[1] || []).map((title, index) => ({
			title,
			url: wiki?.[3]?.[index] || "",
			snippet: `Wikipedia · ${wiki?.[2]?.[index] || ""}`
		})),
		(wikiData?.search || []).map((row) => ({
			title: row.label || "Wikidata",
			url: row.concepturi || "",
			snippet: `Wikidata · ${row.description || ""}`
		})),
		(reddit?.data?.children || []).map((row) => ({
			title: row.data?.title || "Reddit",
			url: row.data?.permalink ? `https://www.reddit.com${row.data.permalink}` : "",
			snippet: `Reddit · r/${row.data?.subreddit || ""} ${(row.data?.selftext || "").slice(0, 140)}`
		})),
		(news?.hits || []).map((row) => ({
			title: row.title || "Hacker News",
			url: row.url || (row.objectID ? `https://news.ycombinator.com/item?id=${row.objectID}` : ""),
			snippet: "Hacker News"
		})),
		(archive?.response?.docs || []).map((row) => ({
			title: row.title || "Internet Archive",
			url: row.identifier ? `https://archive.org/details/${row.identifier}` : "",
			snippet: "Internet Archive"
		})),
		(books?.docs || []).map((row) => ({
			title: row.title || "Open Library",
			url: row.key ? `https://openlibrary.org${row.key}` : "",
			snippet: `Open Library · ${(row.author_name || []).slice(0, 2).join(", ")}`
		})),
		(Array.isArray(places) ? places : []).map((row) => ({
			title: row.display_name || "Place",
			url: row.lat && row.lon ? `https://www.openstreetmap.org/?mlat=${row.lat}&mlon=${row.lon}` : "",
			snippet: "OpenStreetMap"
		})),
		(apple?.results || []).map((row) => ({
			title: row.trackName || "Apple",
			url: row.collectionViewUrl || "",
			snippet: `Apple · ${row.artistName || ""}`
		})),
		(code?.items || []).map((row) => ({
			title: row.full_name || "GitHub",
			url: row.html_url || "",
			snippet: `GitHub · ${row.description || ""}`
		})),
		(answers?.items || []).map((row) => ({
			title: row.title || "Stack Overflow",
			url: row.link || "",
			snippet: "Stack Overflow"
		}))
	];
	if (data.kind === "email") {
		const { createHash } = await import("node:crypto");
		const person = (await readJson(`https://en.gravatar.com/${createHash("md5").update(query.toLowerCase()).digest("hex")}.json`))?.entry?.[0];
		if (person?.profileUrl) groups.unshift([{
			title: person.displayName || person.name?.formatted || query,
			url: person.profileUrl,
			snippet: `Gravatar · ${person.aboutMe || "Profile for this email"}`
		}]);
		const users = await readJson(`https://api.github.com/search/users?q=${encodeURIComponent(`${query} in:email`)}&per_page=3`, { Accept: "application/vnd.github+json" });
		groups.push((users?.items || []).map((row) => ({
			title: row.login || "GitHub user",
			url: row.html_url || "",
			snippet: "GitHub · email match"
		})));
		groups.push(await duckResults(`"${query}" site:linkedin.com`, 3));
	}
	if (data.kind === "phone") {
		const pretty = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits.length > 10 ? digits.slice(-10) : digits;
		const shown = pretty.length === 10 ? `(${pretty.slice(0, 3)}) ${pretty.slice(3, 6)}-${pretty.slice(6)}` : query;
		groups.unshift([{
			title: shown,
			url: `tel:${pretty}`,
			snippet: "Number"
		}]);
		groups.push(await duckResults(`"${shown}"`, 3));
		groups.push(await duckResults(`"${pretty}" site:linkedin.com`, 2));
	}
	const hits = keepHits(groups);
	const missing = data.key || processModule.env.DOGPILE_API_KEY ? "" : "Add the Dogpile key in Integrations for live results.";
	return {
		hits,
		note: [
			searx.note,
			dogpile.note,
			hits.length ? "" : missing || "Nothing came back from the public sources."
		].filter(Boolean).join(" ")
	};
});
var inspectSite_createServerFn_handler = createServerRpc({
	id: "cd3883a970f8e2f887ab53797e5002b6e3983b5de87fd5854bf0cf74a04ac86d",
	name: "inspectSite",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => inspectSite.__executeServer(opts));
var inspectSite = createServerFn({ method: "POST" }).validator((url) => {
	const value = String(url || "").trim();
	if (!/^https?:\/\//i.test(value)) throw new Error("Use a full http URL");
	return value.slice(0, 300);
}).handler(inspectSite_createServerFn_handler, async ({ data }) => {
	const res = await fetch(data, {
		redirect: "follow",
		headers: { "User-Agent": "LifeOS/1" }
	});
	const html = (await res.text()).slice(0, 2e5);
	const title = html.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim() || "";
	const description = html.match(/name=["']description["'][^>]*content=["']([^"']*)/i)?.[1] || html.match(/content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] || "";
	const h1 = (html.match(/<h1\b/gi) || []).length;
	return {
		ok: res.ok,
		status: res.status,
		title: title.slice(0, 140),
		description: description.slice(0, 200),
		h1
	};
});
function effortOf(title) {
	return /survey|cashback|beer money|beermoney|microtask|swagbucks|user testing|print on demand|affiliate|template|digital download|gpt|flip/i.test(title) ? "low" : "medium";
}
var findPictures_createServerFn_handler = createServerRpc({
	id: "c4af2e8b020209dc0a6dd8a87ea4c0f3c451bb893ada4ac531de78e38b073aee",
	name: "findPictures",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => findPictures.__executeServer(opts));
var findPictures = createServerFn({ method: "POST" }).validator((input) => ({
	query: String(input?.query || "").trim().slice(0, 80),
	kind: input?.kind === "gif" ? "gif" : "photo"
})).handler(findPictures_createServerFn_handler, async ({ data }) => {
	const empty = [];
	if (!data.query) return { images: empty };
	const signal = AbortSignal.timeout(8e3);
	const headers = {
		"User-Agent": "Mozilla/5.0",
		Accept: "application/json"
	};
	const home = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(data.query)}&iax=images&ia=images`, {
		headers,
		signal
	}).catch(() => null);
	const html = home ? await home.text() : "";
	const token = html.match(/vqd="([^"]+)"/)?.[1] || html.match(/vqd=([\d-]+)/)?.[1] || "";
	if (!token) return { images: empty };
	const filter = data.kind === "gif" ? "type:gif" : "type:photo";
	const result = await fetch(`https://duckduckgo.com/i.js?o=json&l=us-en&q=${encodeURIComponent(data.query)}&vqd=${encodeURIComponent(token)}&f=,,,${filter}&p=1`, {
		headers: {
			...headers,
			Referer: "https://duckduckgo.com/"
		},
		signal
	}).catch(() => null);
	if (!result?.ok) return { images: empty };
	return { images: ((await result.json()).results || []).slice(0, 36).map((row) => ({
		title: String(row.title || "Image").slice(0, 120),
		url: String(row.image || ""),
		thumb: String(row.thumbnail || row.image || ""),
		page: String(row.url || "")
	})).filter((row) => /^https?:/i.test(row.url)) };
});
async function visualMatches(pageUrl, source, original) {
	try {
		const response = await fetch(pageUrl, {
			headers: {
				"User-Agent": "Mozilla/5.0",
				Accept: "text/html"
			},
			signal: AbortSignal.timeout(9e3)
		});
		if (!response.ok) return [];
		const html = await response.text();
		const found = /* @__PURE__ */ new Set();
		const images = [];
		for (const pattern of [
			/murl":"(https:[^&"]+)/g,
			/"murl":"(https:[^"]+)"/g,
			/img_href":"(https:[^"]+)"/g,
			/"url":"(https:\\\/\\\/[^"]+)"/g
		]) for (const match of html.matchAll(pattern)) {
			const raw = match[1].replace(/\\\//g, "/").replace(/\\u0026/g, "&").replace(/&/g, "&");
			if (!/^https:\/\//i.test(raw) || raw === original || found.has(raw)) continue;
			found.add(raw);
			images.push({
				title: source,
				url: raw,
				thumb: raw
			});
			if (images.length >= 8) return images;
		}
		return images;
	} catch {
		return [];
	}
}
var reverseImage_createServerFn_handler = createServerRpc({
	id: "8e62ba3ef6b266603e88c7f4c03939952b46d175310dc965ed285cb6c6fdda96",
	name: "reverseImage",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => reverseImage.__executeServer(opts));
var reverseImage = createServerFn({ method: "POST" }).validator((input) => ({
	url: /^https?:\/\//i.test(String(input?.url || "")) ? String(input?.url).trim().slice(0, 500) : "",
	dataUrl: String(input?.dataUrl || "").startsWith("data:image/") ? String(input?.dataUrl).slice(0, 9e5) : ""
})).handler(reverseImage_createServerFn_handler, async ({ data }) => {
	const hits = [];
	const images = [];
	if (!data.url && !data.dataUrl) return {
		hits,
		images,
		note: "Paste an image URL or upload an image."
	};
	if (data.url) {
		const encoded = encodeURIComponent(data.url);
		const [bing, yandex] = await Promise.all([visualMatches(`https://www.bing.com/images/search?q=imgurl:${encoded}&view=detailv2&iss=sbi&form=SBIIRP`, "Bing", data.url), visualMatches(`https://yandex.com/images/search?rpt=imageview&url=${encoded}`, "Yandex", data.url)]);
		images.push(...bing, ...yandex);
		hits.push({
			title: "Google Lens",
			url: `https://lens.google.com/uploadbyurl?url=${encoded}`,
			snippet: "Open reverse search"
		}, {
			title: "Bing",
			url: `https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:${encoded}`,
			snippet: "Open reverse search"
		}, {
			title: "Yandex",
			url: `https://yandex.com/images/search?rpt=imageview&url=${encoded}`,
			snippet: "Open reverse search"
		}, {
			title: "TinEye",
			url: `https://tineye.com/search?url=${encoded}`,
			snippet: "Open reverse search"
		});
	}
	const sauce = data.url ? await readJson(`https://saucenao.com/search.php?output_type=2&numres=6&url=${encodeURIComponent(data.url)}`) : await (async () => {
		try {
			const bytes = Uint8Array.from(atob(data.dataUrl.split(",")[1] || ""), (char) => char.charCodeAt(0));
			const form = new FormData();
			form.set("output_type", "2");
			form.set("numres", "6");
			form.set("file", new Blob([bytes]), "image.jpg");
			const response = await fetch("https://saucenao.com/search.php", {
				method: "POST",
				body: form,
				signal: AbortSignal.timeout(12e3)
			});
			if (!response.ok) return null;
			return await response.json();
		} catch {
			return null;
		}
	})();
	for (const row of sauce?.results || []) {
		const score = Number(row.header?.similarity || 0);
		if (score < 50) continue;
		const page = row.data?.ext_urls?.[0] || "";
		if (!page) continue;
		hits.push({
			title: row.data?.title || row.data?.source || "SauceNAO match",
			url: page,
			snippet: `SauceNAO · ${score}%`
		});
		if (row.header?.thumbnail) images.push({
			title: row.data?.title || "Match",
			url: page,
			thumb: row.header.thumbnail
		});
	}
	if (data.url) {
		const traced = await readJson(`https://api.trace.moe/search?anilistInfo&url=${encodeURIComponent(data.url)}`);
		for (const row of traced?.result || []) {
			if ((row.similarity || 0) < .85 || !row.video) continue;
			hits.push({
				title: `${row.filename || "Scene"}${row.episode ? ` · ep ${row.episode}` : ""}`,
				url: row.video,
				snippet: `trace.moe · ${Math.round((row.similarity || 0) * 100)}%`
			});
			if (row.image) images.push({
				title: row.filename || "Scene",
				url: row.video,
				thumb: row.image
			});
		}
	}
	return {
		hits,
		images,
		note: images.length ? "" : data.url ? "No matching pictures were returned. The Lens, Bing, Yandex, and TinEye links still open that image." : "No match on the upload. Paste a public image URL to also search Bing and Yandex."
	};
});
var findIdeas_createServerFn_handler = createServerRpc({
	id: "c274fb50470cc764bd6b8820e7ba76ba609765a95571cff580bd590efe071b1b",
	name: "findIdeas",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => findIdeas.__executeServer(opts));
var findIdeas = createServerFn({ method: "GET" }).handler(findIdeas_createServerFn_handler, async () => {
	const ideas = [];
	const seen = /* @__PURE__ */ new Set();
	const add = (title, url, source) => {
		const name = title.replace(/\s+/g, " ").trim().slice(0, 160);
		const key = name.toLowerCase();
		if (!name || seen.has(key) || name.length < 8) return;
		if (/guaranteed|giveaway|seed phrase|dm me|telegram|whatsapp|crypto airdrop/i.test(name)) return;
		seen.add(key);
		ideas.push({
			title: name,
			url: url.slice(0, 300),
			source,
			effort: effortOf(name)
		});
	};
	await Promise.all([fetch("https://hn.algolia.com/api/v1/search?query=side%20hustle&tags=story&hitsPerPage=8").then((res) => res.ok ? res.json() : null).then((body) => {
		for (const hit of body?.hits || []) add(hit.title || "", hit.url || `https://news.ycombinator.com/item?id=${hit.objectID || ""}`, "Hacker News");
	}).catch(() => void 0), ...[
		"beermoney",
		"sidehustle",
		"WorkOnline"
	].map((sub) => fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=8`, { headers: { "User-Agent": "LifeOS-Lucid/1.0" } }).then((res) => res.ok ? res.json() : null).then((body) => {
		for (const child of body?.data?.children || []) {
			if (child.data?.stickied) continue;
			add(child.data?.title || "", `https://www.reddit.com${child.data?.permalink || ""}`, `r/${sub}`);
		}
	}).catch(() => void 0))]);
	return { ideas: ideas.slice(0, 24) };
});
var marketQuotes_createServerFn_handler = createServerRpc({
	id: "aeb8ac7d5a55382a017f106d50eae6b4842b3c2aa620933bcee7615114751b44",
	name: "marketQuotes",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => marketQuotes.__executeServer(opts));
var marketQuotes = createServerFn({ method: "GET" }).handler(marketQuotes_createServerFn_handler, async () => {
	const crypto = [];
	const stocks = [];
	const names = {
		bitcoin: "BTC",
		ethereum: "ETH",
		solana: "SOL",
		ripple: "XRP",
		dogecoin: "DOGE"
	};
	try {
		const body = await (await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,dogecoin&vs_currencies=usd&include_24hr_change=true")).json();
		for (const [id, symbol] of Object.entries(names)) crypto.push({
			symbol,
			price: Number(body[id]?.usd) || 0,
			change: Number(body[id]?.usd_24h_change) || 0
		});
	} catch {}
	await Promise.all([
		"AAPL",
		"MSFT",
		"NVDA",
		"TSLA",
		"AMZN",
		"META"
	].map(async (symbol) => {
		try {
			const meta = (await (await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`)).json()).chart?.result?.[0]?.meta;
			const price = Number(meta?.regularMarketPrice) || 0;
			const prev = Number(meta?.chartPreviousClose) || price;
			if (price) stocks.push({
				symbol,
				price,
				change: prev ? (price - prev) / prev * 100 : 0
			});
		} catch {}
	}));
	return {
		crypto,
		stocks
	};
});
var COIN_IDS = {
	BTC: "bitcoin",
	ETH: "ethereum",
	SOL: "solana",
	XRP: "ripple",
	DOGE: "dogecoin",
	ADA: "cardano",
	AVAX: "avalanche-2",
	LINK: "chainlink",
	DOT: "polkadot",
	LTC: "litecoin"
};
var watchQuote_createServerFn_handler = createServerRpc({
	id: "91b8a075fb0651eb6013b3fd24ffeee7acf6f68266783393650db798f75b7a04",
	name: "watchQuote",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => watchQuote.__executeServer(opts));
var watchQuote = createServerFn({ method: "POST" }).validator((input) => ({
	symbol: String(input?.symbol || "").trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12),
	kind: input?.kind === "crypto" ? "crypto" : "stock"
})).handler(watchQuote_createServerFn_handler, async ({ data }) => {
	if (!data.symbol) return {
		ok: false,
		error: "Enter a symbol."
	};
	try {
		if (data.kind === "stock") {
			const meta = (await (await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(data.symbol)}?interval=1d&range=1d`)).json()).chart?.result?.[0]?.meta;
			const price = Number(meta?.regularMarketPrice) || 0;
			const prev = Number(meta?.chartPreviousClose) || price;
			if (!price) return {
				ok: false,
				error: "No stock quote for that symbol."
			};
			return {
				ok: true,
				quote: {
					symbol: data.symbol,
					price,
					change: prev ? (price - prev) / prev * 100 : 0
				}
			};
		}
		const id = COIN_IDS[data.symbol] || data.symbol.toLowerCase();
		const body = await (await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_change=true`)).json();
		const price = Number(body[id]?.usd) || 0;
		if (!price) return {
			ok: false,
			error: "No crypto quote for that symbol."
		};
		return {
			ok: true,
			quote: {
				symbol: data.symbol,
				price,
				change: Number(body[id]?.usd_24h_change) || 0
			}
		};
	} catch {
		return {
			ok: false,
			error: "The quote service did not answer."
		};
	}
});
var locateArea_createServerFn_handler = createServerRpc({
	id: "62cbb925365b416c89e8e966158d875058306e05ec23b825ccd475ffbe0c2445",
	name: "locateArea",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => locateArea.__executeServer(opts));
var locateArea = createServerFn({ method: "POST" }).validator((input) => ({
	kind: input?.kind === "county" || input?.kind === "radius" || input?.kind === "place" ? input.kind : "zip",
	zip: String(input?.zip || "").trim().slice(0, 12),
	county: String(input?.county || "").trim().slice(0, 60),
	state: String(input?.state || "").trim().slice(0, 40),
	miles: String(input?.miles || "").trim().slice(0, 6),
	center: String(input?.center || "").trim().slice(0, 80),
	place: String(input?.place || "").trim().slice(0, 80)
})).handler(locateArea_createServerFn_handler, async ({ data }) => {
	const headers = {
		"User-Agent": "LifeOS-Maps/1.0",
		Accept: "application/json"
	};
	const query = data.kind === "county" ? `${data.county} County, ${data.state || "USA"}` : data.kind === "place" ? `${data.place}${data.state ? `, ${data.state}` : ""}` : data.kind === "radius" ? data.center || data.zip : data.zip;
	if (!query) return {
		ok: false,
		error: "Enter a zip, county, neighborhood, or a center for the radius."
	};
	const url = new URL("https://nominatim.openstreetmap.org/search");
	url.searchParams.set("format", "json");
	url.searchParams.set("limit", "1");
	url.searchParams.set("polygon_geojson", "1");
	if (data.kind === "zip") {
		url.searchParams.set("postalcode", data.zip);
		url.searchParams.set("country", "us");
	} else url.searchParams.set("q", query);
	const hit = (await (await fetch(url, { headers })).json())[0];
	if (!hit?.lat || !hit.lon) return {
		ok: false,
		error: "No area came back for that search."
	};
	const box = (hit.boundingbox || []).map(Number);
	return {
		ok: true,
		label: hit.display_name || query,
		lat: Number(hit.lat),
		lng: Number(hit.lon),
		miles: Number(data.miles) || 0,
		bbox: box.length === 4 ? box : null,
		geojson: hit.geojson && hit.geojson.type && hit.geojson.type !== "Point" ? hit.geojson : null
	};
});
var telegramBot_createServerFn_handler = createServerRpc({
	id: "539485e889577aab54db87aebfd8688294fb3a3d8cb62fc2fa74d23da3631a3b",
	name: "telegramBot",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => telegramBot.__executeServer(opts));
var telegramBot = createServerFn({ method: "POST" }).validator((input) => ({
	token: String(input?.token || "").trim().slice(0, 120),
	chat: String(input?.chat || "").trim().slice(0, 40),
	text: String(input?.text || "").trim().slice(0, 500)
})).handler(telegramBot_createServerFn_handler, async ({ data }) => {
	if (!/^\d+:[A-Za-z0-9_-]+$/.test(data.token)) return {
		ok: false,
		bot: "",
		error: "That is not a bot token."
	};
	const base = `https://api.telegram.org/bot${data.token}`;
	if (!data.text) {
		const body = await (await fetch(`${base}/getMe`)).json();
		if (!body.ok) return {
			ok: false,
			bot: "",
			error: body.description || "Telegram did not answer."
		};
		return {
			ok: true,
			bot: body.result?.username ? `@${body.result.username}` : body.result?.first_name || "bot",
			error: ""
		};
	}
	if (!data.chat) return {
		ok: false,
		bot: "",
		error: "A chat id is required."
	};
	const body = await (await fetch(`${base}/sendMessage`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			chat_id: data.chat,
			text: data.text
		})
	})).json();
	return body.ok ? {
		ok: true,
		bot: "",
		error: ""
	} : {
		ok: false,
		bot: "",
		error: body.description || "Send failed."
	};
});
var pullChats_createServerFn_handler = createServerRpc({
	id: "add788fa70ee908ed28dd48bae0a0e289995e09c335223b2efac41202998ddd7",
	name: "pullChats",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => pullChats.__executeServer(opts));
var pullChats = createServerFn({ method: "POST" }).validator((input) => ({
	telegram: String(input?.telegram || "").trim().slice(0, 200),
	facebook: String(input?.facebook || "").trim().slice(0, 4e3)
})).handler(pullChats_createServerFn_handler, async ({ data }) => {
	const messages = [];
	const notes = [];
	const token = data.telegram || processModule.env.TELEGRAM_BOT_TOKEN || "";
	if (/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
		const body = await (await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=40&allowed_updates=${encodeURIComponent("[\"message\"]")}`)).json();
		if (!body.ok) notes.push(body.description || "Telegram did not return chats.");
		else {
			for (const update of body.result || []) {
				const message = update.message;
				const text = message?.text?.trim();
				if (!message || !text) continue;
				const who = [message.chat.first_name, message.chat.last_name].filter(Boolean).join(" ") || message.chat.username || "Telegram";
				messages.push({
					id: `tg:${message.chat.id}:${message.message_id}`,
					who,
					text,
					mine: Boolean(message.from?.is_bot),
					platform: "telegram"
				});
			}
			notes.push(`Telegram ${messages.length} message${messages.length === 1 ? "" : "s"}.`);
		}
	} else notes.push("Telegram bot token is not saved.");
	if (data.facebook) {
		const headers = { Authorization: `Bearer ${data.facebook}` };
		const pages = await fetch("https://graph.facebook.com/v23.0/me/accounts?fields=id,name,access_token", { headers });
		const listed = await pages.json();
		if (!pages.ok) notes.push(listed.error?.message || "Reconnect Facebook so Messenger can be read.");
		else if (!listed.data?.length) notes.push("Facebook is connected, but no Page was returned.");
		else {
			let count = 0;
			for (const page of listed.data.slice(0, 3)) {
				if (!page.access_token) continue;
				for (const kind of ["messenger", "instagram"]) {
					const url = `https://graph.facebook.com/v23.0/${page.id}/conversations?platform=${kind === "instagram" ? "instagram" : "messenger"}&fields=participants,messages.limit(8){id,message,from,created_time}&access_token=${encodeURIComponent(page.access_token)}`;
					const response = await fetch(url);
					const body = await response.json();
					if (!response.ok) {
						notes.push(body.error?.message || `${kind} refused the Page token.`);
						continue;
					}
					for (const conversation of body.data || []) {
						const other = (conversation.participants?.data || []).find((person) => person.id && person.id !== page.id);
						const who = other?.name || "Facebook";
						for (const message of conversation.messages?.data || []) {
							const text = message.message?.trim();
							if (!message.id || !text) continue;
							messages.push({
								id: `fb:${page.id}:${other?.id || "0"}:${message.id}`,
								who,
								text,
								mine: message.from?.id === page.id,
								platform: kind === "instagram" ? "instagram" : "messenger"
							});
							count += 1;
						}
					}
				}
			}
			notes.push(`Meta ${count} message${count === 1 ? "" : "s"}.`);
		}
	} else notes.push("Facebook is not connected. Reconnect it for Messenger and Instagram.");
	const apiKey = processModule.env.NYLAS_API_KEY || "";
	if (apiKey) {
		const headers = {
			Authorization: `Bearer ${apiKey}`,
			Accept: "application/json"
		};
		const listed = await fetch("https://api.us.nylas.com/v3/grants?limit=10", { headers });
		const grants = await listed.json();
		const board = [
			"chris@ceogps.com",
			"chrisgr33ninc@gmail.com",
			"cagednreality@icloud.com"
		];
		const mine = (grants.data || []).filter((row) => board.includes((row.email || "").toLowerCase()));
		const use = mine.length ? mine : (grants.data || []).slice(0, 3);
		if (!listed.ok || !use.length) notes.push(grants.error?.message || "Nylas has no mailbox for texts.");
		else {
			let count = 0;
			for (const grant of use) {
				const response = await fetch(`https://api.us.nylas.com/v3/grants/${grant.id}/messages?limit=30`, { headers });
				const mail = await response.json();
				if (!response.ok) {
					notes.push(mail.error?.message || `${grant.email || "Mailbox"} did not return text mail.`);
					continue;
				}
				for (const row of mail.data || []) {
					const from = (row.from || []).map((item) => item.email || "").join(" ");
					const blob = `${from} ${(row.to || []).map((item) => item.email || "").join(" ")} ${row.subject || ""} ${row.snippet || ""}`;
					const phone = [...blob.matchAll(/\d{10,11}/g)].map((hit) => hit[0].replace(/\D/g, "").replace(/^1/, "").slice(-10)).filter((num) => num.length === 10 && num !== "4702223939" && num !== "4708150666")[0] || "";
					const voice = /voice\.google\.com|google voice|text message from/i.test(blob);
					const mobile = /tmomail\.net/i.test(blob);
					if (!voice && !mobile) continue;
					const who = phone ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}` : voice ? "Google Voice · 470-222-3939" : "SMS · 470-815-0666";
					messages.push({
						id: `${voice && !mobile ? "gv" : "tm"}:${row.id || blob.slice(0, 40)}`,
						who,
						text: row.snippet || row.subject || "Text",
						mine: board.some((email) => from.toLowerCase().includes(email)),
						platform: voice && !mobile ? "voice" : "sms"
					});
					count += 1;
				}
			}
			notes.push(`${use.map((row) => row.email).filter(Boolean).join(", ") || "Mailboxes"} ${count} text${count === 1 ? "" : "s"}.`);
		}
	}
	return {
		ok: messages.length > 0,
		text: notes.join(" "),
		messages
	};
});
var sendChat_createServerFn_handler = createServerRpc({
	id: "0f5c9a16bbf75095ca6512ba55df08ca26aa7f743ecb79d0cf3178b914c8df41",
	name: "sendChat",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => sendChat.__executeServer(opts));
var sendChat = createServerFn({ method: "POST" }).validator((input) => ({
	platform: String(input?.platform || "").slice(0, 20),
	route: String(input?.route || "").trim().slice(0, 400),
	text: String(input?.text || "").trim().slice(0, 500),
	telegram: String(input?.telegram || "").trim().slice(0, 200),
	facebook: String(input?.facebook || "").trim().slice(0, 4e3)
})).handler(sendChat_createServerFn_handler, async ({ data }) => {
	if (!data.text) return {
		ok: false,
		error: "Message is empty."
	};
	if (data.platform === "telegram") {
		const token = data.telegram || processModule.env.TELEGRAM_BOT_TOKEN || "";
		const chat = data.route.split(":")[1] || "";
		if (!/^\d+:[A-Za-z0-9_-]+$/.test(token) || !chat) return {
			ok: false,
			error: "Telegram needs a bot token and an existing chat."
		};
		const body = await (await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: chat,
				text: data.text
			})
		})).json();
		if (!body.ok) return {
			ok: false,
			error: body.description || "Telegram did not send."
		};
		return {
			ok: true,
			error: "",
			id: `tg:${chat}:${body.result?.message_id || Date.now()}`
		};
	}
	if (data.platform === "messenger" || data.platform === "instagram") {
		const [, pageId, recipient] = data.route.split(":");
		if (!data.facebook || !pageId || !recipient) return {
			ok: false,
			error: "Reconnect Facebook, then open a thread that already exists."
		};
		const listed = await (await fetch("https://graph.facebook.com/v23.0/me/accounts?fields=id,access_token", { headers: { Authorization: `Bearer ${data.facebook}` } })).json();
		const page = listed.data?.find((row) => row.id === pageId);
		if (!page?.access_token) return {
			ok: false,
			error: listed.error?.message || "That Page token is missing."
		};
		const sent = await fetch(`https://graph.facebook.com/v23.0/${page.id}/messages?access_token=${encodeURIComponent(page.access_token)}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				recipient: { id: recipient },
				message: { text: data.text },
				messaging_type: "RESPONSE"
			})
		});
		const body = await sent.json();
		if (!sent.ok) return {
			ok: false,
			error: body.error?.message || "Messenger did not send."
		};
		return {
			ok: true,
			error: "",
			id: `fb:${page.id}:${recipient}:${body.message_id || Date.now()}`
		};
	}
	if (data.platform === "voice") {
		const messageId = data.route.replace(/^(gv|sms):/, "");
		if (!messageId || /^\d+$/.test(messageId)) return {
			ok: false,
			error: "Open a text that already came in to (470) 222-3939. Replying to that thread sends from that number."
		};
		const apiKey = processModule.env.NYLAS_API_KEY || "";
		if (!apiKey) return {
			ok: false,
			error: "Nylas key is not on the server."
		};
		const headers = {
			Authorization: `Bearer ${apiKey}`,
			Accept: "application/json",
			"Content-Type": "application/json"
		};
		const grants = await (await fetch("https://api.us.nylas.com/v3/grants?limit=10", { headers })).json();
		const grant = (grants.data || []).find((row) => (row.email || "").toLowerCase() === "cagednreality@icloud.com") || (grants.data || []).find((row) => (row.email || "").toLowerCase().includes("cagednreality"));
		if (!grant) return {
			ok: false,
			error: grants.error?.message || "cagednreality@icloud.com is not on Nylas."
		};
		const sent = await fetch(`https://api.us.nylas.com/v3/grants/${grant.id}/messages/send`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				reply_to_message_id: messageId,
				body: data.text
			})
		});
		const mail = await sent.json();
		if (!sent.ok) return {
			ok: false,
			error: mail.error?.message || "Google Voice did not send the reply."
		};
		return {
			ok: true,
			error: "",
			id: `gv:${mail.data?.id || Date.now()}`
		};
	}
	if (data.platform === "sms" || data.platform === "email") {
		const apiKey = processModule.env.NYLAS_API_KEY || "";
		if (!apiKey) return {
			ok: false,
			error: "Nylas key is not on the server."
		};
		const headers = {
			Authorization: `Bearer ${apiKey}`,
			Accept: "application/json",
			"Content-Type": "application/json"
		};
		const grants = await (await fetch("https://api.us.nylas.com/v3/grants?limit=10", { headers })).json();
		const grant = (grants.data || []).find((row) => (row.email || "").toLowerCase() === "cagednreality@icloud.com") || (grants.data || []).find((row) => (row.email || "").toLowerCase().includes("cagednreality")) || (grants.data || [])[0];
		if (!grant) return {
			ok: false,
			error: grants.error?.message || "No Nylas mailbox is connected."
		};
		const digits = data.route.replace(/\D/g, "").slice(-10);
		const to = data.platform === "sms" ? digits.length === 10 ? `${digits}@tmomail.net` : "" : data.route.includes("@") ? data.route : "cagednreality@icloud.com";
		if (!to) return {
			ok: false,
			error: "The T-Mobile number is missing."
		};
		const sent = await fetch(`https://api.us.nylas.com/v3/grants/${grant.id}/messages/send`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				subject: data.platform === "sms" ? "Text" : "Forward",
				body: data.text,
				to: [{ email: to }]
			})
		});
		const mail = await sent.json();
		if (!sent.ok) return {
			ok: false,
			error: mail.error?.message || "Nylas did not send."
		};
		return {
			ok: true,
			error: "",
			id: `mail:${mail.data?.id || Date.now()}`
		};
	}
	return {
		ok: false,
		error: "WhatsApp and Discord open in their own apps. There is no send key for them."
	};
});
function youtubeHits(node, out) {
	if (!node || typeof node !== "object" || out.length >= 8) return;
	if (Array.isArray(node)) {
		node.forEach((item) => youtubeHits(item, out));
		return;
	}
	const row = node;
	const video = row.videoRenderer;
	if (video?.videoId && !out.some((item) => item.id === video.videoId)) out.push({
		id: video.videoId,
		title: video.title?.runs?.[0]?.text || "Video",
		author: video.ownerText?.runs?.[0]?.text || ""
	});
	Object.values(row).forEach((value) => youtubeHits(value, out));
}
var youtubeSearch_createServerFn_handler = createServerRpc({
	id: "75d661d7253a80bc7ed5f8f73061894a941ac4d4f5ab600880acf76c106ffe2e",
	name: "youtubeSearch",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => youtubeSearch.__executeServer(opts));
var youtubeSearch = createServerFn({ method: "POST" }).validator((input) => ({
	query: String(input?.query || "").trim().slice(0, 120),
	key: String(input?.key || "").trim().slice(0, 200)
})).handler(youtubeSearch_createServerFn_handler, async ({ data }) => {
	if (!data.query) return {
		videos: [],
		error: "Type a search."
	};
	const key = data.key || processModule.env.YOUTUBE_DATA_V3_API_KEY || processModule.env.YOUTUBE_API_KEY || processModule.env.VITE_YOUTUBE_API_KEY || "";
	if (key) try {
		const videos = ((await (await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(data.query)}&key=${encodeURIComponent(key)}`)).json()).items || []).map((row) => ({
			id: row.id?.videoId || "",
			title: row.snippet?.title || "Video",
			author: row.snippet?.channelTitle || ""
		})).filter((row) => row.id);
		if (videos.length) return {
			videos,
			error: ""
		};
	} catch {}
	try {
		const response = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				context: { client: {
					clientName: "WEB",
					clientVersion: "2.20251001.00.00",
					hl: "en",
					gl: "US"
				} },
				query: data.query
			}),
			signal: AbortSignal.timeout(8e3)
		});
		const videos = [];
		youtubeHits(await response.json(), videos);
		if (videos.length) return {
			videos,
			error: ""
		};
	} catch {}
	return {
		videos: [],
		error: "YouTube search did not answer."
	};
});
var pullSocial_createServerFn_handler = createServerRpc({
	id: "15e270b31a1e03cffcb2aaef1d66c411f05905ae11123cc8f6f2cc482334137e",
	name: "pullSocial",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => pullSocial.__executeServer(opts));
var pullSocial = createServerFn({ method: "POST" }).validator((input) => ({
	facebook: String(input?.facebook || "").slice(0, 4e3),
	youtube: String(input?.youtube || "").slice(0, 200),
	youtubeHandle: String(input?.youtubeHandle || "").replace(/^@/, "").slice(0, 60),
	reddit: String(input?.reddit || "").replace(/^u\//i, "").replace(/^@/, "").slice(0, 40),
	x: String(input?.x || "").slice(0, 4e3),
	linkedin: String(input?.linkedin || "").slice(0, 4e3),
	tiktok: String(input?.tiktok || "").slice(0, 4e3)
})).handler(pullSocial_createServerFn_handler, async ({ data }) => {
	const rows = [];
	const notes = [];
	if (data.facebook) try {
		const pages = await fetch(`https://graph.facebook.com/v23.0/me/accounts?fields=id,name,fan_count,followers_count,access_token&access_token=${encodeURIComponent(data.facebook)}`, { signal: AbortSignal.timeout(8e3) });
		const body = await pages.json();
		if (!pages.ok) notes.push(body.error?.message || "Facebook did not return pages.");
		const page = body.data?.[0];
		if (page?.id) {
			rows.push({
				id: "facebook",
				handle: page.name || "Facebook",
				followers: Number(page.followers_count || page.fan_count) || 0,
				following: 0,
				likes: Number(page.fan_count) || 0,
				comments: 0,
				views: 0
			});
			const account = (await (await fetch(`https://graph.facebook.com/v23.0/${page.id}?fields=instagram_business_account{username,followers_count,follows_count,media_count}&access_token=${encodeURIComponent(page.access_token || data.facebook)}`, { signal: AbortSignal.timeout(8e3) })).json()).instagram_business_account;
			if (account) rows.push({
				id: "instagram",
				handle: account.username ? `@${account.username}` : "Instagram",
				followers: Number(account.followers_count) || 0,
				following: Number(account.follows_count) || 0,
				likes: 0,
				comments: 0,
				views: Number(account.media_count) || 0
			});
		}
	} catch {
		notes.push("Facebook did not answer.");
	}
	const youtubeKey = data.youtube || processModule.env.YOUTUBE_DATA_V3_API_KEY || processModule.env.YOUTUBE_API_KEY || "";
	if (youtubeKey && data.youtubeHandle && data.youtubeHandle !== "yourhandle") try {
		const body = await (await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=${encodeURIComponent(data.youtubeHandle)}&key=${encodeURIComponent(youtubeKey)}`, { signal: AbortSignal.timeout(8e3) })).json();
		const channel = body.items?.[0];
		if (channel?.statistics) rows.push({
			id: "youtube",
			handle: `@${data.youtubeHandle}`,
			followers: Number(channel.statistics.subscriberCount) || 0,
			following: 0,
			likes: Number(channel.statistics.videoCount) || 0,
			comments: 0,
			views: Number(channel.statistics.viewCount) || 0
		});
		else notes.push(body.error?.message || "YouTube channel was not found.");
	} catch {
		notes.push("YouTube did not answer.");
	}
	if (data.reddit && data.reddit !== "yourhandle") try {
		const body = await (await fetch(`https://www.reddit.com/user/${encodeURIComponent(data.reddit)}/about.json`, {
			headers: { "User-Agent": "LifeOS/1.0" },
			signal: AbortSignal.timeout(8e3)
		})).json();
		if (body.data) rows.push({
			id: "reddit",
			handle: `u/${data.reddit}`,
			followers: Number(body.data.subreddit?.subscribers || body.data.total_karma) || 0,
			following: 0,
			likes: Number(body.data.link_karma) || 0,
			comments: Number(body.data.comment_karma) || 0,
			views: 0
		});
	} catch {
		notes.push("Reddit did not answer.");
	}
	if (data.x) try {
		const body = await (await fetch("https://api.x.com/2/users/me?user.fields=public_metrics,username", {
			headers: { Authorization: `Bearer ${data.x}` },
			signal: AbortSignal.timeout(8e3)
		})).json();
		const metrics = body.data?.public_metrics;
		if (metrics) rows.push({
			id: "x",
			handle: body.data?.username ? `@${body.data.username}` : "@x",
			followers: Number(metrics.followers_count) || 0,
			following: Number(metrics.following_count) || 0,
			likes: Number(metrics.like_count) || 0,
			comments: 0,
			views: Number(metrics.tweet_count) || 0
		});
		else notes.push(body.detail || "X did not return account numbers.");
	} catch {
		notes.push("X did not answer.");
	}
	if (data.linkedin) try {
		const response = await fetch("https://api.linkedin.com/v2/userinfo", {
			headers: { Authorization: `Bearer ${data.linkedin}` },
			signal: AbortSignal.timeout(8e3)
		});
		const body = await response.json();
		if (response.ok) rows.push({
			id: "linkedin",
			handle: body.name || "LinkedIn",
			followers: 0,
			following: 0,
			likes: 0,
			comments: 0,
			views: 0
		});
		else notes.push(body.error || "LinkedIn did not return the profile.");
	} catch {
		notes.push("LinkedIn did not answer.");
	}
	if (data.tiktok) try {
		const body = await (await fetch("https://open.tiktokapis.com/v2/user/info/?fields=username,follower_count,following_count,likes_count,video_count", {
			headers: { Authorization: `Bearer ${data.tiktok}` },
			signal: AbortSignal.timeout(8e3)
		})).json();
		const user = body.data?.user;
		if (user) rows.push({
			id: "tiktok",
			handle: user.username ? `@${user.username}` : "@tiktok",
			followers: Number(user.follower_count) || 0,
			following: Number(user.following_count) || 0,
			likes: Number(user.likes_count) || 0,
			comments: 0,
			views: Number(user.video_count) || 0
		});
		else notes.push(body.error?.message || "TikTok did not return account numbers.");
	} catch {
		notes.push("TikTok did not answer.");
	}
	if (!rows.length && !notes.length) notes.push("Connect Facebook, or add the X, LinkedIn, TikTok, YouTube, or Reddit account, then sync.");
	return {
		rows,
		note: notes.join(" ")
	};
});
var publishSocial_createServerFn_handler = createServerRpc({
	id: "a58fe346b7eafd010f0b04e0a1fc2ea5a456b73076fa8465dc2af09bc9f15d7c",
	name: "publishSocial",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => publishSocial.__executeServer(opts));
var publishSocial = createServerFn({ method: "POST" }).validator((input) => ({
	text: String(input?.text || "").trim().slice(0, 5e3),
	platforms: (Array.isArray(input?.platforms) ? input.platforms : []).map((item) => String(item)).filter(Boolean).slice(0, 8),
	facebook: String(input?.facebook || "").slice(0, 4e3),
	image: String(input?.image || "").trim().slice(0, 2e3),
	x: String(input?.x || "").slice(0, 4e3),
	linkedin: String(input?.linkedin || "").slice(0, 4e3),
	redditToken: String(input?.redditToken || "").slice(0, 4e3),
	subreddit: String(input?.subreddit || "").replace(/^r\//i, "").slice(0, 40),
	tiktok: String(input?.tiktok || "").slice(0, 4e3)
})).handler(publishSocial_createServerFn_handler, async ({ data }) => {
	const sent = [];
	const notes = [];
	const want = new Set(data.platforms);
	if (!data.text) return {
		sent,
		note: "Write the post first."
	};
	if ((want.has("facebook") || want.has("instagram")) && !data.facebook) notes.push("Reconnect Facebook in Integrations. Posting needs a fresh connect.");
	if ((want.has("facebook") || want.has("instagram")) && data.facebook) try {
		const pages = await fetch(`https://graph.facebook.com/v23.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(data.facebook)}`, { signal: AbortSignal.timeout(8e3) });
		const body = await pages.json();
		const page = body.data?.find((row) => row.id && row.access_token);
		if (!pages.ok || !page) notes.push(body.error?.message || "No Facebook page is on this login.");
		else {
			if (want.has("facebook")) {
				const posted = await fetch(`https://graph.facebook.com/v23.0/${page.id}/feed`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						message: data.text,
						access_token: page.access_token
					}),
					signal: AbortSignal.timeout(8e3)
				});
				const result = await posted.json();
				if (posted.ok && result.id) sent.push("Facebook");
				else notes.push(result.error?.message || "Facebook refused the post.");
			}
			if (want.has("instagram")) {
				const instagram = await (await fetch(`https://graph.facebook.com/v23.0/${page.id}?fields=instagram_business_account&access_token=${encodeURIComponent(page.access_token || "")}`, { signal: AbortSignal.timeout(8e3) })).json();
				const igId = instagram.instagram_business_account?.id;
				if (!igId) notes.push(instagram.error?.message || "That Facebook page has no Instagram account.");
				else if (!/^https?:\/\//i.test(data.image)) notes.push("Instagram needs a public image URL.");
				else {
					const container = await fetch(`https://graph.facebook.com/v23.0/${igId}/media`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							image_url: data.image,
							caption: data.text,
							access_token: page.access_token
						}),
						signal: AbortSignal.timeout(12e3)
					});
					const made = await container.json();
					if (!container.ok || !made.id) notes.push(made.error?.message || "Instagram did not take the image.");
					else {
						const live = await fetch(`https://graph.facebook.com/v23.0/${igId}/media_publish`, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								creation_id: made.id,
								access_token: page.access_token
							}),
							signal: AbortSignal.timeout(12e3)
						});
						const published = await live.json();
						if (live.ok && published.id) sent.push("Instagram");
						else notes.push(published.error?.message || "Instagram did not publish.");
					}
				}
			}
		}
	} catch {
		notes.push("Facebook did not answer.");
	}
	if (want.has("x")) {
		if (!data.x) notes.push("Add the X user token in Integrations.");
		else try {
			const posted = await fetch("https://api.x.com/2/tweets", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${data.x}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ text: data.text.slice(0, 280) }),
				signal: AbortSignal.timeout(8e3)
			});
			const body = await posted.json();
			if (posted.ok && body.data?.id) sent.push("X");
			else notes.push(body.detail || body.title || "X refused the post.");
		} catch {
			notes.push("X did not answer.");
		}
	}
	if (want.has("linkedin")) {
		if (!data.linkedin) notes.push("Add the LinkedIn token in Integrations.");
		else try {
			const who = await (await fetch("https://api.linkedin.com/v2/userinfo", {
				headers: { Authorization: `Bearer ${data.linkedin}` },
				signal: AbortSignal.timeout(8e3)
			})).json();
			if (!who.sub) notes.push("LinkedIn token was refused.");
			else {
				const posted = await fetch("https://api.linkedin.com/rest/posts", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${data.linkedin}`,
						"Content-Type": "application/json",
						"LinkedIn-Version": "202607",
						"X-Restli-Protocol-Version": "2.0.0"
					},
					body: JSON.stringify({
						author: `urn:li:person:${who.sub}`,
						commentary: data.text,
						visibility: "PUBLIC",
						distribution: {
							feedDistribution: "MAIN_FEED",
							targetEntities: [],
							thirdPartyDistributionChannels: []
						},
						lifecycleState: "PUBLISHED",
						isReshareDisabledByAuthor: false
					}),
					signal: AbortSignal.timeout(1e4)
				});
				if (posted.ok || posted.status === 201) sent.push("LinkedIn");
				else notes.push("LinkedIn refused the post.");
			}
		} catch {
			notes.push("LinkedIn did not answer.");
		}
	}
	if (want.has("reddit")) {
		if (!data.redditToken) notes.push("Add the Reddit token in Integrations.");
		else if (!data.subreddit) notes.push("Enter a subreddit.");
		else try {
			const posted = await fetch("https://oauth.reddit.com/api/submit", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${data.redditToken}`,
					"User-Agent": "LifeOS/1.0",
					"Content-Type": "application/x-www-form-urlencoded"
				},
				body: new URLSearchParams({
					sr: data.subreddit,
					kind: "self",
					title: data.text.slice(0, 300),
					text: data.text,
					api_type: "json"
				}),
				signal: AbortSignal.timeout(1e4)
			});
			const errors = (await posted.json()).json?.errors || [];
			if (posted.ok && !errors.length) sent.push("Reddit");
			else notes.push("Reddit refused the post.");
		} catch {
			notes.push("Reddit did not answer.");
		}
	}
	if (want.has("tiktok")) {
		if (!data.tiktok) notes.push("Add the TikTok token in Integrations.");
		else if (!/^https?:\/\//i.test(data.image)) notes.push("TikTok needs a public image URL.");
		else try {
			const posted = await fetch("https://open.tiktokapis.com/v2/post/publish/content/init/", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${data.tiktok}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					post_info: {
						title: data.text.slice(0, 90),
						description: data.text.slice(0, 4e3),
						privacy_level: "PUBLIC_TO_EVERYONE"
					},
					source_info: {
						source: "PULL_FROM_URL",
						photo_cover_index: 0,
						photo_images: [data.image]
					},
					post_mode: "DIRECT_POST",
					media_type: "PHOTO"
				}),
				signal: AbortSignal.timeout(12e3)
			});
			const body = await posted.json();
			if (posted.ok && body.data?.publish_id) sent.push("TikTok");
			else notes.push(body.error?.message || "TikTok refused the post.");
		} catch {
			notes.push("TikTok did not answer.");
		}
	}
	if (want.has("youtube")) notes.push("YouTube does not accept a text post. Use Sync for the channel numbers.");
	if (want.has("snapchat")) notes.push("Snapchat has no post API. The account can still be tracked by hand.");
	return {
		sent,
		note: [...sent.length ? [`Posted to ${sent.join(" and ")}.`] : [], ...notes].join(" ") || "Nothing was sent."
	};
});
function dayStamp(daysAgo) {
	return (/* @__PURE__ */ new Date(Date.now() - daysAgo * 864e5)).toISOString().slice(0, 10);
}
var pullAnalytics_createServerFn_handler = createServerRpc({
	id: "ce35a548154c9b90a7e2f45d464930c682285d901f4de8762fe1b758b3c1ab96",
	name: "pullAnalytics",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => pullAnalytics.__executeServer(opts));
var pullAnalytics = createServerFn({ method: "POST" }).validator((input) => ({
	google: String(input?.google || "").slice(0, 4e3),
	property: String(input?.property || "").replace(/\D/g, "").slice(0, 20),
	site: String(input?.site || "").trim().slice(0, 200),
	facebook: String(input?.facebook || "").slice(0, 4e3),
	x: String(input?.x || "").slice(0, 4e3),
	linkedin: String(input?.linkedin || "").slice(0, 4e3),
	tiktok: String(input?.tiktok || "").slice(0, 4e3),
	bdKey: String(input?.bdKey || "").slice(0, 200),
	bdSite: String(input?.bdSite || "").trim().slice(0, 200),
	godaddy: String(input?.godaddy || "").slice(0, 200),
	godaddySecret: String(input?.godaddySecret || "").slice(0, 200)
})).handler(pullAnalytics_createServerFn_handler, async ({ data }) => {
	const rows = [];
	const notes = [];
	if (data.google && data.property) try {
		const live = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${data.property}:runRealtimeReport`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${data.google}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ metrics: [{ name: "activeUsers" }] }),
			signal: AbortSignal.timeout(1e4)
		});
		const body = await live.json();
		if (live.ok) rows.push({
			id: "ga-live",
			label: "GA active now",
			value: Number(body.rows?.[0]?.metricValues?.[0]?.value) || 0,
			points: []
		});
		else notes.push(body.error?.message || "Google Analytics refused the property.");
		const points = ((await (await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${data.property}:runReport`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${data.google}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				dateRanges: [{
					startDate: "7daysAgo",
					endDate: "today"
				}],
				metrics: [{ name: "sessions" }],
				dimensions: [{ name: "date" }]
			}),
			signal: AbortSignal.timeout(1e4)
		})).json()).rows || []).map((row) => Number(row.metricValues?.[0]?.value) || 0);
		if (points.length) rows.push({
			id: "ga-sessions",
			label: "GA sessions",
			value: points.reduce((sum, point) => sum + point, 0),
			points
		});
	} catch {
		notes.push("Google Analytics did not answer.");
	}
	else if (!data.property) notes.push("Add the GA4 property ID.");
	else notes.push("Reconnect Google so Analytics and Search Console are allowed.");
	if (data.google && data.site) try {
		const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(data.site)}/searchAnalytics/query`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${data.google}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				startDate: dayStamp(10),
				endDate: dayStamp(2),
				dimensions: ["date"],
				rowLimit: 10
			}),
			signal: AbortSignal.timeout(1e4)
		});
		const body = await response.json();
		if (!response.ok) notes.push(body.error?.message || "Search Console refused that site.");
		else {
			const clicks = (body.rows || []).map((row) => Number(row.clicks) || 0);
			const impressions = (body.rows || []).map((row) => Number(row.impressions) || 0);
			if (clicks.length) rows.push({
				id: "gsc-clicks",
				label: "Search clicks",
				value: clicks.reduce((sum, point) => sum + point, 0),
				points: clicks
			});
			if (impressions.length) rows.push({
				id: "gsc-impressions",
				label: "Search impressions",
				value: impressions.reduce((sum, point) => sum + point, 0),
				points: impressions
			});
		}
	} catch {
		notes.push("Search Console did not answer.");
	}
	if (data.facebook) try {
		const body = await (await fetch(`https://graph.facebook.com/v23.0/me/accounts?fields=id,name,fan_count,followers_count,access_token&access_token=${encodeURIComponent(data.facebook)}`, { signal: AbortSignal.timeout(8e3) })).json();
		const page = body.data?.[0];
		if (!page?.id) notes.push(body.error?.message || "No Facebook page on this login.");
		else {
			rows.push({
				id: "fb-followers",
				label: "Facebook followers",
				value: Number(page.followers_count || page.fan_count) || 0,
				points: []
			});
			const stats = await (await fetch(`https://graph.facebook.com/v23.0/${page.id}/insights?metric=page_impressions,page_post_engagements&period=day&access_token=${encodeURIComponent(page.access_token || data.facebook)}`, { signal: AbortSignal.timeout(8e3) })).json();
			for (const metric of stats.data || []) {
				const points = (metric.values || []).map((item) => Number(item.value) || 0).slice(-7);
				if (!points.length) continue;
				rows.push({
					id: metric.name === "page_post_engagements" ? "fb-engagement" : "fb-impressions",
					label: metric.name === "page_post_engagements" ? "Facebook engagement" : "Facebook impressions",
					value: points.at(-1) || 0,
					points
				});
			}
			const account = (await (await fetch(`https://graph.facebook.com/v23.0/${page.id}?fields=instagram_business_account{followers_count,media_count}&access_token=${encodeURIComponent(page.access_token || data.facebook)}`, { signal: AbortSignal.timeout(8e3) })).json()).instagram_business_account;
			if (account?.id) {
				rows.push({
					id: "ig-followers",
					label: "Instagram followers",
					value: Number(account.followers_count) || 0,
					points: []
				});
				const reachBody = await (await fetch(`https://graph.facebook.com/v23.0/${account.id}/insights?metric=reach&period=day&metric_type=total_value&access_token=${encodeURIComponent(page.access_token || data.facebook)}`, { signal: AbortSignal.timeout(8e3) })).json();
				const value = Number(reachBody.data?.[0]?.total_value?.value);
				if (Number.isFinite(value)) rows.push({
					id: "ig-reach",
					label: "Instagram reach",
					value,
					points: []
				});
			}
		}
	} catch {
		notes.push("Facebook did not answer.");
	}
	if (data.x) try {
		const body = await (await fetch("https://api.x.com/2/users/me?user.fields=public_metrics", {
			headers: { Authorization: `Bearer ${data.x}` },
			signal: AbortSignal.timeout(8e3)
		})).json();
		const metrics = body.data?.public_metrics;
		if (metrics) {
			rows.push({
				id: "x-followers",
				label: "X followers",
				value: Number(metrics.followers_count) || 0,
				points: []
			});
			rows.push({
				id: "x-posts",
				label: "X posts",
				value: Number(metrics.tweet_count) || 0,
				points: []
			});
		} else notes.push(body.detail || "X did not return numbers.");
	} catch {
		notes.push("X did not answer.");
	}
	if (data.tiktok) try {
		const body = await (await fetch("https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count,video_count", {
			headers: { Authorization: `Bearer ${data.tiktok}` },
			signal: AbortSignal.timeout(8e3)
		})).json();
		const user = body.data?.user;
		if (user) {
			rows.push({
				id: "tt-followers",
				label: "TikTok followers",
				value: Number(user.follower_count) || 0,
				points: []
			});
			rows.push({
				id: "tt-likes",
				label: "TikTok likes",
				value: Number(user.likes_count) || 0,
				points: []
			});
		} else notes.push(body.error?.message || "TikTok did not return numbers.");
	} catch {
		notes.push("TikTok did not answer.");
	}
	if (data.linkedin) try {
		if ((await fetch("https://api.linkedin.com/v2/userinfo", {
			headers: { Authorization: `Bearer ${data.linkedin}` },
			signal: AbortSignal.timeout(8e3)
		})).ok) rows.push({
			id: "li-connected",
			label: "LinkedIn",
			value: 1,
			points: []
		});
		else notes.push("LinkedIn token was refused. Member analytics are not on this key.");
	} catch {
		notes.push("LinkedIn did not answer.");
	}
	if (data.bdKey && data.bdSite) {
		const site = /^https?:/i.test(data.bdSite) ? data.bdSite.replace(/\/$/, "") : `https://${data.bdSite.replace(/\/$/, "")}`;
		for (const [path, id, label] of [[
			"user",
			"bd-members",
			"Directory members"
		], [
			"leads",
			"bd-leads",
			"Directory leads"
		]]) try {
			const response = await fetch(`${site}/api/v2/${path}/count`, {
				headers: { "X-Api-Key": data.bdKey },
				signal: AbortSignal.timeout(1e4)
			});
			const body = await response.json();
			if (response.ok) rows.push({
				id,
				label,
				value: Number(body.total ?? body.count) || 0,
				points: []
			});
			else notes.push(body.message || "Brilliant Directories refused the key.");
		} catch {
			notes.push("Brilliant Directories did not answer.");
		}
	}
	if (data.godaddy) try {
		const auth = data.godaddySecret ? `sso-key ${data.godaddy}:${data.godaddySecret}` : `Bearer ${data.godaddy}`;
		const response = await fetch("https://api.godaddy.com/v1/domains?statuses=ACTIVE&limit=100", {
			headers: {
				Authorization: auth,
				Accept: "application/json"
			},
			signal: AbortSignal.timeout(1e4)
		});
		const body = await response.json();
		if (!response.ok || !Array.isArray(body)) notes.push(body.message || "GoDaddy has no website analytics API. Domain list was refused.");
		else rows.push({
			id: "gd-domains",
			label: "GoDaddy domains",
			value: body.length,
			points: []
		});
	} catch {
		notes.push("GoDaddy did not answer.");
	}
	return {
		rows,
		note: notes.join(" ")
	};
});
var COMMUNITY = [
	{
		id: "nextdoor",
		label: "Nextdoor",
		query: (service, city) => `site:nextdoor.com ("looking for" OR "need a" OR "anyone know" OR "recommendations") ${service}${city ? ` ${city}` : ""}`
	},
	{
		id: "facebook",
		label: "Facebook groups",
		query: (service, city) => `site:facebook.com/groups ("looking for" OR "need a" OR "recommendations") ${service}${city ? ` ${city}` : ""}`
	},
	{
		id: "reddit",
		label: "Reddit",
		query: (service, city) => `site:reddit.com ("looking for" OR "need a" OR "recommendations") ${service}${city ? ` ${city}` : ""}`
	},
	{
		id: "offerup",
		label: "OfferUp",
		query: (service, city) => `site:offerup.com ${service}${city ? ` ${city}` : ""}`
	}
];
var findCommunity_createServerFn_handler = createServerRpc({
	id: "75fea98bf27623791051f47a2fee58403af52c371f1ac5ec85335b11de220752",
	name: "findCommunity",
	filename: "src/lib/lifeos/sync.ts"
}, (opts) => findCommunity.__executeServer(opts));
var findCommunity = createServerFn({ method: "POST" }).validator((input) => ({
	service: String(input?.service || "").trim().slice(0, 80),
	city: String(input?.city || "").trim().slice(0, 40),
	sources: (Array.isArray(input?.sources) ? input.sources : []).map((item) => String(item)).slice(0, 6),
	groups: (Array.isArray(input?.groups) ? input.groups : []).map((row) => ({
		label: String(row?.label || "").slice(0, 80),
		url: String(row?.url || "").slice(0, 240)
	})).filter((row) => /facebook\.com\/groups\//i.test(row.url)).slice(0, 20)
})).handler(findCommunity_createServerFn_handler, async ({ data }) => {
	if (!data.service) return {
		posts: [],
		note: "Type the service people are asking for."
	};
	const want = new Set(data.sources.length ? data.sources : COMMUNITY.map((row) => row.id).concat("craigslist"));
	const city = /^(national|usa|us|all)$/i.test(data.city) ? "" : data.city;
	const jobs = [];
	for (const source of COMMUNITY) {
		if (!want.has(source.id)) continue;
		jobs.push(duckResults(source.query(data.service, city), 5).then((hits) => hits.map((hit) => ({
			title: hit.title,
			url: hit.url,
			snippet: hit.snippet.replace(/^DuckDuckGo · /, ""),
			source: source.label
		}))));
	}
	if (want.has("facebook")) for (const group of data.groups) {
		const slug = group.url.split("/groups/")[1]?.split(/[/?#]/)[0] || "";
		if (!slug) continue;
		jobs.push(duckResults(`site:facebook.com/groups/${slug} ("looking for" OR "need" OR "recommend") ${data.service}`, 4).then((hits) => hits.map((hit) => ({
			title: hit.title,
			url: hit.url,
			snippet: hit.snippet.replace(/^DuckDuckGo · /, ""),
			source: group.label || slug
		}))));
	}
	if (want.has("craigslist")) {
		jobs.push(duckResults(`site:craigslist.org ("looking for" OR "need a" OR "wanted") ${data.service}${city ? ` ${city}` : ""}`, 6).then((hits) => hits.map((hit) => ({
			title: hit.title,
			url: hit.url,
			snippet: hit.snippet.replace(/^DuckDuckGo · /, ""),
			source: "Craigslist"
		}))));
		if (city) {
			const town = city.toLowerCase().split(",")[0].trim().replace(/[^a-z]/g, "") || "";
			if (town) jobs.push((async () => {
				const posts = [];
				for (const section of [
					"ccc",
					"hss",
					"bbb"
				]) try {
					const response = await fetch(`https://${town}.craigslist.org/search/${section}?query=${encodeURIComponent(data.service)}&format=rss`, {
						headers: { "User-Agent": "LifeOS/1.0" },
						signal: AbortSignal.timeout(8e3)
					});
					if (!response.ok) continue;
					const xml = await response.text();
					for (const item of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
						const block = item[1];
						const title = searchText(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");
						const url = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "").trim();
						const snippet = searchText(block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || "").slice(0, 180);
						if (!title || !url.startsWith("http")) continue;
						posts.push({
							title: title.slice(0, 140),
							url: url.slice(0, 400),
							snippet,
							source: "Craigslist"
						});
						if (posts.length >= 8) return posts;
					}
				} catch {}
				return posts;
			})());
		}
	}
	const settled = await Promise.all(jobs);
	const seen = /* @__PURE__ */ new Set();
	const posts = settled.flat().filter((row) => {
		if (!row.url || seen.has(row.url)) return false;
		seen.add(row.url);
		return true;
	}).slice(0, 40);
	return {
		posts,
		note: posts.length ? "" : "No public posts matched. Facebook only returns posts those groups already make public."
	};
});
//#endregion
export { askNyx_createServerFn_handler, cloneVoice_createServerFn_handler, composeSong_createServerFn_handler, editPicture_createServerFn_handler, findCommunity_createServerFn_handler, findIdeas_createServerFn_handler, findPictures_createServerFn_handler, freeImage_createServerFn_handler, googleCalendar_createServerFn_handler, inspectSite_createServerFn_handler, locateArea_createServerFn_handler, lookup_createServerFn_handler, makeClip_createServerFn_handler, makePicture_createServerFn_handler, marketQuotes_createServerFn_handler, publishSocial_createServerFn_handler, pullAnalytics_createServerFn_handler, pullBoard_createServerFn_handler, pullCalendar_createServerFn_handler, pullChats_createServerFn_handler, pullSocial_createServerFn_handler, pushBoard_createServerFn_handler, reverseImage_createServerFn_handler, sendChat_createServerFn_handler, speakVoice_createServerFn_handler, telegramBot_createServerFn_handler, wanClip_createServerFn_handler, watchQuote_createServerFn_handler, youtubeSearch_createServerFn_handler };
