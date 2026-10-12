# P0-POMO-056 月历同色当前数与单行周总计

- IN_PROGRESS；owner /root，隔离模块局部实现与既有授权发布，唯一状态本卡；基线c5f426cd89dfd26e9e8e293e7ae444cd7050ceae，canonical同源，task/p0-pomo-056-calendar-inline。用户本轮明确：当前数跟随对应目标色系，周总计/金番茄仅一行。轻风险T1纯显示，无业务/持久状态或第三方运行语义变更；无子Agent，不触发提醒或声音。
- 允许：app/renderer/src/focus/focus.css、components/HeatmapCalendar.tsx；tests/browser-control-desktop.cjs仅已存在月历显示断言适配；docs/TASK-P0-POMO-056.md、ACCEPTANCE-P0-POMO-056.md、CHANGELOG.md；version helper package.json、SettingsPanel.tsx。ignored artifacts仅静默隔离视觉fixture/截图、包、验证回执/既有发布helper。根仓、用户profile/AW数据、目标/汇总/旅程/计时/权限和注册逻辑不写。
- 四处预检：①focus.css wg-now固定深灰；hm-badge-slot column/27px导致数字与图标两行，HeatmapCalendar现有weekTotals/LogoIcon复用。②不适用：仅项目自有CSS/JSX显示，不采用/升级或改第三方运行语义。③既有版本/build/package/push/updater helper与Learning039不可变五资产规则复用，无新Learning候选；脚本目录和Learning同类检索未发现新的显示机制。④ACCEPTANCE-P0-POMO-053和browser-control-desktop旧上下分离断言命中，应更新为原位单行同基线/不遮挡正例，保留周汇总和权重。
- 验收：科研当前数与红色目标同色且粗体，普通/达标周当前数继承目标同色，目标400字重；周数和缩小金番茄同一行、相邻不遮、三位数可读；未达标数字仍可读、悬浮详情仍可用。真实静默隔离桌面在不同右栏宽度检查实际矩形/颜色，截图复核；整体四象限/概览比例不改。轻量卡自测收口无需额外reviewer。新91安装更新五资产/固定源/旧90真实更新器检测，默认推送沿模块AGENTS用户授权；不自动安装重启用户App。
- 资源：独占本clone/build/dist，静默随机profile；无数据库/schema/端口/真实浏览器/正式注册键写入。复用既有browser-control-desktop仅其随机HKCU Software/PomatezFocusTests/p055-UUID临时测试项，沿既有marker/UUID清理保护；不改变原注册/控制行为。一次有界前台实施，开工/冻结/提交复核HEAD/写集/worktree绿灯；若改业务/权限升级完整卡。回滚显式revert本次显示文件，公开用新版本、不替换90资产/tag。Learning none：既有布局及颜色继承的局部修正，不是新可跨任务工程机制。
