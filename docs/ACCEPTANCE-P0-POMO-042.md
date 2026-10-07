# P0-POMO-042 验收

- 当前本地实现，发布待验。四处预检、授权、官方冻结路径和回滚唯一见TASK-P0-POMO-042.md。固定Electron34.5.8实际Node20.19.1；采用其公开spawn detached/stdio-ignore/unref与execFile固定参数，无shell/任意命令桥。
- 已验证：275逻辑PASS（artifacts/p042-logic.txt），含6个runtime正反测试：健康服务零启动/进程查询、并发一次启动、已有launcher/缺安装不重复启动及后续恢复、退出/暂停中探测不再启动、启动错误与就绪等待有界、真实合成manager→server子孙→loopback接口链路。测试只管理自己创建的进程，不读取窗口/浏览记录。
- 已验证：真实本机AW已有服务分支ensure成功，官方REST聚合为recording（artifacts/p042-local-aw.json），未停止或重复启动用户AW；未导出原始历史。真实冷启动已安装AW会打断当前用户采集，未强停以造测试；实际默认spawn固定exe分支有源码/官方机制与合成完整链路证据，不能声称用户AW冷重启已实测。
- 已验证：真实生产main/preload/renderer、合成HTTP，新增刷新按钮禁用/一次请求、重新discover、用量更新、故障保留同日总量与恢复；已有策略/休眠/原生督促/计时动作回归19组PASS（artifacts/p042-ui.txt、activitywatch-desktop.json）。新增周缓存刷新断言和最终冻结版本仍需复验。P041六组真实尺寸/无溢出/状态及热力回归PASS；14原布局回归在P041冻结时PASS。
- 待验：独立只读review、最终干净构建、包源一致/五安装资产/真实旧73检测与源码公开同步。版本75将一起交付P041界面；74无公开tag/安装包。
- Learning判断：暂无新的跨任务已验证机制，沿用已有统计、官方进程管理和Learning039发布规则；不把本次合成测试或诊断未知写成工程教训。
