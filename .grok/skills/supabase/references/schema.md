---
description: "Tables and columns the LifeOS worker actually writes. Read before a migration."
connections: []
---

# Schema notes

## integrations_credentials

Worker inserts and patches this table with the service role. Columns the callback and fresh-token route use:

`id`, `user_id`, `integration_name`, `label`, `email`, `oauth_provider`, `oauth_access_token`, `oauth_refresh_token`, `oauth_expires_at`, `oauth_scope`, `oauth_id_token`, `oauth_state`, `oauth_redirect_uri`, `status`, `updated_at`.

`status` is `pending` or `on`. Nylas stores the grant id as `oauth_refresh_token` prefixed with `grant:`.

Duplicate connected rows for the same `user_id + oauth_provider + email` are deleted after a successful callback.

## user_settings

Older code disagrees on column names (`key`/`value` vs `key_name`/`key_value`). `src/lib/unifiedStorage.ts` and the worker KV route must be checked against the live table before a write. Do not migrate both shapes in one unattended statement.

## Auth user

`user_id` on credentials is `auth.users.id` from `GET /auth/v1/user`, not the email. Email is a separate column and can differ from the login mailbox (the linked Google account).
