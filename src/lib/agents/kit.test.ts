import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { briefFor, findPlugins, planKitLine, PLUGINS, pluginNeedsApproval } from "./kit.ts";

const OWNERS = new Set(["Erebus", "Kranos", "Hermes", "Qwen"]);

describe("shared agent kit", () => {
  it("gives every plugin one id and one of the four owners", () => {
    const ids = PLUGINS.map((card) => card.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.length >= 90);
    for (const card of PLUGINS) assert.ok(OWNERS.has(card.owner), card.id);
    assert.equal(PLUGINS.find((card) => card.id === "telegram-platform")?.owner, "Kranos");
    assert.equal(PLUGINS.find((card) => card.id === "qwen-oauth-provider")?.owner, "Qwen");
    assert.equal(PLUGINS.find((card) => card.id === "image-xai")?.runner, "qwen");
  });

  it("lists the pack and resolves one plugin", () => {
    const index = planKitLine("/plugins", true);
    assert.ok(index?.text.includes("telegram-platform"));
    assert.ok(index?.text.includes("image-xai"));
    assert.equal(findPlugins("image-xai").length, 1);
    assert.ok(findPlugins("xai").length > 1);
    const missing = planKitLine("/plugin not-a-plugin", true);
    assert.match(missing?.text || "", /No plugin named/);
  });

  it("sends Qwen an image plugin from a user command", () => {
    const plan = planKitLine("/plugin image-xai a red door", true);
    assert.equal(plan?.hand, "qwen-image");
    assert.equal(plan?.handPrompt, "a red door");
    const blocked = planKitLine("PLUGIN: image-xai a red door", false);
    assert.equal(blocked?.hand, undefined);
    assert.match(blocked?.text || "", /approved=yes/);
  });

  it("keeps Telegram and Hermes sends behind approval", () => {
    assert.equal(pluginNeedsApproval(PLUGINS.find((card) => card.id === "telegram-platform")!), true);
    const held = planKitLine("/telegram chat=42 text=hello", true);
    assert.equal(held?.telegram, undefined);
    assert.match(held?.text || "", /approved=yes/);
    const ready = planKitLine("/telegram chat=42 text=hello approved=yes", true);
    assert.deepEqual(ready?.telegram, { chat: "42", text: "hello" });
    const slack = planKitLine("/plugin slack-platform hello", true);
    assert.equal(slack?.hand, undefined);
    const go = planKitLine("/plugin slack-platform approved=yes", true);
    assert.equal(go?.hand, "hermes");
    assert.match(go?.handPrompt || "", /slack-platform/);
  });

  it("searches from a web plugin and drafts email without sending", () => {
    const search = planKitLine("/plugin web-ddgs cats", true);
    assert.equal(search?.search, "cats");
    assert.equal(search?.hand, undefined);
    const mail = planKitLine("/plugin email-platform to=a@b.co subject=Hi body=Note", true);
    assert.match(mail?.text || "", /Nothing was sent/);
    assert.match(mail?.noteBody || "", /a@b.co/);
  });

  it("briefs each agent with the same hierarchy", () => {
    for (const agent of ["Erebus", "Kranos", "Hermes", "Qwen"] as const) {
      const brief = briefFor(agent);
      assert.match(brief, new RegExp(agent));
      assert.match(brief, /Erebus runs the dashboard/);
      assert.match(brief, /Kranos manages workers/);
      assert.match(brief, /\/plugin/);
    }
  });
});
