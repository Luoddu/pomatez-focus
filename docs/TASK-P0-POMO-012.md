# P0-POMO-012 — task details on demand

Status: REVIEW (implemented, tested and published; no separate reviewer assigned).
Module implementer/context owner: /root.
Baseline: 190a080cb1ce70c3b08a1c11e5b97611ecf5cab0 (public preview.35).
Branch: task/p0-pomo-012-task-details. User authorizes this UI adaptation;
standing source/installer publication authorization applies to the existing repo.

## Scope and context

Read optional linked task text field `详细` (fallback `详情` only if absent).
Show title-only board; title click reveals details, outside click dismisses.
Show smaller details below active task title. Preserve selection/timing/accounting.
User examples are reference, not tasks to create or publish.
Allowed: focus Feishu today adapter, renderer task/cache/components/CSS, dedicated
tests/runners, module docs, existing release metadata. No root shared files,
credentials, live Feishu writes, other worktrees or running personal app changes.
Exclusive resources: current clean worktree and synthetic hidden test profiles.
No agents, monitors, dependency/runtime upgrades. One bounded implementation and
regression pass; retry only after classifying failure. Recheck Git at commit/release.

Required context: module AGENTS, root dispatch/context/version-control relevant
sections, this card and edited source/tests. Unrelated architecture excluded.
Escalate actual overlapping writes or new identity/schema/network authority.

## Four-source precheck

1. Current: adapter already reads linked task records but drops detail text;
   FocusTask/cache lack description, board title is plain text and timer only title.
   Live fetch/check:sync confirmed preview.35; prior preview.33 branch preserved.
2. Installed react-dom 16.14.0 official package, cjs/react-dom.development.js
   lines 24910–24960, 25001: public createPortal into DOM container. Existing hooks
   and escaped JSX text; no HTML parsing. Existing Bitable v1 list response/plain
   rich-text parser reused, no new API/third-party runtime behavior. No upgrade.
3. Reuse task snapshot and active-session persistence. Root Learning lookup:
   LEARN-P1-UI-129-01 real component/lifecycle verification applies. Existing
   scripts/test-focus-all.cjs, test-startup-cache.cjs and hidden Electron runners.
4. Existing ACCEPTANCE-local-first.md and task-snapshot/feishu/desktop suites.
   Add text mapping, no-field compatibility, cache, outside dismiss, unchanged
   selection, timer/pause/reload and narrow-window UI checks using synthetic data.

## Acceptance and rollback

- Details preserve line breaks and literal markup; no script/HTML execution.
- Title opens details without starting/changing focus; outside click/Escape closes;
  other task titles remain usable, no board layout shift or viewport overflow.
- Missing details keep title/chips usable; same-day cache and active reload retain
  details; same timer/ID survives pause/resume. No extra adapter write/API request.
- Existing accounting, quick entry, desktop checks and build still pass.
- Publish only clean tested source with verified artifacts and next free version.
Rollback: previous installer/source; additive optional display metadata requires
no table migration, existing records and accounting identities remain unchanged.
Evidence: ACCEPTANCE-task-details.md. Learning judgment at checkpoint: reuse
existing lifecycle guidance; no new reusable lesson established yet.

## Release handoff

preview.36 source/tag: 0c8e3fc2d9ccc9ea09def52c902823a6ec979675.
Public source branch and six release assets verified; installation remains a user
action through existing in-app update. No personal app interruption or live data
mutation. See acceptance for published release and verification receipt details.
