import { n as createServerFn } from "./ssr.mjs";
import { a as createSsrRpc } from "./env-keys-B504YYo8.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cli-agents-DGsGXTn2.js
var runCliAgent = createServerFn({ method: "POST" }).validator((input) => ({
	who: input?.who === "qwen" ? "qwen" : "hermes",
	prompt: String(input?.prompt || "").slice(0, 4e3),
	check: Boolean(input?.check)
})).handler(createSsrRpc("2f727bfc5deb797c331c1bce4f0000acdf2974bd440c21b8fba516cd58c685fd"));
//#endregion
export { runCliAgent };
