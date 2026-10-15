/** AES-256-GCM for tokens at rest. WebCrypto only, so it runs on Node and Workers. */
const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(bytes: Uint8Array) {
  let text = "";
  bytes.forEach((b) => { text += String.fromCharCode(b); });
  return btoa(text);
}

function fromB64(text: string) {
  const raw = atob(text);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function keyFor(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptText(plain: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFor(secret), enc.encode(plain));
  return `v1.${toB64(iv)}.${toB64(new Uint8Array(body))}`;
}

export async function decryptText(blob: string, secret: string): Promise<string> {
  const [version, iv, body] = blob.split(".");
  if (version !== "v1" || !iv || !body) throw new Error("Stored token is not in a known format.");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, await keyFor(secret), fromB64(body));
  return dec.decode(plain);
}

/** Dedicated key first, the auth secret as a fallback. Empty means tokens stay as they are. */
export function encryptionSecret(): string {
  return (process.env.INTEGRATIONS_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET || "").trim();
}
