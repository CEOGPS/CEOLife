import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [note, setNote] = useState("");
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm space-y-3">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-white/50">This is the dashboard login. Integration cards do not use it. Press Connect on a card to sign into that service.</p>
        {authEnabled ? (
          GROK_PROVIDERS.map((provider) => (
            <button
              key={provider.providerId}
              type="button"
              onClick={() => {
                setNote(`Opening ${provider.label}…`);
                void signIn(provider.providerId, { callbackURL: "/" }).catch((error: unknown) => {
                  setNote(error instanceof Error ? error.message : `${provider.label} did not open.`);
                });
              }}
              className="min-h-11 w-full rounded-lg border border-line bg-surface px-4 text-sm"
            >
              Continue with {provider.label}
            </button>
          ))
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
        {note ? <p className="text-sm text-amber-200">{note}</p> : null}
      </div>
    </main>
  );
}