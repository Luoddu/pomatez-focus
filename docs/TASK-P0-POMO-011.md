# P0-POMO-011 — local-first quick tasks and record reassignment

Status: IN_PROGRESS. Module implementer/context owner: /root.
Baseline: 6a8bc82f7b60312db38239c1514098110ed89b16 (preview.32).
Branch: task/p0-pomo-011-local-first. Authority: current user requests, including
task reassignment follow-up; standing source/installer publishing authorization.

## Scope

Immediately project durable queued quick tasks into their quadrant, allow timing
before upload, bind temporary identities to verified Feishu rows without losing
timing/history. Persist failures and retry same intent. Enable saved-record task
selection and move accounting to selected task without duplicate history.
Allowed files: focus renderer/session/queues/components, CounterContext, focus
adapter/history/plan, tests/scripts, module docs and release metadata. No root
shared files, credentials, network settings, other worktrees or real test records.
Exclusive: this task worktree and synthetic hidden Electron profiles. No agents.
Existing table/API identity and permissions retained; reassignment may add one
text field to the same original table for interrupted-move recovery, no new table.

## Four-source precheck / context

1. Current quick tasks exist only in EditQueue until createQuickTask + refresh
   complete. Board projects only CompletionQueue. ManualEntry disabled its select
   for initial records; correctRecord rejects changed task. Verified public SHA.
2. Existing Bitable v1 create/update/get paths, same pinned adapter/runtime; no new
   endpoint, dependency or proxy behavior. API lacks cross-row atomic transactions;
   reassignment needs persisted recovery intent and readback, not blind replay.
   Official routes documented in ACCEPTANCE-quick-entry.md (dynamic v1 docs).
3. Reuse EditQueue persistence/idempotent creation marker, timer storage, plan
   ledger/history validation and completion ownership. LEARN-P1-UI-123-01 stable
   intent retries; LEARN-P1-UI-129-01 verify real lifecycle restoration.
4. Existing quick-edit, edit-queue, cloud and desktop suites; add offline creation,
   timing-before-upload, restart, identity binding and record-transfer fault cases.
Required: module AGENTS, this card, prior acceptance, directly edited source/tests.
Do not load credentials/private runtime or unrelated root architecture. Escalate
new external authority, shared schema effects outside this module or actual overlap.

## Acceptance / rollback

- Add shows title/quadrant/count before network completes and permits focus;
  failed upload keeps row/retry, restart restores it, retry creates no duplicate.
- Bind active and saved draft sessions to real rows; no elapsed/count reset,
  no temporary ID sent as an actual Feishu record ID and no wrong-Base binding.
- Edited record can select another eligible task; cancellation leaves it intact.
  Cloud minutes/history move once; original owned completions released and unrelated
  completions retained. Fault at each write resumes; conflicting edits reject.
- Full focused/regression/build, hidden real UI tests and clean release provenance.
Status/ref/worktree checks at first write, commit, release. Bounded retries; no
background monitors. Previous installer rollback retains records and pending work;
do not downgrade an in-flight move. Evidence in module acceptance; Learning review
applies existing stable-intent/lifecycle guidance, root Learning remains untouched.
