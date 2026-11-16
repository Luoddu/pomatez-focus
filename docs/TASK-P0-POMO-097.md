# P0-POMO-097 睡眠可视化与Hermes本机接入

- IN_PROGRESS；owner /root，模块状态源本卡。用户2026-11-15要求微信说我要睡了/晚安、我起床了/早上好即可记录，并把科学专注拆为2/5简版额度环与3/5早睡早起，浅色时间区间图、7/30天均值、自设目标线。NAS/Tailscale保持暂停。
- 基线a90db53c4ce59390c23cb033fcbe8bb6d7dcc710，公开origin/codex/feishu-focus实时一致；独占task/p0-pomo-097-sleep-dashboard当前树与随机合成profile/端口。根仓共享文件存在不相关脏改，不覆盖；Hermes live接入另作根执行卡记录。
- 写集：app/electron/src/focus/sleep.ts、main.ts、preload.ts；app/renderer/src/focus/components/HistoryPanel.tsx、ScientificRest.tsx、新SleepPanel.tsx及sleepChart.js、sleep.css、focus.css；tests/sleep*、tests/hermes-sleep*、scripts/test-sleep*；integrations/hermes-sleep/**；docs/SLEEP-API.md、本卡、ACCEPTANCE-P0-POMO-097.md；CHANGELOG及既有版本准备输出。忽略artifacts仅合成验证/发行，不提交个人资料。
- 非目标：不改督促额度/禁用规则、不模拟睡眠阶段、不开放网络、不部署NAS、不读真实凭据/旧聊天、不迁移睡眠真相源、不关闭活动计时。sleep-checkins仍唯一记录源，新增目标持久配置可与旧记录兼容。
- 四源：①135有本机SleepStore和stdio入口，无可视化/Hermes注册；本机Hermes固定d337b736aa1e8ebecfab043842d13e4a2d2f48a3。②固定Hermes website/docs/user-guide/features/plugins.md:18-99原生plugin.yaml/register_tool，官方system prompt section扩展继续按源码定位；不改Hermes核心。③复用Journey transport、sleep-client，Learning054幂等/057跨日投影；现有scripts/test-sleep-api-desktop。④P094睡眠验收与P096发行原文，当前135回归已确认。
- 验收：跨午夜平均23:30+00:30=00:00、缺失不当0；7/30切换/目标保存重启仍在；浅色区间/端点/目标线，缺失不画假数据；正常额度环/勾选/设置可用且严格锁保持；消息正例自动打卡，重复/引用/未来计划/无授权来源不误写；原请求重试幂等、App关闭给失败而非成功；真实本机Hermes插件→stdio→农场→图表验证，微信实消息回执不足不得声称全链通过。完整测试/独立复核/固定发行后交付。
- 允许两个有界子任务：frontend实现者仅renderer上述组件/CSS/图表纯函数测试，禁止后端/Hermes/live/提交；独立reviewer只读冻结diff和证据。共享工作树不同文件写集，协调者单写main/preload/sleep/插件/文档，发现重叠暂停冲突文件。
- 预算：本轮前台实施验收，不新增常驻进程/计划任务/费用，Hermes复用已运行gateway；新模型测试至多2个合成短turn，真实微信需用户发消息，禁止测试消息冒充实际个人打卡；同因未知两次分类停止对应动作。
- 回滚：退回135前保留sleep记录与目标配置；移除本任务Hermes插件并恢复仅本任务配置，其他插件/凭据不动。个人数据不删。Learning待检查点按原证据判断，不把本轮进度写成教训。

- 用户补充：136本机更新后认为首页卡片过高；137调整首页176px简版，仅7天趋势，7/30均值与目标编辑放“统计”详情；窄窗口按独立网格行排列月历，禁止重叠。136未公开草稿上传408后已取消，无公共tag，最终发行137。

- 137后续纠正：用户要求详情并入全局StatsPanel，取消独立入口；首页7天窗口为今天前5天+今天+明天，每个北京时间日自动前移，不把明天计入过去均值。允许新增StatsPanel.tsx写集与相关睡眠图表/桌面测试。137已公开且本机运行源码a0cd70a。卡顿先T0：3秒采样renderer约1.92CPU秒，主进程0.44；尚未证明根因，先隔离对照测量，不以猜测加性能补丁。其它核心状态、授权及网络不变。验收包含全局统计正例/无独立弹层、跨午夜日期滚动/历史均值不污染、首页响应及既有策略可用。

- 渲染T0实证：固定137 Electron实际renderer开启绘制的4秒窗口，normal TaskDuration0.524s/LayoutCount641；同窗只改装饰动画steps(8)为0.185s/37；暂停装饰为0.00445s/1。JS ScriptDuration各约0.00045s，指向持续SVG装饰布局而非睡眠接口轮询。允许focus.css禁持续装饰动画，保留事件型收获反馈。实际个人App更新后仍需重新采样，不把隔离改善当作所有卡顿已消失。

允许tests/effective-stats.test.cjs最小CSS装载适配以覆盖全局StatsPanel新引用；不跳过已有断言。

139滑块增量：用户要求首页可拖动隐藏小滑块。基线1c820ee，现有独占资源/授权保持；写集SleepPanel.tsx、sleep.css、既有桌面测试、版本准备输出、本卡与验收。采用原生range，无新依赖/持久状态。最近30天内移动7日视窗，默认今天倒数第二；跨日归位，hover/focus可见，触屏可用。首次交互才读取30天，拖动只本地切片。四源：现状138只自动滚动；第三方新语义不适用（原生输入）；复用sleepHomeRows与SleepStore stats；复用P097桌面验收。验收拖动历史日期正确且不冒充今天、回到默认、键盘可用、卡片高度不增、全局统计不出现此滑块。预算本轮有界实施/验证，回滚138，无新后端/凭证/网络配置。

2026-11-16 Hermes更正增量：用户明确要求补更正工具并修正时间僵硬问题。基线1ef01ad，写集integrations/hermes-sleep/**、tests/hermes-sleep*、本卡与验收；只改插件，不重发无变化App。复用现有SleepStore correct/CAS/UUID回执；四源为现有插件缺correct、固定Hermes d337b73原生register/session_context、既有sleep-client与幂等helper、P094/P097验收。提供单字段kind/day/at/expected_revision更正，必须本人微信鉴权、明确更正指令，回读验证；旧revision拒绝且另一字段保留。支持澄称呼问候，禁止工具调用时刻冒充消息时刻；无可核实at返回需时间而非静默写now。测试未知结果重放、冲突不覆盖、引用计划拒绝、原生注册及隔离真实链路。既有有界独立reviewer可用。live安装仅本插件，根P166授权保持、空闲受控加载。回滚插件备份且保留个人记录，既有公开源码同步授权保持，不无故递增App。

140目标标记：用户确认预览并授权App实施；基线3af98e0。写集SleepPanel.tsx、sleep.css、sleepChart.js、sleep-chart.test.mjs、sleep-dashboard-desktop.cjs、版本输出与本卡/验收。提前或晚≤20分为勾，20<晚≤50红圈，晚>50红感叹号，分别按就寝/起床目标精确比较，跨午夜同归档轴；缺失不标。只变图表表现，不改后端达标字段/个人数据。禁止添加预览下方规则或今天汇总文字。四源：139图表仅圆点；无新第三方语义；复用sleepMinute/clockMinute及既有CSS；P097桌面/纯图表验收。正反验收20/50边界、跨日、目标变更随动、无记录不标、原趋势/均值/滑块可用、卡片不增高。既有独立reviewer有界复核，回滚139包且保留记录。
