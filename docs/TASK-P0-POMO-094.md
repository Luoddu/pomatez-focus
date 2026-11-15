# P0-POMO-094 睡眠打卡本机接口

- DONE（接口、独立复核、133成品发布与132更新发现完成；Hermes接入不在范围）；owner /root，独立模块，本卡为唯一状态源。用户2026-11-15明确先实现接口，Hermes微信接入留后；目标23:30就寝、07:40–08:00起床。
- 基线/协调ref：7bc332b1938a5db1659fe700a896401252acb163 / origin/codex/feishu-focus，实时check:sync通过；原工作区无修改。本任务独占p094工作区与合成profile，不占个人App/飞书/微信/远程设备。代码隔离任务分支。
- 目标：本地stdio接口记录就寝/起床、补记更正、读取区间及达标统计。固定UTC+08:00，按起床日归档，缺失不是0，记录是自报休息时段不是实测睡眠。
- 写集：app/electron/src/focus/sleep.ts、app/electron/src/main.ts、app/electron/src/assets/sleep-client.cjs、scripts/sleep-client.cjs、tests/sleep.test.cjs、tests/sleep-api-desktop.cjs、scripts/test-sleep-api-desktop.cjs、docs/SLEEP-API.md、本卡、docs/ACCEPTANCE-P0-POMO-094.md；验证后可写CHANGELOG及既有version输出。禁止根控制面、其他功能、实际数据、Hermes注册、云同步、微信、系统配置、自动升级个人App。
- 四源预检：①最新主线只有就寝提醒与Journey安排接口，没有实际睡眠打卡；旧99不是当前基线。②沿用Electron34.5.8官方second-instance/additionalData，docs/api/app.md 414–436、879–925（https://raw.githubusercontent.com/electron/electron/v34.5.8/docs/api/app.md），不改transport/锁机制、不引依赖。③复用JourneyGateway与journey-client；Learning LEARN-P0-POMO-054-01逻辑ID与transport分离；sleep存储仅App主进程同步处理。④docs/ACCEPTANCE-P0-POMO-054.md及tests/journey-api-desktop.cjs：真实CLI→第二实例→主进程、同ID并发、旧revision拒绝和正常新写正反。
- 验收：就寝/起床正常关联与历史更正；重复/并发/重启不重复；同ID不同payload拒绝、新ID正常；无时区/非法日期/未来/倒序拒绝且合法历史仍能补；冲突不覆盖、读取再更正成功；存储损坏拒绝保留、正常持久回读；跨午夜、目标边界、缺失及连续天数；真实隐藏Electron全链和原Journey回归，测试不使用个人数据。
- 复用选择：扩展已有stdio通道，不新建HTTP服务或并行调度；独立sleep文件是该领域唯一数据源，与现有实际休息日志不自动互抄。业务逻辑T1，需独立只读reviewer一名，冻结diff/原始证据；允许该有界子任务，不允许其他子Agent。
- 预算：本轮前台实现验证90分钟；无后台/新费用，未知同因两次或根级失败停止对应步骤。发布依模块既有授权，但未验收不得发布；当前先实现可审查接口。
- 上下文：模块AGENTS、上述源码/验收/Learning、根how-to-dispatch与version-control；不读个人运行数据/密钥/不相关模块。改变网络/身份/根集成需升级，实际Hermes接入不在本卡。
- 回滚：回退本任务代码到基线，保留独立sleep数据文件，不迁移/删除个人历史；旧版忽略新文件。
- Learning：沿用已验证054去重教训，本检查点无新可复用实证教训。

- 最终证据：docs/ACCEPTANCE-P0-POMO-094.md。review_sleep_api最终源码、包、远端五资产与旧更新器复核PASS。旧分类测试契约失配明确保留；后续修订由分类/同步任务owner处理。发行tag固定9daad，验收文档后置提交不改变包。
