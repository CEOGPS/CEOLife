import { a as SUPABASE, t as ANON } from "./views-kXuQ6J71.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/board-store-1nOnUdLR.js
var headers = {
	apikey: ANON,
	Authorization: `Bearer ${ANON}`
};
async function pullCloud(device) {
	const response = await fetch(`${SUPABASE}/rest/v1/lifeos_board?device=eq.${encodeURIComponent(device)}&select=doc,updated_at`, { headers });
	if (!response.ok) return null;
	const row = (await response.json())?.[0];
	if (!row?.doc) return null;
	return {
		doc: row.doc,
		at: row.updated_at ? new Date(row.updated_at).getTime() : 0
	};
}
async function pushCloud(device, doc) {
	const copy = { ...doc };
	delete copy.keys;
	delete copy.vault;
	let packed = JSON.stringify(copy);
	if (packed.length > 7e5) {
		delete copy.banner;
		delete copy.logo;
		packed = JSON.stringify(copy);
	}
	return (await fetch(`${SUPABASE}/rest/v1/lifeos_board?on_conflict=device`, {
		method: "POST",
		headers: {
			...headers,
			"Content-Type": "application/json",
			Prefer: "resolution=merge-duplicates,return=minimal"
		},
		body: JSON.stringify({
			device,
			doc: JSON.parse(packed),
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		})
	})).ok;
}
var BRAND = "lifeos-brand";
async function pullBrand() {
	const doc = (await pullCloud(BRAND))?.doc;
	if (!doc || typeof doc !== "object") return null;
	const brand = doc;
	return {
		banner: String(brand.banner || ""),
		logo: String(brand.logo || "")
	};
}
async function pushBrand(banner, logo) {
	return (await fetch(`${SUPABASE}/rest/v1/lifeos_board?on_conflict=device`, {
		method: "POST",
		headers: {
			...headers,
			"Content-Type": "application/json",
			Prefer: "resolution=merge-duplicates,return=minimal"
		},
		body: JSON.stringify({
			device: BRAND,
			doc: {
				banner,
				logo
			},
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		})
	})).ok;
}
var KEYS = "lifeos-keys";
async function pullKeys() {
	const doc = (await pullCloud(KEYS))?.doc;
	if (!doc || typeof doc !== "object") return [];
	const keys = doc.keys;
	if (!Array.isArray(keys)) return [];
	return keys.filter((item) => item && typeof item === "object" && "name" in item && "value" in item).map((item) => {
		const row = item;
		return {
			id: String(row.id || row.name || ""),
			name: String(row.name || ""),
			value: String(row.value || "")
		};
	}).filter((item) => item.name && item.value);
}
async function pushKeys(keys) {
	return (await fetch(`${SUPABASE}/rest/v1/lifeos_board?on_conflict=device`, {
		method: "POST",
		headers: {
			...headers,
			"Content-Type": "application/json",
			Prefer: "resolution=merge-duplicates,return=minimal"
		},
		body: JSON.stringify({
			device: KEYS,
			doc: { keys },
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		})
	})).ok;
}
//#endregion
export { pullBrand, pullCloud, pullKeys, pushBrand, pushCloud, pushKeys };
