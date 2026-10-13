---
description: "LifeOS auth threats and the required control. Read during an OAuth or session review."
connections: []
---

# Threats

| Threat | Control |
|---|---|
| CSRF on the callback | Random state, KV TTL 600s, delete on claim (`claimState`). |
| Open redirect | `safeOrigin` / `returnOrigin` allowlist. Default `https://lifeos.ceogps.com`. |
| Auth code injection | Code is exchanged only with the pending row's redirect URI. |
| Stolen browser storage | Provider tokens are not in `lifeos.oauth`. Session JWT still is; keep it the Supabase token only. |
| Confused deputy / IDOR | Token reads filter `user_id` from the verified bearer, plus provider and email. |
| Token in logs | Callback logs `e.message` only. Do not log `code`, tokens, or the KV record. |
| Expired or replayed state | One-time claim. Missing or foreign `user_id` fails closed. |
| Secret in the bundle | Grep the client for `SERVICE_ROLE` and `CLIENT_SECRET` before deploy. |
| Over-broad CORS | Credentialed responses echo only an allowlisted Origin. |
| Account mix-up | Google login_hint plus post-exchange email compare. Mismatch does not set `status=on`. |
| Privilege via header | `X-User-Id` is not identity. Header remains listed for old clients; new code ignores it. |
