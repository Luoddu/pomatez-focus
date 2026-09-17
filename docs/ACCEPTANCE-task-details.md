# P0-POMO-012 — task details acceptance

Baseline preview.35 / 190a080cb1ce70c3b08a1c11e5b97611ecf5cab0.
Authority, four-source precheck and allowed scope: TASK-P0-POMO-012.md.
Module implementer /root; no delegated reviewer, live Feishu writes or user data.

## Implemented behavior

Linked task text `详细` (fallback `详情` when absent) travels with existing today()
results and completed placeholders; no additional request or table migration.
Description is optional display metadata in task snapshots/current sessions;
canonical history/accounting identities are unchanged. Existing empty values
stay empty; unrelated text columns are never guessed as a description.

Title button opens a portal with wrapped, scrollable literal text; outside click,
keyboard Escape, outside focus/scroll or resize closes it. Clicking the title does
not select/start a tomato. Timer shows small multiline description below title.
Board/timer accounting, controls, completion, quick creation and uploads unchanged.
No detail text is added to shared history payloads or new telemetry.

## Verification (synthetic tasks only)

- `node scripts/test-focus-all.cjs`: 154/154 PASS. Includes linked rich-text lines,
  plain fallback, primary field preference, cleared/missing details and zero writes;
  snapshot roundtrip retains details while excluding unknown IPC properties.
- `node scripts/build-focus.cjs`: PASS (existing Browserslist/deprecation notices).
- `node scripts/test-task-details.cjs`: 4 scenario groups PASS in real hidden
  Electron main/preload/renderer: literal markup never executes; title-only layout
  unchanged, selection/timer unaffected; switch titles, inside/outside click and
  Escape; long text fits approximately 520-DIP viewport and scrolls; active detail
  survives pause/resume/reload with remote reads held, same session ID retained.
- `node scripts/test-startup-cache.cjs`: 7 checks PASS, actual two-process restart,
  cached detail is visible when starting focus with all remote reads held. Invalid,
  other-day/source caches still rejected and free focus remains usable.
- `node scripts/test-desktop.cjs`: 21/21 PASS plus actual process restart.
- `node scripts/test-portrait-desktop.cjs`: 12/12 PASS.
- `node scripts/test-quick-entry.cjs`: 12/12 PASS, including task reassignment and
  focus while task creation/sync waits. No personal app was stopped or shown.
- Local screenshots: artifacts/task-details/narrow.png and timing.png visually
  inspected (synthetic, ignored). Hidden compositor needed a second capture to
  update its prior frame; DOM hit testing additionally verifies the overlay is top.
  Native window dimensions round by one DIP; test uses existing two-DIP tolerance.

## Limits / rollback / Learning

Read-only optional text only; field attachments/document bodies are outside scope.
Floating compact timer remains compact; details appear in full focus view.
No live credentials accessed; actual user field content awaits ordinary app refresh.
Rollback to prior installer preserves all data because no schema/storage-key change.
Learning-Review: none — existing real-lifecycle and stable-accounting guidance is
applied; this bounded display extension establishes no new cross-task lesson.

## Published release

`v0.1.0-preview.36` was built/packaged from clean source
`0c8e3fc2d9ccc9ea09def52c902823a6ec979675`. The executable ASAR provenance equals
the clean-build receipt. The source branch was pushed non-force using the guarded
helper and verified remotely; published tag points to exactly that source SHA.

[GitHub release](https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.36)
is public (prerelease, not draft), release ID 390776412. All six uploaded assets'
SHA-256 digests and sizes equal local outputs. Update feed setup SHA-512 also
matches. Assets: setup EXE, portable EXE, setup blockmap, preview.yml,
source-version.json and SHA256SUMS.txt. Local ignored receipt:
artifacts/release36-verification.json. User can install through Settings / Check
for updates; the personal running instance was not restarted. No independent
review is claimed. This follow-up changes release documentation only.
