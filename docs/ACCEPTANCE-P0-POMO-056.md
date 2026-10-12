# P0-POMO-056 月历显示验收

已验证：四处预检、授权/写集/回滚引用TASK-P0-POMO-056。纯项目CSS/显示class改动，不改weekTotals/目标/计时/数据库。wg-now color inherit；research-goal及met科研色一致；hm-badge-slot row/14px，小LogoIcon按现有cell宽缩放，周总数字仍完整、title保留，达标数字金色。删除原脚注入场动画以保持脚注稳定。

静默实际生产main隔离界面：p056-calendar-visual.json，科研current/goal rgb(173,56,47)、普通周current/goal rgb(107,114,128)，current700/target400；13与22px原格宽下2/38/60/93/94/350等周总数同基线、小金番茄与数字不交叠，total+icon+gap小于列间可用宽；未达标数仍可读、原title详情保留。p056-calendar-preview.png实际隐藏窗口截图已目视复核，只有一行脚注，四象限/概览列布局CSS未改；silence/realProfileWrites0/realRegistryWrites0。旧脚注动画在隐藏窗口的零缩放帧不推进，已识别后先用原生finish确认最终几何，再去掉本次脚注多余入场效果，不改系统或后台生命周期。

现有browser-control-desktop显示断言改为同色与单行；沿原fixture其他检查不扩功能。最终冻结构建/包/公开旧90→91更新链待补。轻风险T1依据how-to-dispatch实现者实际显示自测收口，不新派reviewer。Learning none：局部颜色继承/inline flex修正，不构成新的跨任务工程机制；沿Learning039固定源不可变发布规则。
