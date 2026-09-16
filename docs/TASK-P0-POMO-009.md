# P0-POMO-009 — quick entry and nonblocking focus

Status: DELIVERED; preview.31 published. Module execution card; owner /root.
Release source: 97d9e4f7961848461aa63faf7c6e62fd0cf222bd.
Release: https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.31
Baseline: 354410f1abd58da37c17a1d1a5170beb35c2cba9 (preview.30).
Branch: task/p0-pomo-009-quick-entry; coordination ref origin/codex/feishu-focus.

## Authorized scope
User requested count → duration → start-time manual entry, quadrant quick tasks,
starting focus during background sync, and correction of mistaken saved records.
Implement inside app renderer/electron focus, CounterContext, main/preload IPC,
tests and module docs; package metadata only for a verified release.
Standing user authorization includes publishing source and installer updates to the
existing Luoddu/pomatez-focus repository; no new remote or private history publication.
No changes to root governance, other worktrees, credentials, proxy, or real Feishu
test data. No background agents or scheduled jobs. Existing dependencies retained.
Independent worktree and synthetic Electron test profiles are exclusive resources.

## Behavior and acceptance
- Count changes preset count × 25 minutes; duration changes backdate start from now;
  manual start-time adjustment remains possible. Duration does not change count.
- Quadrant + creates a dated task and its planned tomatoes in the existing linked
  Feishu table. Pending intent survives restart; retry does not create duplicates.
  No writes to a different configured Base; no success label before readback.
- Background refresh/upload cannot disable starting a known task or free focus;
  storage failures and pending placeholder tomatoes still cannot start.
- Saved-record correction is staged locally during upload and applied afterwards.
  Same record identity, versioned cloud snapshots, conflict checks and explicit retry;
  no blind overwrite of other-device edits or unrelated task completions.
- Test normal flow, disconnected/retry/restart, response lost after write, stale
  revision and background sync while timing; full build and applicable regression.

## Precheck / four sources
1. Current: preview.30 clean public baseline, fetched and check:sync PASS. ManualEntry
   follows minutes → count; FocusApp passes busy || loadingTasks to start button;
   cloud/ledger intentionally reject changed immutable records, no correction API.
2. Official: existing Feishu Bitable v1 create/update endpoints (official create and
   update documentation checked 2026-09-16; dynamic pages lack extractable text).
   Use documented POST records + client_token, PUT fields and GET readback, same as
   current adapter. No SDK/runtime upgrade. Persistent operation marker required;
   do not assume indefinite client_token retention or server compare-and-swap.
3. Reuse existing CompletionQueue persistence pattern, generate clientToken and
   schema resolvers, plan ledger/history validators. Learning LEARN-P1-UI-123-01:
   preserve user-intent identity on ambiguous retry. No new root Learning write.
4. Existing tests: manual-sync-desktop, completion-queue, Feishu/plan/history/cloud
   suites and test-focus-all. Extend with synthetic quick-entry/correction tests.

## Budget and rollback
No delegation. Bounded diagnostics; investigate repeated failure before new patch.
Check status/remote ancestry before first edit, checkpoint and release. Other clean
worktrees are not conflicts; never modify Kimi's branch. Rollback via prior release
and backed-up local history; never reset user history. Pending operations remain
recoverable and old releases must not overwrite newer record revisions.
Learning-Review: none — no new root-wide lesson; existing LEARN-P1-UI-123-01 applies.
Verification and limitations: ACCEPTANCE-quick-entry.md. This module is not a root
integration or shared-service change. Root dirty files remain untouched.
