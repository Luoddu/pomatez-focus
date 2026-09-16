# P0-POMO-010 — startup task snapshot (preview.32)

Baseline: 4a04ee641a586c5935cd913ae17933fee7b525e0 (preview.31).
Four-source precheck, scope and rollback: TASK-P0-POMO-010.md.

## Verified root cause

FocusApp initialized tasks to [] on every mount, awaited Feishu.today and disabled
the start button while loading an empty list. preview.30 silentgen only changed
repeat generation; preview.31 only unblocked sync after tasks were loaded. Neither
persisted tasks across restarts. This is application initialization, not evidence
of a proxy, DNS, IPC or OS storage failure. No network/system settings changed.

## Changes

- Persist the latest successful task read in the existing renderer storage.
- After local status identifies the configured table, restore its same-day cache
  immediately; network reads refresh it afterwards. Cache date matches Feishu's
  local-day calculation. No secrets or arbitrary response fields are cached.
- Permit free focus after local identity is known, even with no cache / offline.
- Wrong source/day, malformed data and optimistic pending placeholders are not
  restored. Failed reads preserve prior rows; successful empty reads replace them.
- Persist fresh rows before retiring completion intents, so old cache cannot
  revive an acknowledged completed chip. Existing queue projection still applies.
- Preserve stale-response guards and do not change timer/history ownership.

## Validation

- Full focus unit/adapter suite: 140/140 pass, including five snapshot tests.
- Full focus Electron/preload/renderer build: pass.
- `node scripts/test-startup-cache.cjs`: seed in one hidden Electron process,
  flush storage, exit, start a second process with ALL remote reads held. Cached
  selected task can start before reads resolve. Then verify offline retention,
  authoritative empty replacement, wrong-day exclusion with free focus available,
  different-source exclusion, corrupt-cache recovery. Seven checks pass.
- Existing quick-entry desktop flows: 8/8 pass; existing silent-generation UI:
  3/3 pass; desktop lifecycle: 21/21 and actual process restart pass.
- Initial harness reload was rejected by main.ts will-navigate. Diagnostics showed
  unchanged request count and page state. Harness now uses webContents.reload and
  checks a new today() call, rather than accepting a no-op renderer navigation.
- All data synthetic; no user app restart, credential access or live Feishu writes.

## Limits / recovery

Upgrading from versions without task cache requires one successful initial read to
seed it. On a new day, old tasks are excluded and a fresh read is needed; free focus
is available meanwhile. Cache represents the last read, so edits on other devices
appear after background refresh. The network transfer itself is not claimed faster.
Cache failure does not disable focus and is reported; history is independent.
Rollback binaries without deleting user records; the new cache is disposable.

Learning-Review: none — reuses LEARN-P1-UI-129-01 cold-start lifecycle verification;
no additional root-wide lesson. Module delivery does not imply root integration.
