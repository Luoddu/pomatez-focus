# P0-POMO-006 — 跨机版本整合与发布防错

状态：DONE。负责人：Codex；本卡是独立番茄模块的任务状态源。已发布 v0.1.0-preview.26，源码 ac3a0385f33b74d916e35891ea261ead8d19f59a；验收见 ACCEPTANCE-integration.md。

## 授权与范围

2026-09-15 用户明确要求接力已完成的 Kimi 工作，检查既有修改、整合、推送并防止再次漏合。允许公开源码与安装包发布到既有 Luoddu/pomatez-focus；不操作飞书真实数据、不读取凭证正文、不重启用户应用、不改根仓、不中断其他模块。

基线：公开分支 codex/feishu-focus@44a77b4（preview.24）；本地交付 62ef659；共同代码基线 c836a8a。独立整合分支 task/p0-pomo-006-integrate；整合期间原工作树保持不变，交付后在干净状态切回跟踪公开主线的 codex/feishu-focus。允许 app/、scripts/、tests/ 中两线相关代码、版本、构建脚本，以及本卡/验收/公开开发说明/AGENTS.md。排除旧私人开发历史、私人截图和环境配置；使用公开基线上的逐文件三方整合，记录源 commit，避免将未公开历史作为 merge parent 上传。

独占资源：本任务工作树和 artifacts 下测试 profile、构建输出；无生产进程、端口、数据库租约。开工、提交、推送前重新核对本地状态与实时远端 SHA；远端前进只暂停发布并先整合。无子 Agent、定时或长期后台；未知同因两次失败先定位，不盲重试。

## 四处预检与官方路径

1. 已验证：远端 44a77b4 比本地缓存 c836a8a 多 5 个提交，本地 62ef659 包含生成进度、日期并集、提示音与版本取号，但缺少远端竖屏和每日记录展示。Kimi 交付后原工作区干净。
2. Git 2.53.0.windows.3，按官方 merge-file 三方合并、merge-base --is-ancestor、ls-remote 和非强制 push 路径实现；不升级 Electron 34.5.8 或现有依赖。Git merge-base 手册 2.43.0 的 --is-ancestor 段（后续至 2.53 无变动）定义包含关系返回码；固定版本官方文档原文见 https://github.com/git/git/tree/v2.53.0/Documentation 。不引入平行版本服务。
3. 复用 next-version.cjs、package-focus.cjs、隐藏进程 helper、已有 Git task-commit 预扫；既有 Learning 中固定 blob 优先于物化换行与来源义务审查适用。原版本脚本仅扫本地并硬编码地板，不能证明包含远端；补实时来源检查。
4. 验收复用 tests/session、feishu、plan、generate、cloud、history、sound、version 与 desktop/portrait/manual-sync/update；对照 docs/ACCEPTANCE-today-union.md、ACCEPTANCE-multidevice.md、公开 preview.24 测试。

## 验收与回滚

- 竖屏/星期/每日汇总保持；新增生成进度、近日行动或今日日期并集、原行回写、自由番茄、提示音与跨机同步保持，所有适用回归通过。
- 远端基线缺失、网络不可验证、工作区脏、版本冲突时挡住发布打包；最新基线、干净源码、唯一版本仍正常构建打包。推送前再次验证；非强制推送防止竞争覆盖。
- 产物记录源码 SHA、版本与 hash；公开源码不含私人新增内容；推送后回读分支/标签与发布资产。
- 回滚：旧公开 preview.24 与本地 62ef659 保留，不 reset/force；用户数据不迁移。

Learning 判断随验收记录；根共享 Learning 不在本模块写集。证据最终集中于 ACCEPTANCE-integration.md。

发布防错补充（同一用户授权范围）：已读 GitHub Branch Protection REST 官方说明，确认公开主线此前 protected=false。仅对既有 codex/feishu-focus 启用禁止 force push/删除并对管理员生效；不要求新增 PR 审批、不增加身份权限，不改变其他分支。回读配置并以正常快进文档推送验证合法工作仍可进行；不实际尝试破坏性强推。该可逆设置补足其他电脑尚未更新本地 hook 的空档。
