# P0-POMO-059 统一有效番茄验收
状态：REVIEW；发行和真实生产桥接待验证；基线公开3a93524，version95。
四源与范围见TASK059。所有派生番茄数使用本机比例：周/科研目标、历史日/记录、月历/时段热力、统计/分享、农场累计/周/生长、任务已收和旅程贡献显示。今日取消未折算副总数。计时秒数保留真实；编辑/确认输入明确实际颗数，原始整数/日期/时间/身份/颜色快照不写、不迁移、不触碰真实profile/飞书。
功能证据：369/369全逻辑PASS；weights9（含缺9条明细补足confirmed10→6、foreignBase不混、override1+9*.6=6.4、零权重）；effective-stats14（8+10*.6=14、零/全1、>=10仍14.4、50*.58科研29恰达目标29、.29*100=29、summary/day/category/share等一致且原始字节/时长不改）；有效布局17 PASS；完整renderer TS PASS、相关ESLint PASS。
独立初审两P2已修复：researchWeeks聚合整数百位后/100，避免28.999...未达29；task progress保留confirmed总数，明细仅匹配source/sourceKey/task/day，known按固定分类+missing按当前任务比例并在tooltip注明，不让仅一条明细覆盖10个已收。工作流任务完成仍依据真实操作确认，不按0/0自动完成。
回滚：保留94发行与用户App，权重全1恢复；raw records无需恢复。Learning none - 复用同一派生视图和现有已验证接口，未产生新的跨任务教训。后续clean正式CRA/生产界面/包与更新器复验，未通过不发布。
