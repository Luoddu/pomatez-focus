# P0-POMO-013 — active assignment and visible details

Baseline: public source 9089d44, packaged preview.36 source 0c8e3fc.
Branch: task/p0-pomo-013-active-task. Next installer: preview.37.
Scope/precheck/rollback: TASK-P0-POMO-013.md. No independent review claimed.

## Diagnosis

Installed ASAR source receipt matches clean preview.36; its Feishu adapter equals
the packaged build. A bounded read-only query through the existing app connection
returned 21 plan rows, 10 carrying descriptions, across 5 distinct tasks. The linked
task field is `详细`, returned as text. Read-only local cache inspection found the
same counts. Neither personal task values nor credentials were written to evidence.

Actual mouse input opens details in the hidden production renderer. The reported
missing popup could not be reproduced: do not claim an adapter bug was found.
The previous UI lacked an explicit detail indicator and an empty-details response.
Also, the active task was captured only at begin(): remote metadata refresh did not
update that display. This change addresses both observable gaps. Feishu schema and
read endpoints remain unchanged.

The diagnostic initially used a separate profile and could not decrypt the existing
connection. Fixed Electron 34.5.8 safeStorage source shows decryption uses OSCrypt;
electron_browser_main_parts initializes the profile Local State. Using the original
profile via app.setPath, without BrowserWindow/default session, permits the existing
read-only connection. Original Local State SHA-256 was unchanged. No credentials
were copied, reconfigured or exposed, and no remote records were mutated.
Official fixed sources: electron/electron v34.5.8,
shell/browser/api/electron_api_safe_storage.cc (DecryptString, lines 71–114),
shell/browser/electron_browser_main_parts.cc (OSCrypt/Local State initialization).
Local ignored diagnostic scripts remain outside the published tree.

## Behavior

- Active and paused full-window focus offer an inline task selector, including
  free focus. Confirm updates only the task snapshot; session ID, segments, start,
  elapsed duration and pause state survive. The whole unsaved session is reassigned.
- Cancel changes nothing and does not pause an active clock. Completed/unavailable
  plans and foreign sources cannot be selected; ordinary available plans still work.
- No sync before final confirmation; save creates one record for the corrected task.
- Described titles show a small details cue. All titles can be clicked; missing
  text explains the field/refresh path. Outside click/Escape closes the panel.
- Current focus displays refreshed description, including an intentionally cleared
  field; absent task rows preserve the session's original description snapshot.
- Existing pending-credit calculation is reused; no timer or sync implementation
  is replaced. Compact window remains compact; expand it to change assignments.

## Validation

- `node scripts/test-focus-all.cjs`: 156/156 PASS.
- `node scripts/build-focus.cjs`: PASS.
- `node scripts/test-active-task.cjs`: four real Electron lifecycle scenarios PASS:
  free-to-task, task-to-task/free, cancel while ticking, paused changes and reload,
  refreshed/cleared details, and one final sync to the corrected plan.
- `node scripts/test-task-details.cjs`: four scenario groups PASS, including actual
  pointer input, explicit cue, empty state, literal text escaping, outside dismissal,
  narrow viewport and restored focus details.
- `node scripts/test-quick-entry.cjs`: 12/12 PASS (inflight sync, task creation and
  saved-record reassignment still work).
- `node scripts/test-portrait-desktop.cjs`: 12/12 PASS.
- `node scripts/test-desktop.cjs`: 21/21 plus two-process restart PASS. Initial
  fixed-delay wide-layout assertion was intermittent; diagnostic viewport read
  showed the correct 1101 x 761 viewport at 1.75 DPI and separated panels. Test now
  waits for the requested renderer viewport before asserting layout independently,
  rather than assuming native resize delivery within 150 ms. Product window logic
  is unchanged. Logs/screenshots use synthetic data in ignored artifacts.

## Safety and Learning

No personal running app was stopped, restarted or installed over. No schema,
permissions, identity or private-data publication change. T1 code is reversible;
rollback installer keeps storage keys and history. Existing source/release
authorization applies. Concurrent worktrees have no overlapping current edits;
public baseline unchanged at version reservation (live preview.36).

Learning-Review: none — existing real-lifecycle and single timing-owner guidance
applied; this UI correction adds no independently established cross-task lesson.
