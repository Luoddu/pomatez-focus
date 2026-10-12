# P0-POMO-057 标题拖动与紧凑右栏验收

部分确认：实现/正反测试已完成，冻结独立复核、最终包源与公开更新链待补。授权/四处预检/写集/回滚引用TASK-P0-POMO-057.md；根仓不写，用户profile/真实飞书无读取或写入。固定React16.14.0/@types DragEvent index.d.ts1172、1496/1498，既有TodayJourney525原生dragStart/drop路径复用，不新增依赖/进程/定时器。

boardLayout只保存version/scope/order稳定ID及quadrant枚举，无任务标题、计划/历史副本。raw任务保持唯一来源，现有完成/quick队列先投影，之后薄应用看板偏好；group整体移动，当前活动/记录未传给偏好函数且不改。没有手动顺序时原researchFirst默认保留，已调顺序优先。sourceKey和local隔离，非法/重复/过长/错误枚举拒，unknown/source/临时拖动拒而有效同/跨象限仍通；save先写并精确回读，失败不推进UI。成功写入通知本组件版本失效；useMemo依赖真实任务/队列/来源/安排版本，tick不重读存储/排序。

右栏right-col间距16→12，side-section12→8，rest-calendar-group18→14，scientific-rest8→6；字体/列宽/象限比例规则不变。标题button原生draggable抓手，仅内部ref携scope/key；蓝落点线/空卡高亮不占空间，external drop忽略、dragEnd清理。单击原TaskTitle详情行为保留。

p057-unit.txt 6项纯正反；p057-all.txt全量344/344包含顺序前/后、research默认、整个group信用/plan/已收、持久回读/刷新新任务、错误来源投影不重排/改象限、source与local分离、schema/存储失败及有效路径。p057-desktop.txt与p057-desktop-write.json实际main/IPC/生产渲染器6组：title DragEvents向上/下、跨有任务和空象限、done组保留、外部drop/取消/保存quota拒、正常保存、刷新仍在、真实设置configure流程（无写合成桩）来源切换/旧drag失效、返回原来源恢复、详情单击、左右列矩形宽度不变、启动选中原planId任务且使用新象限/既有saved记录不改。p057-desktop-restore.json冷进程重启保留active task ID/plan/新象限；结束放弃后仍显示持久安排（1组）。所有测试hidden/muted随机隔离profile，externalWrites0、realProfileWrites0。

测试分类：ES5目标不支持Map/Set展开，采用Array.from等价路径，未改编译目标；偏好读取memo的成功写入版本依赖加精确lint说明。初始任务显示但状态回读未完时drag暂禁，fixture等待就绪；fixture函数回传不能结构克隆，改void返回。来源切换应走设置configure刷新，不放宽生成按钮已有来源门禁。隐藏合成器截图先capture唤醒再取最终图，p057-board-preview.png目视复核；这些fixture限制不改用户运行生命周期。

Learning none：本次复用原生拖放、薄投影/持久偏好和既有不可变发布；上述编译/合成fixture问题有常规精确修正，无新的跨任务产品/权限机制。独立复核若有候选必须先处置，再封版。源码显式revert本卡写集可恢复原默认排序；忽略独立偏好key不影响任务/统计/计时，公开用新版本不替换91资产。
