# P0-POMO-010 — usable startup with task snapshot

Status: VERIFIED; preview.32 packaging next. Module implementer/context owner: /root.
Baseline: 4a04ee641a586c5935cd913ae17933fee7b525e0 (preview.31).
Branch: task/p0-pomo-010-startup-cache; coordination: origin/codex/feishu-focus.

## Scope and authority

Fix empty/blocked task board on every restart. Same-day, same-connection task
snapshot first, background refresh next; free focus remains available after local
connection identity is known even without a snapshot. Keep completed/history data,
today generation, real Feishu API and credentials unchanged. Standing publication
authorization covers source and installer to existing Luoddu/pomatez-focus remote.
Allowed: renderer focus cache/FocusApp, focused tests, scripts, module docs and
release version metadata. No root control files, user profile writes, other
worktrees, network settings or live Feishu test records. No new services or agents.
Exclusive resources: this clean task worktree and synthetic hidden Electron profiles.

## Precheck / required context

1. Current code: FocusApp initializes tasks to [] and loadingTasks=true; refresh
   waits for today() without a persisted task snapshot. Starting free focus is
   disabled when loadingTasks && tasks.length===0. preview.30 silentgen only handles
   repeated generateToday; it does not implement cached startup. status() is local
   credential/config identity lookup, not a remote fetch. Public baseline verified.
2. Official third-party semantics: not applicable; no third-party API, runtime or
   storage mechanism changed. Reuse existing renderer localStorage and React state
   patterns on the pinned build (no dependency upgrade).
3. Reuse: CompletionQueue projection, localStorage outbox error handling,
   refreshSequence stale-response protection; existing silent generation remains.
   Learning LEARN-P1-UI-129-01: restoration belongs in the always-mounted owner,
   verified through actual cold startup, not a separately mounted leaf component.
4. Acceptance: existing quick-entry, manual-sync, completion and desktop tests;
   add snapshot unit tests and real main/preload/renderer cold-restart tests.
Must load module AGENTS, prior task/acceptance, FocusApp, FocusService.status,
task/session types and tests; root governance/version-control applies.
Do not load private credentials, runtime data or unrelated architecture.
Escalate only changed external authority, actual overlapping writer or schema/API
changes. No delegation, persistent background jobs, or blind repeated retries.

## Acceptance / rollback

- Cached same-day tasks render and can start before remote today/history complete;
  wrong connection/day or malformed cache is never displayed as current tasks.
- Empty cache still allows free focus once local identity resolved; pending task
  placeholders and corrupt timer state remain blocked as before.
- Failed refresh preserves useful cache and permits retry; successful empty result
  replaces cache. Late obsolete responses cannot overwrite newer connection/day.
- Completion queue projection applies to cached tasks; cache does not own history.
- Run full regression/build and cold process restart tests, verify clean packaged
  provenance and remote assets before publishing. Do not interrupt the user app.
Check status/ref/worktrees before write, commit and release. Root files untouched.
Rollback: previous app binary, retaining user records; cache is disposable and
   versioned. Learning-Review: none — applies existing LEARN-P1-UI-129-01;
no newly established general engineering lesson. Evidence: ACCEPTANCE-startup-cache.md.
