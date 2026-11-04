# P0-POMO-080 生活图标再次点击取消

- DONE；模块状态源本卡，owner/root。用户2026-11-04要求再点取消点亮并撤回占时，删除预计开始说明小字。基线3d5c0d7，实时fetch/check:sync通过，独立工作树复用task/p0-pomo-080-rest-toggle，无重叠写者/资源；根仓不写。
- 写集：renderer focus/restLog.ts、FocusApp.tsx、components/TodayJourney.tsx；tests/quick-rest.test.mjs、quick-rest-desktop.cjs；本卡、ACCEPTANCE-P0-POMO-080.md、DAILY-JOURNEY.md、CHANGELOG；版本helper明确两个文件。禁改真实专注/飞书、其他产品功能、依赖和用户运行目录。仅合成profile；沿既有本机包与默认发布授权，不重启App。
- 四源：①118标题点击仍追加，实际图标打开菜单，说明行为TodayJourney data-next-focus-time。②仅自有记录撤回与既有React/Storage，第三方语义不变，无采用升级Gate。③复用restLog验证/写后回读和journey投影、既有隔离及发布helpers；Learning命中039发布和067隔离规则，前轮已读未变化。④079验收/quick-rest和rest-log现有正反测试。
- 实现：标题再次点击取消当天该类最新记录，旅程已点亮图标取消指定ID；只移动紧随其后且连续、同番茄锚点的估算活动，保持其他活动时长，腾回被取消的时间；不移动非估算或跨专注的记录。原精确菜单通过右键保留；移除整行预计文字，实际时间角标保留。
- 正反验收：点亮→取消→重选，记录/占时/预测同步撤回，取消餐饭后连续后项前移，历史其他段/真实专注/其他来源不变；失败写入保留已点亮状态与原字节；过期ID/跨日不误删；无说明小字，拖放/默认时长仍通。回滚源码至118，无迁移。
- 预算60分钟前台；允许复用一名只读review_quick_rest独立复核冻结差异和证据，不写产品/再分派；无后台goal。检查点/提交前刷新status/HEAD/worktree，根因未知同因两次暂停对应步骤。Learning none：目前只复用原机制，结束复核。

- 产品检查点：487逻辑、19独立定向、TS/正式构建和隐藏UI六组PASS；独立复核PASS。Learning none，理由见验收。交付准备119。

- 最终：固定436a7a8/119，独立本地复核、干净包及安装器ASAR一致、五公开资产和118真实更新器发现119均PASS。本地更新已准备，未安装/重启；详见ACCEPTANCE-P0-POMO-080.md。Learning none。
