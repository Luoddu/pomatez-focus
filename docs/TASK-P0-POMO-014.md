# P0-POMO-014 — local-first additional tomatoes

Status: REVIEW (implementation/local acceptance passed; preview.40 published;
independent-agent review not claimed).
Role/context owner: isolated module implementer /root.
Baseline: 02c86bae8caffe225dd894429a0e0c06888b77e1 (public preview.39).
Branch: task/p0-pomo-014-plan-local-first. User requests usable local additions in
the original quadrant while remote writes run. Standing source/installer release
authorization applies. Source of task status: this module card only.

## Four-source precheck

1. adjust(+1) inserts kind=pending without quadrant/sourceKey/description;
   QuadrantBoard disables those chips and falls back to the gray quadrant.
   It snapshots/rolls back the whole task list on error and awaits full refresh.
2. No dependency/runtime upgrade (Electron 34.5.8, React 16.14). Existing Bitable
   v1 records GET/list/create and deterministic task/day/sequence client_token
   remain in use; existing quick-task receipts/queue reused. Pure app state
   semantics change, no new third-party mechanism. Existing official API sources
   in ACCEPTANCE-quick-entry.md; no new field/permission/service required.
3. Reuse EditQueue persisted intentions/receipts, quickRows projection,
   bindQuickSessions and unresolved-session sync gate. Stable intent and real
   lifecycle Learning guidance UI-123-01/UI-129-01 applies; no root writes.
4. local-first, quick-edit, completion, active-task and hidden desktop suites
   directly cover these paths. Add unresolved append/restart/lost-reply tests.

## Scope / budget / concurrency

Allowed: renderer focus queue/types/board/FocusApp, Feishu adapter (same existing
createQuickTask bridge), module tests/runners/docs and release version metadata.
No credentials, live task writes for testing, root shared files, network settings,
other worktrees or user app restart. New backend branch only ensures the queued
task/day/sequence row; minus behavior preserved. No unrelated layout changes.
Mandatory context: module AGENTS, root module boundaries/dispatch/version rules,
this card and direct code/acceptance. Unrelated maps/root roadmap excluded.
Escalate actual concurrent overlap or changed identity/schema/authority. No agents,
scheduled work or new daemons; one implementation/review cycle, bounded diagnosed
retries. Exclusive this worktree and synthetic hidden profiles. Refresh status,
remote baseline and worktrees at commit/release; retain preview.38/.39 features.

## Paired acceptance

Append remains in all four original quadrants, including a completed-task group;
not misclassified or disabled. Immediately start focus before any network reply;
failure/restart preserves the row and time, successful receipt binds to real row.
Saved pre-receipt focus waits locally then syncs once; no temporary plan ID sent.
Retry uses the same desired sequence/day; lost acknowledgments create no duplicate.
Foreign source/invalid sequence/occupied historical row reject; valid original-table
adds still succeed. Unrelated rows, selection and progress survive readback.
Quick-task creation, minus protection, completion queue, task correction, chip
window and layout remain working. No downgrade while unresolved append exists:
previous versions do not understand append intents; drain first, then rollback.
Evidence: ACCEPTANCE-plan-local-first.md. Learning disposition before checkpoint.
