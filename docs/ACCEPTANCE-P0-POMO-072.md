# P0-POMO-072 旅程实际时间验收

状态IN_PROGRESS；目标/写集/四源/授权/资源/回滚见TASK-P0-POMO-072.md。用户明确只更新已开始部分、未来保留预设。journeyActualTimes纯投影复用completion的实际会话映射：同来源同日的已确认记录或active/paused/review提供stage开始，原生未绑定active投影首个空槽所属段但不改绑定；同一session多单位不伪造逐个起点。TodayJourney角标用HH:mm及title说明实际/模板参考；全部槽完成且末槽有效endedAt才显示实际终点。未开始/明日仍原小时，模板/旅程/records/active不因投影写回。memo依赖plan/records和active身份/开始时间/状态/来源，不依赖逐秒elapsed，无新增进程/轮询/网络/写盘。

artifacts/p072-journey-unit.txt：原journey+templates及新增实际时间正反共20/20 PASS，14:07、修改后新时间、未开始无投影、原8/12不变、跨段同session共用真实起点、完整结束与无效/倒置边界；原生未绑定和绑定active、paused/review显示，错误日/来源/无效开始拒绝，正确同源仍通，序列化plan不变。

p072-build-working.txt成功；p072-journey-working.txt两个真实Electron隐藏静音进程全部检查PASS，实际14:07替换模板8，修改记录后显示14:17，未来12及模板8保持；旅程启动的active显示真实分钟，原拖动/列布局/模板编辑/休息/保留计时与更换任务/保存失败/跨日/冷启/坏数据保护仍通。真实外部写入0，不操作个人App。首轮resume比较失败仅_revision不同：原夹具在后续模拟跨日开始/放弃之前冻结预期，合法状态操作应产生新revision。保留p072-journey-before-final-revision.txt，夹具先对比最终与原计划全部字段（仅revision允许合法变化），再冻结最终revision，冷启继续完整raw相等验证；未修改产品存储逻辑。

独立复核、固定干净源码/成品/本地准备/公开更新链待补。Learning-Review: none - 纯投影复用现有完成与日期/来源机制，memo采用已记录日期依赖原则；旧夹具快照时序局部适配，没有新的可跨任务工程事实。
