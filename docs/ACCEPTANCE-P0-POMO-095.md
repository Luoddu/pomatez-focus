# P0-POMO-095 本机候选验收

状态IN_PROGRESS，等待独立复核、最终构建/发布和NAS部署条件。根控制面只读。

## 四源与范围

四源预检及用户确认见TASK-P0-POMO-095.md；固定Node24.22.1/SQLite3.53.4原文见services/shared-entertainment/README.md。原始本机ActivityWatch来源不改；飞书不承担额度核准事务。

## 已验证

- 固定Node完整逻辑测试：`node scripts/test-focus-all.cjs` 569通过。实际执行使用绝对24.22.1路径；提升权限默认PATH另指向24.18.0，已识别并用固定版复跑。原始artifacts/p095-all.log。
- 服务/客户端/图表15项专项通过：实际HTTPS两个客户端共享窗口，重启/同ID重试不重复扣额；额度耗尽拒绝、合法次日继续；冷静倒计时跨午夜延续，合法到期恢复；服务器时钟回退拒绝，时间恢复后仍读原额度；无效身份/HTTP地址拒绝，合法TLS连接成功；未知覆盖不当零。原始artifacts/p095-shared-tests.log。
- `scripts/test-shared-entertainment-desktop.cjs` 10检查通过：真实Electron主进程/preload、Windows safeStorage密文、两个客户端和重启、Native Messaging能力协商与投影、共享统计桥接和30日图、关闭农场投影后不放行。合成HTTPS服务器及临时证书，只在测试进程信任；假注册表adapter，不动个人Edge或配置。原始artifacts/p095-shared-desktop.log。
- `scripts/test-daily-usage-desktop.cjs` 8检查通过：原今日小时图、7/30日柱图、日期时段、缺失口径、窄/宽无溢出。原始artifacts/p095-daily-desktop.log。
- `scripts/test-daily-focus-lock.cjs` 6整链路检查通过：真实静音视频、原生宿主/worker/内容脚本、11/12限制与12/12合法放行、额度耗尽、旧本机模式断连/重连兼容。原始artifacts/p095-lock-desktop.log。
- 构建曾暴露JSX闭合及JS时区参数类型错误，已按精确编译错误修正并构建通过；最终界面小改后再构建。

## 限制与未完成

NAS尚未启用/确认Docker，真实网络与两台物理电脑未接入；不把本机验收称为云端已上线。正式部署需独立任务核对地址、TLS、设备凭据、持久本地卷、重启恢复和用户确认。默认每日工作日15分钟/周末60分钟、放行15分钟、冷静2分钟需部署时核对。短时许可保守预留与实际观看分开；不能防止管理员删除数据/卸载配套/关闭游戏守护。既有游戏持续限制未放宽。

既有category-review桌面测试的6.4秒即时云写断言与preview132/133五分钟QuietSync契约冲突，此已知基线不在本卡修复；不宣称所有历史桌面套件通过。

## 并发、Learning、回滚

基线3abac0c；独占task/p0-pomo-095-shared-entertainment及合成随机profile/端口，无其他工作树重叠写。全部修改在本卡写集。Learning none：缓存排空、区间去重和固定运行版本核对均复用既有要求，本轮尚无需新增的跨任务教训；独立复核若提出候选再处理。回滚源码至preview133，保留真实统计与加密连接/服务数据库；已启用共享的客户端不能静默改为本机新额度，实际降级先停止娱乐放行并迁移服务状态。
