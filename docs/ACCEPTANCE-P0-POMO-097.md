# P0-POMO-097 acceptance

Status: implementation, isolated write integration and actual WeChat read verified;
release pending. Baseline `a90db53c4ce59390c23cb033fcbe8bb6d7dcc710`.

- `build:focus`: PASS, production React/Electron build.
- Fixed Node 24.22.1 `scripts/test-focus-all.cjs`: 581/581 PASS.
- Sleep store/goals: 17/17 PASS; midnight-relative means, separately missing samples,
  goal persistence, unchanged historical record bytes, invalid/corrupt goals rejected.
- Python plugin: 6/6 PASS, direct phrases accepted, quoted/planned content rejected,
  same UUID request replay, existing field preserved, unauthorized context denied,
  live lock denied and real child-process crash releases lock.
- Hidden, muted desktop fixture: actual stdio transport + Electron store + preload
  stats/goals + renderer, 14 endpoints and two target lines; 2:3 columns and narrow
  viewport without overflow. Actual 7/30 buttons and target form save verified.
  Desktop mean sample is 23:20–23:38 => 23:29; cross-midnight mean is covered by unit tests.
- Actual fixed Hermes session context in a synthetic child process: plugin-to-stdio
  write, same request replay, other user denial PASS (3 checks). Personal state untouched.
- Independent review closed source-authentication and crash-lock findings after
  reading fixed Hermes context and upstream DM allowlist adapter. No open P1/P2.

Runtime installation is separate from source acceptance. Native plugin doctor confirms
three tool registrations. Use the existing controlled gateway launcher, which injects
its encrypted account in memory; do not copy credentials or start a bare gateway.
The user sent the requested WeChat query: native read plus 7/30-day statistics tools
returned successful JSON receipts without errors. The first actual bedtime/wake
write remains to be observed when the user really checks in; no synthetic personal
records were created. This limits live-write acceptance, not the isolated tests.

Rollback: disable only this plugin through native CLI and reload via the existing owner;
retain personal sleep records and request receipts. Previous farm can still read sleep
records. Learning: existing idempotent recovery lessons apply; no new general lesson.

137 UX follow-up: default cards are 176 CSS px high. Home shows only the seven-day
trend; the statistics dialog holds 7/30-day averages and goal editing. Desktop test
opens statistics, switches ranges, saves a goal through the actual form, closes it,
and asserts the compact height. Narrow layout explicitly places the calendar below
the rhythm row and tests their rectangles do not overlap. Updated screenshots inspected.
136 was locally installed by the user; its unpublished release draft was cancelled
after an upload timeout and the user's layout feedback. No public 136 tag was created.

137 was published from a0cd70a733b72b557d2ae2143efa51167ade34a5. Five remote
assets match hashes, NSIS embedded ASAR matches the verified tree, actual public135
updater detects137 without downloading/installing. Personal installed source matched137.

138 follow-up requested by user: statistics belongs inside the global StatsPanel,
not a separate modal. Home has a seven-day sliding date window with today second-last
and tomorrow last. Beijing-midnight unit test verifies automatic date advancement;
future placeholders do not enter the 7/30-day averages. Home no longer reads 30-day
stats and its component is memoized against unrelated parent ticks.

Performance diagnosis on the same isolated 137 renderer, drawing enabled: over four
seconds ambient SVG motion produced TaskDuration0.524s/LayoutCount641, stepped motion
0.185s/37, and static illustration0.00445s/1. ScriptDuration remained about0.00045s.
138 disables continuous decorative motion, retaining event-triggered harvest feedback.
This proves a rendering cost and its local mitigation, not elimination of every possible
personal-device stall. Live user-process sampling after update is still required.

138最终回归：582/582 PASS（p097-all138-final.log）。全局统计新增样式引用使原内存DOM打包测试失败；测试专用CSS empty loader修正后完整复验通过，产品CSS仍由桌面构建验证。12项桌面检查PASS。最终138相同绘制fixture四秒normal TaskDuration 0.002083s/LayoutCount0，animationCount0（p098-perf138.log）；仅支持隔离空闲负担改善，个人实际卡顿仍待更新后核验。Learning判断：未新增通用教训；当前性能数值限定本fixture，不外推。

138发行验收：固定源码0cea8256336fd75538ccf044f49d2ab7f51bc02d，干净构建；144构建文件与ASAR逐字节一致，NSIS内ASAR与win-unpacked SHA一致，隐藏隔离启动PASS。五资产远端大小/SHA256全匹配；公开prerelease v0.1.0-preview.138，release ID446126850，固定annotated tag同源，137资产与Latest不变。真实137更新器发现138，errors空、downloads0、自动下载/退出安装均false。本机已stage138；最后只读安装检查仍137，用户加载138后的真实卡顿观察待续。独立复核关闭测试CSS装载问题并确认582/582。回滚保留数据，使用既有137安装包；不覆盖历史记录。

139滑块：原生range回看最近30天，7日窗口、默认今天倒数第二保持；hover/focus显示，触屏可用，最右侧回到默认。首次操作读取历史，连续拖动本地切片；历史未加载/失败与真实空记录区分。582/582回归、14项桌面检查与独立复核PASS。合成延迟500ms/失败/键盘重试恢复通过；隐藏窗口重复focus未发事件已追踪确认（调用1→1，键盘重试→2），未据此修改产品IPC。176px不增高，无统计页滑块，真实局部截图检查通过。四源见任务卡139段。用户138已加载，安装源码0cea825已确认；空闲3秒各进程CPU增量四舍五入0.00，仅为此次空闲观察。Learning：无新增，沿用异步状态与真实交互验收规则。

139发行完成：源码8106dc4981bdddf53eca57200142ff04feaccb57；干净构建149文件与ASAR一致，NSIS内ASAR同SHA，隔离隐藏启动通过；5项远端资产大小/SHA256通过，公开v0.1.0-preview.139（release446135103），annotated tag同源，138与Latest保持。真实138更新器发现139，错误空、无下载/安装。139已stage本机，用户最后确认运行138，139待手动加载。实际绘制悬停截图p097-slider139-visible.png确认细滑块不遮挡日期，隐藏窗口初次截帧滞后不用于外观结论。Learning无新增，复用既有发行与真实交互规则。

2026-11-16 Hermes1.1更正：新增pomatez_sleep_correct，原生本人weixin鉴权、单字段CAS、持久UUID回执、回读verified；check_in强制可核实at，不再用工具调用时刻；带澄称呼问候支持。10项插件单测、7项真实Hermes上下文→stdio→隔离农场检查、14项UI检查通过，独立复核PASS；毫秒规范化与非+08偏移用例通过。未改变App源码/接口/记录schema，复用139已有correct，不制造无代码差异的App升级；只发布插件源码并本机安装。四源与范围见任务卡本日段。Learning无新增，现有幂等/CAS/原生薄适配覆盖本次。个人打卡不进入公共验收材料。
