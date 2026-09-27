# P0-POMO-029 科研收获与持续投入

- REVIEW（实现/合成回归及preview.63发布验证通过）；隔离实现者/上下文负责人 Codex。用户授权科研周目标、趋势、农场和象限视觉增强；既有源码及安装包发布授权延续。基线 032317872ea6c57c260e5babacf95c052f899f5b；独占 task/p0-pomo-029-research 工作树与合成测试 profile。P0-POMO-028 已由 Mac 独立任务使用，本轮不触碰其路径/资源。
- 写集：renderer focus 的 weekgoal、research 纯函数、ResearchGoal/ResearchProgress、HistoryPanel、StatsPanel、QuadrantBoard、FarmField、focus.css；对应测试/runner；本卡、验收、CHANGELOG、既有版本文件。禁止真实凭证/记录/飞书写入、用户 App 安装重启、根共享控制、新依赖、分类或同步协议变更。
- 四源预检：① 分类真相为 recordCategory（历史颜色覆盖优先），任务用 projectType；现有周目标以北京时间周一为界，默认60且覆盖仅该周；复用这些口径。② 项目自有 UI/聚合，不改变第三方运行语义，不适用额外第三方调研。③ 搜索 focus/weekgoal、classification、week、scripts 和既有 Learning 结论；复用存储校验、统计、静音隐藏桌面 runner，无新机制教训。④ weekgoal/week 单元和 category-review/portrait 桌面验收提供回归基线。
- 默认科研目标40，仅本周覆盖；总目标独立不变。科研数依据已保存完成数，不由时长折算或标题猜测；分类修正后随记录重算。四象限内科研优先，稳定保留同类顺序，不跨象限。科研视觉有文字标识，农场红果描边突出，统计展示最近8周真实收获与投入天数，当前周明确未结束。
- 正反验收：科研计入/其他与未保存不计入；改本周目标不改历史和其他周/总目标；科研排序不跨象限、不阻止非科研选择；图表零值与当前周清楚、无虚构连胜；小屏目标可访问、任务详情/专注/历史仍可用。静音隐藏合成 renderer 与逻辑回归，不操作真实数据。
- 无子 Agent/长期后台；本轮120分钟时间盒，同因未知失败两次停止对应尝试；开工/提交/发布前检查远端与写集。回滚独立提交；新增独立科研目标存储键无需迁移。Learning none：现有分类、聚合与 UI 能力的局部复用，无新的跨任务工程机制。

- 发布前黄灯复核：远端新增 Mac 独立发布4个提交至4b976a40534f87f1134cc3fbc5c44d1d88d3bdd9；审查路径无本轮功能写集冲突，Windows运行分支未变。显式 fast-forward 纳入该基线，保留Mac版本表达式，重跑构建/逻辑/桌面。非强制、不重写历史。
