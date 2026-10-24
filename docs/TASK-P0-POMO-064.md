# P0-POMO-064 计时中按任务选择自动关联番茄

状态：IN_PROGRESS；owner/root，隔离番茄模块实现/既有授权发布，唯一状态本卡。基线871359126c58dc1577bc72536416ff79fe1709cc（公开99），已fetch/check:sync同源、clean、单worktree task/p0-pomo-064-task-picker；旧93任务分支保留，无merge/rebase或覆盖其他电脑修改。

用户2026-10-24要求选择框只选任务，不逐个列出第几个番茄；自动关联相应可用槽位。截图为FocusTimer更换任务框。目标：一任务一选项、名称不带番茄序号；确认选别的任务自动选序号最小的未完成/非pending可用行，同当前任务保留当前行；时长/暂停/记录/精确planId照既有更换API。非目标：不改旅程/补记已分组的选择框，不改任务真相源/自动完成规则/云接口/同步偏好/账户权限或历史。

完整卡（选择映射涉及计时plan归属）；允许复用review_scientific_rest独立有界只读冻结diff/原始实链/包源发布，不新增Agent。允许文件：app/renderer/src/focus/components/FocusTimer.tsx；tests/active-task-desktop.cjs、scripts/test-active-task.cjs（仅静默/隔离如必要）；本卡、ACCEPTANCE-P0-POMO-064.md、CHANGELOG.md；版本helper electron/package.json、renderer SettingsPanel.tsx。ignored仅合成profile/截图/测试与官方已发布99安装包（校验哈希后只提取ASAR，不安装）、构建/包/已有发布helper。根治理/组件锁/Learning/Memory、任务/时间数据及真实账户不写。

四源预检：①当前99 FocusTimer options按row id/title列出所有槽位；FocusApp changeActiveTask按精确row ID查可用行再withPendingCredit/changeTask，已有active计时保护；ManualEntry/TodayJourney已按任务，不扩改。②不适用第三方新运行语义：沿已固定React16.14/原生select/onChange与现有groupTasks；不引入库/API/生命周期。③shared.tsx groupTasks按稳定taskId/local id分组、parseTitle去序号并排序番茄；保留board顺序与现有切换/当前记录算法。Learning定向检索057本地日cache不命中新缓存（不新增memo）；039固定源发布门禁命中；现有build/version/push/五资产updater/helper复用。④tests/active-task-desktop.cjs原free→任务/取消/暂停/刷新描述/精确最终一次归属，原P053/057计时稳定与发布实链。

正反验收：八个槽位仅一个任务选项，两个不同稳定ID同名仍两项，done/pending/free排除；按既有序号排序映射剩余2/3等，保留部分credited/applied信息。选当前任务不能从第3个退到第1个；当前行不在候选但仍活动保留当前选项。取消不改绑定；无可用行/列表刷新失效不误绑自由或其他ID、正常新选择仍通；更换时运行/暂停计时ID、start、elapsed/暂停segment保留，最终只按精确目标planId确认保存一次。实际main/preload/renderer静默合成transport验证、全量相关回归/构建、独立复核；只证明合成实链，不操作个人App。

资源与授权：本clone build/dist及随机合成profile独占；无真实DB/端口/个人Edge、注册或其他设备操作。沿用户默认推送源码+Windows preview安装更新5资产，不交便携包、不自动安装重启。发布使用干净固定源码、先draft/五资产哈希、同HEAD annotated tag后立即公开，不设Latest；前一真实已发布99 updater验证发现新版、0下载0安装。失败或独立复核未通过不发布；一轮有界实施，未知同因两次停对应尝试，超预算/新边界升级。

回滚：显式revert本次选择框改动，无存储schema迁移；99原发行及asset不变，新版本修正不复用tag。开工/冻结/提交/发布复查HEAD/写集/资源；仅模块状态本卡，不写根路线图。Learning none初判：既有稳定ID分组和精确计时切换的薄UI映射，不制造新运行/权限机制；若复核产生候选须先明确处置再封版。
