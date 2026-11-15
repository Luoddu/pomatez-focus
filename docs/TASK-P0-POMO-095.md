# P0-POMO-095 跨电脑娱乐额度、倒计时与逐日统计

- IN_PROGRESS；owner /root。隔离模块本卡唯一状态源，根控制面只读。用户2026-11-15明确要求共享每日娱乐额度与休息倒计时，换电脑不能重置，增加B站每日统计可视化。
- 基线3abac0ca3308436de57d0b9d7d149e9d56b837fb / origin/codex/feishu-focus，fetch+实时check:sync一致，原工作区clean。独占p095 worktree、合成测试profiles及临时本机回环测试资源；不占个人App/真实云表/其他机器。写前、检查点、提交前核对HEAD/写集/运行资源。
- 范围：先完成独立的逐日图表与30天查询，然后补共享用量/全局截止时间、幂等传输及断网语义。最终共享云端的账号/运行位置和离线策略已向用户询问；未确认前不部署服务、不创建账号/表、不使用真实凭证或开放网络。禁止把本机多客户端测试宣称实际跨电脑云端验收。
- 允许文件：app/electron/src/focus/activitywatch.ts、preload.ts、main.ts、focus/browserControl.ts、dailyFocusLock.ts、nativeBrowserHost.ts；app/electron/src/focus/sharedEntertainment*.ts；app/electron/src/assets/browser-control/{background.js,content.js,popup.js,manifest.json}；app/renderer/src/focus/{dailyUsage.js,focus.css}、components/ScientificRest.tsx、相关bridge声明；tests/daily-usage.test.mjs、activitywatch.test.cjs、shared-entertainment*.cjs、daily-usage-desktop.cjs及对应scripts/test-*.cjs；本卡、docs/ACCEPTANCE-P0-POMO-095.md、docs/SHARED-ENTERTAINMENT.md，验收后CHANGELOG/version helper输出。服务实现/真实配置写集须在平台确认后补卡，未确定平台不预造第三方适配。
- 非目标：睡眠功能、微信Hermes、任务同步修复、云端任务真相源、新后台自动化、安装个人App、迁移历史/运行库到网盘。游戏既有工作日严格禁用不放宽，未经新授权不扩展系统级阻断。
- 四源预检：①133源中DailyFocusLock只持有本机日承诺/放行until，浏览器background.js生成本机冷静until，AW usage只有本机数据，周图按小时聚合不逐日。②每日汇总与图表为自有逻辑，无新第三方关键语义；沿用AW既有查询，云端固定API/原文待平台确定，不把缺失写成不适用。飞书现有append-only偏好不是原子额度核准。③复用AW summarize.sessions去重、restStatistics、DailyFocusLock；Learning054去重、042刷新排空命中；已有偏好同步只参考不挪作锁。④tests/activitywatch.test.cjs的周缓存/手动刷新并发、daily-focus-lock与browser-control测试，p094已确认旧category-review即时云写断言不符合5分钟安静同步，保留已知基线。
- 初始验收：跨午夜拆分，7/30日柱图与当日时段一致，未知/未覆盖不冒充零使用，重复区间不重复累计；宽/窄桌面真实图表无溢出，原今日图正常。共享验收需双客户端并发、重启、换设备、陈旧缓存、请求丢失与重试、断网重连、跨日、时钟漂移，保证总额不重领/倒计时不延长且合法剩余额度仍可用。测试只用合成数据。
- 风险：业务逻辑/持久状态需独立只读reviewer；允许一名冻结diff/原始证据review子任务，禁止其他子Agent。当前T1本地实现；云部署/外部写入待具体目标明确并按现有授权Gate执行。既有农场源码/安装版发行持续授权沿用，但未完成验收不发布“互锁已生效”。
- 行为预算：前台两小时有界纵切，无新付费/后台服务；平台不明先做无依赖图表，未知同因两次停对应试错。跨工作周期/新云平台/真实网络暴露须明确方案和用户决定，不猜默认云商。
- 回滚：回退本任务到133，保留既有AW与本机锁/睡眠文件；共享启用后降级不得静默发放新额度，最终云方案需单独定义退出路径。
- Learning：复用已验证缓存和去重契约，未形成新实证教训前none。加载模块源码/上述测试及根路由/版本控制；不读取个人凭证/浏览历史/无关模块。

## 2026-11-15 接入决定与本机服务纵切

- 用户确认有NAS或飞书；NAS此前未用过Docker，运行条件未知。明确离线不发新额度、倒计时继续。先做本机双客户端与服务完整链路，NAS部署、开放端口及真实凭证均不在本卡授权内。
- 补充允许写集：services/shared-entertainment/server.cjs、services/shared-entertainment/README.md；tests/shared-entertainment*.cjs；已有客户端sharedEntertainment*.ts与桥接/组件文件。独占合成临时SQLite和随机loopback端口，退出即关服务，不安装后台。
- 固定本机Node24.22.1 / bundled SQLite3.53.4，node:sqlite DatabaseSync为官方release-candidate接口；不引入第三方包。官方SQLite事务薄适配，BEGIN IMMEDIATE+COMMIT保证核准原子；不自研持久锁/数据库。Node固定版API https://nodejs.org/download/release/v24.22.1/docs/api/sqlite.html 第154–249行、http.html；SQLite事务 https://www.sqlite.org/lang_transaction.html 第38–55行是现行补充说明，不冒充固定版证明。
- 实现保守的短时许可预扣：全账号共享同一20秒许可窗口，重复/换设备沿用截止时间，不叠加；每次断开可能损失窗口内未用秒数，实际观看统计独立计量并明确区分。服务统一Asia/Shanghai日界；工作日900秒，周末3600秒，作为兼容既有策略的本地验证默认值，正式部署需核对用户设定。
- 冷静期与放行截止时间由服务保存，幂等ID持久化，服务失败不回退本机新额度。服务默认仅loopback；鉴权使用随机测试令牌只在进程内传递，真实服务以后独立审查。

## 本机阶段检查点

本机实现d0914de复审PASS，573逻辑/19专项/12共享桌面/8每日UI通过；preview134已完成发行与真实旧更新器验证，仍为IN_PROGRESS，真实NAS部署与物理换机验收未完成。NAS只读确认Z4Pro客户端已登录，Docker/网络入口尚未确认，未改变设置。

发行源码b8e1b730e6d6846dea5d44c2ea44600365689896，安装包/远端五资产/132和133更新器验证见ACCEPTANCE-P0-POMO-095.md发行回执。默认共享未启用，NAS未部署；后续先确认Docker、固定地址、TLS与首次接入当日额度迁移，不能凭安装新版宣称云端互锁。
