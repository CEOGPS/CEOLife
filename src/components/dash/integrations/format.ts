export type Tone = "ok" | "error" | "warn" | "idle";

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hr ago`;
  return `${Math.round(seconds / 86400)} d ago`;
}

export function mask(value: string) {
  const text = value.trim();
  if (!text) return "";
  return text.length <= 8 ? "••••" : `••••${text.slice(-4)}`;
}
