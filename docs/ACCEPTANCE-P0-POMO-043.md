# P0-POMO-043 验收

- DONE；四处预检、授权、范围、原生官方路径与回滚见TASK-P0-POMO-043.md。preview.76，固定运行源码5e18e7eb73e6c207bc502ad7ab49718690a90a50。
- 已验证：默认时钟逻辑全套284/284（artifacts/p043-all.txt），含短窗尾段替换与全量结果一致、重复查询不累加、30秒全日/手动刷新/恢复/午夜重读，变更提醒档位才额外写盘，目标网址＋前台Edge＋AFK/声音正反场景；展示helper不修改正式聚合，断连、暂停、其他应用、过期、钟倒退和日切换均不造秒。
- 已验证：真实生产main/preload/renderer与合成官方REST的23组desktop（p043-desktop.txt、activitywatch-desktop.json），原20组策略/进度/原生提醒/刷新/托盘/重载/窄屏保留；新增B站秒变化、切小红书B停止、鼠标悬浮详情、其他前台及断连冻结；正式用量600秒在显示估算推进时仍600。隐窗无法原生获得焦点，hover通过CDP公开CSS.forcePseudoState与DOM mouseover触发，不能冒充用户鼠标操作。
- 已验证：overview7与portrait14（p043-overview.txt、p043-portrait.txt），1040×800/1080×1840/1440×1000的四象限比例、右列宽和无横溢出保持。默认8–24视口，0–8仍保留，滚动到顶部可见；48格半小时详情不丢失。横屏月历卡片高168.14px，比原216.14px少48px，专注积累跟随上移。隐藏Windows CDP wheel未送进DOM，诊断p043-wheel-diagnostic.txt已查明，保留限制；原生overflow:auto和DOM滚动正反通过，不声称真滚轮输入验收。
- 性能约束：未新增进程/额外采集器，复用一个5秒循环；近期60秒查询，30秒全日校准；界面只有正在目标站计时或悬浮时启用局部1秒计时，清理卸载计时器，不每秒REST请求或写盘。有效信号7秒短租期，失效暂停估算；浏览器心跳最长75秒新鲜窗，窗口/AFK5秒，未来/无效信号不给站点。显示补差有82秒上限，不进入提醒阈值或历史持久化。
- 已验证本机短样本：p043-local-performance.json，真实AW近期查询15.61/15.86ms；10.10秒adapter CPU62ms约单核0.61%，AW服务CPU62.5ms约0.62%。p043-renderer-performance-source.json，10.02秒活跃估算隔离窗口同4个PID不增进程，主Browser单核0.35%、Tab1.47%、GPU1.16%、Utility0.01%，合计2.99%。这些含已有App和服务工作，隐藏隔离短采样不等于所有机器长期压力保证，也不是纯功能增量成本。没有导出用户原始网址/标题或停止AW/Edge。
- 固定第三方证据：AW v0.13.2/aw-server b4ad07509067defec9a2a958ea9d58f3ed220c88、WebWatcher0.6.0 2e70779b09733afd25f7bbeb7f188ae1938f4f42；artifacts/p043-official/manifest.json逐Git blob/sha256/大小/原始URL/许可证。WebWatcher config.ts L4–7确认60秒心跳，公开heartbeat切换事件和AW query2 timeperiods。正式记录可能晚于显示秒数，tooltip和使用说明明确含估算，原额度和番茄监督仅以正式聚合触发。
- Learning判断：复用模块042单次缓存失效和039不可变更新发布；本次未形成需新登记的跨任务教训，性能数据只代表该机短样本，不推广为工程定律。既有午夜plan历史fixture问题本轮默认全套在日内通过，未改计划产品/旧fixture。
- 交付完成并独立复核PASS：冻结源码独立PASS、最终干净build/package、五安装资产公开及真实旧75→76更新器检测均通过；未自动下载/安装/重启用户App。

- 独立复核7c6d177发现两项P2：短暂停仍短窗，默认底部视口露出07:30。已先用冻结旧构建分别精确失败（p043-old-suspend.txt、p043-old-early-slots.txt），再修正stop清全日校准标记、按08:00实际cell坐标及页面缩放定位并预留尾部滚动空间。新增快速暂停/双start/恢复全日一次/随后短窗正反测试；全逻辑285/285 PASS（p043-all-fixed.txt）。补强全部0–8的16格不可见与8–24的32格可见断言，不降低卡高/布局约束。修正后overview7/7（p043-overview-fixed.txt）、desktop23/23（p043-desktop-fixed.txt）PASS；最终干净构建和复核通过，见下述固定源及交付证据。

- 源码独立复核：5e18e7e两个P2关闭，源码PASS。最终干净构建p043-build-release.txt，meta dirty=false/head/version匹配；最终overview7与desktop23 PASS（p043-overview-release-final.txt、p043-desktop-release-final.txt）。包源独立PASS：ASAR的103个build文件全部匹配，成品隐藏隔离smoke退出0、五安装附件和feed SHA512一致（release76-package-acceptance.json）。
- 已发布 https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.76；非draft、prerelease、nonlatest，固定tag运行源5e18e7e，canonical已非force同步。草稿上传一次成功，五资产远端size/SHA256与本地逐项一致，公开前后资产ID相同；旧75五资产、tag和发布日期未变（release76-remote-draft.json、release76-remote-public.json、release76-old75-before.json、release76-upload-result.json）。未交付便携包，用户只需App手动更新。
- 真实生产FocusUpdater/NSIS updater以旧75和同一GitHub preview配置在隔离Electron进程检查；发布前current、发布后available/76，setup URL、size和SHA512完全对应公开feed，autoDownload=false/autoInstallOnAppQuit=false，0下载、0安装、0错误（release76-before-update.json、release76-live-update.json）。不能声称已替用户安装，真实滚轮输入/真实AW冷启动/长期压力限制维持前述范围。
- 发布Learning判断：沿用039固定不可变tag和五资产原子发布，无上传重放或新恢复方案；未形成新的跨任务已验证教训。回滚为显式源码恢复/旧75不可变安装版，保留用户配置/记录，不改旧tag。

- 最终公开交付独立复核PASS，绑定5e18e7e/preview.76及原始五资产、旧75不变、真实更新检测证据。DONE文档检查点只更新本卡与回执，不改变运行tag或安装资产；无新Learning候选，限制如实保留。
