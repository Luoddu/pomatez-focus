# P0-POMO-097 acceptance

Status: implementation, isolated write integration and actual WeChat read verified;
release pending. Baseline `a90db53c4ce59390c23cb033fcbe8bb6d7dcc710`.

- `build:focus`: PASS, production React/Electron build.
- Fixed Node 24.22.1 `scripts/test-focus-all.cjs`: 581/581 PASS.
- Sleep store/goals: 17/17 PASS; midnight-relative means, separately missing samples,
  goal persistence, unchanged historical record bytes, invalid/corrupt goals rejected.
- Python plugin: 6/6 PASS, direct phrases accepted, quoted/planned content rejected,
  same UUID request replay, existing field preserved, unauthorized context denied,
  live lock denied and real child-process crash releases lock.
- Hidden, muted desktop fixture: actual stdio transport + Electron store + preload
  stats/goals + renderer, 14 endpoints and two target lines; 2:3 columns and narrow
  viewport without overflow. Actual 7/30 buttons and target form save verified.
  Desktop mean sample is 23:20–23:38 => 23:29; cross-midnight mean is covered by unit tests.
- Actual fixed Hermes session context in a synthetic child process: plugin-to-stdio
  write, same request replay, other user denial PASS (3 checks). Personal state untouched.
- Independent review closed source-authentication and crash-lock findings after
  reading fixed Hermes context and upstream DM allowlist adapter. No open P1/P2.

Runtime installation is separate from source acceptance. Native plugin doctor confirms
three tool registrations. Use the existing controlled gateway launcher, which injects
its encrypted account in memory; do not copy credentials or start a bare gateway.
The user sent the requested WeChat query: native read plus 7/30-day statistics tools
returned successful JSON receipts without errors. The first actual bedtime/wake
write remains to be observed when the user really checks in; no synthetic personal
records were created. This limits live-write acceptance, not the isolated tests.

Rollback: disable only this plugin through native CLI and reload via the existing owner;
retain personal sleep records and request receipts. Previous farm can still read sleep
records. Learning: existing idempotent recovery lessons apply; no new general lesson.
