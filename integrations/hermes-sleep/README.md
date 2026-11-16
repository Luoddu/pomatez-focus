# Hermes sleep check-ins

Native Hermes plugin for a same-user running Pomatez desktop. No network listener,
NAS, Tailscale, copied account credentials, or independent sleep database.

The controlled gateway must supply its existing single-user `WEIXIN_ALLOWED_USERS`
environment value. Tool calls must carry Hermes' real `weixin` / `dm` session
context for that user, and must not be cron calls. The plugin does not decrypt
account storage. It registers tools in `hermes-weixin` and a native prompt section.

Install this directory in the operator's Hermes plugins directory. Add the verified
`sleep-client.cjs` and `journey-client.cjs` from the same farm release under `client/`.
Local-only `runtime.json` contains absolute `node`, `client`, `state` paths,
`node_sha256`, and `hashes` mapping the two client filenames to SHA-256 values.
Never commit this file or the request receipts. Enable with native
`hermes plugins enable pomatez-sleep --no-allow-tool-override`, then reload through
the existing gateway owner when idle. Do not start a competing bare gateway.

“晚安 / 我要睡了” means a self-reported bedtime, not measured sleep onset.
“我起床了 / 早上好 / 早安” records wake time; a leading/trailing “澄” is accepted.
`at` is required: use a verifiable original message timestamp or the user's explicit
actual time, never the tool invocation clock. Ask when no timestamp is available.
Quotes, plans and discussions must not be rewritten into direct check-ins.
Existing fields are preserved; correction is a separate explicit operation.
`pomatez_sleep_correct` requires an explicit user correction request, the wake-day,
one kind, the intended timestamp, the revision just read, and a UUID. It changes
only that field, retains the other, and reads back after saving. Only `verified=true`
supports a success claim. Conflicts must not silently fetch a new revision and overwrite.
Milliseconds are preserved (sub-millisecond precision is normalized to JavaScript Date).
No desktop clicking or broader computer-use approval is required.

Reuse the same UUID and identical arguments after an unknown result. A kernel lock
serializes that UUID; it releases on process death. The exact request is atomically
persisted before sending, so retry can recover the farm receipt. Do not delete lock
files while another process may use them. An unavailable farm returns failure and
must never be described as a successful save.

Validated against Hermes commit `d337b736aa1e8ebecfab043842d13e4a2d2f48a3` native
plugin registration and `gateway.session_context` API. Real WeChat delivery is a
separate operator acceptance step; synthetic test messages are never personal data.
