import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { Memory } from "@/components/dash/memory";
import { guarded, requireUser } from "@/lib/integrations/http.server";
import { runErebus } from "@/lib/agents/loop.server";
import { sessionMiddleware } from "@/lib/lifeos/session-middleware";
import type { Skill } from "@/lib/agents/skills";

type ErebusInput = {
  question: string;
  facts: string;
  mind: string;
  model: string;
  endpoint: string;
  prompt: string;
  key: string;
  memory: Partial<Memory>;
  skills: Skill[];
  agent?: string;
};

function clean(input: ErebusInput) {
  return {
    question: String(input?.question || "").trim().slice(0, 4000),
    facts: String(input?.facts || "").slice(0, 96_000),
    mind: String(input?.mind || "").slice(0, 40),
    model: String(input?.model || "").trim().slice(0, 80),
    endpoint: String(input?.endpoint || "").trim().slice(0, 300),
    prompt: String(input?.prompt || "").slice(0, 8000),
    key: String(input?.key || "").trim().slice(0, 400),
    memory: {
      leads: Array.isArray(input?.memory?.leads) ? input.memory.leads.slice(0, 40) : [],
      tasks: Array.isArray(input?.memory?.tasks) ? input.memory.tasks.slice(0, 40) : [],
      ideas: Array.isArray(input?.memory?.ideas) ? input.memory.ideas.slice(0, 20) : [],
      events: Array.isArray(input?.memory?.events) ? input.memory.events.slice(0, 20) : [],
      facts: Array.isArray(input?.memory?.facts) ? input.memory.facts.slice(0, 40) : [],
    },
    skills: (Array.isArray(input?.skills) ? input.skills : []).slice(0, 6).map((skill) => ({
      id: String(skill?.id || "").slice(0, 40),
      name: String(skill?.name || "").slice(0, 80),
      text: String(skill?.text || "").slice(0, 800),
    })),
    agent: ["Erebus", "Kranos", "Hermes", "Qwen"].includes(String(input?.agent || "")) ? String(input?.agent) : "Erebus",
  };
}

export const askErebus = createServerFn({ method: "POST" })
  .middleware([sessionMiddleware])
  .validator(clean)
  .handler(async ({ data }) => {
    if (!data.question) throw new Error("question required");
    return runErebus(data);
  });

export const Route = createFileRoute("/api/agents/erebus")({
  server: {
    handlers: {
      POST: ({ request }) => guarded(async () => {
        await requireUser(request);
        const body = await request.json().catch(() => ({})) as ErebusInput;
        const data = clean(body);
        if (!data.question) return Response.json({ ok: false, text: "question required" }, { status: 400 });
        return Response.json(await runErebus(data));
      }),
    },
  },
});
