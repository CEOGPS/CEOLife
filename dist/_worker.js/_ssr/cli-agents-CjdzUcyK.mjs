import { n as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CN-evIEF.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/cli-agents-CjdzUcyK.js
/* @__NO_SIDE_EFFECTS__ */
function createNotImplementedError(name) {
	return /* @__PURE__ */ new Error(`[unenv] ${name} is not implemented yet!`);
}
/* @__NO_SIDE_EFFECTS__ */
function notImplemented(name) {
	const fn = () => {
		throw /* @__PURE__ */ createNotImplementedError(name);
	};
	return Object.assign(fn, { __unenv__: true });
}
var spawn = /* @__PURE__ */ notImplemented("child_process.spawn");
function run(command, args) {
	return new Promise((resolve) => {
		const child = spawn(command, args, {
			windowsHide: true,
			env: {
				...processModule.env,
				CI: "1"
			}
		});
		let out = "";
		let err = "";
		const timer = setTimeout(() => {
			child.kill();
			resolve({
				ok: false,
				text: `${command} took too long and was stopped.`,
				url: ""
			});
		}, 12e4);
		child.stdout.on("data", (chunk) => {
			out += String(chunk);
			if (out.length > 12e3) out = out.slice(-12e3);
		});
		child.stderr.on("data", (chunk) => {
			err += String(chunk);
			if (err.length > 4e3) err = err.slice(-4e3);
		});
		child.on("error", (error) => {
			clearTimeout(timer);
			resolve({
				ok: false,
				text: error.code === "ENOENT" ? `${command} is not installed on the computer running this app.` : error.message,
				url: ""
			});
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			const text = (out || err).trim().slice(0, 8e3);
			const url = text.match(/https?:\/\/\S+/)?.[0] || "";
			resolve({
				ok: code === 0 && Boolean(text),
				text: text || `${command} exited with no output.`,
				url
			});
		});
	});
}
var runCliAgent_createServerFn_handler = createServerRpc({
	id: "2f727bfc5deb797c331c1bce4f0000acdf2974bd440c21b8fba516cd58c685fd",
	name: "runCliAgent",
	filename: "src/lib/lifeos/cli-agents.ts"
}, (opts) => runCliAgent.__executeServer(opts));
var runCliAgent = createServerFn({ method: "POST" }).validator((input) => ({
	who: input?.who === "qwen" ? "qwen" : "hermes",
	prompt: String(input?.prompt || "").slice(0, 4e3),
	check: Boolean(input?.check)
})).handler(runCliAgent_createServerFn_handler, async ({ data }) => {
	if (data.check) {
		const result = await run(data.who, ["--version"]);
		return result.ok ? {
			...result,
			text: `${data.who} ${result.text.split("\n")[0]}`
		} : result;
	}
	if (!data.prompt) return {
		ok: false,
		text: "Nothing to send.",
		url: ""
	};
	if (data.who === "qwen") return run("qwen", [
		"-p",
		data.prompt,
		"--output-format",
		"text"
	]);
	return run("hermes", [
		"chat",
		"-q",
		data.prompt
	]);
});
//#endregion
export { runCliAgent_createServerFn_handler };
