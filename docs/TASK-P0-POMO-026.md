# P0-POMO-026 历史专注主题精简

- 状态 REVIEW（实现、回归、截图和 preview.61 发布已验证）；隔离模块实现者/上下文负责人 Codex。用户授权历史卡仅显示当日主题、去掉当日复盘标题、改善阅读。沿用源码及安装包发布授权。
- 基线 88f52665bdf706d6b5062a55855edb4ae724dadb，task/p0-pomo-026-history-theme。已 fetch、核对 clean/worktree 与实时公开源，独占本工作树及合成测试 profile。
- 允许：HistoryPanel.tsx、reviewCache.ts、focus.css、manual-category.test.mjs、category-review-desktop.cjs、本卡/验收、CHANGELOG 和既有版本文件。禁止真实记录/飞书数据/凭证/根控制面变更、重启用户 App、新依赖。
- 四处预检：① 历史折叠卡渲染整个 dayReviews 字符串并截八行，另有当日复盘标签。② 仅项目自有文本与 CSS，不改变第三方关键语义，不适用外部调研。③ 复用 reviewCache、既有日期排序/折叠与 runner；同会话相关 Learning 搜索无命中，无模块 Learning。④ category-review-desktop 覆盖摘要隐藏/展开/编辑，增加主题隔离和截图验证。
- 实现：从带标签摘要提取当日主题，剔除后续代表进展等段落；无明确主题时不展示长复盘，显示简短占位。保留日期、计数、时长与查看明细。
- 正反验收：折叠不出现当日复盘标题及进展正文，但主题可完整阅读；点击可展开记录并编辑，今天记录和日期倒序保持；窄窗不溢出。旧原文保持原存储值不写回。
- 不加载无关控制面/真实用户数据；无子 Agent/定时后台任务，90 分钟预算，同根因未知失败两次停对应尝试。关键检查点及提交/发布前核对远端和写集。
- 回滚：回退独立提交，无迁移。Learning none：展示范围局部调整，无新的跨任务机制教训。
