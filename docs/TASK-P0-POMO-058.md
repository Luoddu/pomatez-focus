# P0-POMO-058 有效番茄比例与竖屏概览
状态：DONE（实现、正式构建、推送、Windows preview.94发布及旧93更新发现均PASS）；唯一状态源本卡；负责人Codex，本模块不接入澄行根控制面。
授权：2026-10-14用户要求按项目类别折算，明确15目标按有效番茄14尚差1；追加竖屏布局，折算日显示今日/有效双数。
固定基线：GitHub API确认公开主线fbae4a769a0f1b7b586a585e35af0f608804fc4a，原生Git网络不可达；官方tarball SHA256ff78676d7f9b8ee222b3694526986e296064e43b0f9c0bc884c3af920e4a6463。本机preview93安装commit26524e7a。开发于独立快照，旧工作树/用户profile不写。
目标：本机设置按科研/项目/长线/软件/个人/杂事/未分类0–1两位小数比例，默认均1确保旧行为，提供杂事0.6便捷设置；保存后按当前设置重算历史，只改变有效目标/累计里程碑和科学专注达标判断，原记录整数count、时长、云端明细、农场原始果实和统计趋势不改。科学专注桥增可选effectiveCount，兼容旧整数completedCount。
允许写：app/renderer/src/focus/weights.js与.d.ts、components/WeightSettings.tsx、SettingsPanel.tsx、FocusApp.tsx、HistoryPanel.tsx、ResearchGoal.tsx、ScientificRest.tsx、restProgress.ts、focus.css、app/electron/src/focus/activitywatch.ts及命中browserControl仅达标字段；相关tests、docs/TASK-P0-POMO-058.md和ACCEPTANCE-P0-POMO-058.md；测试产物ignored artifacts及隔离profile。若需要version文件/发布，只在Git完整同步校验恢复后进行。
禁止：真实飞书读写/凭证/生产profile/旧工作树/根共享控制面/强推/改写历史/替换现有安装/修改扩展采集规则。比例本机保存，不新建飞书字段或任务表，UI标明其他电脑需设置相同比例。
四源：现状preview93、源码fbae目标原始整数，本机/其他旧目录保全；官方固定版React16/TS4.9沿用既有useState/localStorage无第三方新运行语义；helper为classification.recordCategory、week beijingWeekStart、weekgoal/research/restProgress；验收为tests/restProgress、activitywatch、portrait-desktop和category-review，定向Learning无比例命中。
正反验收：8科研+10杂事0.6=14，目标15未达；全1=原18达；未保存计时不计、0比例不删记录、不逐记录舍入、未知分类不冒充杂事；非法/损坏/写失败显式错误不静默应用；今日没折算只单数，有折算双数；竖屏月历独立行，今日数/时长/科学专注紧凑组，旅程下一整行，宽屏保持原排版；真实时间/计时/四象限正常，原明细/时长不变；隔离桌面不连真实Feishu/AW、不出窗口/声音。
回滚：丢弃本隔离修改或返回原安装；恢复系数全1；原记录无需迁移/修复。行为预算本轮一个工作周期；2个有界Agent允许，一个实现HistoryPanel布局和今日双数/ResearchGoal，仅写明确组件/CSS，其一独立只读review全部改动与证据，无根写入；各写集不重叠。
Git：源码快照允许形成独立本地受治理快照检查点，来源SHA不伪称本地原始Git祖先；只使用模块task-commit显式文件。Git远端不可达期间不打包/发布；完成未受影响实现/测试并记录门禁。Learning none：沿用原始量/派生视图原则，不记录新的未经验证教训。

范围补记：累计进度涉及QuadrantBoard/FarmField/FarmProgress；科学提醒文案涉及restReminderWindow；月历周达标徽章必须同步有效口径，允许HeatmapCalendar保持每日原始格数、扩大半年视图并填充竖屏宽度。新增effective-progress-desktop验证真实main/preload/App。同期全renderer类型检查暴露基线i18next25/TS4.9不匹配，不顺手改依赖；focused树类型检查0诊断，真实组件隔离fixture可构建，正式CRA与发布门禁仍待恢复。


用户最终布局（覆盖前述全宽月历）：右列独占番茄月历，左列依次今日两数/科学专注/今日旅程，并排等宽；390px窄屏仍可达，月历允许内部横滚。图示和几何断言均按此验收。


任务ID纠正：官方快照已有051图标任务，登记阶段误用了051。已完整恢复官方051卡/验收不改；已有本地提交保留审计、不改写历史。此功能此后唯一ID为058，仅本地快照，不向公开主线混入错误任务历史。

最终证据：冻结修复f8c36aa获独立PASS，两P2关闭；351逻辑/17布局/完整main-preload-App桥接PASS。不得将此状态当作已安装或已发布。

最新显示优先级：2026-10-14用户明确优先有效番茄。有折算的今日卡主数/标签为有效番茄，原始今日番茄为次要小字，达标颜色按有效数量；无折算仍单独显示今日番茄。增量基线9f50e8b；无重叠活动写者，沿用隔离fixture资源，绿灯继续。

2026-10-14发行续卡：用户明确要求解决Git/构建并发布App可升级安装版。允许同模块新建公开主线完整clone pomatez-focus-release058、移植22文件补丁（不推synthetic历史）、固定兼容国际化依赖及yarn.lock、版本文件、针对性测试/验收/发行脚本；公开目标唯一Luoddu/pomatez-focus codex/feishu-focus和新preview不可变发行。Git当前原生ls-remote已成功且API相同fbae4a7，需fetch/check:sync证明祖先；首次失败属于旧受限网络环境，不改全局代理/DNS。TS4.9无法解析i18next25 const类型参数已冻结原始日志；沿用CRA5/TS4.9，核验官方兼容版本后仅收敛国际化依赖，禁止跳过类型检查。沿用四源预检和2位已授权Agent；Heisenberg只读复核固定变更/正式构建/发行链证据。预算本轮一个工作周期；不覆盖用户App/profile/凭证，不修改系统服务。发布前源码/构建/旧版更新发现/五资产核对，未知提交结果先回读不重放。回滚保留旧93发行与安装，失败草稿保留证据不替换已有资产。根共享控制原文已补读，隔离模块不接入根服务，不修改根治理文件。

兼容修复固定来源：i18next v22.5.1 package.json声明typescript^4.9.3；react-i18next v12.3.1 package.json测试react16.14/typescript4.6.2，peer i18next>=19/react>=16.8，MIT。固定tag官方raw已核对，保留CRA5/TS4.9，回归原国际化调用。release058 clone基线fbae4a7，完整Gitfetch成功，当前进程使用既有系统代理；旧snapshot修改不合并历史。

兼容修复补充允许i18n/index.ts：固定i18next22的CustomTypeOptions/returnNull公开扩展，运行时returnNull:false与类型一致，确保label/placeholder仍为字符串。共享shareables缺失只是未运行官方rollup前置，按build-focus既有顺序先构建，不改第三方包。

最终交付：固定发行源码4aa55c6d7cdb193a245cc8786deda91193eb5217；preview94公开非draft prerelease/非Latest，五资产校验和93→94实际更新器通过，独立复核PASS。用户App尚未自动升级。后续仅追加验收文档，tag继续指向固定发行源码。Learning none，原因见验收。
