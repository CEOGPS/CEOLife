import { n as createServerFn } from "./ssr.mjs";
import { a as createSsrRpc } from "./env-keys-B504YYo8.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/sync-B1-Awm_c.js
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function device(value) {
	const id = String(value || "").trim();
	if (!UUID.test(id)) throw new Error("bad device");
	return id;
}
var pullBoard = createServerFn({ method: "POST" }).validator((id) => device(id)).handler(createSsrRpc("9cfd941d8bd78387fd8ebfd76a9afcdc28769fb6babc222e81c215898baad78d"));
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
}).handler(createSsrRpc("e9d0e0346919adc719a37f581ec9395ad24ad1eb656a639fc7e8b18935b9e094"));
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
}).handler(createSsrRpc("be998f075e8d8075f9256b47a873c47f348a89d05e1a44a2b1d2fda9bdde3b96"));
var speakVoice = createServerFn({ method: "POST" }).validator((input) => ({
	text: String(input?.text || "").trim().slice(0, 500),
	key: String(input?.key || "").trim().slice(0, 400),
	voice: String(input?.voice || "").trim().slice(0, 80)
})).handler(createSsrRpc("e58b3eddb041f4d9d956847f2ba9cb9d1a5fc19f8e2f9a60c18e299d98e7229c"));
var cloneVoice = createServerFn({ method: "POST" }).validator((input) => ({
	name: String(input?.name || "").trim().slice(0, 40),
	audio: String(input?.audio || "").slice(0, 8e6),
	type: String(input?.type || "audio/mpeg").slice(0, 60),
	key: String(input?.key || "").trim().slice(0, 400)
})).handler(createSsrRpc("73684b61ea46f70be74bae3b953b25b6a70fb4f2055e206dd4df709b737bc0e2"));
var composeSong = createServerFn({ method: "POST" }).validator((input) => ({
	title: String(input?.title || "").trim().slice(0, 80),
	style: String(input?.style || "").trim().slice(0, 240),
	lyrics: String(input?.lyrics || "").trim().slice(0, 2500),
	instrumental: Boolean(input?.instrumental),
	key: String(input?.key || "").trim().slice(0, 400),
	engine: input?.engine === "ace" ? "ace" : "eleven",
	replicate: String(input?.replicate || "").trim().slice(0, 400),
	job: String(input?.job || "").trim().slice(0, 80)
})).handler(createSsrRpc("d73d2b54a81f1b75bc9256eb4ce9b725555d863cef2565a8e2a8aabfd4b7a040"));
var pullCalendar = createServerFn({ method: "GET" }).handler(createSsrRpc("6e730b5e9c79d56d3084b2c9fd82075b3340881ff5d3c704b46fd5daecee1ed3"));
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
})).handler(createSsrRpc("0b8b94a3630c6e896d2ee5afefdb6590d24dabd7c46648ea0170941be9bc7978"));
var makePicture = createServerFn({ method: "POST" }).validator((input) => ({
	prompt: String(input?.prompt || "").trim().slice(0, 500),
	key: String(input?.key || "").trim().slice(0, 400)
})).handler(createSsrRpc("9c95b7f220d8c052f8115d09667283584724acc1b7aaa4c6ac7bde38dd268921"));
var editPicture = createServerFn({ method: "POST" }).validator((input) => ({
	prompt: String(input?.prompt || "").trim().slice(0, 800),
	image: String(input?.image || "").trim().slice(0, 2e3),
	key: String(input?.key || "").trim().slice(0, 400),
	id: String(input?.id || "").trim().slice(0, 80)
})).handler(createSsrRpc("4a81d92ef559122cb98b92e0f843a426d96bacb759cc9bfff87727a19309c420"));
var freeImage = createServerFn({ method: "POST" }).validator((input) => ({
	prompt: String(input?.prompt || "").trim().slice(0, 500),
	account: String(input?.account || "").trim().slice(0, 40),
	token: String(input?.token || "").trim().slice(0, 200)
})).handler(createSsrRpc("007c72a4dbd468f7bb947acf662864cef1a2bfed12e93a8f5782a8621f07d6fb"));
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
})).handler(createSsrRpc("7cb23775ad14054a9572c492df202c42208a37e723293b4d3a20df7a50f030b9"));
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
})).handler(createSsrRpc("9ad8776f168300649487079d53253432a6c42d6987f33a92cb55b9ea910f8e57"));
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
}).handler(createSsrRpc("38f8f2a469e57d261180d3f0ea9ac7084e07cf1e7d439820a2e9770e37204b40"));
var inspectSite = createServerFn({ method: "POST" }).validator((url) => {
	const value = String(url || "").trim();
	if (!/^https?:\/\//i.test(value)) throw new Error("Use a full http URL");
	return value.slice(0, 300);
}).handler(createSsrRpc("cd3883a970f8e2f887ab53797e5002b6e3983b5de87fd5854bf0cf74a04ac86d"));
createServerFn({ method: "POST" }).validator((input) => ({
	query: String(input?.query || "").trim().slice(0, 80),
	kind: input?.kind === "gif" ? "gif" : "photo"
})).handler(createSsrRpc("c4af2e8b020209dc0a6dd8a87ea4c0f3c451bb893ada4ac531de78e38b073aee"));
createServerFn({ method: "POST" }).validator((input) => ({
	url: /^https?:\/\//i.test(String(input?.url || "")) ? String(input?.url).trim().slice(0, 500) : "",
	dataUrl: String(input?.dataUrl || "").startsWith("data:image/") ? String(input?.dataUrl).slice(0, 9e5) : ""
})).handler(createSsrRpc("8e62ba3ef6b266603e88c7f4c03939952b46d175310dc965ed285cb6c6fdda96"));
createServerFn({ method: "GET" }).handler(createSsrRpc("c274fb50470cc764bd6b8820e7ba76ba609765a95571cff580bd590efe071b1b"));
var marketQuotes = createServerFn({ method: "GET" }).handler(createSsrRpc("aeb8ac7d5a55382a017f106d50eae6b4842b3c2aa620933bcee7615114751b44"));
var watchQuote = createServerFn({ method: "POST" }).validator((input) => ({
	symbol: String(input?.symbol || "").trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12),
	kind: input?.kind === "crypto" ? "crypto" : "stock"
})).handler(createSsrRpc("91b8a075fb0651eb6013b3fd24ffeee7acf6f68266783393650db798f75b7a04"));
var locateArea = createServerFn({ method: "POST" }).validator((input) => ({
	kind: input?.kind === "county" || input?.kind === "radius" || input?.kind === "place" ? input.kind : "zip",
	zip: String(input?.zip || "").trim().slice(0, 12),
	county: String(input?.county || "").trim().slice(0, 60),
	state: String(input?.state || "").trim().slice(0, 40),
	miles: String(input?.miles || "").trim().slice(0, 6),
	center: String(input?.center || "").trim().slice(0, 80),
	place: String(input?.place || "").trim().slice(0, 80)
})).handler(createSsrRpc("62cbb925365b416c89e8e966158d875058306e05ec23b825ccd475ffbe0c2445"));
var telegramBot = createServerFn({ method: "POST" }).validator((input) => ({
	token: String(input?.token || "").trim().slice(0, 120),
	chat: String(input?.chat || "").trim().slice(0, 40),
	text: String(input?.text || "").trim().slice(0, 500)
})).handler(createSsrRpc("539485e889577aab54db87aebfd8688294fb3a3d8cb62fc2fa74d23da3631a3b"));
createServerFn({ method: "POST" }).validator((input) => ({
	telegram: String(input?.telegram || "").trim().slice(0, 200),
	facebook: String(input?.facebook || "").trim().slice(0, 4e3)
})).handler(createSsrRpc("add788fa70ee908ed28dd48bae0a0e289995e09c335223b2efac41202998ddd7"));
createServerFn({ method: "POST" }).validator((input) => ({
	platform: String(input?.platform || "").slice(0, 20),
	route: String(input?.route || "").trim().slice(0, 400),
	text: String(input?.text || "").trim().slice(0, 500),
	telegram: String(input?.telegram || "").trim().slice(0, 200),
	facebook: String(input?.facebook || "").trim().slice(0, 4e3)
})).handler(createSsrRpc("0f5c9a16bbf75095ca6512ba55df08ca26aa7f743ecb79d0cf3178b914c8df41"));
var youtubeSearch = createServerFn({ method: "POST" }).validator((input) => ({
	query: String(input?.query || "").trim().slice(0, 120),
	key: String(input?.key || "").trim().slice(0, 200)
})).handler(createSsrRpc("75d661d7253a80bc7ed5f8f73061894a941ac4d4f5ab600880acf76c106ffe2e"));
var pullSocial = createServerFn({ method: "POST" }).validator((input) => ({
	facebook: String(input?.facebook || "").slice(0, 4e3),
	youtube: String(input?.youtube || "").slice(0, 200),
	youtubeHandle: String(input?.youtubeHandle || "").replace(/^@/, "").slice(0, 60),
	reddit: String(input?.reddit || "").replace(/^u\//i, "").replace(/^@/, "").slice(0, 40),
	x: String(input?.x || "").slice(0, 4e3),
	linkedin: String(input?.linkedin || "").slice(0, 4e3),
	tiktok: String(input?.tiktok || "").slice(0, 4e3)
})).handler(createSsrRpc("15e270b31a1e03cffcb2aaef1d66c411f05905ae11123cc8f6f2cc482334137e"));
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
})).handler(createSsrRpc("a58fe346b7eafd010f0b04e0a1fc2ea5a456b73076fa8465dc2af09bc9f15d7c"));
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
})).handler(createSsrRpc("ce35a548154c9b90a7e2f45d464930c682285d901f4de8762fe1b758b3c1ab96"));
var findCommunity = createServerFn({ method: "POST" }).validator((input) => ({
	service: String(input?.service || "").trim().slice(0, 80),
	city: String(input?.city || "").trim().slice(0, 40),
	sources: (Array.isArray(input?.sources) ? input.sources : []).map((item) => String(item)).slice(0, 6),
	groups: (Array.isArray(input?.groups) ? input.groups : []).map((row) => ({
		label: String(row?.label || "").slice(0, 80),
		url: String(row?.url || "").slice(0, 240)
	})).filter((row) => /facebook\.com\/groups\//i.test(row.url)).slice(0, 20)
})).handler(createSsrRpc("75fea98bf27623791051f47a2fee58403af52c371f1ac5ec85335b11de220752"));
//#endregion
export { askNyx, cloneVoice, composeSong, editPicture, findCommunity, freeImage, googleCalendar, inspectSite, locateArea, lookup, makeClip, makePicture, marketQuotes, publishSocial, pullAnalytics, pullBoard, pullCalendar, pullSocial, pushBoard, speakVoice, telegramBot, wanClip, watchQuote, youtubeSearch };
