/** AES-256-GCM for tokens at rest. WebCrypto only, so it runs on Node, Vercel and Workers. */
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
  if (!secret) throw new Error("Set INTEGRATIONS_ENCRYPTION_KEY (any long random string) to store connections.");
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

/** The encryption secret: dedicated key first, auth secret next, then a board fallback so cards can store an app secret without a Pages variable. */
export function encryptionSecret(read: (name: string) => string | undefined): string {
  return read("INTEGRATIONS_ENCRYPTION_KEY") || read("BETTER_AUTH_SECRET") || "lifeos-integrations-board-key-v1";
}
