# P0-POMO-098 本机启动去重验收

2026-11-16；四源与授权范围见TASK-P0-POMO-098.md。本次仅修复本机配置和冗余运行实例，App源码、版本、数据库内容和计时状态均不主动修改，不另发安装包。

## 已验证

- AW v0.13.2 / aw-qt 43864b2f7ec3b71d5b181eafb47b4ded6c197b8f，原生main每次autostart，无单实例保护。农场先启动后，Windows Startup直启快捷方式再启动，形成两套。原有农场ActivityWatchRuntime具备API健康复用、进程检测和本实例并发合并；正常桌面启动/恢复调用ensure，退出不关闭AW。
- 已用SQLite backup产生本机一致性备份并integrity_check=ok；不复制热WAL、不把数据库提交Git。两个watcher持久队列停止前均0。基于持续服务日志、collector正常连接日志、实际API心跳与进程路径/父子/创建时间，保留首组，移除后起重复组。未仅凭一次端口枚举选择：重复server存在时端口PID观测不稳定。
- 首版停止脚本被独立复核指出PID重用风险，修正为保持已核实Process.Handle并核对创建时间后按同一对象停止；已自然退出者跳过。修正复核PASS后执行。实际回读只有qt、server、AFK、window各一，均为保留组；农场原进程继续运行。
- Startup/ActivityWatch.lnk字节级备份核哈希后移出；农场Run原值和正常启动逻辑保留，StartupApproved未发现禁用项。回滚是把本机备份快捷方式放回原处；通常不应恢复双入口，不恢复覆盖活动数据库。
- 对比备份60228条事件：缺失0、已存历史payload改变0、时长缩短0；实测后60259条，桶仍5，在线integrity_check=ok。初次即时新鲜度断言未通过，随后连续两次只读观测确认两类心跳继续推进，最终window/AFK距采样分别约2.09/2.54秒；没有为该观测重启或修补采集器。备份保护的是已提交数据，不声称证明了每个内存瞬间无丢失。
- 既有activitywatch-runtime测试6/6通过，含并发冷启、健康复用、已运行但接口异常不另起、启动失败有界、真实合成manager→child→loopback链。真实现有API重复ensure 4/4成功、0启动，执行前后各一次，单组保持。

## 边界与交接

- 本次没有重启Windows，登录自动启动结果待下次实际登录观察；已核对配置和既有运行逻辑。手工直接多次运行官方aw-qt仍可能重复；本次消除的是已查明的农场与Windows开机双入口。
- 本机备份、官方源码快照、停止脚本和去敏回读存忽略artifacts/p098；不发布个人记录、设备路径、快捷方式或数据库。快照main SHA256 4d596aa9e4abac13a939aa43af5d6f657e40343bba88075e00d319597283563d；manager 4591413c2a046a57b6040c0debfb5b88906ffe3482f8170f7a9e61c3c6d63eaa。
- Learning：无新增；本次复用已要求的完整进程链核验、SQLite一致备份与副作用前身份复核，未形成需另建条目的新通用机制。根仓不相关脏文件、共享状态、Hermes及其他应用不变。

独立终验PASS：已复核after-verification.json、live-runtime-after.json、live-reuse.json与限定停止脚本；无剩余阻断。runtime-tests.tap保留6/6原始结果。停止脚本SHA256 9c04f0bf856c57dc31708d30b33bf39046a5156933462ef6e82eb8f8ef85304b。
