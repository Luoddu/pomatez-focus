# P0-POMO-007 — 连续右键完成

状态：IN_PROGRESS。隔离模块实现者/负责人 Codex；本卡是任务状态源。
用户授权优化连续标记完成并后台同步。基线 650ec2a，公开主线实时检查一致。写集：renderer focus 队列/UI、对应 tests、本卡与版本文件；复用原 completeToday IPC/飞书 PUT，不改凭证、接口、真实表或根仓。独占本工作树及合成测试 profile；不重启用户 App。无子 Agent、长期后台；只在 App 开启时处理用户明确提交的队列，失败显式重试。提交前复核远端/工作树，冲突只停对应步骤。

四处预检：① FocusApp.tsx:597 全局 completing 阻塞，成功还整页刷新，失败回滚整个旧 tasks；service.ts:154 现有计划锁复用。② 不改变第三方语义/依赖，官方第三方迁移不适用；沿用 feishu.ts:826 completePlan 固定行 GET/PUT true/GET 幂等路径。③ 已检查 scripts/test-focus-all、package/build/repo-sync 与 Learning 中逐项持久结果、写后回读失败不等于未写的规则；复用现有本机持久化及 sourceKey 隔离方式。④ tests/plan.test.cjs、plan-desktop、shot-app 及 ACCEPTANCE-integration 为同类验收。

实现：本机持久队列、即时按行投影、串行调用原 API、失败项留存/重试，刷新不复活待完成项；不创建专注分钟/历史。禁止跨 sourceKey 重放，允许正确源恢复处理；失败不阻塞后续，成功仍经原回读确认。存储失败不接受新点击。验收含慢请求时连续入队、重复点击、失败后下一项、重启恢复、源隔离与 stale refresh；完整构建及相应回归。回滚保留原分支/commit，不删除未同步队列。Learning 结论随验收记录。不加载根共享路线图、其他模块和私人材料。

## 验收检查点

已验证：完整 build:focus；test:focus:all 118/118；test:desktop 21/21 及真实进程重启；completion-desktop 使用真实主进程/preload/renderer 和合成飞书适配器，第一项 gate 未放行前连续三项入队、持久化/刷新不复活、第二项失败后第三项继续、重载保留失败、只重试失败、实际分钟不新增全部通过。单元含来源隔离、重复入队、存储损坏/写失败拒绝、计划操作期间暂停后继续。构建版本 preview.27；未重放真实飞书写入，未操作正在运行的 App。

限制：后台处理随 App 生命周期运行，关闭后下次开启恢复 pending；failed 需显式重试，仍遵守原接口“只完成今天番茄”的日期限制。当前来源有待处理项时禁止改连接，防止串表；没有新增服务或网络权限。成功项仅在权威刷新确认后移出本机队列，不以整表旧快照回滚。

Learning：candidate — 乐观批量操作要按项持久化和失败隔离，整表快照回滚会抹掉后续意图；证据为 completion-queue.test.cjs 及 completion-desktop.cjs 的挂起、失败、重载与按项重试验证。根 Learning 不在写集。

封版补检：已将队列投影同时用于 ± 的候选行与“保存并开始下一个”，待同步完成项不会再次成为后续计时/减少候选。真实桌面补测：挂起第 2 项完成请求后，第 1 项仍可开始专注，确认页禁用已标记的第 2 项；通过。底部队列状态条在可视区域内（Windows 分数 DPI 容差 1 DIP）。测试点击确认采用原生 aria-label（可见文字带问号）。最初截图为隐藏窗口旧帧，未把该截图作为视觉验收证据。

preview.27 已创建来源标签但未发布；封版前上述补检发现关联入口需一致处理，因此按不可覆盖版本规则改用 preview.28，保留旧 tag，不发布旧草稿。最终源码/包版本为 preview.28。
