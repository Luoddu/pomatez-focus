# P0-POMO-090 验收

- REVIEW；产品目标：本地确认新番茄后，生活活动快捷按钮重新可记录，旧历史不能被下一轮快捷点击取消。四源预检及范围见任务卡。
- 修复：restLog.currentRestShortcut用原同来源/同日完成数与事件afterCount判定当前边界，ongoing保留；TodayJourney按钮显示与点击共用同一函数。没有schema、写入或同步逻辑变化；历史事件及时间轴仍读取完整事件集。权重不改变原始完成边界。
- 单测20/20 PASS：meal/nap/gym当前边界、未同步新番茄、零完成片段/其他日期/其他来源不误重置、ongoing、重载、历史不变。全回归535/535 PASS（artifacts/p090-all-tests.txt），构建PASS（artifacts/p090-build.txt）。
- 真实隐藏静音桌面7组PASS（artifacts/p090-desktop-final.txt、artifacts/quick-rest-desktop.json）：点击/反选、拖动历史、失败保存、重载、开始专注，以及实际结束/确认1番茄后按钮重置，保存前后旧事件逐项一致，再次新增meal/nap和本轮撤回。新番茄cloudSynced非true，证明本地生效。
- 测试定位：初次将未同步可省略字段误断言为false，改为非true；短测试的计时不代表已完成番茄，改为通过真实确认面板明确选择1个并断言completedCount=1，随后重载3个完成项通过。未改产品计数绕过验收。
- 独立review_local_editing代码无P1/P2，独立20/20通过；末次复核已核桌面7组及535/535原始证据，PASS无剩余P1/P2，可冻结。Learning-Review: none — 使用既有afterCount和完成投影做局部UI修正，无新增跨任务工程机制，不另记Learning。
- 基线69f5e0256e32b7883cc47427118636b2103d6130；独立任务分支task/p0-pomo-090-rest-button-cycle；范围内无其他写者。原个人App/记录/浏览器未修改。
- 回滚128安装版及固定源码；无需记录迁移。待固定129包、发布和本机准备，不能把源码验证说成用户已安装。
