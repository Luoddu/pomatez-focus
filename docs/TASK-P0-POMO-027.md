# P0-POMO-027 小屏记录表单可达

- REVIEW（实现、回归、preview.62 发布验证通过）；隔离实现者/上下文负责人 Codex。用户授权修复小屏补记/编辑底部按钮被裁切。基线 33aaa2731f11c24d8c957ee79aeaf6f2953b6b5e，task/p0-pomo-027-small-editor；已 fetch、clean/worktree 核对，独占本工作树与合成 profile。
- 写集：HistoryPanel.tsx、ManualEntry.tsx、focus.css、category-review-desktop.cjs、本测试 runner 静音参数、任务/验收、CHANGELOG 和既有版本文件。禁止真实记录/凭证/飞书写入、用户 App 重启、新依赖、根控制面。
- 四源预检：① right-col overflow hidden，records-section min-height 0，下方表单超出后被裁掉；只有历史列表有滚动。② 项目自有布局，不改变第三方运行语义，无额外第三方调研。③ 复用内联表单与桌面 runner，前轮已定位测试需 --mute-audio，本轮 runner 明确启用；无新的相关 Learning 命中。④ 既有 category-review 桌面真实 renderer 回归，扩充最小窗表单滚动/保存取消可达与正常布局恢复。
- 修复：仅编辑时右栏整体可滚动，表单不收缩，历史列表暂时隐藏，打开自动滚动到表单；不动计时与数据协议。
- 正反验收：小屏不裁按钮，滚动后感受/保存/取消可点击；结束编辑后恢复历史及概览布局，补记/修改保存与验证保持；正常横竖屏仍通过。
- 无子 Agent/定时任务；90 分钟预算，同因未知失败两次停对应尝试；检查点/提交/发布前核对远端。既有源码+安装包发布授权，静音隐藏测试，不安装用户 App。
- Learning none：局部 flex/overflow 缺陷，复用既有布局与测试能力，无新跨任务机制。回滚独立提交，无迁移。
