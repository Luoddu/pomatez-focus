# P0-POMO-096 跨电脑134合并与共享额度交接

- IN_PROGRESS；owner /root，独立模块唯一状态源。用户2026-11-15明确允许发布，要求合并本机修复与公开134并接手P0-POMO-095。NAS部署、网络开放、真实凭据须具体方案后另获批准。
- 基线88d93b34e626eb62e79bc2f35130ffba628f3067，协调origin/codex/feishu-focus；独占task/p0-pomo-096-integrate-134当前工作树、合成随机profile/端口、preview135候选发行。旧分支16622a保留。其他工作树不重叠，首次检查绿灯。
- 目标：审查逐文件移植dc74c191f0b71792c021d225d181561c4d198539的整个任务完成修复；保留远端133睡眠接口及134共享服务/图表；测试、复核、不可变新preview发布、本地更新包准备；只读核对NAS条件并交付具体接入计划。
- 非目标：不复制私人开发历史，不覆盖已发布133/134；不修改个人任务/历史、额度政策、真实凭据，不部署NAS、不开放网络、不强关或自动重启个人App；不改根仓。
- 允许写集：app/electron/src/focus/feishu.ts、service.ts；app/renderer/src/focus/FocusApp.tsx、completionQueue.ts、components/QuadrantBoard.tsx；tests/completion-queue.test.cjs、plan-fixture.cjs、plan.test.cjs、quiet-sync-desktop.cjs、whole-task-desktop.cjs；scripts/test-whole-task.cjs；既有version:prepare输出app/electron/package.json、components/SettingsPanel.tsx；CHANGELOG.md；本卡、docs/ACCEPTANCE-P0-POMO-096.md、docs/HANDOFF-P0-POMO-096.md。忽略artifacts仅验证/包/临时合成配置，不提交运行数据。远端P094与本机旧P094编号冲突：保留远端P094，旧修复证据引用原commit，不覆盖同名卡。
- 四源：①live check:sync 88d93b3/134干净；本机dc74修复产品文件与134产品变更无重叠，版本/日志/旧卡除外。②不升级第三方、不改变原API运行语义；沿用已审Feishu复选框PUT及当前Electron；旧修复固定官方依据见dc74:docs/TASK-P0-POMO-094.md，服务固定Node24.22.1/SQLite3.53.4依据见services/shared-entertainment/README.md；NAS运行环境未定，不作为部署通过。③Learning中039真实旧更新器、054去重、057跨日投影；复用repo-sync、version、build、stage-local-update、task-commit和既有验证脚本。④dc74旧P094验收及公开P094睡眠、P095共享验收原文已读，继续以合并版实测为准。
- 验收正反：整个任务完成后刷新/次日不重现且普通日常任务继续生成；失败/离线保留意图且重试只写原任务完成；单番茄完成不升级整个任务且正常专注继续；共享超额/断网拒绝且合法额度仍放行，睡眠合法读写与冲突拒绝不回归；完整逻辑及相关真实隐藏桌面通过。独立只读reviewer一名，允许有界复核子任务，不改文件。发布五资产哈希、固定tag、前一公开134真实更新器发现新版本，无自动安装；NAS/物理双机未完成不得声称整体完成。
- 预算：前台有界合并验证发布，至多本工作周期；无新费用/后台自动化。未知同因两次停止对应动作并分类，产品失败不得靠继续发布绕过。
- 回滚：保留134公共tag和旧本地分支；待wholeTask队列排空后方可回退旧客户端；共享状态不删不重置。NAS尚未修改无需恢复。个人App保持运行现场。
- Learning判断：暂未新增，沿用已知不可变发行、投影与幂等教训；复核时再按证据判断。