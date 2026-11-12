# P0-POMO-086 验收记录

- 状态：REVIEW；旅程修复已验证，1254607复发仍待定位，不宣称云端积压恢复。
- 四源、边界和正反验收见 TASK-P0-POMO-086.md。基线0dcec8c7f48429be01bb0c18c65e6c2956d45d80；两工作树无重叠活动写者。
- 实现：连接态saved本地记录进入完成集合；journeyDisplayPlan派生溢出完成格，不写回预设；详情与拖动保护采用显示视图。ID按记录与单位确定并避让，当前来源隔离保持。
- node --test tests/journey.test.mjs tests/journey-templates.test.mjs tests/journey-api.test.mjs：31/31 PASS。包含7+4、当前来源迁移不重复、异来源/别日/review拒绝、112个完成单位与零预设、减数/删除、截止时间保留实际、原计划字节不变。
- node scripts/build-focus.cjs：PASS。
- node scripts/test-journey-desktop.cjs：plan/resume/times/complete四阶段PASS。真实Electron/预加载/renderer，合成隔离静音隐藏窗口；2格预设显示11个实际、溢出详情只读、780宽无横溢出、减数回1完成并保留2格预设；原启动/拖动/模板/跨日/时间线回归PASS。证据artifacts/journey-*-checks.json（私有忽略，不进仓）。
- 同步T0：上一版只在service.sync/archiveHistory完整幂等操作恢复一次；service.history直接调用Feishu.history，依次planSchema表/字段读取和全记录分页。renderer同步写入后依次history→dailyReviews→refresh(today)，启动也调用refresh。截图只有GET分类，无法定位实际接口或具体阶段；未增重试、未读凭证/真实记录、未发真实飞书请求。待用户触发入口与失败阶段信息。
- Learning：none；本轮为项目专有显示口径纠正，没有新增可跨任务复用且超出既有本地优先原则的工程教训；不把未知同步猜测写入Learning。
- 回滚：新版本恢复基线旅程展示；保留原预设、所有记录和同步队列，不覆盖旧发布资产。
