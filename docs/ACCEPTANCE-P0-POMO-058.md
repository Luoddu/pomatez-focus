# P0-POMO-058 有效番茄与竖屏并排验收
实现已独立复核PASS；完整更新发布 BLOCKED。唯一状态源 TASK-P0-POMO-058.md，不修改根路线图。

- 来源：官方公开主线API快照fbae4a769a0f1b7b586a585e35af0f608804fc4a，tarball SHA256 ff78676d7f9b8ee222b3694526986e296064e43b0f9c0bc884c3af920e4a6463。原文件快照与生成patch可逐文件核对；本地Git是隔离检查点，不声称保留公开祖先。
- 功能：设置7类0–1两位比例，默认全1，可便捷设杂事0.6。整数百分之一累加，原保存记录completedCount、秒数、颜色和云端字段均不变。有效数用于周/科研目标、累计小旗、月历周达标与科学专注目标；月历每日/明细/时长保持实际值。未知类别独立归未分类。本机保存，其他机器需相同设置。
- 用户最终布局：竖屏/900px以下，右列月历跨三行；左列两张今日卡、科学专注、今日旅程。今日有折扣才显示有效数。横屏保持原结构；仅一个ScientificRest，无新采集/计时循环。月历内部细滚动条可查看旧周。
- 逻辑：artifacts/effective-all-tests.txt最终351/351；新增损坏/特殊原型类别回归见effective-weight-final-tests.txt 6/6；activitywatch有效14/原18桥、达标15、非法输入不破坏状态、旧bridge兼容通过。
- 界面：artifacts/effective-layout-tests.txt 17/17，覆盖1080×1840、900×700、720×1000、390×844、1600×900、零/小数比例、调整比例不回放里程碑和目标庆祝、设置保存/全1恢复、全部入口可达、无外部请求/可见窗口。effective-portrait.png与effective-settings.png是合成数据图；不代表当前用户App已更新。
- 完整桥接：artifacts/effective-bridge-tests.txt，真实main/preload/App+CounterContext+SettingsPanel，保存杂事0.6得到原18/有效14、科学专注收到同一数，保存全1恢复单数；原记录ID/count/seconds保持；普通主界面损坏比例有alert、再次保存清除alert。隐藏隔离profile，阻断所有HTTP/HTTPS，不访问真实Feishu/AW。
- 类型：electron项目成功；FocusApp及全部实际引用focus树 TypeScript4.9零诊断。未改动官方基线的全renderer类型检查也失败（i18next25定义含TS5语法），原始证据effective-renderer-baseline-errors.txt；不能把esbuild测试fixture视作正式CRA发布构建。
- 修复复核：首轮独立review指出普通界面缺错误提示与原型类别NaN两个P2；已加所有focus-app分支的weight-config-error、类别白名单，并新增上述负例。同一reviewer已对冻结f8c36aa最终复核PASS，两P2关闭，无剩余实现阻断；完整发行保持BLOCKED。
- 审计：最初误用已存在051任务号，已恢复官方051任务卡及其既有验收，未改写此前本地检查点历史；本功能独立058卡。未来公开提交须从官方主线移植patch，禁止把错误编号/私有初始历史推送。
- 发布/安装：Git到github.com连接重置/443不可达，官方API可读。没有伪造祖先/跳过发布门禁，没有Push/新tag/Release/安装或重启用户App。当前安装preview.93未修改。恢复源码同步并解决基线完整构建后，才能形成Windows可更新包并验更新器。
- 回滚：旧运行App/真实数据未改变；比例保存可恢复全1。隔离修改可从官方固定快照重建。Learning none：验证的是当前派生统计与响应式布局，不新增跨任务教训或长期Memory。


2026-10-14增量验收：有折算时今日卡主数为有效14、标签有效番茄，小字今日番茄18；小数4.64不取整，成就颜色按4.64且不沿用原18的高档；全1恢复今日18单数。17布局测试PASS、真实main/preload/App桥接PASS、focused renderer类型0诊断；两列截图已目视核对。逻辑未改变，沿用351逻辑PASS，不重复全套。Learning none - 仅既有派生值显示优先级，无新的可跨任务工程教训。独立增量复核PASS（冻结d704d482，reviewer Heisenberg）；独立核对4.64/4.99无等级、5/9.99 mid、10/14 high，focused TS 0诊断、原始桌面日志与截图。发行门禁不变。

## 正式主线发行续验（2026-10-14）

授权：用户明确修复Git和构建、推送发布。实现工作树release058来自原生完整clone，基线公开fbae4a7，git fetch origin --tags及实时check:sync成功。旧synthetic历史未合并，按逐文件补丁移植；所有旧安装/用户记录不写。

Git根因：无显式进程代理的大数据clone连接reset，现有系统代理桥接到当前进程后同官方clone成功；沿用已有P0-NET-001 helper，不改全局代理/凭证/DNS。第三方官方Git http.proxy环境接口已由P0-NET-001固定原文核验。

构建根因：i18next25/React-i18next16类型参数使用TS5语法，仓库CRA5/TS4.9解析失败。固定官方i18next[v22.5.1](https://github.com/i18next/i18next/blob/v22.5.1/package.json)使用TS^4.9.3；[react-i18next v12.3.1](https://github.com/i18next/react-i18next/blob/v12.3.1/package.json)测试React16.14/TS4.6且peer React>=16.8/i18next>=19，均MIT。只固定兼容国际化依赖和锁文件，不升级框架/关类型检查。固定包index.d.ts 12–38/485/863提供CustomTypeOptions/returnNull公开选项；运行时false与类型一致。完整renderer tsc --noEmit PASS；真实初始化回归确认中文任务列表、英文fallback、null值不返回null。shareables先按官方Rollup前置生成。首次正式CRA揭示weights import位于函数后，已移到imports，相关ESLint PASS。

四源：当前源码/精确失败见上述；官方固定tag和锁定包见artifacts/official-i18n/manifest.json；复用系统代理helper、repo-sync、版本/构建/打包脚本，命中Learning草稿可见tag风险；同类portrait/updater/安装链验收沿用，按新布局调整几何断言且保留功能/负例。正式build/桌面/发行复核继续中。Learning判断none：本次为已有公开兼容和原生代理接口的恢复，暂无新可跨任务教训。

正式clone检查点：352/352逻辑测试PASS（初次缺静态资源，按官方复制步骤补齐后通过）；完整renderer TypeScript PASS；相关ESLint PASS；国际化真实init回归PASS。依赖和迁移只读独立复核PASS，正式CRA构建/桌面/发行仍待本检查点之后验收。
