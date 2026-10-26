# P0-POMO-066 每日专注承诺锁与秒级提醒

状态 IN_PROGRESS；owner/root，本隔离农场模块实现及已授权Windows更新发布，唯一状态本卡。用户2026-10-26确认最近展示方案并开始作战、默认推送，追加提醒间隔支持秒。baseline 1bfe437e6a1b3ae12c45ad0bf8afa07c73cb05e6，实时fetch/check:sync同源102/clean；单worktree task/p0-pomo-066-daily-focus-lock，旧065分支保留，未merge/rebase。角色为模块负责人，不接入根澄行控制面。

冻结目标：科学专注设置内手动开启每日锁（默认未开启），复用现有已保存记录/有效番茄计数，当日目标默认12。开启后冻结当天目标；未达标App内关闭督促/降低目标/切宽松模式及偏好导入均拒绝。达标后仍须手动临时放行，默认15分钟、可设1–60，到期恢复；每日网站额度继续有效，次日按已保存策略重锁，重启保留当天安排。不设密码、不防卸载；退出App/监测失联/租约过期仍解除页面限制。达标后设置改动用于次日，临时放行单独入口，普通计时/任务/数据不改。提醒支持5–3600整秒、秒/分钟单位可选；保持5秒采集，允许几秒延迟，不增加轮询/逐秒进程。

实现边界：新增本机DailyFocusLock窄状态仅保存启用策略、临时放行时长、当日冻结目标与放行截止，不保存另一份番茄计数/网址/账户。沿原BrowserControl→原生host→MV3→content投影追加窄每日锁字段和能力回执，原协议帧/权限不变；旧配套明确标记需更新，不误称已拦截。UI与主进程设置入口共同校验，日进度由原restProgress供给，未知/新日不借用昨日达标。临时放行不绕当日额度；失联沿既有fail-open。秒数内部沿reminderMinutes数值字段表达整秒/60，旧整分钟兼容，无新增云字段/表/真相源；校验与账本/偏好显示配对更新。

允许文件：app/electron/src/focus/dailyFocusLock.ts（新增）、browserControl.ts、activitywatch.ts、nativeBrowserHost.ts、restReminderWindow.ts；app/electron/src/main.ts、preload.ts；app/electron/src/assets/browser-control/background.js、content.js、manifest.json；app/electron/src/focus/preferences.ts；app/renderer/src/focus/components/ScientificRest.tsx、preferences.ts、preferenceDiff.ts、focus.css；新增tests/daily-focus-lock.test.cjs、tests/daily-focus-lock-desktop.cjs、scripts/test-daily-focus-lock.cjs；现有tests/browser-control.test.cjs、activitywatch.test.cjs、preferences-api.test.cjs、preference-sync.test.cjs、preference-diff.test.cjs仅对应回归；本卡、docs/ACCEPTANCE-P0-POMO-066.md、docs/BROWSER-CONTROL.md、CHANGELOG.md，版本helper的app/electron/package.json和SettingsPanel.tsx。ignored仅合成profile、纯VM/消息/成品回执、官方证据、包/发行helper、上一公开102安装器提取ASAR。根治理/路线图/锁/根Learning、用户profile/注册/飞书/任务历史/真实Edge不写；本模块Learning仅在独立确认候选后同最终收口checkpoint单写已接受条目。

四源：①当前BrowserControl只按提醒暂停/冷静/额度控制，publish由7秒AW租约决定ready；main的restSettings/browserConfigure/applyDevicePreference均可改规则；原dailyRestProgress从确认记录按本地日与权重计算。现提醒validSettings/账本/双端偏好限制整数分钟，UI分钟输入。②固定Electron34.5.8/Node20.19.1、原MV3 NativeMessaging官方路径不变，无新权限/第三方库/API；既有P053官方快照manifest及原文已读并重算edge-native-messaging SHA256 9cad29d4fd61a29e6f36128cbe3eb4ad5e28f012d2f67aa25e4b16b50cc53efa、electron-environment b683b92b1fbf4ce819e9238953985f15d34f3f7ed603db69391ad4ac3d35e4ca，与固定blob相等。只追加自有JSON策略，不偏离原官方消息机制。③Learning065恢复门禁/039不可变五资产更新命中，沿原串行epoch/session初始化、有效计数和NSIS发布helpers；不另建统计/定时器/服务。④既有browser-control worker/stdio/静音视频实链、activitywatch提醒持久账本、preferences双端/桥接/原sender校验验收命中；新增每日锁正反与秒级迁移。

验收正反：未开启完全保留原功能；启用保存及重启后11/12持续整页阻挡/拒播，不能从API/偏好关闭或降级，但正常保存记录/增加进度仍通。12/12才可显式放行、时长到点恢复、额度用完拒放、重启保留截止不延长、进度变少/未知不借用旧达标；跨日重锁且昨日计数/放行无效，达标后次日策略可改，损坏/保存失败不假成功。旧配套能力缺失明确提示，新增字段严格校验/超限拒绝，合法原host/worker消息仍通；断连/过期/退出清控制，重连按原初始化/epoch规则恢复。秒级5/15/30/90/3600有效，0/非整秒/超限拒绝，旧分钟和旧账本可读、重启不重复提醒、秒显示不出现已看0分钟；偏好往返一致。真实main/preload/renderer→隔离CMD/原生消息→原content静音HTML视频覆盖拦截/放行/撤销/到期，固定未改四象限/概览占比，无真实云/注册写。

资源/预算：本clone build/dist和随机合成profile独占，无数据库/schema/端口/系统服务/其他电脑操作。单轮3小时有界实施/验证/发行，只复用既有review_scientific_rest做只读独立源码/包/公开终验，不新增Agent/后台任务/自动化。未知同因两次停相应尝试，系统/恢复故障先原始复现分类，已知可在卡内修正；超界只停依赖步骤。首次写入/冻结/提交/推送比对status/diff/worktree/实时主线，冲突按红黄绿。

交付：完整测试/实际静默链路/独立复核后，干净固定源码NSIS-only；先draft五资产hash→同HEAD annotated tag→公开prerelease不设Latest；真实上一公开102更新器发现新版、0下载0安装。用户自行App检查安装、更新配套/Edge重新加载，不自动安装或重启个人App。回滚显式revert功能提交，旧102资产不变；新本地承诺文件在回滚后无读者，不迁移/删除用户记录。Learning预检引用065/039，新增候选按证据由模块owner单写最终同commit，不写根Learning。
