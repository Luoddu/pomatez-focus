# P0-POMO-006 整合验收

日期：2026-09-15。四处预检、授权、非目标与回滚见 P0-POMO-006.md。

## 来源与保留清单

- 公开基线 44a77b4：完整保留 preview.21–24 的竖屏原生窗口尺寸、象限字号、概览/月历并排、日期卡片、星期、每日番茄合计及今日空态。
- 本地源 62ef659，相对共同代码基线 c836a8a 逐文件三方整合：生成进度、合成提示音开关、近日行动/今日日期并集、实际收获日期与跨日多番茄计入、手动同步提示、版本检查。
- 既有原行回写、自由番茄、暂停分段、加时确认、显式完成数、放弃不写、跨机已保存记录共享、更新器不降级均保留。
- 两处文本冲突：包版本选新号 preview.26；HistoryPanel 保留公开星期/合计与本地进度、待同步提示。没有用旧本地文件覆盖远端布局。
- 公开提交从 44a77b4 继续，不引入私人旧开发历史为父提交。旧源分支及原截图留在本机；公开增量不含私人任务截图、配置或凭证。设计专用 HTML/脚本未纳入运行代码；可复用界面验证脚本改将图片写入忽略的 artifacts。

## 已验证

运行时 Node 22.23.2、Git 2.53.0.windows.3、Electron 34.5.8，未升级依赖。

| 验证 | 结果 |
| --- | --- |
| test:focus:all（状态机、飞书、原行、生成、共享、提示音、版本） | 113/113 |
| test:desktop + 真实进程重启 | 21/21；暂停、紧凑窗、恢复、导出均通过 |
| portrait-desktop | 12/12；横竖屏来回切换、日期合计/星期/空态均通过 |
| manual-sync-desktop | 4/4；失败保留、重试、重复点击和空队列下载 |
| cloud-desktop（用 Node 启动其三进程驱动） | A→B→A 共享历史通过，活动计时不迁移 |
| plan-desktop | 3/3；自由专注/暂停/放弃、12+13 分钟原行累计、离线自由番茄重试去重 |
| quadrant-desktop | 3/3；延迟载入、刷新分类和失败保持 |
| shot-app | 69/69；任务/计时/确认/放弃/设置/小窗/农场/生成进度 |
| updater（Electron 驱动） | 模拟状态 + 真实本地 HTTP 404、SHA-512 拒绝通过；失败不安装 |
| build:focus | 完整 TypeScript/renderer 构建通过 |
| repo-sync 治理测试 | 7/7；实时落后、分叉、脏树、断网、版本冲突、旧构建拒绝；修正后合法路径通过 |
| 实际旧分支检查 | 本地 preview.25 因缺少 44a77b4 被拒绝 |
| pre-push 干运行负例 | 未提交源码被拒绝，未向远端写入 |

原始本机输出：artifacts/tests-all.log、tests-desktop.log、portrait-desktop.cjs.log、manual-sync-desktop.cjs.log、cloud-full.log、plan-desktop.cjs.log、quadrant-desktop.cjs.log、shot-app.cjs.log、updater-test.log。横/竖屏与设置截图人工查看，无遮挡/溢出；均为合成任务。

## 验证中修正的旧测试

最初冷工作树缺少 emitted JS，测试入口补编译；cloud-desktop 必须经 Node 驱动三阶段而非直接启动 Electron。原行桌面测试仍断言早期隐藏完成数、数组插入顺序和旧 sync-only 服务；更新为手动确认、按记录 ID 判断、完整 archive/history 模拟链，等待共享完成后验去重。象限测试改验读取期间刷新禁用；月历断言改验实际布局列数，不依赖已变为 CSS 变量的内联 13px 字面值。这些是测试与现有公开交互对齐，未为通过测试删除产品功能。

## 发布门禁与边界

打包前要求干净 commit、包含实时远端、未发布版本、构建 SHA/版本一致；不自动 bump 已构建应用。push 使用原生非强制更新，复读远端 SHA。包内 source-version.json 保存源码来源；SHA256SUMS.txt 随 Release 发布。

不触碰真实飞书表、个人记录、正在运行的 App；此次真实飞书写入未重放，接口链由合成 HTTP 验证。仅 Windows x64；既有工具链版本与未签名预览版限制不变。其他电脑首次需启用 dev:setup，Git hook 本身不随 clone 自动启用；不声称能阻止人为绕过。

Learning：candidate — 更大版本号和本地 origin 缓存不证明包含公开代码；必须核实时远端祖先、干净构建来源，并在非强制推送前复核。证据为本次旧分支拒绝、双分支 fixture 正反例与构建来源检查。根 Learning 不在本模块写集，候选留本验收。

源码/安装包发布回读结果在 Release 与最终任务回执中确认，不把构建通过冒充已发布。
