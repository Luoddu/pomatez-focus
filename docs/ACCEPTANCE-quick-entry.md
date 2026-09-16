# P0-POMO-009 — preview.31

Baseline: public preview.30, 354410f1abd58da37c17a1d1a5170beb35c2cba9.
Scope and four-source precheck: TASK-P0-POMO-009.md.

## Behavior

- 补记：先填番茄数，按每颗 25 分钟预填时长；调整时长后，开始时间
  按当前时刻倒推，可再手动微调。时长不会反过来改番茄数。
- 四象限悬浮/键盘聚焦出现 ＋；输入名称和今日番茄数，后台写入既有
  飞书任务表及原番茄表。计划日为添加当天，不勾选近日行动。
- 任务表增加文本字段「农场任务标识」，保存稳定操作 ID，避免断网或
  回执丢失后重试重复建任务。不写入凭证。
- 刷新、同步历史时，已加载任务与自由专注可以开始；首次任务加载、
  损坏的本地计时状态、休息中等原有保护保留。
- 专注记录旁增加「修改」。同步中的记录也可提交修改；本机队列持久化，
  原上传结束后再按原 ID 修正分钟台账和跨端记录。其他电脑拉取较高版本，
  同版本内容冲突拒绝覆盖，旧响应不回退新内容。
- 修改已有记录的番茄数不会重置原时间；只改数量时保留秒数、暂停区间。
  新增与纠错失败显示具体原因，可重试；不影响正在运行的计时。

## Verification (synthetic data only)

- `node scripts/test-focus-all.cjs`: 135/135 pass.
- `node scripts/build-focus.cjs`: full Electron/preload/renderer build pass.
- `node scripts/test-quick-entry.cjs`: 8/8 real hidden Electron UI checks pass:
  count/duration/start linkage, manual date preservation, starting during upload,
  editing during upload and active focus, durable task creation retry/reload,
  starting a selected tomato during task refresh.
- `tests/manual-sync-desktop.cjs`: 4/4 pass.
- `tests/completion-desktop.cjs`: rapid completion, persistence, restart and retry pass.
- `node scripts/test-desktop.cjs`: 21/21 plus actual process restart pass.
- `node scripts/test-portrait-desktop.cjs`: 12/12 pass.
- New adapter tests cover response lost after task/plan creation, response lost
  after correction PUT, repeated retry, wrong Base, stale revision, manual ledger
  conflict, owned completion rollback and legacy unowned completion preservation.
- No private Feishu test tasks created; tests run with synthetic service/adapter
  and isolated profiles. No user app stopped or credentials accessed.

## Limits / recovery

Some old sessions lack ownership of additional completed plan rows. Corrections
still update minutes/history, but those checkboxes are preserved with a warning.
Extra checkboxes owned by another session are also preserved. Increased completion
counts use existing completion logic; historical ownership not known to the app is
never inferred from task titles. Task reassignment and record deletion are not part
of this edit UI. Feishu lacks an adapter-level compare-and-swap transaction: the app
checks before write and verifies after write, but does not claim a distributed lock
against simultaneous independent editors. Upgrade other devices before using edited
history there; older clients deliberately reject changed immutable snapshots.

Local outbox retains original and proposed record until success. Existing session
backup is retained. Rollback app binaries independently of data; do not reset user
history or downgrade edited records. New task retries use both durable marker and
official Bitable v1 client_token; no assumption of unlimited token lifetime.

Learning-Review: none — stable intent on ambiguous retries is already captured by
LEARN-P1-UI-123-01; these tests apply that rule. No new root-wide lesson established.

Official API references (v1 routes, no runtime/SDK upgrade):
- https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/create
- https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/update
