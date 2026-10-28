# P0-POMO-075 静默同步与专注中补记验收

REVIEW准备；目标/四源/边界/正反/回滚见TASK-P0-POMO-075.md，基线35874cb，单worktree任务分支。静态复现113缺口：edit/color均叫记录修改，只有edit能放弃；个人截图不足以读取其具体kind，不冒称已读个人数据。补齐failed color并明确标签，恢复副本/来源/运行中/非修改拒绝保护不变，未自动删除实际积压。

HarvestSync变成标题内的小span，无左下固定卡片、果筐或CSS动画；busy有百分比/阶段title，done立即返回null，error小字状态。自动同步无成功/失败toast，明确手动请求按source记住至实际处理并仍通知；原队列/发送时机不改。移除原3秒完成浮层清理timer，无新增timer或轮询。

CounterContext.addManual不再无条件拒绝active；新补记默认结束在当前专注开始，表单和计时入口检查重叠，拒绝时不关表单/不清输入。保存仅upsert记录，active本体不改，原计时循环继续。未新增历史之间的重叠规则，不改云记录格式。

p075-unit-full.txt 30/30 PASS（editQueue/quietSync/session/manual），包含failed color清理与pending color保护。p075-build-working.txt成功；p075-desktop-working.txt真实隐藏静音Electron main/preload/生产页，四进程write/resume/record/ui全部通过：原5分钟/串行/手动/source分类/恢复及failed edit清理仍通；新增1440与480宽标题badge<115x30、无横溢出、position relative/no animation/no transition、无旧浮层节点、自动完成立即卸载且无toast。p075-inline-preview.png为合成宽屏实际截图，已人工查看同步85%在标题右侧，未改变左右列布局比例。

UI同进程先开始真实active，再补过去一条：id/task/status保持、elapsed继续；暂停后重叠输入被拒且表单保留，调为更早区间后保存成功，paused active深相等。手动同步两条成功并给结果，active仍深相等。右键历史改色→合成同网络错误→颜色修改行按钮可见→放弃，备份entry一致、原record/current active均深相等，recolor仅调用一次、其他队列不动。个人App未读取/操作、0真实云写；截图不是个人业务数据。

待冻结独立复核、最终干净构建/本机包/公开更新链；未据局部测试宣称DONE。Learning-Review none：本轮为既有恢复保护、计时状态和显示语义局部调整，没有已验证的新跨任务教训候选。
