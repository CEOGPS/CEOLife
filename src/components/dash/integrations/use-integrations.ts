import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Talks to the app's own integration server routes.
 *
 * The panel never sees a token: it asks the server what is connected, tells it
 * to connect or re-test, and reacts to the result. An authorization started in
 * the preview runs in a popup (providers refuse to render inside the preview
 * frame) and reports back with a message; a top-level page just navigates.
 */

export type Connection = {
  provider: string;
  label: string;
  status: string;
  scopes: string;
  connectedAt: string;
  verifiedAt: string | null;
  expiresAt: string | null;
  lastError: string;
};

export type ProviderInfo = {
  name: string;
  docs: string;
  scopes: string;
  configured: boolean;
  missing: string[];
  redirectUri: string;
};

export type IntegrationStatus = {
  ok: boolean;
  signedIn: boolean;
  redirectUri: string;
  connections: Connection[];
  providers: Record<string, ProviderInfo>;
  error?: string;
};

const SID_KEY = "lifeos.oauth.sid";
const POPUP_MS = 180_000;

function tabId() {
  let sid = "";
  try {
    sid = sessionStorage.getItem(SID_KEY) || "";
  } catch {
    sid = "";
  }
  if (!sid) {
    sid = crypto.randomUUID();
    try {
      sessionStorage.setItem(SID_KEY, sid);
    } catch {
      /* a non-persisted id still binds this attempt */
    }
  }
  return sid;
}

export function useIntegrations() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const waiting = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pending, setPending] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations/status", { headers: { Accept: "application/json" }, cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as IntegrationStatus;
      if (!response.ok || !body.ok) {
        setStatus(null);
        setMessage(body.error || `The connection list did not load (HTTP ${response.status}).`);
      } else {
        setStatus(body);
      }
      return body;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The connection list did not load.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // The authorization window reports its result here, and the connection list is
  // re-read so the card shows the provider's own answer, not the message alone.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; provider?: string; ok?: boolean; message?: string; sid?: string };
      if (!data || data.type !== "lifeos-oauth") return;
      if (data.sid && data.sid !== tabId()) return;
      setPending("");
      setMessage(data.message || (data.ok ? `${data.provider} connected.` : "The authorization did not finish."));
      void refresh();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refresh]);

  // While a popup is open, poll so a closed window or a slow provider still resolves.
  const watch = useCallback(
    (provider: string) => {
      setPending(provider);
      if (waiting.current) clearInterval(waiting.current);
      const started = Date.now();
      waiting.current = setInterval(() => {
        if (Date.now() - started > POPUP_MS) {
          if (waiting.current) clearInterval(waiting.current);
          waiting.current = null;
          setPending("");
          setMessage("No answer from the authorization window. Start again if it closed early.");
          return;
        }
        void refresh().then((body) => {
          if (!body?.connections?.some((row) => row.provider === provider)) return;
          if (waiting.current) clearInterval(waiting.current);
          waiting.current = null;
          setPending("");
        });
      }, 2500);
    },
    [refresh],
  );

  useEffect(() => () => {
    if (waiting.current) clearInterval(waiting.current);
  }, []);

  const connect = useCallback(
    (provider: string, returnTo = "/panel/integrations") => {
      const sid = tabId();
      const url = `/api/integrations/start?provider=${encodeURIComponent(provider)}&sid=${encodeURIComponent(sid)}&return=${encodeURIComponent(returnTo)}`;
      const framed = window.self !== window.top;
      if (framed) {
        const popup = window.open(url, "lifeos-oauth", "width=540,height=740,noopener=no");
        if (!popup) {
          window.location.assign(url);
          return;
        }
        watch(provider);
        return;
      }
      window.location.assign(url);
    },
    [watch],
  );

  const verify = useCallback(
    async (provider: string) => {
      const response = await fetch("/api/integrations/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ provider }),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; text?: string };
      setMessage(body.text || `The check returned HTTP ${response.status}.`);
      await refresh();
      return Boolean(body.ok);
    },
    [refresh],
  );

  const disconnect = useCallback(
    async (provider: string) => {
      const response = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ provider }),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; text?: string };
      setMessage(body.text || `The disconnect returned HTTP ${response.status}.`);
      await refresh();
      return Boolean(body.ok);
    },
    [refresh],
  );

  return { status, loading, message, setMessage, pending, refresh, connect, verify, disconnect };
}

/** Reads the `?connected=` / `?oauth_error=` a returning authorization leaves behind. */
export function readReturn() {
  if (typeof window === "undefined") return { provider: "", error: "", sid: "" };
  const params = new URLSearchParams(window.location.search);
  const provider = params.get("connected") || params.get("oauth_provider") || "";
  const error = params.get("oauth_error") || "";
  const sid = params.get("sid") || "";
  if (provider || error) {
    params.delete("connected");
    params.delete("oauth_error");
    params.delete("oauth_provider");
    params.delete("sid");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);
  }
  return { provider, error, sid };
}

export function sameAttempt(sid: string) {
  if (!sid) return true;
  return sid === tabId();
}
