# P0-POMO-041 验收

- 已验证：以公开preview.73源码28a23b5为基线，独立任务分支、单worktree、无冲突。四处预检及边界唯一记录于TASK-P0-POMO-041.md。
- 已验证：真实生产Electron renderer与隔离合成profile，overview-heat-test.json五组检查：只剩今日两卡，legend/额度footer移除，监控状态在圈内左上，全年月历仍存在；今日48半小时，09:45–10:15一番茄分别0.5、23:30一番茄正常；昨天和未结束的番茄不计入今日热力，tooltip到24:00；1440×1000、1040×800、1080×1840同卡不溢出，横屏右列仍380px、竖屏原布局不变。
- 已验证：portrait-test.json原十四布局检查PASS；因总计两卡隐藏，横屏字体集合预期由22/28px变为28px，其余断言不降低。activitywatch真实主进程/preload/UI十八检查PASS，断线保留记录/变色、自设策略、两按钮原番茄计时与原生置顶提醒不变。无用户profile、历史或私人截图读写。
- 独立复核指出初次三尺寸测试未断言实际viewport，旧几何相同，撤回其多尺寸证明；改为每次真实native resize后reload并断言实际innerWidth/Height及row/column。状态点保留state.message，防止统计正常但督促保存失败信息被隐藏，增加三种状态原始IPC正反验证。269逻辑检查正常权限运行PASS。
- 待冻结复验：最终干净source commit/build、今日热力截图与零renderer error、独立只读复核；包源/五资产/真实旧73更新检测尚未进行，不声称已发布。用户继续要求启动AW联动和手动刷新，另立P042，前述UI交付将随最终安装版一起发布。
- Learning判断：没有新的已实测可跨任务复用的工程教训；重用既有半小时统计和发布helper，不将局部布局调整或合成fixture错误写成Learning。发布沿用LEARN-P0-POMO-039-01限定事实。
- 回滚：基线显式文件恢复，不删除用户数据，不覆盖既有tags/assets；源码、安装包和发布状态在完成后补入本回执。
