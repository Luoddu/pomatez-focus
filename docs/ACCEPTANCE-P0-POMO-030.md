# P0-POMO-030 科研视觉简化验收

- REVIEW；基线347574bed2fc082d1d499c56e544287fab35cd70。四源/授权/写集/回滚见TASK-P0-POMO-030.md。
- 已移除四象限科研标识、左侧边线及附属缩进，保留原浅红渐变背景；移除农场科研数量，不动分类、排序、统计和存储。
- build-focus通过；逻辑230/230；已有research-desktop八组检查通过，补充断言badge/count不存在、border-left为0且渐变存在；科研和普通任务可选、普通任务计时、目标重载与小屏/竖屏仍通。核心桌面与完整重启结果见同轮日志。
- 本地证据artifacts/style-build.log、style-logic.log、style-desktop.log、style-core-desktop.log。所有桌面测试静音隐藏、独立合成profile，不改真实飞书或用户App。
- Learning none：用户指定的局部展示删减，无可复用的新机制。独立复核未执行；发布验证待补。回滚本次提交，无数据迁移。
