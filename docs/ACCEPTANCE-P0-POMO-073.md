# P0-POMO-073 小时与后推验收

IN_PROGRESS；目标/四源/写集/授权/回滚见TASK-P0-POMO-073.md，用户最新要求覆盖072未来固定参考策略。journeyActualTimes仍提供真实起点；新纯journeyTimeline按最近实际阶段与模板的非负延迟后推未开始的参考点，原无时间阶段仅在周围已知锚点间依槽位置插算内部基准。若实际专注/休息结束更晚，先推迟下一参考点再保留后面间隔；原生active的原计划结束提供预计下限。无actual时原参考不变；不改模板/顺序/绑定/记录/revision。角标只显示小时，跨午夜24/次日1等，title提供精确时间及actual/estimate/reference语义，单槽终点优先沿用。memo只依赖原plan/records/restLog与active身份、开始/计划时长/状态/来源，无elapsed秒级依赖、新进程/网络/存储/轮询。

artifacts/p073-journey-unit.txt共22/22 PASS：原journey/templates及新增截图相同14:10/16:17/19:48实际阶段，未来19/21/23变22:48/次日00:48/次日02:48，显示14/16/19/22/24/次日2；实际结束延长至23:30则未来23:30/次日01:30；实际休息至次日00:15则后推并保留间隔。默认未填时间段由12/20间基准16推算延迟，未来23:48；提前开始不提前模板，无进度仍12/24，错误日/来源无影响，计划/记录JSON不变，重复投影一致。

p073-build-working.txt成功；p073-journey-working.txt原真实Electron plan/resume/times三进程PASS，隐藏静音、随机profile、外部业务写入0：只见小时14，hover14:07/修改后14:17，未来参考12推至18但模板8保持；单槽末端小时15、原生暂停未绑定时24及hover14:07、plan/active不因显示变动；截图相同五段实际14/16/19后显示22/24/次日2，hover“预计开始22:48”、模板仍10/14/16/19/21，明日8且原records不变；既有模板编辑/拖动/休息/计时/跨日/冷启/坏数据保护仍通。

首轮独立review_journey_times审23ab940并重跑22/22 PASS，发现无进度分支P2：合法非单调模板末段21、end20时，终点仍被reference更新的floor推为21，违背未开始原参考不变。原只读复现/回执p073-independent-review-first.txt。已仅在hasProgress时约束终点floor，无进度直接原endHour；现有纯函数新增end20/0不变断言，22/22仍PASS。尚未打包111，不生成中间发行或更换资产。

修正复核、最终同源干净包、本机准备及真实110→111公开更新链待补。Learning-Review: none - 自有只读预测复用原完成/日期来源和已验发行链；局部无进度分支边界无新跨任务教训。
