# P0-POMO-059 统一有效番茄展示
状态：DONE；唯一状态源本卡；负责人Codex /root；验收见ACCEPTANCE-P0-POMO-059.md。
授权：2026-10-14用户要求周目标、专注积累等全部按有效番茄；沿用已明确默认推送/Windows发布授权。
基线：公开3a93524a03ec2db1f812c4a85fedcc522c73a31d（preview94），完整Gitfetch/check:sync已通过，独立release058 checkout无冲突，任务分支059；root共享文件/运行服务不写。
范围：统一所有派生番茄数量（农场周/累计/生长、概览、专注积累日/记录、月历/时段图、统计及分享卡、任务已收展示）；保持真实记录整数/任务输入/同步/计时/编辑原始字段。用户已确认“时长保留真实计时”，不折算专注秒数。今日旅程若显示已完成数量/达标仅调整派生展示，不改已持久绑定/旅程协议。
写集：app/renderer/src/focus/weights.js/.d.ts、FocusApp.tsx、stats.ts、shareCard.ts、week.ts及命中HistoryPanel/HeatmapCalendar/TodayTimeHeatmap/StatsPanel/StatsTrendChart/FarmField/FarmProgress/QuadrantBoard/shared/TodayJourney/ResearchProgress/RoutinePanel；相关tests、本卡及ACCEPTANCE-P0-POMO-059.md；版本仅electron/package.json/SettingsPanel显示，ignored artifacts；不改Electron/cloud真实数据或旧工作树。发现其他实际派生展示需在本卡记录允许路径后再改。
四源：现状94周/科研目标已有效、农场周/明细/月历/统计仍原始；无第三方采用/升级，仅React16/TS4.9既有接口；复用weights有效百位整数聚合、classification、weekgoal、stats、shareCard，命中Learning草稿tag更新链门禁；同类weights/effective-layout/portrait/stats/sharecard/updater验收。
验收正反：8科研+10杂事0.6所有数量汇总=14，单条杂事10→6；小数/0比例不向上取整、不生成虚假满果/达标；全1兼容18、已保存0数量仍可编辑；raw records/count/time字节不变，分类切换/改系数即重算，图表/分享同口径；预设计划/确认原始数量仍可输入真实整数；2台系数本机同配置需保持提示。正式TS/CRA、逻辑+真实UI、clean包、五资产及实际旧94更新发现。
预算：本轮一个工作周期；复用2位Agent（Parfit实现stats.ts/StatsPanel/shareCard/HeatmapCalendar/TodayTimeHeatmap及对应测试，Heisenberg只读review）；其他路径root独写，公开发布root独占；独立profile/无真实浏览器/Feishu/AW网络，无端口/服务占用；无新Goal/后台。
回滚：保留94/tag/安装，不覆盖原始记录，权重全1恢复；只用task-commit显式路径，非force推送，新版本不可变。Learning none：复用已验证派生视图口径，待最终检查点再判断。

显示补记：今日主数仍有效，取消未折算副总数以避免两个口径；原始数量仅编辑/确认输入保留。用户已确认时长保留真实计时，未改duration。旅程图标表示真实已确认时段，保持绑定/操作锁，按有效贡献调透明度与tooltip，不改工作流达标。任务计划分母按相同系数显示预期有效量，原任务完成与整数输入不改；不能用折算后目标0自动标记未完成任务已完成。

允许补记：FarmCompanion派生count仅规范两位小数；ManualEntry/ReviewPanel只把原始整数输入标明“实际”，保存/同步/自动累计流程不改。stats.ts允许Parfit仅规范投影汇总小数，避免29个被浮点减成28.999...。

复核修复写集增加research.ts和测试：科研周聚合按百位整数累计避免29误判未达；任务已收允许历史缺明细，来源/任务匹配的本地明细按固定分类计算，剩余已确认数量按该任务项目比例补足，不能用仅一条本地记录覆盖完整confirmed数量。

完成：preview.95已公开；固定源码528739f、五资产及实际94→95更新检测PASS，独立复核Heisenberg最终PASS。369逻辑/17布局/21生产桌面及重启/14横竖屏/实际桥接14与14.4全部PASS；时长保持真实。只提交发布验收回执，固定tag与包不变；Learning none，已复核复用既有派生视图与发行链。
