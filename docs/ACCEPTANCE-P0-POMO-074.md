# P0-POMO-074 每日工作流验收

REVIEW准备；合同/四源/正反验收/授权/回滚见TASK-P0-POMO-074.md。历史08:30原因unknown：用户确认昨日任务残留，现有日志不能复原具体阻塞。修复已定位的路径，不把代码推断当历史事实。基线28709c8，单独task/p0-pomo-074-daily-workflow、单worktree，范围外改动0。

dailyRefresh沿原生成幂等读回，跨日先读今日、保留旧未同步事实；pending/active/写入等待，旧failed不永久挡新日。自动失败一次5分钟补试，最多2次，手动仍可重试；成功只在完整回读后盖戳。纯测试覆盖日期回拨、旧格式、来源隔离及坏metadata。

fitJourneyDay复用completion/journeyTimeline，对当前日以now、实际记录/休息、当前专注原计划和模板间隔求可完成<=24的未开始槽。仅显示投影，已完成/active保留，原计划/模板/记录不删；启动前以精确now再验可见性和原日期/来源。memo每分钟重新估计，不增加计时器/逐秒写盘。原旅程三阶段桌面夹具改为合成早时钟，晚起用例保留实际14/16/19、未来22/24、隐藏4个而原16槽不变，次日模板仍8点。

boardLayout原拖动扩至quick任务，稳定ID回执前先原子保存重绑偏好，再退休临时身份；保留source/外部drop/存储失败保护。原稳定任务跨象限/重排/冷启正反测试复用。新quietSync只保存发送截止metadata，原outbox/CompletionQueue/timer仍是意图真相源。新增/修改/拖动重置source级截止，收据/移除不重置；手动flush只放行当前generation，新操作取消放行，下一写入前再次检查。启动连接未就绪不观察，避免来源确认被误算新操作。坏metadata保留原字节、阻止自动且允许手动。

验证原始证据：p074-policy-unit.txt 14/14；p074-journey-unit.txt 23/23；p074-unit-full.txt受影响完整纯测试；p074-build-working.txt构建成功；p074-refresh-desktop.txt原真实plan/resume进程覆盖08:29/30、活动等待、失败5分钟有界补试、手动恢复、重启不重复和窄宽；p074-journey-desktop.txt原plan/resume/times通过；p074-board-desktop.txt原write/restore通过；p074-quiet-desktop.txt write/resume覆盖最后操作+299秒0发送、+300秒串行新建/完成/记录，quick两chip跨象限及稳定ID回执保留，手动立即，held写入中新增意图停止下一发送，失败不循环/明确重试，同pending ID冷启保留截止。均随机profile、隐藏且静音、真实业务写入0。首次夹具返回class不可克隆已改void返回；冷启发现来源确认重置原截止，原文诊断后修复并实测write/resume通过，未靠重复盲试绕过。

完整纯测试49/49 PASS。旧board夹具首次跨象限失败后只补等待仍失败，已停止同层试补并追完整调用链：quietRevision使没有待发送记录的拖动也触发全量云回读，loadingTasks短暂撤掉onMove，第二次连续拖动被挡。修复无pending时只在来源启动读取一次，保留手动读取；原board write/restore全链7组通过。新task/complete/history队列批处理及cold resume同样通过。失败记录在本进程按原revision/内容记住，聚焦不重复写；手动明确重试清除标记。手动旧历史分类意图跨等待保留。

待独立冻结源码复核、同源干净包/本机stage及公开五资产/真实111更新器验收；未据源码存在宣称DONE。

Learning-Review: none - 本轮复用原队列/日期/source guards和既有只读预测、不可变发行链；新边界属于本功能局部业务，没有新的已验证跨任务教训候选。
