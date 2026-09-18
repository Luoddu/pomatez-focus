# P0-POMO-014 — local-first additional tomatoes

Baseline: `02c86bae8caffe225dd894429a0e0c06888b77e1` (preview.39).
Task contract and four-source precheck: [TASK-P0-POMO-014](TASK-P0-POMO-014.md).

## Root cause and implementation

The existing task-row plus handler inserted a pending placeholder without source,
quadrant or description. The board disabled pending chips and rendered missing
quadrants gray. Network error restored the entire old list. This is app state
projection, not a Feishu permission or transport issue.

Reuse the durable quick-task outbox/receipt binding for an explicit append intent:
original task ID, date, sequence, quadrant and details. Persist before display,
select the new chip, allow timing and saving before receipt, retain siblings and
normalize group progress. Read the latest queue for successive clicks sharing one
render closure. Failed writes remain retryable and survive a cold process restart.

The adapter ensures the specified task/day/sequence using the existing v1 record
API and task/day/sequence client_token. It does not create a second task or update
task counts/schema. Saved focus waits for receipt, then binds to the real row and
syncs through the existing path; active time/session identity are preserved.

Foreign sources, invalid sequences, missing tasks, duplicate slots and already
occupied slots reject without losing local focus. Valid additions and lost-reply
retry work. Same-task minus waits for unresolved appends; existing minus and
completion guards remain. No field, credential, permission or dependency change.

## Validation

- `node scripts/test-focus-all.cjs`: 164/164 PASS. Includes all four quadrants and
  unclassified fallback, completed-task append, metadata/count projection, foreign
  receipt rejection, adapter lost acknowledgment and repeated retry, original-day
  retention and occupied/duplicate/missing-target rejection.
- `node scripts/build-focus.cjs`: PASS.
- `node scripts/test-append-plan.cjs`: real hidden Electron/main/preload/renderer,
  synthetic service, two cold processes PASS. Completed-task 3/3 becomes 3/5 after
  two same-turn clicks; other three quadrants retain original chips. Stale refresh
  preserves drafts; all chips usable. Save a record and start/pause focus before
  remote response, force offline failure, restart, manually retry all five intents,
  bind the same active/saved identities and elapsed time, upload the saved record
  once, preserve sibling plans. Initial harness clicked manual sync before startup
  sync finished; corrected to wait for the button's real enabled state. No product
  workaround or personal Feishu write used for that test.
- Existing local-first cold restart suite: PASS (six lifecycle checks).
- Existing quick-entry suite: 12/12 PASS.
- Completion real-renderer/adapter suite: PASS (rapid triple completion, isolated
  failure, reload/retry, no invented focus minutes and minus guard).
- Active task correction suite: four scenario groups PASS.
- Task details suite: four scenario groups PASS.
- Desktop suite: 21/21 and two-process restart PASS.
- Portrait/landscape suite: 12/12 PASS. Preview.38/.39 layout/chip behavior retained.

Raw synthetic logs in ignored `artifacts/append-*.log`; no personal task data or
credentials in tracked evidence. Chromium can emit GPU teardown warnings after
passing hidden runs; no test assertion or product behavior failure accompanied them.

## Boundaries, review and rollback

Implementation review checked the diff against preview.39, receipt validation,
durable queue order, current-day projection and the existing bridge/write lock.
This is implementer review, not an independent-agent review. Other worktrees are
untouched; no overlapping writer observed. Public mainline remained preview.39 at
version reservation; preview.40 reserved through the existing helper.

No live user app stopped, restarted or installed over. No network settings or
real task data changed for testing. Existing release authorization applies.
If another device has already used the reserved slot, keep local focus and show
the conflict; do not attribute it silently to another completed record. Rollback
to preview.39 only after append intents have drained: older code cannot interpret
the append payload. Storage keys and existing history remain unchanged.

Learning-Review: none — existing UI-123-01 stable-intent and UI-129-01 real-lifecycle
lessons apply directly; this fix does not establish an additional cross-task lesson.
Release verification will be appended after packaging/publication.
