# P0-POMO-078 任务项目选择与修改

- 基线 73167fd8c449f947fac4e4a22abcdb8eec6b02a1，公开主线已实时核对，独占分支 task/p0-pomo-078-task-projects 和合成 profile。模块单实现者，根仓不写。
- 用户要求修复待整理事项的所属项目选择，并支持四象限现有任务右键改项目。当前截图是项目请求进行中但下拉仍只显示可选的空归属，实际飞书迟滞原因未知。源码确认每次打开表单才从头读目录，右键目前仅待办番茄有标记完成。复用加载器、Bitable v1 与写锁、原任务和历史模型，暂不归属仍可整理。明确点击保存后更新目标任务关联并回读，发现原归属已变化则保留飞书现值。历史与计时不是本次写集。
- 四源：上述现状；Feishu Bitable v1 官方 app-table-record/update 与 create、FAQ，沿原关联 ID 数组和单行 fields 更新契约，无 SDK 或权限变更；复用 projectCatalog、linkedRecordIds、QuickTaskEntry、现有串行写锁及本地更新 helper；对照 TASK-P0-POMO-032、TASK-P0-POMO-068、quick-edit 和真实 Electron 隔离入口。
- 写集：renderer focus 的 FocusApp、session、focus.css、components/QuickTaskEntry、QuadrantBoard、新 TaskProjectEditor；electron focus 的 feishu/service、main/preload；项目选择直接相关合成测试、版本 helper、CHANGELOG、本卡与验收。只读使用文档和 Git 状态。禁止真实飞书测试写入、私人数据、额外依赖、桌面监听、操作用户 App。
- 正反验收：整理可选实际项目或主动留空；读取中、失败、空目录区分且可重试。现有任务标题和番茄右键可改项目，已完成任务也能改；只更新原任务所属项目、验证回读、不改历史记录，不覆盖不同旧关联或跨来源写入；保留原完成菜单。可回滚源码，不迁移用户数据。独占构建与隔离测试资源，禁止运行旧 App profile；本机包优先、默认发布门禁沿 AGENTS。
- 前台 100 分钟，允许 review_history_append 一次独立只读复核冻结 diff 及正反证据，禁止真实数据、写入或再分派。Learning 随验收判断；发布前再次检查状态和远端。
