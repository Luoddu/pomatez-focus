# P0-POMO-048 验收

- IN_PROGRESS；完整目标/四处预检/授权/写集/正反定义/资源/回滚见TASK-P0-POMO-048.md；此卡为本轮用户连续追加休息记录需求，不取消047。
- 待实现与验证；Learning none，尚无新增工程机制证据。
- REVIEW：preview.82本地源码；全部逻辑314/314 PASS（p048-all-logic-final.txt），生产build82 PASS。实际休息两独立Electron进程7组PASS（p048-desktop82.txt）：六番茄锚点/第1与第2同类替代/保留16轮廓、可见正计时与隐藏停止0逐秒写、meal→nap→自由专注收口、暂停失败回滚/正常重试、失写回执保原/恢复失败回滚、窄列菜单以及冷启动结束记录不重复原focus。既有journey模板/拖动/任务关联/暂停恢复/跨日/两进程全部PASS（p048-journey-final.txt）。
- 故障分类：首次build仅effect依赖ESLint，修正稳定ongoing/offset依赖；全部逻辑sandbox esbuild父目录读取拒绝，官方既有helper在授权依赖读取环境314 PASS。旧回归改用gym后第一stage断言不符合真实gym第3段，按类型定位修正。直接改存储再location.reload的合成重启等待两次失败，停止该fixture步骤、只读完整profile检查日志和focus存储均有效且冷启动有计时；废弃该证据，改用真实UI产生事件→独立进程读同profile的完整链，两进程PASS，无产品恢复补丁。测试均headless/mute/独立合成profile，0真实用户服务/外部写入。
- 待冻结独立复核；Learning none：复用已有本地持久回执/唯一focus计时器，未形成需要跨任务记录的新机制；范围外实际休息跨机同步/长期导出整理未实施。
- 补强来源：非local的actual completed统计明确要求feishu+sourceKey，与journey.eligible一致；相同sourceKey的local记录负例仍不计，5组纯逻辑PASS（p048-scope-guard.txt）。追加真实native提醒IPC：recording状态+同key主窗通道→sleep实际nap→原自由专注收口，隐藏静音8组双进程PASS（p048-desktop-native-final.txt）；未启用真实AW/飞书。
- 范围外基线fixture限制：旧rest-reminder-desktop在原040断言全部button数量2处报3，c57原断言同为2而045模板已有可选hidden gym按钮（src/assets/rest-reminder.html:15），故未修改该范围外旧fixture，不宣称其PASS；本轮变化触及sleep回调已由新实际native IPC纵切通过。native新fixture首次缺少recording状态被官方update拒绝，补齐完整状态/主窗通知后PASS。
