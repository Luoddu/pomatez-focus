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
