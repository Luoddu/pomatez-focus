# P0-POMO-079 今日旅程一键生活占时与拖动补记

- 状态 REVIEW；模块唯一状态源本卡；owner /root 模块实现者。用户2026-11-04明确推进实现；默认时长吃饭30、健身60、紧接吃饭小憩50、单独小憩20分钟。
- 基线 origin/codex/feishu-focus e309e46；独立临时工作树 pomatez-p0-pomo-079，分支 task/p0-pomo-079-quick-rest。旧目录保留，不合入其换行/环境改动；根控制文件不写。开工、检查点、提交前核对 HEAD/status/worktree 和远端差异。
- 写集：app/renderer/src/focus/restLog.ts、FocusApp.tsx、components/TodayJourney.tsx、focus.css；必要 journey.js/.d.ts 时间投影；tests/quick-rest.test.mjs、tests/quick-rest-desktop.cjs；本卡、docs/ACCEPTANCE-P0-POMO-079.md、docs/DAILY-JOURNEY.md；版本 helper 产生的版本文件、CHANGELOG；ignored 构建产物。禁止改真实番茄历史、飞书数据、凭证、用户运行目录及其他任务。
- 语义：点击直接按默认时长记录估算活动并顺延预测；超过20分钟空档承接上个事件。连续活动按序；提前开始番茄截短尚未发生的估算。拖动图标到历史番茄之前补记实际空档，默认时长封顶实际空档；支持移动已点亮活动，不复制。估算标记不冒充实测。保持旧记录可读。
- 四源预检：①现状 TodayJourney 标题/预设入口打开去/结束菜单，补记必须输入起止，restLog已有重叠/来源/存储保护；主线117已有 fitJourneyDay 投影。②第三方语义不变，无新依赖；沿既有 React事件和Storage、原模块时间计算，不适用第三方采用/升级Gate。③复用 restLog/backfillRest、journeyTimeline/fitJourneyDay、构建/发布/task-commit helpers；Learning 已读取，命中发布链039与隔离测试067，其他无对应新机制。④tests/rest-log.test.mjs、rest-backfill-desktop.cjs、journey时间预算测试与048/050验收可复用。
- 正反验收：四种默认时长正确、连续点击及重启读回、预测顺延；历史拖放可填空档且不跨番茄/不覆盖休息，移动无重复；提前开始/继续收口；已完成番茄的起止/数量完全不变；不同来源/跨日/坏存储/无有效空档拒绝且正常记录仍成功；旧手动精确补记保留。
- 资源：仅该worktree和合成临时profile，无真实数据库/端口/服务控制；本轮前台100分钟，无后台/goal。按规则需要独立复核，允许一名只读reviewer在冻结diff后检验上述正反要求，不写产品或再分派。重试遵守根规则。
- 回滚：保留117及基线；撤销本任务源码即可，新增可选估算标记兼容原v2结构；发布沿模块AGENTS既有明确授权与所有门禁，未通过不发布、不重启用户App。Learning检查点none：目前仅复用现有算法，尚无新增已验证跨任务教训。

- 检查点：485逻辑测试、46旅程相关子集、正式TS/CRA、隔离Electron五组真实交互均PASS。独立review_quick_rest首轮发现标题点亮、旧openRest兼容、实际间隙命中区及估算措辞问题，已修复并独立复核PASS。证据见ACCEPTANCE-P0-POMO-079.md。无Learning候选。发布前待固定commit、clean构建/包校验、五资产与旧更新器验证。
