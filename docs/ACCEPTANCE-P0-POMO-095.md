# P0-POMO-095 本机候选验收

状态IN_PROGRESS，等待独立复核、最终构建/发布和NAS部署条件。根控制面只读。

## 四源与范围

四源预检及用户确认见TASK-P0-POMO-095.md；固定Node24.22.1/SQLite3.53.4原文见services/shared-entertainment/README.md。原始本机ActivityWatch来源不改；飞书不承担额度核准事务。

## 已验证

- 固定Node完整逻辑测试：`node scripts/test-focus-all.cjs` 573通过。实际执行使用绝对24.22.1路径；提升权限默认PATH另指向24.18.0，已识别并用固定版复跑。原始artifacts/p095-all.log。
- 服务/客户端/图表19项专项通过：实际HTTPS两个客户端共享窗口，重启/同ID重试不重复扣额；额度耗尽拒绝、合法次日继续；冷静倒计时跨午夜延续，合法到期恢复；服务器时钟回退拒绝，时间恢复后仍读原额度；无效身份/HTTP地址拒绝，合法TLS连接成功；未知覆盖不当零。原始artifacts/p095-shared-tests.log。
- `scripts/test-shared-entertainment-desktop.cjs` 12检查通过：真实Electron主进程/preload、Windows safeStorage密文、两个客户端和重启、Native Messaging能力协商与投影、共享统计桥接和30日图、关闭农场投影后不放行。合成HTTPS服务器及临时证书，只在测试进程信任；假注册表adapter，不动个人Edge或配置。原始artifacts/p095-shared-desktop.log。
- `scripts/test-daily-usage-desktop.cjs` 8检查通过：原今日小时图、7/30日柱图、日期时段、缺失口径、窄/宽无溢出。原始artifacts/p095-daily-desktop.log。
- `scripts/test-daily-focus-lock.cjs` 6整链路检查通过：真实静音视频、原生宿主/worker/内容脚本、11/12限制与12/12合法放行、额度耗尽、旧本机模式断连/重连兼容。原始artifacts/p095-lock-desktop.log。
- 构建曾暴露JSX闭合及JS时区参数类型错误，已按精确编译错误修正并构建通过；最终构建与每日/共享桌面再次通过。

## 限制与未完成

NAS尚未启用/确认Docker，真实网络与两台物理电脑未接入；不把本机验收称为云端已上线。正式部署需独立任务核对地址、TLS、设备凭据、持久本地卷、重启恢复和用户确认。默认每日工作日15分钟/周末60分钟、放行15分钟、冷静2分钟需部署时核对。短时许可保守预留与实际观看分开；不能防止管理员删除数据/卸载配套/关闭游戏守护。既有游戏持续限制未放宽。

既有category-review桌面测试的6.4秒即时云写断言与preview132/133五分钟QuietSync契约冲突，此已知基线不在本卡修复；不宣称所有历史桌面套件通过。

## 并发、Learning、回滚

基线3abac0c；独占task/p0-pomo-095-shared-entertainment及合成随机profile/端口，无其他工作树重叠写。全部修改在本卡写集。Learning none：缓存排空、区间去重和固定运行版本核对均复用既有要求，本轮尚无需新增的跨任务教训；独立复核若提出候选再处理。回滚源码至preview133，保留真实统计与加密连接/服务数据库；已启用共享的客户端不能静默改为本机新额度，实际降级先停止娱乐放行并迁移服务状态。

## 独立复核修复

1347c9c被独立reviewer指出四个P2，均有针对性正反测试：首次绑定并发拒绝且失败可重试；冷静期代际改由服务共享消费决定，换机旧提醒不重开而新增消费仍可触发；跨午夜选日明细裁剪10/20分钟，未选日保留30分钟；30天两设备合法碎片记录原始超过1MiB时服务返回有界30日汇总，重复跨设备区间不重复累计。

新增真实静音视频验证：有效共享许可可播放；客户端墙钟回退一小时，单调时钟许可到期仍暂停并遮罩。额外2项与原10项均通过。测试中一次executeJavaScript返回函数不能序列化，已改为返回布尔值后通过，不涉及产品修补。

共享隐藏窗口截图存在旧帧现象，不把它作为图表视觉验收证据；真实DOM30柱、宽度边界和桥接数据已通过，每日图宽窄布局另测。

NAS只读定位：已安装极空间客户端并登录Z4Pro；截图工具两次超时，未确认Docker入口或部署网络，未在NAS写入。私人设备编号和路径不进入文档。

## 复审放行

独立reviewer复审d0914de26e3ebcea2b7cafc93c8f60c9b15e58c0为PASS，独立重跑专项19/19，并核对573逻辑、12共享桌面、8每日UI。允许本机候选继续构建/打包/发行验收，不代表NAS上线。Learning none。

## preview134发行回执

- 固定发行源码b8e1b730e6d6846dea5d44c2ea44600365689896，干净构建；ASAR内89个build文件与源码构建逐字节一致。使用包内实际模块再次跑共享12项桌面检查通过。ASAR3.4.1在Windows按path.sep查目录，校验脚本曾用斜杠导致路径查询失败；已读取固定包源码按原生路径修正校验，不修改产品包。
- NSIS大小75,540,545字节，SHA256 `6e2ee93e36bad8bacce34fc9abd71352bcfccde0eafc345be775f4c26345663d`。本机安装包保留，未安装/重启个人App。
- GitHub五资产setup、blockmap、preview.yml、source-version.json、SHA256SUMS.txt与本地大小/服务端SHA256全部一致。draft验证后建立annotated tag，公开为非Latest prerelease。https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.134
- tag解引用为b8e1b730e6d6846dea5d44c2ea44600365689896；真实132与前一发布133更新器均检测134，无下载/安装，errors=[]。Latest仍preview51。原始artifacts/p095-asar-match.log、p095-packaged-desktop.log、p095-remote-assets.json、p095-published-update.log、p095-published-update-133.log。
- 本机软件与发行阶段完成；整体任务仍IN_PROGRESS，NAS运行条件/部署批准及两台物理电脑接入验收未完成。已向用户请求只读确认极空间应用中心Docker状态。Learning none，沿用既有固定版本/原生路径验证要求。
