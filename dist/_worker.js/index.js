globalThis.__nitro_main__ = import.meta.url;
import { i as toEventHandler, n as HTTPError, o as FastResponse, r as defineLazyEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import processModule from "node:process";
import { Buffer } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region scripts/install-page.html?raw
var install_page_default = "<!DOCTYPE html>\n<html lang=\"en\" class=\"device-desktop\">\n  <head>\n    <meta charset=\"utf-8\" />\n    <meta\n      name=\"viewport\"\n      content=\"width=device-width, initial-scale=1, viewport-fit=cover\"\n    />\n    <meta name=\"color-scheme\" content=\"dark\" />\n    <meta name=\"theme-color\" content=\"#000000\" />\n    <meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black\" />\n    <meta name=\"apple-mobile-web-app-title\" content=\"{{APP_NAME}}\" />\n    <title>Add {{APP_NAME}} to your Home Screen</title>\n    <link rel=\"manifest\" href=\"/__grok/manifest.webmanifest\" />\n    <link rel=\"apple-touch-icon\" href=\"/__grok/icon-180.png\" />\n    <link rel=\"stylesheet\" href=\"/__grok/install/styles.css\" />\n    <script>\n      (function () {\n        var ua = navigator.userAgent || \"\";\n        var touch = navigator.maxTouchPoints || 0;\n        var isiPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1);\n        var isiPhone = /iPhone|iPod/.test(ua);\n        var isIOS = isiPhone || isiPad;\n        var isAndroid = /Android/i.test(ua);\n        var isAndroidPhone = isAndroid && /Mobile/i.test(ua);\n        var isAndroidTablet = isAndroid && !/Mobile/i.test(ua);\n        var minSide = Math.min(screen.width || 0, screen.height || 0);\n        var maxSide = Math.max(screen.width || 0, screen.height || 0);\n\n        var type = \"desktop\";\n        if (isiPhone) type = \"phone\";\n        else if (isiPad || isAndroidTablet) type = \"tablet\";\n        else if (isAndroidPhone) type = \"phone\";\n        else if (touch > 0 && minSide > 0 && minSide <= 500) type = \"phone\";\n        else if (touch > 0 && minSide > 500 && maxSide <= 1400) type = \"tablet\";\n\n        var iosMajor = null;\n        var osToken = null;\n        var safariToken = null;\n        var iphoneOs = ua.match(/iPhone OS (\\d+)[._]/);\n        var ipadOs = ua.match(/CPU OS (\\d+)[._](\\d+) like Mac OS X/);\n        var safariVer = ua.match(/Version\\/(\\d+)[._]/);\n        if (iphoneOs) osToken = parseInt(iphoneOs[1], 10);\n        else if (ipadOs) osToken = parseInt(ipadOs[1], 10);\n        if (isIOS && safariVer) safariToken = parseInt(safariVer[1], 10);\n        if (osToken != null || safariToken != null) {\n          iosMajor = Math.max(osToken || 0, safariToken || 0);\n        }\n\n        var root = document.documentElement;\n        var classes = [\"device-\" + type];\n        if (iosMajor != null) {\n          root.dataset.ios = String(iosMajor);\n          classes.push(iosMajor >= 27 ? \"ios-27-plus\" : \"ios-below-27\");\n        }\n        root.className = classes.join(\" \");\n      })();\n    <\/script>\n  </head>\n  <body>\n    <div class=\"page\">\n      <header class=\"powered\" aria-label=\"Powered by Grok\">\n        <span class=\"powered-by\">Powered by</span>\n        <span class=\"powered-brand\">\n          <img\n            class=\"grok-logo\"\n            src=\"/__grok/install/assets/homescreen/logo-grok.svg\"\n            width=\"14\"\n            height=\"14\"\n            alt=\"\"\n          />\n          <span class=\"powered-grok\">Grok</span>\n        </span>\n      </header>\n\n      <main class=\"content\">\n        <div class=\"ob\" aria-hidden=\"true\">\n          <img\n            class=\"ob-img ob-phone\"\n            src=\"/__grok/install/assets/homescreen/ob-phone.png\"\n            width=\"338\"\n            height=\"294\"\n            alt=\"\"\n          />\n          <img\n            class=\"ob-img ob-ipad\"\n            src=\"/__grok/install/assets/homescreen/ob-ipad.png\"\n            width=\"634\"\n            height=\"294\"\n            alt=\"\"\n          />\n        </div>\n\n        <section class=\"copy\">\n          <h1>Add {{APP_NAME}} to your&nbsp;Home&nbsp;Screen</h1>\n\n          <div class=\"steps\">\n            <p class=\"step step-tap step-ios27\">\n              <span class=\"muted\">Tap</span>\n              <span class=\"glass glass--icon\" aria-hidden=\"true\">\n                <img src=\"/__grok/install/assets/homescreen/glass-puzzle.svg\" width=\"24\" height=\"24\" alt=\"\" />\n              </span>\n              <span class=\"muted loc loc-phone\">in the bottom bar, then</span>\n              <span class=\"muted loc loc-ipad\">in the tool bar, then</span>\n              <span class=\"glass glass--icon\" aria-hidden=\"true\">\n                <img src=\"/__grok/install/assets/homescreen/glass-share.svg\" width=\"24\" height=\"24\" alt=\"\" />\n              </span>\n            </p>\n\n            <p class=\"step step-tap step-ios-legacy\">\n              <span class=\"muted\">Tap</span>\n              <span class=\"glass glass--icon\" aria-hidden=\"true\">\n                <img src=\"/__grok/install/assets/homescreen/glass-share.svg\" width=\"24\" height=\"24\" alt=\"\" />\n              </span>\n              <span class=\"muted loc loc-phone\">in the bottom bar</span>\n              <span class=\"muted loc loc-ipad\">in the tool bar</span>\n            </p>\n\n            <p class=\"step step-select\">\n              <span class=\"muted\">Select</span>\n              <span class=\"add-label\">\n                <img\n                  class=\"plus-icon\"\n                  src=\"/__grok/install/assets/homescreen/plus.svg\"\n                  width=\"16\"\n                  height=\"16\"\n                  alt=\"\"\n                />\n                <span class=\"add-text\">Add to Home Screen</span>\n              </span>\n            </p>\n          </div>\n        </section>\n      </main>\n\n      <main class=\"content content-desktop\">\n        <section class=\"copy\">\n          <h1>Open this link on your iPhone&nbsp;or&nbsp;iPad</h1>\n          <p class=\"desktop-note\">\n            This page shows how to add {{APP_NAME}} to an iOS Home Screen.\n          </p>\n          <a class=\"desktop-open\" href=\"{{APP_URL}}\">Open {{APP_NAME}}</a>\n        </section>\n      </main>\n    </div>\n  </body>\n</html>\n";
//#endregion
//#region \0virtual:grok-og-identity
var grokOgIdentity = { "site": {
	"title": "LifeOS",
	"card": "custom",
	"image": "/og.jpg"
} };
//#endregion
//#region scripts/grok-pwa-shared.mjs
/**
* Single source of truth for platform head chrome (PWA, extensions.js, OG),
* shared by the Vite plugin and Nitro middleware. Plain ESM so `node --test`
* and the Nitro bundler can both consume it.
*/
var DEFAULT_APP_NAME = "Grok App";
var OG_SITE_REL_PATH = "src/lib/og/site.json";
var SHARE_META_KEYS = /* @__PURE__ */ new Set([
	"og:title",
	"og:description",
	"og:image",
	"og:image:width",
	"og:image:height",
	"og:type",
	"og:url",
	"og:site_name",
	"twitter:card",
	"twitter:title",
	"twitter:image",
	"twitter:description",
	"x:game:image",
	"x:game:image:width",
	"x:game:image:height"
]);
function escapeHtml(value) {
	return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
}
/** Inverse of escapeHtml. Decode &amp; last so a single pass undoes one encode. */
function unescapeHtml(value) {
	return String(value).replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", "\"").replaceAll("&#39;", "'").replaceAll("&amp;", "&");
}
/** 6-digit hex for the og.grok.me placeholder, or "" if site.color is missing/invalid. */
function placeholderCardColor(site = {}) {
	const raw = String(site.color ?? "").trim();
	const hex = raw.startsWith("#") ? raw.slice(1) : raw;
	return /^[0-9a-fA-F]{6}$/.test(hex) ? hex : "";
}
/**
* "wild-race.grok.me" → "Wild Race". Only published app hosts encode the
* display name in the first label. Preview / guest hosts are image origins
* only — slugifying them produced internal names like "Hds Abc 3000 Xy".
*/
function appNameFromHost(hostHeader) {
	const host = String(hostHeader ?? "").split(",")[0].trim().split(":")[0].toLowerCase();
	if (!host.endsWith(".grok.me")) return DEFAULT_APP_NAME;
	const slug = host.split(".")[0] ?? "";
	if (!slug || slug === "www" || !/^[a-z0-9-]{1,63}$/.test(slug)) return DEFAULT_APP_NAME;
	return slug.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") || "Grok App";
}
/** True for Vercel system domains. Envoy rewrites origin Host to these; they SSO-protect `/og.jpg`. */
function isVercelSystemHost(host) {
	return host === "vercel.app" || host.endsWith(".vercel.app") || host === "vercel.com" || host.endsWith(".vercel.com");
}
/** Hostname suitable for absolute og:image URLs. Preview guests (X-Forwarded-Host) are allowed. */
function publicAppHost(hostHeader) {
	const host = String(hostHeader ?? "").split(",")[0].trim().split(":")[0].toLowerCase();
	if (!host || !/^[a-z0-9.-]+$/.test(host) || !host.includes(".")) return "";
	if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return "";
	if (isVercelSystemHost(host)) return "";
	return host;
}
/**
* Published apps always use `VITE_PUBLIC_HOSTNAME` (the grok.me host the
* deployer injects). Live preview has no such env, so fall back to the
* request host / X-Forwarded-Host. Never prefer request Host on a published
* app — Envoy rewrites it to `*.vercel.app`.
*/
function resolvePublicHost(hostHeader) {
	return publicAppHost(processModule.env?.VITE_PUBLIC_HOSTNAME) || publicAppHost(hostHeader);
}
function isInstallQuery(url) {
	const query = String(url ?? "").split("?", 2)[1] ?? "";
	const params = new URLSearchParams(query);
	const install = params.get("install");
	const platform = (params.get("platform") ?? "").toLowerCase();
	return (install === "1" || install === "true") && platform === "ios";
}
/** Paths that can carry an app document (vs assets / API / internals). */
function isDocumentPath(pathname) {
	const path = String(pathname ?? "");
	return !path.startsWith("/__grok/") && !path.startsWith("/api/") && !path.startsWith("/@") && !path.startsWith("/node_modules") && !/\.[a-z0-9]+$/i.test(path);
}
function acceptsHtml(accept) {
	const value = String(accept ?? "");
	return value === "" || value.includes("text/html") || value.includes("*/*");
}
/** The same URL without the install-tutorial params (used as the app link). */
function stripInstallParams(url) {
	const [path = "/", query = ""] = String(url ?? "/").split("?", 2);
	const params = new URLSearchParams(query);
	params.delete("install");
	params.delete("platform");
	const rest = params.toString();
	return rest ? `${path}?${rest}` : path;
}
function renderInstallPageHtml(template, { host, url } = {}) {
	return String(template).replaceAll("{{APP_NAME}}", escapeHtml(appNameFromHost(host))).replaceAll("{{APP_URL}}", escapeHtml(stripInstallParams(url)));
}
function renderWebManifest(hostHeader) {
	const name = appNameFromHost(hostHeader);
	return JSON.stringify({
		name,
		short_name: name,
		id: "/",
		start_url: "/",
		scope: "/",
		display: "standalone",
		background_color: "#000000",
		theme_color: "#000000",
		icons: [{
			src: "/__grok/icon-180.png",
			sizes: "180x180",
			type: "image/png"
		}]
	}, null, 2);
}
function grokPwaHeadTags(appName = DEFAULT_APP_NAME) {
	return [
		["manifest", "<link rel=\"manifest\" href=\"/__grok/manifest.webmanifest\">"],
		["apple-touch-icon", "<link rel=\"apple-touch-icon\" href=\"/__grok/icon-180.png\">"],
		["apple-mobile-web-app-title", `<meta name="apple-mobile-web-app-title" content="${escapeHtml(appName)}">`],
		["apple-mobile-web-app-status-bar-style", "<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black\">"],
		["theme-color", "<meta name=\"theme-color\" content=\"#000000\">"]
	];
}
var GROK_EXTENSIONS_SCRIPT_SRC = "https://grok.com/grok-app-builder/extensions.js";
function readGrokProjectId() {
	const fromProcess = typeof processModule !== "undefined" ? processModule.env?.VITE_PROJECT_ID : "";
	return String(fromProcess ?? "").trim();
}
function readGrokExtensionsEnabled() {
	const fromProcess = typeof processModule !== "undefined" ? processModule.env?.VITE_GROK_EXTENSIONS : "";
	return String(fromProcess ?? "").trim() !== "0";
}
function readXCreator() {
	const fromProcess = typeof processModule !== "undefined" ? processModule.env?.X_CREATOR : "";
	return String(fromProcess ?? "").trim();
}
function readXCreatorId() {
	const fromProcess = typeof processModule !== "undefined" ? processModule.env?.X_CREATOR_ID : "";
	return String(fromProcess ?? "").trim();
}
function grokXCreatorHeadTags(creator = readXCreator(), creatorId = readXCreatorId()) {
	const name = String(creator ?? "").trim();
	const id = String(creatorId ?? "").trim();
	if (!name || !id) return [];
	return [`<meta property="x:creator" content="${escapeHtml(name)}">`, `<meta property="x:creator:id" content="${escapeHtml(id)}">`];
}
/** Platform "Created with Grok" banner — injected into every HTML document. */
function grokExtensionsHeadTags(projectId = readGrokProjectId()) {
	const id = escapeHtml(projectId);
	const tags = [];
	if (projectId) tags.push(`<meta name="grok-project-id" content="${id}">`);
	if (!readGrokExtensionsEnabled()) return tags;
	tags.push(`<script src="${GROK_EXTENSIONS_SCRIPT_SRC}"${projectId ? ` data-project-id="${id}"` : ""} defer><\/script>`);
	return tags;
}
function readOgSite(cwd = processModule.cwd()) {
	try {
		const raw = readFileSync(join(cwd, OG_SITE_REL_PATH), "utf8");
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}
/** Public path of an on-disk share card, or "" if neither file exists. */
function ogCardPublicPath(cwd = processModule.cwd()) {
	if (existsSync(join(cwd, "public/og.jpg"))) return "/og.jpg";
	if (existsSync(join(cwd, "public/og.png"))) return "/og.png";
	return "";
}
function detectCustomOgCard(cwd = processModule.cwd(), site = {}) {
	if (ogCardPublicPath(cwd)) return true;
	return siteHasCustomCard(site) || Boolean(String(site.image ?? "").trim());
}
/** Snapshot for Vite/Nitro to bake into the server bundle (Vercel has no workspace FS). */
function snapshotOgIdentity(cwd = processModule.cwd()) {
	const site = { ...readOgSite(cwd) };
	const disk = ogCardPublicPath(cwd);
	if (disk) {
		site.card = "custom";
		site.image = disk;
	} else {
		if (siteHasCustomCard(site)) delete site.card;
		if (site.image) delete site.image;
	}
	if (existsSync(join(cwd, "public/x-banner.jpg"))) site.banner = site.banner || "/x-banner.jpg";
	return { site };
}
function ogServiceUrl() {
	return (String(processModule.env?.VITE_OG_SERVICE_URL ?? "").trim() || "https://og.grok.me").replace(/\/+$/, "");
}
function titleFromDocument(html) {
	const match = String(html ?? "").match(/<title\b[^>]*>([^<]*)<\/title>/i);
	return match ? unescapeHtml(match[1]).trim() : "";
}
function resolveOgTitle(site = {}, appName = DEFAULT_APP_NAME, host = "", documentTitle = "") {
	const fromSite = String(site.title ?? "").trim();
	if (fromSite) return fromSite;
	const fromDoc = String(documentTitle ?? "").trim();
	if (fromDoc) return fromDoc;
	const fromHost = appNameFromHost(host);
	if (fromHost && fromHost !== "Grok App") return fromHost;
	return String(appName ?? "").trim() || "Grok App";
}
function siteHasCustomCard(site = {}) {
	return String(site.card ?? "").toLowerCase() === "custom";
}
/**
* Preview: public/og.jpg|png on disk.
* Vercel: the bake (`card=custom` / `image`) because the function cannot stat public/.
* Otherwise empty — caller emits the og.grok.me placeholder.
*/
function resolveOgCardAsset(site = {}, cwd = processModule.cwd()) {
	return ogCardPublicPath(cwd) || (detectCustomOgCard(cwd, site) ? String(site.image ?? "").trim() || "/og.jpg" : "");
}
/** Stamp `card=custom` when public/og.jpg or public/og.png is on disk. */
function applyCustomCardFromFs(site, cwd) {
	const disk = ogCardPublicPath(cwd);
	if (!disk) return site;
	return {
		...site,
		card: "custom",
		image: disk
	};
}
function grokOgHeadTags({ host = "", appName = DEFAULT_APP_NAME, site = {}, documentTitle = "", cwd = processModule.cwd() } = {}) {
	const title = resolveOgTitle(site, appName, host, documentTitle);
	const publicHost = resolvePublicHost(host);
	const tags = [`<meta name="twitter:card" content="summary_large_image">`, `<meta property="og:title" content="${escapeHtml(title)}">`];
	const description = String(site.description ?? "").trim();
	if (description) tags.push(`<meta property="og:description" content="${escapeHtml(description)}">`);
	if (String(site.type ?? "").toLowerCase() === "x:game") tags.push(`<meta property="og:type" content="x:game">`);
	if (publicHost) {
		const asset = resolveOgCardAsset(site, cwd);
		const custom = Boolean(asset);
		let image = custom ? `https://${publicHost}${asset.startsWith("/") ? asset : `/${asset}`}` : `${ogServiceUrl()}/v1/card.png?host=${encodeURIComponent(publicHost)}&title=${encodeURIComponent(title)}`;
		const color = !custom ? placeholderCardColor(site) : "";
		if (color) image += `&color=${encodeURIComponent(color)}`;
		tags.push(`<meta property="og:image" content="${escapeHtml(image)}">`);
		tags.push(`<meta property="og:image:width" content="1200">`);
		tags.push(`<meta property="og:image:height" content="630">`);
		const banner = String(site.banner ?? "").trim();
		if (banner) {
			const bannerUrl = `https://${publicHost}${banner.startsWith("/") ? banner : `/${banner}`}`;
			tags.push(`<meta property="x:game:image" content="${escapeHtml(bannerUrl)}">`);
			tags.push(`<meta property="x:game:image:width" content="1200">`);
			tags.push(`<meta property="x:game:image:height" content="264">`);
		}
	}
	return tags;
}
function stripGrokExtensionsScript(html) {
	return String(html).replace(/<script\b[^>]*\bsrc\s*=\s*["'][^"']*\/grok-app-builder\/extensions\.js[^"']*["'][^>]*>\s*<\/script>/gi, "");
}
function stripShareMetaTags(html) {
	return String(html).replace(/<meta\b[^>]*>/gi, (tag) => {
		const attrs = [...tag.matchAll(/\b(?:property|name)\s*=\s*["']([^"']+)["']/gi)];
		for (const match of attrs) if (SHARE_META_KEYS.has(String(match[1]).toLowerCase())) return "";
		return tag;
	});
}
function insertAfterHeadOpen(html, snippet) {
	if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b[^>]*>/i, (open) => `${open}${snippet}`);
	if (/<html\b[^>]*>/i.test(html)) return html.replace(/<html\b[^>]*>/i, (open) => `${open}<head>${snippet}</head>`);
	return `<!doctype html><html><head>${snippet}</head>${html}`;
}
function insertBeforeHeadClose(html, snippet) {
	if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${snippet}</head>`);
	return insertAfterHeadOpen(html, snippet);
}
function normalizeHeadContext(ctx = {}) {
	const cwd = ctx.cwd ?? processModule.cwd();
	const site = applyCustomCardFromFs(ctx.site !== void 0 ? ctx.site : snapshotOgIdentity(cwd).site, cwd);
	return {
		appName: resolveOgTitle(site, ctx.appName ?? "Grok App", ctx.host ?? ""),
		projectId: ctx.projectId ?? readGrokProjectId(),
		creator: ctx.creator ?? readXCreator(),
		creatorId: ctx.creatorId ?? readXCreatorId(),
		host: ctx.host ?? "",
		cwd,
		site
	};
}
function injectGrokPwaHead(html, ctx = {}) {
	if (typeof html !== "string") return html;
	const { site, projectId, creator, creatorId, host, cwd } = normalizeHeadContext(ctx);
	const documentTitle = titleFromDocument(html);
	const appName = resolveOgTitle(site, ctx.appName ?? "Grok App", host, documentTitle);
	let next = stripShareMetaTags(html);
	if (!readGrokExtensionsEnabled()) next = stripGrokExtensionsScript(next);
	const missing = grokPwaHeadTags(appName).filter(([key]) => {
		if (key === "manifest") return !next.includes("href=\"/__grok/manifest.webmanifest\"");
		if (key === "apple-touch-icon") return !next.includes("href=\"/__grok/icon-180.png\"");
		return !next.includes(`name="${key}"`);
	}).map(([, tag]) => tag);
	next = insertAfterHeadOpen(next, grokOgHeadTags({
		host,
		appName,
		site,
		documentTitle,
		cwd
	}).join(""));
	if (readGrokExtensionsEnabled() && !next.includes("/grok-app-builder/extensions.js")) missing.push(...grokExtensionsHeadTags(projectId));
	else if (projectId && !next.includes("name=\"grok-project-id\"")) missing.push(`<meta name="grok-project-id" content="${escapeHtml(projectId)}">`);
	if (projectId && !next.includes("property=\"grok:app_id\"") && !next.includes("property='grok:app_id'")) missing.push(`<meta property="grok:app_id" content="${escapeHtml(projectId)}">`);
	const creatorTags = grokXCreatorHeadTags(creator, creatorId);
	if (creatorTags.length > 0) {
		if (!(next.includes("property=\"x:creator\" content=") || next.includes("property='x:creator' content="))) missing.push(creatorTags[0]);
		if (!next.includes("property=\"x:creator:id\"")) missing.push(creatorTags[1]);
	}
	if (missing.length === 0) return next;
	return insertBeforeHeadClose(next, missing.join(""));
}
function findHeadClose(buf) {
	return buf.toString("latin1").search(/<\/head>/i);
}
/**
* Streaming head injector: buffers only until `</head>` (ASCII marker; never
* appears inside a UTF-8 continuation byte), overwrites share-card metas,
* then passes later chunks through so streaming SSR keeps streaming.
*/
function createHeadInjector(ctx = {}) {
	const normalized = normalizeHeadContext(ctx);
	/** @type {Buffer[]} */
	let pending = [];
	let done = false;
	const apply = (html) => injectGrokPwaHead(html, {
		appName: normalized.appName,
		projectId: normalized.projectId,
		creator: normalized.creator,
		creatorId: normalized.creatorId,
		host: normalized.host,
		cwd: normalized.cwd,
		site: normalized.site
	});
	return {
		/** @param {Uint8Array | string} chunk @returns {Buffer[]} chunks ready to emit */
		push(chunk) {
			const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			if (done) return [buf];
			pending.push(buf);
			const joined = Buffer.concat(pending);
			const at = findHeadClose(joined);
			if (at === -1) return [];
			done = true;
			pending = [];
			const closeLen = joined.toString("latin1", at).match(/^<\/head>/i)[0].length;
			const head = apply(joined.subarray(0, at + closeLen).toString("utf8"));
			return [Buffer.concat([Buffer.from(head, "utf8"), joined.subarray(at + closeLen)])];
		},
		/** @returns {Buffer[]} whatever is still buffered (no `</head>` seen) */
		flush() {
			if (done || pending.length === 0) return [];
			const rest = Buffer.concat(pending);
			pending = [];
			done = true;
			return [Buffer.from(apply(rest.toString("utf8")), "utf8")];
		}
	};
}
//#endregion
//#region server/middleware/grok-pwa.ts
/**
* Deployed-app (Nitro) half of the platform PWA chrome. Auto-registered as
* global h3 middleware because vite.config.ts sets `serverDir: "./server"` —
* without that option Nitro v3 never scans this directory.
*
* - `?install=1&platform=ios` on a document path → the Home Screen tutorial,
*   bundled into the server build via `?raw` (the public/ directory is CDN
*   static output on Vercel and not readable from the function).
* - `/__grok/manifest.webmanifest` → per-app-named manifest (kept out of
*   public/ so this dynamic response is the only one).
* - Other HTML documents → stream-inject PWA + OG head tags at `</head>`.
*   OG identity is baked via `virtual:grok-og-identity` at `vite build`
*   (this function cannot read `src/lib/og/site.json` or `public/og.jpg`).
*   This must be a middleware transforming `next()`: h3 discards the `response`
*   runtime hook's return value, and `render:html` does not exist in Nitro v3.
*/
function requestHost(event) {
	return event.req.headers.get("x-forwarded-host") ?? event.req.headers.get("host") ?? event.url.host;
}
function injectHeadStreaming(response, host) {
	const injector = createHeadInjector({
		host,
		site: grokOgIdentity.site
	});
	const transformed = response.body.pipeThrough(new TransformStream({
		transform(chunk, controller) {
			for (const out of injector.push(chunk)) controller.enqueue(out);
		},
		flush(controller) {
			for (const out of injector.flush()) controller.enqueue(out);
		}
	}));
	const headers = new Headers(response.headers);
	headers.delete("content-length");
	return new Response(transformed, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}
async function grokPwaMiddleware(event, next) {
	if ((event.req.method ?? "GET").toUpperCase() !== "GET") return next();
	const path = event.url.pathname;
	const urlWithQuery = path + event.url.search;
	if (path === "/__grok/manifest.webmanifest" || path === "/__grok/manifest.json") return new Response(renderWebManifest(requestHost(event)), { headers: {
		"content-type": "application/manifest+json; charset=utf-8",
		"cache-control": "no-cache"
	} });
	if (isInstallQuery(urlWithQuery) && isDocumentPath(path) && acceptsHtml(event.req.headers.get("accept"))) {
		const html = renderInstallPageHtml(install_page_default, {
			host: requestHost(event),
			url: urlWithQuery
		});
		return new Response(html, { headers: {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "no-cache"
		} });
	}
	if (!isDocumentPath(path)) return next();
	const result = await next();
	if (result instanceof Response && result.body && String(result.headers.get("content-type") ?? "").includes("text/html") && !result.headers.get("content-encoding")) return injectHeadStreaming(result, requestHost(event));
	return result;
}
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_FJjs9V = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_FJjs9V
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
var globalMiddleware = [toEventHandler(grokPwaMiddleware)].filter(Boolean);
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~middleware"].push(...globalMiddleware);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		middleware.push(...h3App["~middleware"]);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/favicon.svg": {
		"type": "image/svg+xml",
		"etag": "\"108-jmhIAex6STc1ucQ+GyE5h9vzvZU\"",
		"mtime": "2026-10-16T22:13:18.042Z",
		"size": 264,
		"path": "../favicon.svg"
	},
	"/logo.svg": {
		"type": "image/svg+xml",
		"etag": "\"13e-4HF8e9YWicZse5rFW01b0KNL21o\"",
		"mtime": "2026-10-16T22:13:18.048Z",
		"size": 318,
		"path": "../logo.svg"
	},
	"/og.jpg": {
		"type": "image/jpeg",
		"etag": "\"a49e-FxAfQTcbTLjJvqVaDar9wKSDIto\"",
		"mtime": "2026-10-16T22:13:18.055Z",
		"size": 42142,
		"path": "../og.jpg"
	},
	"/agents/az.webp": {
		"type": "image/webp",
		"etag": "\"38a8-hOf13F1AtwmImbcQLyZE87ya3l8\"",
		"mtime": "2026-10-16T22:13:18.146Z",
		"size": 14504,
		"path": "../agents/az.webp"
	},
	"/banner.png": {
		"type": "image/png",
		"etag": "\"23e0a-tpGxY2gIh98qpQoUGnAk0uYgsk8\"",
		"mtime": "2026-10-16T22:13:18.036Z",
		"size": 146954,
		"path": "../banner.png"
	},
	"/weather/clear-day.svg": {
		"type": "image/svg+xml",
		"etag": "\"f91-Pzk1zhkzu3jjAv2R4X+4oh4gZZw\"",
		"mtime": "2026-10-16T22:13:18.401Z",
		"size": 3985,
		"path": "../weather/clear-day.svg"
	},
	"/weather/cloudy.svg": {
		"type": "image/svg+xml",
		"etag": "\"13ba-8U8DDD7/vz0nR7TTeYFZt4UQTFs\"",
		"mtime": "2026-10-16T22:13:18.414Z",
		"size": 5050,
		"path": "../weather/cloudy.svg"
	},
	"/weather/clear-night.svg": {
		"type": "image/svg+xml",
		"etag": "\"ef1-WlZE+3TopAKwpkZ2qfl0SYO97CQ\"",
		"mtime": "2026-10-16T22:13:18.408Z",
		"size": 3825,
		"path": "../weather/clear-night.svg"
	},
	"/weather/drizzle.svg": {
		"type": "image/svg+xml",
		"etag": "\"1253-wqjrQ+9b9xEuRGpQh5KAGkiyoGo\"",
		"mtime": "2026-10-16T22:13:18.421Z",
		"size": 4691,
		"path": "../weather/drizzle.svg"
	},
	"/weather/extreme-rain.svg": {
		"type": "image/svg+xml",
		"etag": "\"1695-1bLjr5a0pbGrQwhyPAomp3piHJM\"",
		"mtime": "2026-10-16T22:13:18.427Z",
		"size": 5781,
		"path": "../weather/extreme-rain.svg"
	},
	"/weather/extreme-snow.svg": {
		"type": "image/svg+xml",
		"etag": "\"14e5-azknpI9fHrPdVCCiWGxkqidTrXo\"",
		"mtime": "2026-10-16T22:13:18.434Z",
		"size": 5349,
		"path": "../weather/extreme-snow.svg"
	},
	"/weather/fog-day.svg": {
		"type": "image/svg+xml",
		"etag": "\"16bf-MvnJPF96gSb7SJtb5YBaAQujPhI\"",
		"mtime": "2026-10-16T22:13:18.440Z",
		"size": 5823,
		"path": "../weather/fog-day.svg"
	},
	"/weather/fog.svg": {
		"type": "image/svg+xml",
		"etag": "\"11d9-PcReRdctW8mGJJv+xexJ7VtxlVE\"",
		"mtime": "2026-10-16T22:13:18.453Z",
		"size": 4569,
		"path": "../weather/fog.svg"
	},
	"/weather/fog-night.svg": {
		"type": "image/svg+xml",
		"etag": "\"161c-PQ6VWLpCsrcCbCyLjRLR8SQ3fXA\"",
		"mtime": "2026-10-16T22:13:18.447Z",
		"size": 5660,
		"path": "../weather/fog-night.svg"
	},
	"/weather/hail.svg": {
		"type": "image/svg+xml",
		"etag": "\"14af-j9FVNiVD99ay8DiamDx0OplZJO8\"",
		"mtime": "2026-10-16T22:13:18.460Z",
		"size": 5295,
		"path": "../weather/hail.svg"
	},
	"/weather/humidity.svg": {
		"type": "image/svg+xml",
		"etag": "\"d94-BJn54796p3IAonLle5SWYoQpFIo\"",
		"mtime": "2026-10-16T22:13:18.466Z",
		"size": 3476,
		"path": "../weather/humidity.svg"
	},
	"/weather/LICENSE.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"1b5-Op+a+7pZW0RIWhFhIy9DF4rp//0\"",
		"mtime": "2026-10-16T22:13:18.395Z",
		"size": 437,
		"path": "../weather/LICENSE.txt"
	},
	"/weather/overcast-day.svg": {
		"type": "image/svg+xml",
		"etag": "\"189b-GuyeAJEjsq39xEKmTWU8o29QOiE\"",
		"mtime": "2026-10-16T22:13:18.474Z",
		"size": 6299,
		"path": "../weather/overcast-day.svg"
	},
	"/weather/overcast-night.svg": {
		"type": "image/svg+xml",
		"etag": "\"17fb-Rz3YLedE8dVgjgQQVP+nyeLwKfQ\"",
		"mtime": "2026-10-16T22:13:18.480Z",
		"size": 6139,
		"path": "../weather/overcast-night.svg"
	},
	"/api-directory.json": {
		"type": "application/json",
		"etag": "\"83295-qsirU9M96pWgbcQwA2AaL7aCrb0\"",
		"mtime": "2026-11-02T13:19:42.237Z",
		"size": 537237,
		"path": "../api-directory.json"
	},
	"/weather/partly-cloudy-day-drizzle.svg": {
		"type": "image/svg+xml",
		"etag": "\"16a4-bWsoHV8VR5948TjCrLjuuLs3JAE\"",
		"mtime": "2026-10-16T22:13:18.488Z",
		"size": 5796,
		"path": "../weather/partly-cloudy-day-drizzle.svg"
	},
	"/weather/partly-cloudy-day-rain.svg": {
		"type": "image/svg+xml",
		"etag": "\"1a35-Kllj0hzO7k1E2tQ0GETy05r951M\"",
		"mtime": "2026-10-16T22:13:18.495Z",
		"size": 6709,
		"path": "../weather/partly-cloudy-day-rain.svg"
	},
	"/weather/partly-cloudy-day-snow.svg": {
		"type": "image/svg+xml",
		"etag": "\"16fd-B55wApMfcH29GTPhyRJW6SsGY84\"",
		"mtime": "2026-10-16T22:13:18.501Z",
		"size": 5885,
		"path": "../weather/partly-cloudy-day-snow.svg"
	},
	"/weather/partly-cloudy-day.svg": {
		"type": "image/svg+xml",
		"etag": "\"141f-rL0zWSMk9mKvSpdyU+2ud4k2SW0\"",
		"mtime": "2026-10-16T22:13:18.509Z",
		"size": 5151,
		"path": "../weather/partly-cloudy-day.svg"
	},
	"/agents/nyx.jpg": {
		"type": "image/jpeg",
		"etag": "\"93639-BSEEh1uVC+JxZRHjJ8mMDJ2DuXY\"",
		"mtime": "2026-10-16T22:13:18.159Z",
		"size": 603705,
		"path": "../agents/nyx.jpg"
	},
	"/weather/partly-cloudy-night.svg": {
		"type": "image/svg+xml",
		"etag": "\"1380-2Govay1nc9y9gfpy8jCJt9jAlfA\"",
		"mtime": "2026-10-16T22:13:18.515Z",
		"size": 4992,
		"path": "../weather/partly-cloudy-night.svg"
	},
	"/weather/rain.svg": {
		"type": "image/svg+xml",
		"etag": "\"1421-s3MorUkUdTnQ3yjIHqkuuMfAPDI\"",
		"mtime": "2026-10-16T22:13:18.522Z",
		"size": 5153,
		"path": "../weather/rain.svg"
	},
	"/weather/sleet.svg": {
		"type": "image/svg+xml",
		"etag": "\"134d-JIWiRDzhYUdAMNsiGWXshXa2RNY\"",
		"mtime": "2026-10-16T22:13:18.535Z",
		"size": 4941,
		"path": "../weather/sleet.svg"
	},
	"/weather/snow.svg": {
		"type": "image/svg+xml",
		"etag": "\"1279-AV1zApY0oQUwQyGE3nMC8Hg2Pnw\"",
		"mtime": "2026-10-16T22:13:18.542Z",
		"size": 4729,
		"path": "../weather/snow.svg"
	},
	"/weather/raindrop.svg": {
		"type": "image/svg+xml",
		"etag": "\"dd9-g93ZckuO8hL+8Zk59JtFyLjfjd8\"",
		"mtime": "2026-10-16T22:13:18.529Z",
		"size": 3545,
		"path": "../weather/raindrop.svg"
	},
	"/weather/thunderstorms-day-rain.svg": {
		"type": "image/svg+xml",
		"etag": "\"1a27-mgqFOOsB26zStt44Zik8UWNbrRM\"",
		"mtime": "2026-10-16T22:13:18.549Z",
		"size": 6695,
		"path": "../weather/thunderstorms-day-rain.svg"
	},
	"/weather/thunderstorms-night-rain.svg": {
		"type": "image/svg+xml",
		"etag": "\"1987-De8yJQPT7rOdNpicdpKjoJO4R2M\"",
		"mtime": "2026-10-16T22:13:18.557Z",
		"size": 6535,
		"path": "../weather/thunderstorms-night-rain.svg"
	},
	"/weather/uv-index.svg": {
		"type": "image/svg+xml",
		"etag": "\"f90-AioN7y01+7ig7zFR1KdZQ7Yc1WU\"",
		"mtime": "2026-10-16T22:13:18.570Z",
		"size": 3984,
		"path": "../weather/uv-index.svg"
	},
	"/weather/thunderstorms-rain.svg": {
		"type": "image/svg+xml",
		"etag": "\"1549-kAWrb+zWRFjbaHR+1AwmiXuf+GM\"",
		"mtime": "2026-10-16T22:13:18.563Z",
		"size": 5449,
		"path": "../weather/thunderstorms-rain.svg"
	},
	"/weather/wind.svg": {
		"type": "image/svg+xml",
		"etag": "\"11fb-YepN7Qq0i4SWqKI6nYayxNzzHSM\"",
		"mtime": "2026-10-16T22:13:18.575Z",
		"size": 4603,
		"path": "../weather/wind.svg"
	},
	"/assets/cli-agents-CTpzyD_p.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"187-7kuI5iY+BA3ai0uS+IGWlrmc/XY\"",
		"mtime": "2026-11-04T16:20:28.857Z",
		"size": 391,
		"path": "../assets/cli-agents-CTpzyD_p.js"
	},
	"/assets/board-store--m117c-Q.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7c4-VUVOl+9Tt8BbCeZVej0HrxeJMnI\"",
		"mtime": "2026-11-04T16:20:28.856Z",
		"size": 1988,
		"path": "../assets/board-store--m117c-Q.js"
	},
	"/assets/client-D8oIqYF4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7e0b-wo1tgcq0mq/mR5fSE71snn8fVVw\"",
		"mtime": "2026-11-04T16:20:28.858Z",
		"size": 32267,
		"path": "../assets/client-D8oIqYF4.js"
	},
	"/assets/cloud-agent-BCPiPmw8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fe-mlJi8T6QxkEuSBVo0TU/H+45D2g\"",
		"mtime": "2026-11-04T16:20:28.859Z",
		"size": 254,
		"path": "../assets/cloud-agent-BCPiPmw8.js"
	},
	"/assets/client-DNKy03Zb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"773-STLfAkVZP+tOLGXE6vSotOy4fBE\"",
		"mtime": "2026-11-04T16:20:28.859Z",
		"size": 1907,
		"path": "../assets/client-DNKy03Zb.js"
	},
	"/assets/design-yYsrjxH5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ff-F8G1meEXg+lfJUiMs3RsvT0ZGwM\"",
		"mtime": "2026-11-04T16:20:28.860Z",
		"size": 255,
		"path": "../assets/design-yYsrjxH5.js"
	},
	"/assets/engines-Agly_bGu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"183-uvGcbQW9HfOzuW2GGwb4O/+2hgI\"",
		"mtime": "2026-11-04T16:20:28.860Z",
		"size": 387,
		"path": "../assets/engines-Agly_bGu.js"
	},
	"/assets/erebus-CQUTQK65.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13b-NXK6GimBe2wq8Mb/1XCI7MTfeAA\"",
		"mtime": "2026-11-04T16:20:28.861Z",
		"size": 315,
		"path": "../assets/erebus-CQUTQK65.js"
	},
	"/assets/invariant-CgFvOqN2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c2-OtvVxjJzKVqOT1XQL6Tnz3B8fGk\"",
		"mtime": "2026-11-04T16:20:28.861Z",
		"size": 450,
		"path": "../assets/invariant-CgFvOqN2.js"
	},
	"/assets/jsx-runtime-DREnUpxT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b3-9G7HVVwlvE7bzvgv8pu/0O+IfBw\"",
		"mtime": "2026-11-04T16:20:28.861Z",
		"size": 435,
		"path": "../assets/jsx-runtime-DREnUpxT.js"
	},
	"/assets/env-keys-f_jeRlr8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3f1-ZIOvi3yH+s6g/hDSe0X23u0wGeM\"",
		"mtime": "2026-11-04T16:20:28.860Z",
		"size": 1009,
		"path": "../assets/env-keys-f_jeRlr8.js"
	},
	"/assets/fileRoute-Dy2x_W4o.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e02-ys3kxoyOFyL0xRnMh1G4M9cgTUA\"",
		"mtime": "2026-11-04T16:20:28.861Z",
		"size": 3586,
		"path": "../assets/fileRoute-Dy2x_W4o.js"
	},
	"/assets/createClientRpc-CKl5TyNe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"81f4-0/0T4G/ID4PytM74lNmmnHUPTRg\"",
		"mtime": "2026-11-04T16:20:28.859Z",
		"size": 33268,
		"path": "../assets/createClientRpc-CKl5TyNe.js"
	},
	"/assets/index-ChRomio2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5c068-UVKEyYauMtdySZTtlwQs5mIUJQ4\"",
		"mtime": "2026-11-04T16:20:28.856Z",
		"size": 376936,
		"path": "../assets/index-ChRomio2.js"
	},
	"/assets/link-j_n9aWSL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2d80-rsQIYY2cgverYX4uRWoer4+jT7U\"",
		"mtime": "2026-11-04T16:20:28.862Z",
		"size": 11648,
		"path": "../assets/link-j_n9aWSL.js"
	},
	"/assets/login-46GpreLk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"48d-zhi+HQqRw5bgU4AVWlnktRTTmAE\"",
		"mtime": "2026-11-04T16:20:28.862Z",
		"size": 1165,
		"path": "../assets/login-46GpreLk.js"
	},
	"/assets/local-agents-C74b6SRU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1160-/0uo7rxwx2WXpVLXQPkr/bmgWeU\"",
		"mtime": "2026-11-04T16:20:28.862Z",
		"size": 4448,
		"path": "../assets/local-agents-C74b6SRU.js"
	},
	"/assets/ollama-B4YgQUs0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"dd3-hfyrZlSWh5+glIaoK++pcN3lnJQ\"",
		"mtime": "2026-11-04T16:20:28.863Z",
		"size": 3539,
		"path": "../assets/ollama-B4YgQUs0.js"
	},
	"/assets/oauth-CCt48kjN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1483-hMP+uu5wMe4wd0YyUgP4z0Y8/no\"",
		"mtime": "2026-11-04T16:20:28.863Z",
		"size": 5251,
		"path": "../assets/oauth-CCt48kjN.js"
	},
	"/assets/routes-BDugMLPA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cc-vPiHLPQzcq4w0gS6e63CruFQjc0\"",
		"mtime": "2026-11-04T16:20:28.864Z",
		"size": 204,
		"path": "../assets/routes-BDugMLPA.js"
	},
	"/assets/react-CQOZoUwg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ec4-Or6uT4+vKJfuyHfNPedeAoMZnak\"",
		"mtime": "2026-11-04T16:20:28.863Z",
		"size": 7876,
		"path": "../assets/react-CQOZoUwg.js"
	},
	"/assets/supabase-public-iLlNeXQR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"117-74g+Al2t1Zq4AQHdLkdrYrcNT+E\"",
		"mtime": "2026-11-04T16:20:28.865Z",
		"size": 279,
		"path": "../assets/supabase-public-iLlNeXQR.js"
	},
	"/assets/sync-DHxB8mkb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1053-tzOr3wNwT1bUcBev9Ou0F3j3lCU\"",
		"mtime": "2026-11-04T16:20:28.865Z",
		"size": 4179,
		"path": "../assets/sync-DHxB8mkb.js"
	},
	"/assets/rolldown-runtime-Dd_uD5pT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"452-sZl5y+VnYZJIxKNwHO0DTqczPH0\"",
		"mtime": "2026-11-04T16:20:28.864Z",
		"size": 1106,
		"path": "../assets/rolldown-runtime-Dd_uD5pT.js"
	},
	"/assets/session-middleware-P8oFQFmV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14d9-JQHxFhhcInDgzmkMveRZsYmbsOQ\"",
		"mtime": "2026-11-04T16:20:28.864Z",
		"size": 5337,
		"path": "../assets/session-middleware-P8oFQFmV.js"
	},
	"/assets/pptxgen.es-BbumqUkw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5b863-Ih3hfnvjuzQ5awMotVv+6tF2+vE\"",
		"mtime": "2026-11-04T16:20:28.863Z",
		"size": 374883,
		"path": "../assets/pptxgen.es-BbumqUkw.js"
	},
	"/assets/_slug-CDmpyHX0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14f-WqlRlW7x5mphu5wlr2r2bs0d86E\"",
		"mtime": "2026-11-04T16:20:28.856Z",
		"size": 335,
		"path": "../assets/_slug-CDmpyHX0.js"
	},
	"/assets/truth-Ew-A7JF4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"712-LVo2P0v3cjrV56AzrBMQ048w4Do\"",
		"mtime": "2026-11-04T16:20:28.866Z",
		"size": 1810,
		"path": "../assets/truth-Ew-A7JF4.js"
	},
	"/agents/stills/erebus.jpg": {
		"type": "image/jpeg",
		"etag": "\"9513-9CS8UYoSV1Ah5FN8YIGmChTHqRU\"",
		"mtime": "2026-10-16T22:13:18.360Z",
		"size": 38163,
		"path": "../agents/stills/erebus.jpg"
	},
	"/assets/styles-1azgQDEW.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"2613d-Xw4A/Vvg5jUri/BYIAm5lbSsMQM\"",
		"mtime": "2026-11-04T16:20:28.867Z",
		"size": 155965,
		"path": "../assets/styles-1azgQDEW.css"
	},
	"/agents/stills/ember.jpg": {
		"type": "image/jpeg",
		"etag": "\"1318b-rdfyJYFvZ5BxC0nTqMJ4ryl88OA\"",
		"mtime": "2026-10-16T22:13:18.354Z",
		"size": 78219,
		"path": "../agents/stills/ember.jpg"
	},
	"/agents/stills/kranos.jpg": {
		"type": "image/jpeg",
		"etag": "\"12947-BvGqAwDtCRdNvpo6NB1GXlfKJaU\"",
		"mtime": "2026-10-16T22:13:18.368Z",
		"size": 76103,
		"path": "../agents/stills/kranos.jpg"
	},
	"/__grok/install/styles.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"1a3d-VUsWOMAheo1/P30EqU5qaIkyvIQ\"",
		"mtime": "2026-10-16T22:13:18.078Z",
		"size": 6717,
		"path": "../__grok/install/styles.css"
	},
	"/agents/stills/nyx.jpg": {
		"type": "image/jpeg",
		"etag": "\"e73f-BhzIhpNXzXm9Tw9dPaWcMLeEuFs\"",
		"mtime": "2026-10-16T22:13:18.383Z",
		"size": 59199,
		"path": "../agents/stills/nyx.jpg"
	},
	"/__grok/install/assets/homescreen/glass-share.svg": {
		"type": "image/svg+xml",
		"etag": "\"954-jb3ATcKjqgMOYrA/4w1v21j0Jvg\"",
		"mtime": "2026-10-16T22:13:18.103Z",
		"size": 2388,
		"path": "../__grok/install/assets/homescreen/glass-share.svg"
	},
	"/__grok/install/assets/homescreen/glass-puzzle.svg": {
		"type": "image/svg+xml",
		"etag": "\"713-AP2wG8KChAGjse1Fn+f/+vDN+sQ\"",
		"mtime": "2026-10-16T22:13:18.096Z",
		"size": 1811,
		"path": "../__grok/install/assets/homescreen/glass-puzzle.svg"
	},
	"/assets/views-BfzhtmVw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"173702-WhBSs82HGS6jMFBm9IBKETzS9kU\"",
		"mtime": "2026-11-04T16:20:28.866Z",
		"size": 1521410,
		"path": "../assets/views-BfzhtmVw.js"
	},
	"/__grok/install/assets/homescreen/logo-grok.svg": {
		"type": "image/svg+xml",
		"etag": "\"423-5mXO+yh9KW40jM3to5JlWPhxNK8\"",
		"mtime": "2026-10-16T22:13:18.111Z",
		"size": 1059,
		"path": "../__grok/install/assets/homescreen/logo-grok.svg"
	},
	"/__grok/install/assets/homescreen/ob-ipad.png": {
		"type": "image/png",
		"etag": "\"18dd3-wlRwrpmBImStuiu+4poVz7ANin4\"",
		"mtime": "2026-10-16T22:13:18.120Z",
		"size": 101843,
		"path": "../__grok/install/assets/homescreen/ob-ipad.png"
	},
	"/__grok/install/assets/homescreen/plus.svg": {
		"type": "image/svg+xml",
		"etag": "\"961-sSBPunx/13vbMNAlPxb7UeO3l3A\"",
		"mtime": "2026-10-16T22:13:18.135Z",
		"size": 2401,
		"path": "../__grok/install/assets/homescreen/plus.svg"
	},
	"/__grok/install/assets/homescreen/ob-phone.png": {
		"type": "image/png",
		"etag": "\"194bc-oZradWHIHO68q2glHU0Gk5ttpWA\"",
		"mtime": "2026-10-16T22:13:18.129Z",
		"size": 103612,
		"path": "../__grok/install/assets/homescreen/ob-phone.png"
	},
	"/agents/avatars/erebus.mp4": {
		"type": "video/mp4",
		"etag": "\"1bded9-/ejfN4lVPZaGanFT1+crKX0IGgM\"",
		"mtime": "2026-10-16T22:13:18.203Z",
		"size": 1826521,
		"path": "../agents/avatars/erebus.mp4"
	},
	"/agents/avatars/ember.mp4": {
		"type": "video/mp4",
		"etag": "\"1defe0-FKaK3N/HUPRZmd7uEL+K69Nnx+o\"",
		"mtime": "2026-10-16T22:13:18.183Z",
		"size": 1961952,
		"path": "../agents/avatars/ember.mp4"
	},
	"/__grok/icon-180.png": {
		"type": "image/png",
		"etag": "\"834-Xk8vfS0DTFn7ggtkfEduWTcNWGE\"",
		"mtime": "2026-10-16T22:13:18.066Z",
		"size": 2100,
		"path": "../__grok/icon-180.png"
	},
	"/agents/stills/nova.jpg": {
		"type": "image/jpeg",
		"etag": "\"17c62-QbvYJeT6D3dlv2Sylrpicc29VRM\"",
		"mtime": "2026-10-16T22:13:18.374Z",
		"size": 97378,
		"path": "../agents/stills/nova.jpg"
	},
	"/agents/avatars/nyx.mp4": {
		"type": "video/mp4",
		"etag": "\"49e530-bMSfdCMDhVqWOlmQqaTKQuU7TAM\"",
		"mtime": "2026-10-16T22:13:18.341Z",
		"size": 4842800,
		"path": "../agents/avatars/nyx.mp4"
	},
	"/agents/avatars/nova.mp4": {
		"type": "video/mp4",
		"etag": "\"57549f-Kuq7ng/XXbISC2tUj23X6BSjdgM\"",
		"mtime": "2026-10-16T22:13:18.297Z",
		"size": 5723295,
		"path": "../agents/avatars/nova.mp4"
	},
	"/agents/avatars/kranos.mp4": {
		"type": "video/mp4",
		"etag": "\"57549f-Kuq7ng/XXbISC2tUj23X6BSjdgM\"",
		"mtime": "2026-10-16T22:13:18.252Z",
		"size": 5723295,
		"path": "../agents/avatars/kranos.mp4"
	}
};
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs
function augmentReq(cfReq, ctx) {
	const req = cfReq;
	req.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
	req.runtime ??= { name: "cloudflare" };
	req.runtime.cloudflare = {
		...req.runtime.cloudflare,
		...ctx
	};
	req.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/cloudflare-pages.mjs
var nitroApp = useNitroApp();
var cloudflare_pages_default = {
	async fetch(cfReq, env, context) {
		augmentReq(cfReq, {
			env,
			context
		});
		const url = new URL(cfReq.url);
		if (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfReq);
		return nitroApp.fetch(cfReq);
	},
	scheduled(event, env, context) {}
};
//#endregion
export { cloudflare_pages_default as default };
