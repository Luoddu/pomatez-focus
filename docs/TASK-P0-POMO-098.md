# P0-POMO-098 ActivityWatch 重复启动修复

- DONE（限定本机去重和启动配置；下次Windows登录待观察）；owner /root；基线72c0e971aac102295074ee14f9dc0caadde265a2。用户明确要求只留一份正常运行、不影响记录、修复启动逻辑。模块状态源本卡；根仓脏共享控制文件不覆盖。本机运行修复，不涉及澄行接入或部署。
- 范围：本卡、ACCEPTANCE-P0-POMO-098.md；忽略artifacts内只读官方源码快照、去敏验证及回滚备份；备份并移出当前用户Startup中ActivityWatch.lnk，保持现有农场Run自动启动。核实后退出冗余AW进程树。禁止删除数据库/事件、关闭农场/浏览器/正在专注的程序、修改额度/网络/其他启动项、自动升级第三方。
- T0已确认：AW0.13.2启动两组，农场22:21:41与Explorer22:22:00；Startup快捷方式直接启动aw-qt。原生农场运行检查已存在；main.ts正常桌面启动ensureRestRuntime，退出不杀AW。两个server均启动同一数据库，端口枚举结果不稳定，不能只凭单次端口PID选择保留组。需要采集心跳和历史元数据连续验证。
- 四源：①本机进程树、快捷方式、Run注册项、日志；②activitywatch v0.13.2固定aw-qt子模块43864b2f7ec3b71d5b181eafb47b4ded6c197b8f，aw_qt/main.py:75-104每次创建manager/autostart后退出stop_all，无单实例锁；manager.py Module.stop以terminate停止自身子进程。③复用activitywatchRuntime.ts的健康检测/进程检查/启动及existing runtime tests；Learning生命周期完整链路要求。④tests/activitywatch-runtime.test.cjs及P043性能验收。
- 方案：使用现有农场作为唯一开机启动所有者，移除重复的Windows Startup入口，不新造守护器、不改AW源码。保留采集正常的原进程树；先数据库SQLite backup一致性备份及integrity_check，再按固定父子PID/创建时间核对关闭另一组。退出方式不强于官方terminate路径。回滚还原快捷方式，仅在没有AW进程时启动官方aw-qt；不回滚覆盖活动数据库。
- 验收正反：只剩一组qt/server/AFK/window且API可读；两类采集事件继续推进、既有事件/桶不减少；农场计时进程不变；Startup重复入口消失且Run农场仍启用；重复ensure不启动新组，缺失时正常启动和失败时不无限重启通过既有测试。不为验收重启用户Windows。
- 独立reviewer授权一个有界只读子任务，复核本卡、源码机制、脚本/证据，不改个人运行态。预算本轮前台，未知同因两次停止，禁止新增后台/费用。无App代码变化不递增发行版本。
- Learning检查点：待实测后判断；不将定位猜测记为工程教训。

