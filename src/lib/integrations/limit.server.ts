/** A small sliding-window limiter. Stops a runaway loop from hammering providers. State is per server instance. */
export function createLimiter(now: () => number = () => Date.now()) {
  const hits = new Map<string, number[]>();
  return {
    /** Records one hit. `ok` is false once `limit` hits landed inside `windowMs`. */
    take(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSeconds: number } {
      const t = now();
      const recent = (hits.get(key) || []).filter((stamp) => t - stamp < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - t) / 1000)) };
      }
      recent.push(t);
      hits.set(key, recent);
      if (hits.size > 5000) {
        for (const [name, stamps] of hits) if (!stamps.some((stamp) => t - stamp < windowMs)) hits.delete(name);
      }
      return { ok: true, retryAfterSeconds: 0 };
    },
  };
}
