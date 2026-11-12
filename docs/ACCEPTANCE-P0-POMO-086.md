# P0-POMO-086 验收记录

- 状态：DONE（旅程）；旅程修复已验证，1254607复发仍待定位，不宣称云端积压恢复。
- 四源、边界和正反验收见 TASK-P0-POMO-086.md。基线0dcec8c7f48429be01bb0c18c65e6c2956d45d80；两工作树无重叠活动写者。
- 实现：连接态saved本地记录进入完成集合；journeyDisplayPlan派生溢出完成格，不写回预设；详情与拖动保护采用显示视图。ID按记录与单位确定并避让，当前来源隔离保持。
- node --test tests/journey.test.mjs tests/journey-templates.test.mjs tests/journey-api.test.mjs：31/31 PASS。包含7+4、当前来源迁移不重复、异来源/别日/review拒绝、112个完成单位与零预设、减数/删除、截止时间保留实际、原计划字节不变。
- node scripts/build-focus.cjs：PASS。
- node scripts/test-journey-desktop.cjs：plan/resume/times/complete四阶段PASS。真实Electron/预加载/renderer，合成隔离静音隐藏窗口；2格预设显示11个实际、溢出详情只读、780宽无横溢出、减数回1完成并保留2格预设；原启动/拖动/模板/跨日/时间线回归PASS。证据artifacts/journey-*-checks.json（私有忽略，不进仓）。
- 同步T0：上一版只在service.sync/archiveHistory完整幂等操作恢复一次；service.history直接调用Feishu.history，依次planSchema表/字段读取和全记录分页。renderer同步写入后依次history→dailyReviews→refresh(today)，启动也调用refresh。截图只有GET分类，无法定位实际接口或具体阶段；未增重试、未读凭证/真实记录、未发真实飞书请求。待用户触发入口与失败阶段信息。
- Learning：none；本轮为项目专有显示口径纠正，没有新增可跨任务复用且超出既有本地优先原则的工程教训；不把未知同步猜测写入Learning。
- 回滚：新版本恢复基线旅程展示；保留原预设、所有记录和同步队列，不覆盖旧发布资产。

## 交付检查点
- 固定源码d0927cdb54dc737a69986fdb6709bd602673a2ca；独立review_local_editing复核PASS，无P1/P2，独立31/31测试PASS，核对真实桌面证据；未自行重复桌面运行。
- 最终干净生产构建PASS；125 NSIS内ASAR与已核包完全一致，95个构建文件逐字节比较PASS，隔离隐藏包冒烟PASS；安装包83113391字节，SHA256 a70bce4ddb0b7022ccc094f598a509d897efbc7d0a6f067a39b66a205fd00fdb。本地准备/回读alreadyPrepared通过；未自动安装或重启。
- v0.1.0-preview.125公开预览release442726784：草稿五资产及公开五资产大小/digest一致，固定annotated tag命中源commit，124资产和Latest保持不变。真实124更新器发现125，downloads=0，autoInstallOnAppQuit=false。源码默认非强推送完成。
- 更新器基线检查一度两次读取失败并回退latest.yml得到404，已暂停发布作只读定向诊断；官方固定electron-updater6.8.3 GitHubProvider.js:120–131原文显示任意首通道读取失败都会回退。诊断运行无请求错误退出0，随后正式基线与发布后检查PASS；不据此猜测最初网络根因，不修改更新器或补建latest.yml。保留原始错误于私有artifacts。
- 四源/正反验收、回滚及Learning判断沿上文，无新增Learning候选。只完成旅程范围；飞书1254607未修复/未实测真实积压，待补触发操作与具体失败阶段。下一步据现场阶段做完整链路定位，不继续堆重试补丁。
