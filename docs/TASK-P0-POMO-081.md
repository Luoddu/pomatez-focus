# P0-POMO-081 本地编辑与任务番茄类型一致

- REVIEW；独立模块状态源本卡，owner/root。用户2026-11-09要求待同步仍能编辑、右键与修改统一、四象限轻量改番茄类型；明确同一任务历史与后续番茄一起变色；追加本地完成立即更新按钮、四象限不显示折算。产品独立复核及定向/全量回归通过，120交付准备中，详见ACCEPTANCE-P0-POMO-081.md。
- 基线556da015560a，公开主线fetch已核对；独立task/p0-pomo-081-local-editing工作树，无重叠写者；根仓只读。允许renderer focus中编辑队列、分类、任务投影、FocusApp、ManualEntry、HistoryPanel、QuadrantBoard及直接相关组件/类型；对应tests与既有隔离运行helper、本卡/验收/DEVELOPMENT/CHANGELOG、版本helper输出。禁止真实飞书测试写入、私人数据、用户App关闭/安装、依赖升级、根共享文件。
- 四源：①基线源码HistoryPanel editingIds禁用、EditQueue.add重复记录拒绝、ManualEntry修改不显示分类；TaskProjectEditor每次远端读取；QuadrantBoard仍显示未同步计划和effectiveTaskProgress折算。②只复用固定既有React/Storage与已验证correctRecord/recolorRecord公开应用接口，不改变第三方API语义；无采用升级Gate。③复用EditQueue、classification、boardLayout、partialTomato、CategorySelect、quietSync以及本地更新helper；Learning发布/隔离命中按原文读取。④edit-queue、quick-edit、partial-tomato、quiet-sync、task-projects验收与隐藏生产窗口测试。
- 验收：未发送编辑可反复修改并合并保留原before、最新after、跨重启恢复；在途或已尝试的意图不可被替换、失败可恢复且不跨来源；右键和修改都可选类型并对同任务历史/后续生效，不改真实项目关系、不影响同名其他任务；本地保存完成隐藏对应待办但部分投入仍能继续，云端回读不重复累计；四象限实际计数，统计折算维持原规则。存储失败不得报告保存成功。
- 预算单次前台120分钟、原授权内一次独立只读review_local_editing复核冻结diff和正反证据，不写产品或再分派；合成profile独占、无后台goal。门禁沿模块AGENTS与根version-control；提交前核对HEAD/status/worktree；未知同根因两次或同类底层修补复发暂停冲突步骤。
- 回滚源码至556da01；保留用户历史/队列/偏好，不迁移真实数据；本地包优先、既有默认发布链，用户自行重启。Learning判断随验收记录。
