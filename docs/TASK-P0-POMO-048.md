# P0-POMO-048 实际吃饭与小憩记录

- DONE（本地验收，未发布）；模块状态源；owner /root。用户本轮明确右侧碗/睡觉按钮、小选项与正计时、实际开始/结束记录，并确认保留未完成番茄、实际替代同类预设，第一次/第二次依序对应；转入下一事件或开始专注自动结束上一事件。本轮本地实现与静默验证，不发布/安装/真实外部写入。
- 基线c57a19b31c54ea1ec89a4dacf086ddaad3832f29（P047本地DONE且独立复核PASS，业务写集依序交接）；canonical3df已包含，单worktree串行资源绿灯。新task/p0-pomo-048-actual-rest从047完成检查点串行承接；单worktree，无并行写。资源仅本clone、ignored合成profile/测试端口。
- 目标：今日旅程标题右侧碗/ZZZ两个入口，菜单去吃饭/吃完了、去睡觉/睡醒了；当前休息在按钮原位正计时，另一事件自动关闭前一事件；完成专注之前的实际累计数量作为锚点，休息图标插入该数量番茄后，按meal/nap同类预设第1、第2依序替代，未来轮廓与未触发预设继续保留。悬浮实际图标看起止/时长；无预设仍可记录额外实际休息。
- 边界：实际休息本地按source隔离、有界元数据，不写FocusSession/飞书计数/实际成果、不推断休息完成；单个进行中事件，0重叠，开始/转事件单次持久原子回执后暂停，存储失败不假记录/不暂停，开始/继续专注成功前收口、失败回滚休息。旧预设gym/night/break路径保持，meal/nap改从实际菜单入口记录。跨日旧休息可收口于下一事件，今日展示只取当日起始事件，不复制昨日计划。
- 四处预检：①TodayJourney目前stage.resting/toggleRest只保存状态无时间，旧图标在段后；FocusApp.beginTask及journey.begin/继续共用唯一timer，reconcile填实际单位。②沿React16.14/Electron34.5.8、原生按钮/本地Storage、JS时间，未改第三方运行语义或IPC/权限；JourneyIcons现有meal/nap SVG复用。③journey.validate/read/write/reconcile、completion、Counter getSnapshot/pause/begin回执；Learning039发布不适用、042采集缓存不改。④journey.test/真实两进程journey以及P045健身写失败回滚、compact/source隔离验收复用，增加实际休息顺序/不重叠/重启/时段保存/开始收口正反。
- 允许写：本卡、docs/ACCEPTANCE-P0-POMO-048.md、docs/DAILY-JOURNEY.md、CHANGELOG.md；新restLog.ts、tests/rest-log.test.mjs、tests/rest-log-desktop.cjs、scripts/test-rest-log-desktop.cjs；TodayJourney.tsx、FocusApp.tsx、focus.css仅实际休息菜单/图标插入/开始继续守卫；必要tests/journey-desktop.cjs新预期。版本helper允许app/electron/package.json和SettingsPanel.tsx；ignored artifacts合成证据。禁止根仓、实际用户数据/配置、飞书/API/IPC/schema/系统/新服务。
- 正反验收：六个实际番茄后首次meal匹配第一碗移至6后，第二meal匹配第二碗而第一记录不改；nap顺序同理。meal→nap同毫秒结束/开始、不重叠，点击吃完结束、点击专注/继续收口；同类进行中不重复开、新日/换source不串计；重启持续计时而只读取一次记录，页面每秒显示仅可见进行中时一个UI interval、无逐秒写盘/请求，卸载/隐藏停止；坏数据/失写回执保原且正常恢复仍通；原实际focus时间/计数/任务/旧gym路径仍通；原列比例和旅程横条不扩宽。
- 预算/复核：本轮有界前台交付，不新增常驻进程/系统计划任务/高频网络，复用existing只读review_scientific_rest一次冻结048源码+原始证据，允许复核相邻047整合守卫，不写/用户App/分派。停止规则同根AGENTS，范围外记录不修。
- 回滚：恢复本卡明确源至c57a19b，新增restLog独立本地键可保留/旧版忽略，不迁移或改用户FocusSession；本轮不发布。Learning none预检，基于既有本地日志与持久回执，最终证据再判断。
