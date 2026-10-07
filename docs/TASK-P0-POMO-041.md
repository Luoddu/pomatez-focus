# P0-POMO-041 概览精简与今日时段热力

- DONE；本模块执行卡为唯一状态源。角色：模块实现/协调/root。用户2026-10-07要求隐藏概览两项总计、移位监控状态点、去掉指定月历说明并在原列内加入今日半小时热力；沿用本会话App手动更新与GitHub源码交付授权，不自动安装/重启用户App。
- 基线28a23b52527ca6e4855039db9371b72abd866380；实时fetch/check:sync已确认公开主线同SHA，preview.73；单worktree干净，绿灯。分支task/p0-pomo-041-overview-time-heat，串行单写；独占本clone、P041合成测试profile与临时端口，不读取用户AW/私人记录。
- 目标：仅概览保留今日两卡；科学休息健康文本改为圈左上状态点及悬浮/无障碍说明；月历去掉holiday-legend，左对齐同卡右侧今日00–24半小时专注热力，采用既有统计半小时分摊口径与红色档位、悬浮时间和番茄数。保留月历日期/周目标与专注记录；四象限、概览宽度/布局媒体查询不改。不增加第二统计源、计时器、持久状态，不改AW或督促策略/原生提醒。
- 允许写集：本卡、docs/ACCEPTANCE-P0-POMO-041.md、CHANGELOG.md；app/renderer/src/focus/components/HistoryPanel.tsx、ScientificRest.tsx、HeatmapCalendar.tsx、TodayTimeHeatmap.tsx；app/renderer/src/focus/focus.css；tests/overview-heat-desktop.cjs、scripts/test-overview-heat-desktop.cjs、必要的tests/portrait-desktop.cjs兼容断言；版本工具生成app/electron/package.json、app/renderer/src/focus/components/SettingsPanel.tsx。忽略artifacts只含合成测试、回执和发布暂存；禁止根仓、其他用户修改、系统设置、凭证与用户profile。
- 四处预检：①HistoryPanel.tsx L331–355四卡、ScientificRest.tsx L491健康footer、HeatmapCalendar.tsx L246 holiday-legend、focus.css L1813月历居中。②纯项目自有展示，无第三方运行语义变更/升级，官方新增证据不适用；沿用固定React16.14/Electron34.5.8。③stats.ts L388–431 halfHourMatrix、StatsPanel.tsx L33–46热力分档/时间标记；Learning LEARN-P0-POMO-039-01发布限定；既有build/package/version/push/helper。④tests/portrait-desktop.cjs、activitywatch-desktop.cjs与stats.test.mjs已有半小时/布局/监控纵切；追加当前日过滤、午夜和不同日反例。
- 正反验收：只隐藏两项总计，今日两项正常/其余统计入口仍在；健康文本不占行，健康/断线点正确且title可读；legend删除，月历/周徽章仍工作；全天48格同卡右侧、今日saved专注有热度，昨日/未保存不混入，跨格分摊一致且悬浮可读；常规/窄屏/竖屏无右栏水平溢出，原四象限与概览列宽比例不变。真实生产renderer+隔离profile DOM几何验证，合成数据不含私人材料。
- 预算：一次前台有界实施、测试、沿用发布交付；无长期后台/新依赖。允许既有review_scientific_rest一次冻结源码和原始证据只读复核，不写入/启动App/再分派。根因未明同因两次暂停对应步骤；无关工作继续。
- 回滚：以基线显式文件恢复，不删除数据、不替换旧tag/包。发布固定源码，五安装资产核对；真实前一公开73发现新版本，无自动安装。遵守草稿先无公开tag上传核验，再短时tag+公开并检查更新器。
- Learning判断：本次为复用现有统计口径的局部显示调整，开工暂无新的跨任务实测教训；安全检查点再判断。代码、实际验证、复核与交付回执齐备后收口。

- 最终交付2026-10-08：固定源码790bdcf0cb5dda9c372a2176bb6bc0d55c478dcf/preview.75随安装版共同公开，源码canonical已同步；包源89文件一致、五安装资产远端size/SHA256匹配、旧73资产不变。真实生产更新器以73版本配置检查公开GitHub，发现75/available且feed一致，0下载0安装；独立源码及包源复核PASS。最终证据见ACCEPTANCE-P0-POMO-041.md，未安装或重启用户App。
