# P0-POMO-015 — visible background generation progress

Status: REVIEW (local validation passed; publication pending).
Role/context owner: isolated module implementer /root.
Baseline: 73f93a474690cc79205933ff1f7c5b7dca84ba56 (preview.40).
Branch: task/p0-pomo-015-generation-feedback. State source: this module card.
User requests immediate compact progress feedback when generating today's plans,
including the existing background path; standing source/installer release consent.

## Four-source precheck

1. FocusApp repeat-generation branch sets silentGenerating only; HistoryPanel
   receives generating only, so no visible busy/progress state. Existing main and
   preload already emit real connect/tasks/records/plan/write/verify events.
2. Third-party semantic change: not applicable; React 16.14/Electron 34.5.8 remain
   unchanged, no IPC/API/network/dependency changes. Pure app-owned display logic.
3. Reuse current progress event subscription, week-goal thin-track styling pattern,
   nonblocking repeat generation and guarded release helpers. UI-129-01 real owner
   lifecycle guidance applies; UI-123-01 duplicate-intent protection preserved.
4. Existing silent-generate-desktop and shot-app generation scenarios explicitly
   assert invisible background progress; update those superseded expectations.
   Desktop/portrait regressions cover compact header constraints.

## Scope, budget and safety

Allowed: FocusApp, HistoryPanel, compact generation button component, focus.css,
silentgen comments, matching renderer tests/shot script, module docs and release
version metadata. No root writes, credentials, personal running app restart,
Feishu test writes, schema, service or network setting changes. Preserve timer,
background interaction, append queue and generator behavior. No subagents,
schedules or new daemon. One bounded implementation/validation/release cycle,
90-minute engineering timebox; diagnosed fixes only, unknown same-cause failure
twice pauses dependent action. Exclusive current worktree/synthetic test profiles.
Read module rules/card/direct source/tests; root maps/roadmap excluded. Escalate
overlapping writer or changed authority; status/remote/worktrees at checkpoints.

## Paired acceptance / rollback

Click shows progress immediately; repeated clicks do not duplicate generation.
Real steps and write counts advance an explicitly step-estimated bar; waiting
animation continues but 100% appears only after generation and refresh succeed.
Failure shows retry feedback, never success; valid retry still succeeds.
No-change result is visible locally without a redundant toast. Background flow
still permits selecting/starting focus. Progress fits inside existing header,
no extra row/layout jump. Both first and repeat flows work. Synthetic screenshot
and real hidden renderer verification; source and installer hashes checked.
Rollback: previous installer/source; no storage or data migration. Learning
judgment and evidence recorded in ACCEPTANCE-generation-feedback.md before commit.
