# P0-POMO-077 同步失败可见性与安全恢复

## 已验证范围

四源、授权、基线、允许写集和回滚见TASK-P0-POMO-077.md。115原编译产物在隐藏静音完整main/preload/renderer中复现两缺陷：合成写回错误后UI只有“同步未完成”且没有原因；后续另一条成功使标签消失，但原ID仍pending并被防重放Set跳过。证据p077-t0.txt/p077-t0.json。第一轮夹具未选择计划任务、走free归档未调用sync，精确定位后显式选任务；不是产品修补或真实云端重试。

SyncFailures沿用原revision防重放key并保存该次错误；按source和当前pending版本投影，明确手动重试仅清本source，cloudSynced或被新revision替代后移除旧诊断。未新建持久队列/计时器/网络重试。FocusApp结束和外层catch保留具体失败步骤/原因，其他记录成功或回读不会将仍失败的原记录报成成功；旧source的迟到进度不显示在新source。HarvestSync用原标题小标签显示阶段，error使用默认收起的原生details/summary显式打开详情，自动仍无toast/浮层动画。未改主进程Feishu、网络、校验、权限、幂等或冲突保护。

## 验证

- p077-build-working.txt构建成功。p077-unit.txt原plan/feishu及新SyncFailures共58/58 PASS：重复同ID不累加、失败保留原内容、人工冲突保护仍挡、正常写入仍通；新诊断覆盖来源隔离/明确重试/旧revision失效/只读不清错。
- p077-recovery-working.txt真实main/preload/生产页面，随机profile，隐藏静音、真实云写0：自动失败详情含具体任务/时间/步骤/异常，默认收起且无toast；另条成功后原错误仍在、原ID不自动重放；明确重试同ID只归档一次，两记录保留、paused active和segments深相等；history读取失败不撤回成功回执、手动恢复不再写成功记录；窄列详情无横溢出。p077-details-preview.png为合成UI预览，已查看。
- p077-quiet-regression.txt原write/resume/record/ui/ui-resume五进程全部PASS：原5分钟/手动/来源分类/在途延期、冷恢复、专注中补记、失败color/edit恢复副本不变。首次旧fixture硬编码10/28而当前10/30，跨日guard清板导致等不到任务；改测试base为当前本地日07:00，产品跨日逻辑未改；有界一次修正后完整回归通过。

## 限制与当前个人状态

个人09:23–09:55记录的首次云端拒绝原因尚unknown；旧版没有持久化该异常，现场读取未得到原文，现有一致性备份日期早于该记录。没有读个人LevelDB、解密凭证、调用真实业务API或删记录，不冒称已同步成功。用户随后要求解除黄色监听外框，已reset桌面读取会话；之后不再读取或控制个人App。新版先提供可见原错误及安全重试，用户自主加载后才可取得具体原因并继续针对性修复。

Learning-Review: none；本轮是既有失败revision保护的诊断信息和UI修补，个人失败根因尚未查明，不能把假设记录为可复用教训。

独立复核、冻结版本与本地/公开发行证据待补；本任务个人积压恢复尚未完成。
