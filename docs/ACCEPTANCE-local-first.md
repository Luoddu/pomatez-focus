# P0-POMO-011 — local-first tasks and saved-record reassignment

Baseline: `6a8bc82f7b60312db38239c1514098110ed89b16`, preview.32.
Task/authority/write budget and four-source precheck: `TASK-P0-POMO-011.md`.
Role: module implementer /root. No delegated agents or live Feishu test data.

## Root causes and changes

- Quick-task intent was durable, but not projected into the board. The renderer
  waited for remote task creation and a full `today()` refresh. The board now
  projects the durable intent immediately, with a distinct draft identity and all
  requested chips. Timing and manual records can use it. Ordinary upload excludes
  unresolved identities. Creation returns verified plan rows, persists the mapping,
  binds active/saved records and dependent corrections, then saves the task cache
  before retiring the intent. A stale refresh cannot overwrite that acknowledgment.
- ManualEntry disabled its task selector and always reused the original task;
  correctRecord enforced same-task edits. The selector now respects selection and
  cancellation. Server correction moves ledger/history and owned checkboxes using
  a durable bounded intent in one optional text column on the original table.
  Every row write has before/after and association checks plus readback. Retry
  resumes applied steps; concurrent/manual changes are rejected, not overwritten.
- While a move is incomplete, history readers see exactly one old record; ordinary
  accounting writes wait. After completion, the same record ID has a higher revision
  and canonical previous-task lineage, so another updated device can merge a move,
  including skipped revisions. Ordinary same-ID edits remain immutable.

## Verification

All records and task names in tests are synthetic. No real data, secrets or profiles
are included in the repository.

- `node scripts/test-focus-all.cjs`: **146/146 PASS**. Includes every move PUT
  failing before application and after application, then retry; one visible history
  record, unchanged total duration, no duplicate destination accounting. Covers
  multiple moves, same-task correction after a move, manual-field conflicts,
  foreign Base rejection, retained unrelated sessions, completion ownership and
  ordinary write exclusion during interrupted migration.
- `node scripts/test-quick-entry.cjs`: **12/12 PASS**, hidden real Electron main,
  preload and renderer. Task selector is enabled and selected assignment reaches
  correction; another active timer continues. New chips appear before a held
  create acknowledgment; local draft starts focus; failed creation survives a real
  `webContents.reload()` and retry binds the same active timer without resetting it.
- `node scripts/test-local-first.cjs`: **6 checks PASS**, two separate real Electron
  processes sharing a synthetic profile. Process one exits with remote creation
  held, an active draft timer and saved draft record. Process two restores paused
  timing, binds both to verified rows, and uploads the saved record exactly once.
- `node scripts/test-startup-cache.cjs`: **7 checks PASS**, actual cold process
  lifecycle; same-day cache usable with all reads held; empty/day/source/corrupt
  cases still behave correctly and free focus is not blocked.
- `node scripts/test-desktop.cjs`: **21/21 PASS + actual process restart**.
  Native frame, compact/topmost behavior, focus/pause/overtime/discard/export,
  suspend and isolated bridge remain functional. Full build passed; packaging
  rebuilds from the clean source commit and records its SHA.

## Limits and rollback

The original Feishu v1 update/get/list/create paths are reused; no dependency,
identity, permission, network or runtime upgrade. Official API source references
remain in `ACCEPTANCE-quick-entry.md`. Feishu updates have no cross-row CAS: this
remains a single user's sequential-device workflow, not concurrent editing.
Other devices must update to preview.33 before reading task transfers; older
clients do not understand migration intent or assignment lineage. Incomplete
moves retain recoverable intent and require retry on the editing computer.
New task creation remains local-first even if its upload fails; changing its
remote quantity or right-click completing its chips awaits verified row identity.
Task reassignment selects existing available plan rows; the current free record
can be reassigned to a task, but an unrelated new free destination is not offered.

No user app process was stopped. Previous installers remain available, but finish
pending operations before any downgrade; old clients cannot interpret moved history.
Learning review: existing stable-intent (`LEARN-P1-UI-123-01`) and real lifecycle
(`LEARN-P1-UI-129-01`) lessons apply; no new distinct cross-task lesson. Root Learning
and shared control documents are unchanged. Rollback source: task baseline above;
preserve user data and pending queue, never reset user records.
