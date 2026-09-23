# P0-POMO-017 项目类型番茄色

- 状态：REVIEW；角色：番茄农场隔离模块实现者。
- 基线：公开主线 `origin/codex/feishu-focus` / `4b75f094ada91e9957a5008d4e4d67937f989059`（preview.50）；工作树 `task/p0-pomo-017-project-colors`。
- 目标：番茄色按任务所属项目的「项目类型」显示，科研红、项目交付黄、长线绿、短线紫、个人蓝、杂事灰；四象限继续用于任务排布。现有旧番茄按当前分类归类一次，此后固定；新番茄保存收获时分类。
- 范围：`app/electron/src/focus/{feishu.ts,history.ts,service.ts}`、`app/electron/src/{main.ts,preload.ts}`、`app/renderer/src/focus/{session.ts,cloud.ts,taskSnapshot.ts,week.ts,FocusApp.tsx,focus.css,components/FocusTimer.tsx,components/HistoryPanel.tsx,components/FarmField.tsx,components/QuadrantBoard.tsx}`、相应 `tests/`、本卡和验收回执；版本准备只涉及仓库既有版本展示位。独占该工作树及其构建/测试产物。
- 禁止：新建飞书表、手改跨端 JSON、复制凭证或运行目录、改变分钟/完成状态/记录数量、覆盖其他分支未提交变更、强推或复用既有 Release。
- 四处自检：①当前 Feishu.today 只连到任务并解析象限，历史快照只存象限；只读实表确认「任务.所属项目 → 项目.项目类型」六类均有记录。②复用固定版 Bitable 列出字段/记录 API 与现有 `linkedRecordIds`；不升级第三方库。③复用现有 `historyRecord` 白名单、`mergeCloudRecords`、`week.ts` 计色和 App 加密连接；未命中可直接复用的 Learning。④同类验收在 `tests/{feishu,history,cloud,week,task-snapshot}.test.*` 及桌面隔离检查。
- 正向验收：六类映射、旧记录一次归类后固定、三机同步后同色，农场/果筐/记录/计时/计划番茄色一致；四象限布局和原同步仍正常。
- 反向验收：无项目/多项目/未知类别不猜；不更改分钟、完成状态、任务关联或记录数量；重复同步不重复累计；旧版记录仍可读；正在计时不被打断。
- 步骤：先核实字段关联与现有数据形状；模拟数据实现和回归；只读实表核验；有界 App 管理回填、回读；准备新预览版本、打包并校验来源；非强推和发布新 Release；隔离验证更新器，安全安装与回滚。
- 回滚：代码在独立分支；发布物保留前一版；回填只新增可选颜色元数据，逐行回读，不改历史时间与完成字段。出现关联不明、字段不符或回读冲突即停止相应写入。
- 已验证：只读实表有 89 条共享专注明细、缺失 0，旧记录 89 条未带分类；未读出任务名称或凭证。模拟数据测试 203/203 通过，桌面 21 项及竖屏 13 项通过；重复分类不增加记录、分钟或完成状态。真实旧记录回填与跨机显示待新版发布、手动同步和回读。
- Learning 判断：本轮改变的是本模块特有的显示与快照协议，没有可跨任务复用的新教训；拒绝新增根 Learning 条目。
