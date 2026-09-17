# P0-POMO-013 — correct active task and diagnose missing details

Status: REVIEW. Role/context owner: module implementer /root.
Baseline: 9089d44aea37e6267207283e2c5e4b91ac7976e7, public preview.36.
Branch: task/p0-pomo-013-active-task. User requests active-task correction
including free focus and investigation of real missing descriptions. Existing
source/installer publication authorization applies.

## Scope and context

Allow correction of active/paused task attribution without resetting session ID,
elapsed/accepted duration, start/segments or pause state. Entire unsaved focus is
assigned to the selected task (not split); sync still begins after confirmation.
Keep foreign-source and unavailable plans excluded. No saved-history migration here.
Diagnose installed package and read-only Feishu response through existing encrypted
connection; keep plaintext secrets/tokens and personal task values out of outputs,
files and Git. Only read operations and necessary existing authentication exchange.
No live task edits, app restart, credential configuration or identity/permission change.

Allowed: module focus adapter/session/CounterContext/components/CSS/tests/runners,
module docs/release metadata, ignored bounded diagnostic output. Exclusive current
worktree and isolated hidden test profiles. No agents, recurring work or other
worktree edits. Refresh Git at first write/commit/release. Stop actual overlap or
new identity/schema/network changes; unrelated root architecture excluded.

## Four-source precheck

1. Public preview.36 includes title/details UI; installed ASAR provenance matches
   source 0c8e3fc. Active FocusTimer has no reassignment; begin() refuses an active
   session, so correction needs an atomic in-place task replacement. Real description
   live read and local cache both contain descriptions (5 distinct tasks).
   Pointer click succeeds in real hidden renderer. No parsing failure reproduced;
   add discoverability and refresh active display metadata instead of schema edits.
2. Same pinned React 16.14/Electron 34.5.8 and existing Feishu v1 records/text
   parsing. No new runtime, endpoint or permissions. Existing state-owner/public
   React update and native select semantics reused. Prior details evidence: task012.
3. Reuse CounterContext settle/publish and task snapshot, board projected tasks,
   pending-credit helper. Learning real-lifecycle validation applies (UI-129-01);
   stable intent ownership and canonical accounting must remain unchanged.
4. ACCEPTANCE-task-details/local-first; session, Feishu, cache and hidden desktop
   tests. Add free-to-task/task-to-task/task-to-free, cancel, pause/reload and final
   save checks; real read-only diagnostic reports only counts/types/field names.

## Acceptance and rollback

Change task without resetting time or uploading the old assignment; preserve pause
and elapsed segments. Cancel leaves task unchanged; no duplicate history/record.
Target details show immediately, current timer stays usable while choosing.
Fields with real descriptions display; missing descriptions keep legacy tasks usable.
Validate packaged installed behavior and data path as well as synthetic tests.
Rollback previous installer (additive local behavior, no schema migration).
Learning review/evidence: ACCEPTANCE-active-task.md; no independent review claimed.
