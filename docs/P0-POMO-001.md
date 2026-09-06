# P0-POMO-001 — Pomatez Focus

Status: IN_PROGRESS. Owner: Codex /root. This is the independent module execution card; it does not change any host project's status.

## Authorized outcome

Deliver a Windows desktop focus timer, an optional Feishu Base connector, and a public fork with source, attribution, documentation and a tested prerelease. The user authorized all three stages and publication to their GitHub account on 2026-09-06. Working name: pomatez-focus. Never display development consoles or launch visible test windows.

Upstream: zidoro/pomatez v1.11.0, c2727800c6272573590911e9ee81637b89e55d5f, MIT. Preserve upstream attribution and history. Publication target: Luoddu/pomatez-focus; no writes to upstream. Public material contains only generic source, synthetic examples and sanitized verification evidence. Personal task data, tokens and machine configuration are excluded.

## Scope and sources checked

1. Current state: unmodified upstream checkout. User plans one row per intended pomodoro in an existing Feishu Base. User manually decides completion and count. Windows, always-on-top compact window; dashboard in Feishu.
2. Fixed official sources: upstream CONTRIBUTING.md:30–66, package.json:8–32, app/electron/package.json; renderer CounterContext.tsx:239–255 and 296–332 (single timer loop and automatic break transition), timer/types.ts:9–14 (no overtime state). Dida help article 6950408124297641984 documents opt-in overtime and duration correction. Electron 34.5.8 is fixed by upstream.
3. Existing helpers and lessons: upstream desktop/compact/tray infrastructure; existing private Feishu Bitable v1 integration and DPAPI channel were inspected, not copied into the public repository. Existing Learning entries concern unrelated gateway permission resolution, not timer implementation. Use existing local commit/pre-scan helpers only as developer tooling, outside published paths.
4. Prior acceptance: existing private Feishu integration has generation and repeat-run evidence, but no timer/recovery acceptance. New synthetic timer and sync acceptance required; no claim that previous evidence proves this app works.

## Reuse decision and bounded deviation

Adopt the fixed Electron/React build and native window infrastructure. Thin-adapt the existing single CounterProvider for explicit session end, overtime and persistence. Add task mapping and restricted main-process Feishu API access through public Bitable v1 APIs. The upstream timer automatically switches to a break, so configuration alone cannot implement the confirmed overtime choice. Do not introduce a second ticking engine, scheduler, cloud service or task-planning database. Alternative Super Productivity has documented APIs but its compact overlay and detailed session timeline need additional components; prioritize this smaller desktop fork while validating the actual cost.

## Stages and paired acceptance

- S1 Desktop: selectable synthetic/local task; start/pause/resume/early end; time-up reminder without auto-completion; overtime inclusion/exclusion/custom duration; local records; compact always-on-top window; recovery pauses an interrupted session. Pauses and shutdown gaps must not inflate time; normal continued focus and accepted overtime must count. One timer only, no repeated finalization.
- S2 Feishu: list only today's planned rows; append confirmed sessions keyed by a stable session ID; retries do not duplicate records; explicit user-selected completion only. A failed sync preserves a local pending record and a retry must succeed after connectivity is restored. Tokens stay encrypted in the main process; renderer gets only connection status and selected records. Existing unrelated tasks and planned rows are not deleted. Use synthetic records for live verification.
- S3 Public prerelease: compile Windows portable build; documented startup/settings/recovery/known limits; synthetic screenshots; fixed upstream source and changes documented; staged and outgoing delta scanned before push. Clean checkout must build. Do not publish personal records, credentials, private documentation, or unverified stable claims. Independent human usability review remains distinct from automated checks.

## Execution boundaries

Allowed writes: this independent repository's app/, tests/, docs/, scripts/, package manifests/lock, README, changelog, ignore files, branding/build configuration; local excluded development tools and build/test profiles. No host repository edits, services, remote workers, system settings, upstream PRs, new paid services, or model calls. Optional Feishu writes are confined to the user's existing target Base and a dedicated focus-session table, with a preview/schema check before mutation. No automatic task completion. No live data in screenshots.

One root implementer, zero subagents. One active build/test process per purpose. No scheduled/background monitor. Native tools use CreateNoWindow/windowsHide. Read-only transient retries: at most one. Unknown same-root failure twice: stop the affected step and classify; do not stack patches for lifecycle faults. Check status/baseline, changed paths and resource ownership at first edit, each stage and each commit. Other host worktrees are outside this module's write set. Timebox: one active work session; preserve partial evidence if an external prerequisite blocks a stage.

Rollback: close the fork, retain/export local records, restore the previous local commit/build. Never delete upstream history or user records; disable the Feishu connector to stop external writes. No force push. Learning review: none at bootstrap — no new validated cross-task engineering finding yet.
