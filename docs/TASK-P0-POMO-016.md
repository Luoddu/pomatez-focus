# P0-POMO-016 专注统计趋势与布局

- 状态：REVIEW（本地验证通过，待用户决定是否发布/安装）；角色：番茄农场隔离模块实现者。
- 基线：公开主线 `origin/codex/feishu-focus` 的 `a8cf4835eeddee1a9c1784ba58f84bc7838195ae`（preview.49）；独立工作树 `task/p0-pomo-016-stats-curve`。
- 目标：把统计页的汇总压缩成清晰的卡片，并用已保存的专注记录绘制收获趋势与明确标注的移动平均；按用户追加要求，改善竖屏主页的月历密度、里程碑、农场文字、操作栏对齐和记录横向浏览。
- 范围：`app/renderer/src/focus/{stats.ts,focus.css,components/StatsPanel.tsx,components/StatsTrendChart.tsx,components/HistoryPanel.tsx,components/FarmField.tsx,components/SettingsPanel.tsx}`、`app/electron/package.json`、`tests/{stats.test.mjs,portrait-desktop.cjs}`、`scripts/shot-app.cjs`、本卡和对应验收记录。版本准备按仓库流程调整预览号；独占资源仅为该隔离工作树及其测试输出。
- 禁止：改动飞书读写、用户数据/凭证、统计原始记录、运行配置、根控制文档；未经另行授权不推送或发布。
- 四处自检：①用户截图与 preview.49 的 StatsPanel/focus.css 已核对；②此任务无新增第三方语义，使用现有 React 与原生 SVG；③复用 `barBuckets`、`rollingTrend` 和既有模块测试，未找到直接适用的可复用 Learning；④同类验收为 `tests/stats.test.mjs` 与 `scripts/shot-app.cjs`。
- 正向验收：周/月/季/年每个分桶与已保存番茄一致；平滑线是过去最多三期的移动平均；当前区间只绘制已到达的日期；竖屏汇总不再形成五条横贯页面的长行；月历格子放大利用宽度，未达标小旗仍直立；里程碑左端是上一个成果、实时数字贴着进度走；记录三列、最新在右、可向左滚动；计时设置对齐，统计与生成入口是清楚的按钮；原有热力、分布、分享及切换区间仍可用。
- 反向验收：无数据不造曲线；不预测未来、不将草稿/进行中计入、不泄露任务名；不写真实飞书，也不改变任何历史或累计。
- 验证：纯函数测试、构建、隔离模拟数据截图与界面检查。回滚为撤销本任务改动；原分支及其脏文件不触碰。
