# P0-POMO-077 待同步记录诊断与恢复

- IN_PROGRESS；模块root单实现/执行卡负责人，唯一状态本卡。基线b53fb4484b1ae774e40c9631c8ae618ff6728b4e，实时fetch/check:sync同公开主线，preview115，clean单worktree，task/p0-pomo-077-sync-recovery，绿灯。根仓及共享控制文件不写。
- 用户2026-10-30要求解决09:23–09:55这条记录长期待同步，保留番茄记录和当前专注。既有默认本机包优先及源码/Windows preview发布授权沿模块AGENTS；不自动关闭/安装/重启个人App。个人云数据修复须明确根因、幂等回读，不盲目重放/删除；当前先只读定位及隔离复现。
- T0事实：现场UIA确认一条pending、另外两条cloudSynced；状态85回读成果→93刷新看板→失败。原FocusApp把每条异常仅写入局部failures，将失败revision放Set阻止自动重放；结束时错误文案丢弃具体failures，外层catch也丢异常；后续仅回读跳过失败项时无failures而可错误清掉告警。首次具体云端失败原因unknown，不把网络或记录冲突猜测当事实。当前request同步API未改。允许只读App现有一致性备份中目标记录的技术字段，不读真实凭证、解密、活动LevelDB/内存或其他私人内容；已查备份日期均早于本条，未读备份内容。
- 目标：失败原因和具体失败阶段可静默点击查看，直到对应记录真正回读成功；跳过已失败记录的回读不冒称全成功；明确手动重试仍处理原ID，自动不循环；保留原5分钟安静窗口/计时/队列/云端冲突保护。只在隔离复现精确定位后补充有界记录写入修复。当前个人记录实际同步成功前不冒称已恢复。
- 允许写：app/renderer/src/focus/FocusApp.tsx、components/HarvestSync.tsx、components/HistoryPanel.tsx、focus.css；新增syncFailures.ts及tests/sync-failures.test.cjs、tests/sync-recovery-desktop.cjs、scripts/test-sync-recovery.cjs；既有tests/quiet-sync-desktop.cjs仅必要兼容。若T0确认记录校验/幂等问题，再补卡明确后修改对应plan/feishu文件及原测试。版本helper两文件、CHANGELOG.md、docs/DEVELOPMENT.md、本卡及ACCEPTANCE-P0-POMO-077.md；ignored合成证据/构建/成品。禁止新依赖、网络协议/代理/TLS/超时改动、活动数据库、凭证、自动安装重启、真实云端盲测/删记录、根共享/其他模块。
- 标准T1业务状态显示及重试保护；前台100分钟工作周期，超限给实证检查点，不后台。隔离build/dist/随机测试profile独占，无生产端口/数据库控制权；无实现子Agent。允许复用review_history_append一次10分钟独立只读复核冻结diff及正反证据，无写入/真实数据/云API/再分派。
- 四源预检：①上述现场和FocusApp.tsx sync/requestSync、HarvestSync.tsx、HistoryPanel.tsx，失败原文在error分支被抹掉；②仅修自有错误状态和React展示，不改变固定React/Electron34.5.8/Feishu调用或第三方关键语义，额外官方调研不适用；若命中第三方/网络根因需先冻结原文再写；③复用现有原ID幂等、quietSync、错误静默标题、stage-local-update及不可变发行，命中Learning-039/067发行隔离；④原075静音quiet-sync链和plan/feishu/session正反，新增真实主进程/预加载/生产页的失败→回读→明确重试→冷启记录不变、源隔离、持续计时、无重复写验证。
- 验收正反：失败能看完整具体原因/阶段且跳过失败不会显示全成功；正常同步仍隐藏状态、人工重试成功后清除对应错误、不重复累加、其他记录和active id/task/segments不变。自动不增加定时器或高频重试、不打开浮层/动画或自动通知；详细信息键盘可开，窄列不横溢出。读回失败不得撤销已确认云端成功、不让旧源错误污染新源。合成测试全程隐藏静音、真实云写0。独立复核/同源成品/五资产/115原updater验证后仅可声明相应完成范围；个人积压状态单列。
- 回滚：源码revert发新版本，旧tag/资产不替换；不迁移或删除原记录/队列/凭证，无运行状态回滚需要。开工/冻结/提交前查status、diff、worktree；同根因未知失败两次停止同层试补、扩大完整链。Learning随验收一次判断，无已验证可复用新教训则具体none。
