# P0-POMO-032 连续减少番茄与新增任务项目归属

- DONE；隔离模块实现者/上下文负责人 Codex，唯一状态源为本卡。用户要求减号不等同步、新增任务可选择项目颜色；沿用已授权公开源码与 Windows Release 发布。非目标：修改历史、项目类别规则、根控制面或真实用户配置。
- 基线 `aecc8d893137a291b39fa483c41f79e4443a5f61`，协调 ref `origin/codex/feishu-focus`；独占 `task/p0-pomo-032-task-interactions` 与当前模块工作树/隔离合成测试 profile。无真实数据库、端口或服务控制权。首次写前 status/fetch/check:sync/worktree 均核对，绿灯；提交与发布前复核。
- 允许写：renderer focus 的 FocusApp/editQueue/quickTasks/session/focus.css、QuadrantBoard/QuickTaskEntry；electron focus 的 feishu/service 与 main/preload 桥；命中测试及其静音 runner；版本文件、CHANGELOG、本卡和验收。禁止用户凭证/记录、实际飞书业务写入、根共享文件、新依赖、用户 App 安装重启。
- 必须加载：以上代码、现有 quick-edit/edit-queue/append-plan/local-first 验收，模块 AGENTS/DEVELOPMENT；条件加载直接命中的 API v1 原文。明确不加载真实连接配置、飞书业务内容、根完整路线图/架构包。发现跨模块/真实身份/权限扩大等范围变化时停止对应写入并升级。
- 四源：① 减号用 adjusting 全局锁且逐次刷新，新增任务缺少所属项目字段；② 保持官方 bitable v1 按 record_id 删除及关联字段写入，官方 SDK 固定 `larksuite/node-sdk@394c83092395a51402ee408b751d7f9fb05f5518`，`code-gen/projects/bitable.ts` L1625–1673/L2238–2264（创建 fields/client_token、DELETE 精确记录）；官方文档页面不可解析，固定源码作为证据，并非引入 SDK；③ 复用 EditQueue 持久意图、quickRows 投影、启动快照、服务写锁；命中 LEARN-P1-UI-123-01，重试保留原行身份，不另创队列/任务源；④ 复用 quick-edit、edit-queue、append-plan 和 local-first 桌面合成用例。
- 实现：本地持久减号意图立即隐藏指定待办，后台串行删除同一行；重试不重新选下一行。读取现有所属项目关联选项，新任务本地立即带颜色，飞书创建写入相同关联。
- 正反验收：连续减多次/跨任务减/同步中选其他番茄并开始均立即可用；活动任务、已完成、已有分钟或历史数据的行仍受保护。断网/冷启动保留意图，响应丢失后重试同一行不额外删除；跨表拒绝且同表正常。选项目后本地颜色和同步回执/刷新一致；空归属仍可新增，不新建项目或猜标题颜色。
- 预算 120 分钟，无子 Agent/长期后台；只读瞬时故障最多重试一次，外部动作查回执后再行动。测试静音隐藏，不动用户 App。Learning 复用既有教训，无新机制候选；回滚独立提交，队列原版本条目兼容。

- 交付：产品实现和正反验收均完成，详见 `ACCEPTANCE-task-interactions.md`。源码 `3706c79db60a31d1afbccdb9034c7ba3abaca5ee`，preview.66 Windows Release 已公开，六资产大小与 digest、包内源码来源、安装包隐藏静音启动均核验通过。提交与发布前实时远端、worktree/写集无活动重叠，绿灯。用户可从 App 检查更新安装。
