# P0-POMO-033 晨间引导、假日休息与稻草人日记

- DONE；隔离模块实现者/上下文负责人 Codex；唯一状态源本卡。用户明确要求六项体验增强，并选择日记本地保存后同步飞书。沿用源码和 Windows Release 发布授权。
- 目标：补记分类；科研目标在前、红/金区分；官方假日标记及无压力休息；08:00–09:30 晨间鼓励、23:30–08:00 休息分区；成果同步真实阶段与收篮动画；季节/日夜稻草人、轻量对话和日记云同步。非目标：接入真实澄服务、引入 AI 供应商、增加计时奖金或改历史账目、移动运行数据库、Mac 发布。
- 基线 fbeb3d4b406987886995ad49ed58cb775b81790c；协调 ref origin/codex/feishu-focus。fetch/check:sync 实时一致，干净，preview.66。独占当前工作树 task/p0-pomo-033-farm-companion 与隔离合成测试 profile；无用户服务/端口/数据库控制权。开工/测试/提交/发布核对 status、worktree、基线至协调 ref 差异，非重叠绿灯继续。
- 允许写：app/renderer/src/focus 内本任务组件、wellbeing/journal 与样式；app/electron/src/focus 的 journal、feishu/service 和 main/preload 的模块内桥；命中 tests/scripts runner；版本、CHANGELOG、本卡、验收和接口文档。禁止根共享控制文件、真实账号/凭证/记录、用户 App 安装重启、新依赖与真实澄跨组件写入。飞书新日记表仅由用户在新版首次保存时使用现有连接创建；本轮测试全为模拟。
- 必须加载：ManualEntry、HistoryPanel/HeatmapCalendar、StatsPanel/stats、FarmField/QuadrantBoard、FocusApp 现有同步、Feishu/service/IPC 及模块 AGENTS/DEVELOPMENT；根 version-control/context-loading/how-to-dispatch 命中原文。条件加载日记 API 与固定官方源码，不加载实际连接和私人任务。跨组件、身份、根拓扑等停止对应步骤升级；预留的澄接口只是模块文档契约，不宣称根已接入。
- 四源 ① 现状：补记无分类；科研目标在后；日历无假日；热力无休息边界；sync 只有忙碌文字；稻草人只有冬季围巾。② 官方：国办发明电〔2025〕7 号，政府转载 https://www.beijing.gov.cn/fuwu/bmfw/sy/jrts/202511/t20251104_4258838.html L20–33，冻结 2026 放假和调休；未知年份不推算法定假日。飞书 bitable v1 保持原生表/记录 API，固定官方 SDK 394c83092395a51402ee408b751d7f9fb05f5518 code-gen/projects/bitable.ts L280 起表创建、L1625 起记录 client_token；无 SDK 安装/升级。③ 复用 EditQueue/启动快照、原生 API 列表分页/UUID 幂等/回读、既有分类 revision；命中根 Learning LEARN-P1-UI-123-01。社区只作设计参考：Habitica 官方休息模式、Super Productivity 官方本地与可选同步文档(master 观察轨，未采用软件)。④ 既有 category-review/research、weekgoal、multidevice/local-first、quiet desktop 合成验收复用。
- 正反验收：补记分类保存/刷新/云往返一致，原任务关联和分钟不改；科研在前红色、总目标金色，目标修改仍独立。放假日标记/调休工作日区分，未知年份不伪造。晨间计有效分段排除暂停，休息区不发工作鼓励且普通计时仍可用。同步进度只在实际回执前停在未完成，断网不假成功且记录留本机/可继续专注；动画不增账。日记先持久保存/失败可重试/重复同步不重复/跨机读回/跨 Base 不串，畸形数据拒绝且有效记录可通；澄提示仅文本渲染且休息优先，无自动外部 AI 调用。
- 预算：6 小时一个工作周期；无子 Agent/长期后台/新依赖；只读瞬时故障最多重试一次，外部副作用复核回执，不盲重放。测试静音隐藏，不触用户 App。日记局部追加式存储，限长和 UUID 去重，首次表创建冲突停止不覆盖现有字段。
- Learning：复用已验证幂等原则；交接判断新候选，无候选必须给原因。回滚独立提交或旧包；不删除新增私有日记表/本地键，旧版本忽略它们，原计时和历史格式兼容。

- 实现和正反验收：`ACCEPTANCE-farm-companion.md`，逻辑240/240、桌面75组及真实进程重启、构建通过。Learning判断none，复用既有UUID/本地优先机制，没有新增根治理候选。
- 交付源码 `0ea360ed6615824af7baa7ed608dc312d54c4e03`，Windows preview.67 Release 已公开；六资产大小与SHA-256、更新feed SHA-512/大小、包内干净源码来源均一致，打包程序隐藏静音启动成功。App同款FocusUpdater/NsisUpdater实测preview.66通过公开GitHub feed发现preview.67，available且无下载/安装。发布前实时远端与写集无活动冲突，绿灯。真实用户表创建/日记同步尚未执行，澄服务未接入；安装后首次保存日记触发已有连接中的实际写入。
