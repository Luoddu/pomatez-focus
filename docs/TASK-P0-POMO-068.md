# P0-POMO-068 专注中临时事项收集

状态 IN_PROGRESS；owner/root，隔离农场模块。用户2026-10-26截图绿框要求专注页顶部随手记临时事项，按原番茄逻辑先保留，结束当前专注再细分项目与调整。前置067源码01dc684与104包已独立PASS但尚未公开；baseline d7cdf10a0149fbc5040fda433b7388465d6dba56。公开主线实时fetch/check:sync为7ae773c、maxPreview103，clean单worktree，分支task/p0-pomo-068-focus-capture（模块提交器强制task前缀）。用户新答复“我晚点自己升级”覆盖067首次代装步骤：不控制个人App、不强杀/备份/安装，保留本地同源包供用户手动升级；本次合并交付067与068，只发布一个最终安装版，不再发布中间104。

目标：计时上方轻量输入，回车/记下以稳定UUID进入原EditQueue的task意图，默认1个未归类番茄，不增加完成数、不改当前任务/计时。先标记待整理而不立即发送创建；结束专注后的review及看板提供原QuickTaskEntry表单编辑标题、数量、象限、所属项目，确认后走原创建/回执/重试/绑定路径。输入保留中文IME，空白/超长拒绝；保存失败保留输入。待整理可跨重载保留，不建立第二任务源、计时器或云API，不新增周期扫描。原四象限/概览比例不变，科学专注策略不变。

允许文件：app/renderer/src/focus/FocusApp.tsx、editQueue.ts、components/QuickTaskEntry.tsx、FocusTimer.tsx、ReviewPanel.tsx、QuadrantBoard.tsx、新增FocusCapture.tsx、focus.css；tests/quick-edit.test.cjs及新增focus-capture-desktop.cjs、scripts/test-focus-capture.cjs；本卡/新增ACCEPTANCE-P0-POMO-068.md；067卡与验收仅更新本次交付状态；AGENTS.md仅记录用户改为自行本地安装；CHANGELOG.md、版本helper的package与Settings版本；ignored artifacts合成证据/固定本地包/发布helper。禁止新增后台/真实云测试写入、修改个人App或记录、公开截图/配置/凭证、根治理/路线图/根Learning。复用已登记review_scientific_rest独立只读复核，不新增Agent。

四源：①原addQuickTask→EditQueue→quickRows→createQuickTask/validateQuickReceipt/bindQuickSessions已处理稳定ID、项目、创建幂等；只增加同一task意图的待整理标志及确认转换，不另造收件数据库。FocusTimer/ReviewPanel/QuadrantBoard复用相同插槽；计时唯一源CounterContext不改。②无第三方采用/升级/关键运行语义变化，React16.14受控表单沿现组件及本地固定源码，不需要无关网络调研；Electron/updater沿067已固定官方证据，不改实现。③Learning稳定意图/回执与067真实安装隔离沿用；命中原quick-entry helper和scripts/test-quick-entry.cjs，不用失败个人备份helper。④docs/ACCEPTANCE-quick-entry.md、active-task/local-first与tests/quick-entry-desktop.cjs覆盖待创建重试/重载/当前计时，扩展待整理不发送与确认后正常发送正反。

验收正反：输入提交恰1稳定task/1计划番茄，当前active身份/elapsed/状态不改变、records不增加；待整理不发云且不阻塞其他意图/已保存记录同步，确认项目后正常只创建一次并回读。断网/重载保留同意图与标题，写失败不清输入；中文组合回车不误提交，空白/超长拒绝，两个同名事项保留不同ID。结束后原表单可改标题/数量/象限/项目，取消不丢原稿，提交失败不丢内容；已提交/正在发送意图不得被旧表单覆盖。原quick-entry/active-task/067分段与全部逻辑回归、合成横竖图检查。最终干净commit构建NSIS、独立包源及五资产/tag/真实公开103更新器0下载门禁；保留本地包给用户自行升级，不把未执行个人安装说成已安装。

资源与预算：此worktree/build/dist与随机隔离测试profile独占；一次前台90分钟实现/测试/发布，所有测试隐藏静音，真实云写0。不触个人运行资源；公开授权沿AGENTS默认推送。未知同因两次停止对应步骤并分类，HEAD漂移按写集判定。回滚显式revert本任务；待整理是原task意图可向前整理，新版添加字段旧版忽略，回退旧版会按旧行为同步这些未分类任务，故保留备份/不自动降级。学习检查点沿既有已验证规则，无新通用教训不重复写Learning。完整完成与独立复核后才DONE。
