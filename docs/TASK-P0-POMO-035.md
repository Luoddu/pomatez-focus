# P0-POMO-035 科学休息 / ActivityWatch 本机接入

- IN_PROGRESS；负责人与上下文负责人 Codex `/root`，角色为隔离模块实施及本任务协调；状态源本卡。2026-10-07 用户明确“好的 开始作战”，按已协商方案实施，可回滚本地 T1；不发布、不 Push、不改其他电脑、根控制面或 ActivityWatch 配置。
- 基线 `bac95785a949fac2a03c81a4bf87d738f16feafa`，公开 preview.68；实读远端同 SHA。旧盘迁移目录只读保全，独立 clone 分支 `task/p0-pomo-035-scientific-rest`。首次 checkout 的换行转换已恢复匹配现有仓设置，工作树干净。
- 目标：月历上方显示紧凑“科学休息”；默认共享每日60分钟、督促开启；环显示剩余，分别显示B站/小红书；原位切换今日/近7日小时分布；超额后每新增5分钟浏览显示标题、一行、睡觉/下一番茄两个按钮。睡觉暂停当前计时并隐藏；已有番茄时回到该番茄。退出停止提醒，隐藏到托盘继续；午夜重置、重启不重弹、重连合并提醒；断连保留最后数值并明确状态。
- 非目标：小窗、本轮统计、用途分类、云端上传、操作系统睡眠、AW fork改动、历史补造、系统服务、自动安装当前用户App。
- 写集：本卡与 `docs/ACCEPTANCE-scientific-rest.md`、`docs/ACTIVITYWATCH.md`；`app/electron/src/focus/activitywatch.ts`、main/preload；`app/renderer/src/focus/components/ScientificRest.tsx`、HistoryPanel、FocusApp、focus.css、focus/types命中API声明；合成 `tests/activitywatch.test.cjs`、`tests/activitywatch-desktop.cjs` 和对应脚本；package.json与electron/package.json、版本文件、CHANGELOG；缺失的本地提交治理脚本/钩子薄复制当前根版本（不覆盖现有 pre-push）、`.gitignore`安全补充。不新增运行依赖、不改飞书接口。
- 必须加载：根AGENTS、context-loading-policy、how-to-dispatch、version-control、ADR-0005、协调包当前原文；模块AGENTS、DEVELOPMENT、本卡；main/preload、HistoryPanel、现有timer/session、desktop测试。条件加载：官方API与固定AW源码、Electron34.5.8声明；涉及身份/外网/跨组件真相源或共享状态时只暂停冲突步骤并升级。无关Paperclip/澄接入和私人参考不加载。
- 四源自检：①当前源码68、AW13.2/Edge watcher0.6.0已运行，现有分类依靠窗口标题会漏记；真实09:45–10:05以原始记录复算，不靠估计补数。②官方：AW13.2官方子模块aw-server `b4ad07509067defec9a2a958ea9d58f3ed220c88`，安装sourcemap冻结webui `291da6f` 的 queries.ts L87–94 AFK/audible、L203–246 Edge前台交集；WebWatcher0.6.0 `2e70779b09733afd25f7bbeb7f188ae1938f4f42`；仅官方REST buckets/events/query只读取数，不替换采集器。③根Learning/scripts/integrations定向搜索未找到AW计数helper；复用现有IPC sender验证、timer.pause/begin、关闭隐藏机制和当前提交安全helper。④复用desktop/restart、portrait、category-review、research/companion回归；新合成案例涵盖计数和持久提醒。
- Adopt/Adapt：采用AW官方记录与REST、现有Electron/React；薄适配前台浏览+非AFK或可听音频的合并区间、聚合两个站点；新增的仅是用户额度/提醒状态与UI，不建立第二原始记录库。实际版本与官方证据索引记验收文档。
- 资源与预算：本 clone 独占写入；旧仓及根均只读（已授权fetch仅更新旧仓remote refs）；只读127.0.0.1:5600，不启新AW实例。30秒有界单请求轮询、失败退避，退出清理；测试独立临时profile、隐藏静音。一个工作周期内纵切；不新增计划任务。允许1个只读独立reviewer子任务，输入冻结diff/执行卡/测试/官方证据，输出问题及原始行证据，禁止写文件和控制运行资源；其复核时间盒20分钟，不再派子Agent。只读瞬时故障一次重试；同因两次且未知停止对应步骤，不盲重放外部写入。
- 并发复核：首次写/工程检查点/提交分别 status、diff baseline与公开ref、worktree、执行卡复核；本独立clone无其他写者，接口只在本模块，绿灯。已迁移旧worktree绝对路径错误不修。未配置NAS根的进程环境已查；运行数据仅临时profile及既有App用户目录，不写同步源码根。
- 验收正反成对：网址精确域匹配能计入、伪域/其他app后台/AFK静音不计；有声前台无操作仍计、重叠记录不重复；跨午夜正确、前一日不串；剩余额度/原位统计可用、断连不伪0/不弹；累计5分钟步进提醒、墙钟等待不追加；重启不重复、重連仅一次；睡觉暂停隐藏、计时与恢复仍通；下一番茄不并发、现有选择和休息流可用；窄屏可达且卡片不大于月历区域、计时/同步回归通过。真实AW只读纵切和真实Electron生产UI必须验，不以单元结果代替。
- 证据与交付：源码本地原子提交、测试与脱敏验收、固定HEAD开发/测试包；不写真实网址/标题、凭证或私人截图到Git。打包先version:prepare、check:sync、干净HEAD构建。公开仓已有origin是用户此前获准的模块事实，不增加远端；根handoff的remote_configured约束如命中只记录模块发布模型差异，不改根Gate。
- 回滚：停止测试/开发实例，回到preview.68；旧源码和用户历史不修改；新增aw-rest-settings仅保存额度/开关/提醒阈值，旧版忽略。工程检查点记录Learning判断，已有模式复用不自造新条目；独立review回读事实后收口。
- 验收写集补充：`tests/portrait-desktop.cjs` 仅更新新增月历分组后的直接子节点选择器，保持原有并排/通栏验收条件；不修改其他既有测试逻辑。

- 检查点 `2bf3b86` 已冻结交 `/root/review_scientific_rest` 只读复核。版本准备实查公开最大68，本地测试版69；自动版本脚本仅修改electron/package.json与SettingsPanel版本展示。独立依赖副本用于构建，不写旧工作树的node_modules。额外允许仅版本展示文件与CHANGELOG；交付可建立同revision的只读接受源码clone，以当前根guard验证零remote/main模式，不改公开模块开发模型或现有仓远端。
