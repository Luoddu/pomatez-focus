# P0-POMO-071 从专注积累追加番茄

- DONE；模块实现/协调root，基线6575d04805ca0b8480b69a71f68d8148de9bd178；状态仅本卡，任务分支task/p0-pomo-071-history-append。开工status/worktree/fetch/check:sync确认clean、公开主线相同、maxPreview107、单worktree；绿灯。根仓/路线图/组件锁不写。
- 用户2026-10-27要求已完成记录悬浮时在修改旁显示四象限同款圆形＋，不是“加任务”文字；点击给原任务今日追加1个番茄。目标使用稳定taskId、原所属飞书表、原EditQueue/adjust及回执，不新建同名任务。当前今日任务存在优先用当前元数据；仅历史任务仍有稳定ID时可从其快照给今天新增第一槽，序号不继承过去日期。自由/本地/未绑定quick/其他来源记录不出现可用＋。保持历史记录、当前计时和手动修改不变。
- 允许写：HistoryPanel.tsx、FocusApp.tsx、focus.css；既有tests/append-plan-desktop.cjs与scripts/test-append-plan.cjs按需扩展原夹具；版本helper两文件、CHANGELOG、本卡/ACCEPTANCE-P0-POMO-071.md、ignored证据/沿原107发行helper准备本地NSIS。禁止第三方依赖/API/schema、真实飞书写入、个人记录/凭证、进程控制/安装、根共享写入。本worktree构建/dist及随机测试profile独占；不占用户App/端口。
- 风险T1标准（新业务入口复用已有持久意图）；一次前台60分钟预算。本卡明确授权一个只读独立reviewer子任务：只审本卡、固定diff、原始测试与相关来源，输出问题/证据，不改文件、不读个人profile、不运行外部写入；无需其他并行Agent。测试全程隐藏静音、合成飞书；发布沿模块默认授权，先准备本机包，用户自行重启。
- 四源：①HistoryPanel当前r-sub仅record-edit，四象限圆形adjust-btn调adjust(taskId,1)；adjust原本只从今日board分组，历史入口需受限fallback；②不采用/升级第三方或改变运行机制；现有feishu.ts appendQueuedPlan1313–1432已公开支持按稳定任务ID、固定day/sequence、client_token创建及回读，当前任务不改该官方薄适配；原固定SDK证据见TASK-P0-POMO-032.md；③复用quickRows/projectQuickTasks/EditQueue/appendQueuedPlan及原本地stage/发布helpers，Learning命中幂等和同源发行规则，不新建第二源；④原append-plan-desktop与test-append-plan已有四象限/连续加/失败保留/冷启动原ID重绑，扩展历史入口、跨日/跨源/活动计时不变证据。
- 正反验收：悬浮/键盘focus同款＋与修改相邻，默认淡出；点＋后原任务今日待办立即增加1，连续点击序号递增且任务ID/项目/象限正确，不新增重复任务；旧日期未在今日board时从今日1开始；无稳定ID/其他来源不能追加，但原修改和有效任务仍可用。异步未回时可继续原计时、当前active/旧records字节不变；失败重试/冷启仍同一意图和序号，原四象限入口仍通。独立复核PASS、干净包/五资产/真实107→新版更新器验收后收口。
- 回滚：revert本任务源码提交并用新版本发布，不改旧tag/安装包；无数据迁移，既有EditQueue兼容。范围外问题只记录；同根因不明两次停冲突步骤，发布副作用不盲重放。Learning判断在验收单次记录并在提交引用。
- 交付：固定源码/tag f288ef3f2fdf34a5a582c4d9b1811639be904e82 / preview108；独立review_history_append只读PASS，working/clean三阶段真实隐藏静音追加夹具PASS、干净构建、234文件同源ASAR/成品启动/本机manifest与字节回读/公开五资产/实际107→108更新器零下载安装PASS。release425397822，旧107与Latest51不变；本机108包由用户自行重启安装。证据与Learning判断见ACCEPTANCE-P0-POMO-071.md；最终仅本卡和验收文档收口，不重打包、不改tag。
