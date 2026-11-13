# P0-POMO-091 旅程实际起止时间

- DONE（修复、验收、130发布和本机更新准备完成；个人安装由用户保存重启入口执行）；owner/root，隔离模块本卡唯一状态源。基线 bfb4ac6536c3aae0d2dc61b7a2a31d98a6a5ba37；实时远端一致，工作树干净。独占当前任务分支/worktree、artifacts/p091；其他工作树不占本任务文件。
- 目标：已完成专注在旅程显示准确的分钟级实际起止；未来安排明确预计/计划，避免将按顺序排列的图标误认为等距小时轴。不改历史记录、番茄数、模板、同步、休息及计时语义。
- 四源预检：① TodayJourney.tsx 只展示阶段首格整数小时及全日末格结束，单条多番茄记录结束被未来格遮蔽。② 纯自有显示投影，无第三方关键语义修改，不适用新采用。③ 复用 completion、activeInJourney、journeyTimeline 和构建发布 helper；Learning 既有原始记录/显示分离边界保持。④ tests/journey.test.mjs、journey-desktop.cjs 和 P090 验收已查。
- 写集：journey.js/d.ts、components/TodayJourney.tsx、focus.css、相关旅程 tests/scripts、本卡和 ACCEPTANCE-P0-POMO-091.md、CHANGELOG及version:prepare输出。禁止个人记录、根共享治理、配套、外部业务写入。
- 正反验收：13:32–15:05 三番茄显示真实首末时间，不编造逐个开始时间；单番茄同时起止；跨阶段同记录只一对；进行中只真实开始；未完成显示预计/计划；零完成/异日/异来源不误入；模板、番茄数与拖放仍正常；窄窗标签不重叠、不裁切；原休息按钮逻辑回归。
- T1 业务显示；沿用 review_local_editing 独立只读复核，输入精确diff与测试证据，输出问题/通过，禁止其写文件。前台90分钟，同因未知两次停止对应试错。
- 按模块已有默认授权测试复核后固定130源码与安装包、本地stage及GitHub preview；不自动重启App。回滚129，无数据迁移。Learning检查点同批判断，证据不足不新增。
