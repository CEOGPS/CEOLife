import { n as createServerFn } from "./ssr.mjs";
import { a as createSsrRpc } from "./env-keys-B504YYo8.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/engines-GP3m-tat.js
var checkEngines = createServerFn({ method: "POST" }).validator((input) => ({ panel: String(input?.panel || "").slice(0, 40) })).handler(createSsrRpc("2758a974f5d1cf7d2124ca33668688b156532fa3a9deb266d457780c6d492f39"));
var runEngine = createServerFn({ method: "POST" }).validator((input) => ({
	id: String(input?.id || "").slice(0, 40),
	query: String(input?.query || "").trim().slice(0, 500)
})).handler(createSsrRpc("856da3863629135dc5d0d81c26f4d9e30393a390eb379164ce02612428bcadf1"));
//#endregion
export { checkEngines, runEngine };
