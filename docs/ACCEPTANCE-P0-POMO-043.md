# P0-POMO-043 验收

- REVIEW；四处预检、授权、范围、原生官方路径与回滚见TASK-P0-POMO-043.md。preview.76，源commit由taskcommit后冻结。
- 已验证：默认时钟逻辑全套284/284（artifacts/p043-all.txt），含短窗尾段替换与全量结果一致、重复查询不累加、30秒全日/手动刷新/恢复/午夜重读，变更提醒档位才额外写盘，目标网址＋前台Edge＋AFK/声音正反场景；展示helper不修改正式聚合，断连、暂停、其他应用、过期、钟倒退和日切换均不造秒。
- 已验证：真实生产main/preload/renderer与合成官方REST的23组desktop（p043-desktop.txt、activitywatch-desktop.json），原20组策略/进度/原生提醒/刷新/托盘/重载/窄屏保留；新增B站秒变化、切小红书B停止、鼠标悬浮详情、其他前台及断连冻结；正式用量600秒在显示估算推进时仍600。隐窗无法原生获得焦点，hover通过CDP公开CSS.forcePseudoState与DOM mouseover触发，不能冒充用户鼠标操作。
- 已验证：overview7与portrait14（p043-overview.txt、p043-portrait.txt），1040×800/1080×1840/1440×1000的四象限比例、右列宽和无横溢出保持。默认8–24视口，0–8仍保留，滚动到顶部可见；48格半小时详情不丢失。横屏月历卡片高168.14px，比原216.14px少48px，专注积累跟随上移。隐藏Windows CDP wheel未送进DOM，诊断p043-wheel-diagnostic.txt已查明，保留限制；原生overflow:auto和DOM滚动正反通过，不声称真滚轮输入验收。
- 性能约束：未新增进程/额外采集器，复用一个5秒循环；近期60秒查询，30秒全日校准；界面只有正在目标站计时或悬浮时启用局部1秒计时，清理卸载计时器，不每秒REST请求或写盘。有效信号7秒短租期，失效暂停估算；浏览器心跳最长75秒新鲜窗，窗口/AFK5秒，未来/无效信号不给站点。显示补差有82秒上限，不进入提醒阈值或历史持久化。
- 已验证本机短样本：p043-local-performance.json，真实AW近期查询15.61/15.86ms；10.10秒adapter CPU62ms约单核0.61%，AW服务CPU62.5ms约0.62%。p043-renderer-performance-source.json，10.02秒活跃估算隔离窗口同4个PID不增进程，主Browser单核0.35%、Tab1.47%、GPU1.16%、Utility0.01%，合计2.99%。这些含已有App和服务工作，隐藏隔离短采样不等于所有机器长期压力保证，也不是纯功能增量成本。没有导出用户原始网址/标题或停止AW/Edge。
- 固定第三方证据：AW v0.13.2/aw-server b4ad07509067defec9a2a958ea9d58f3ed220c88、WebWatcher0.6.0 2e70779b09733afd25f7bbeb7f188ae1938f4f42；artifacts/p043-official/manifest.json逐Git blob/sha256/大小/原始URL/许可证。WebWatcher config.ts L4–7确认60秒心跳，公开heartbeat切换事件和AW query2 timeperiods。正式记录可能晚于显示秒数，tooltip和使用说明明确含估算，原额度和番茄监督仅以正式聚合触发。
- Learning判断：复用模块042单次缓存失效和039不可变更新发布；本次未形成需新登记的跨任务教训，性能数据只代表该机短样本，不推广为工程定律。既有午夜plan历史fixture问题本轮默认全套在日内通过，未改计划产品/旧fixture。
- 交付剩余：冻结源码独立只读复核、最终干净build/package、五安装资产原子公开及真实旧75→76更新器检测；不自动下载/安装/重启用户App。

- 独立复核7c6d177发现两项P2：短暂停仍短窗，默认底部视口露出07:30。已先用冻结旧构建分别精确失败（p043-old-suspend.txt、p043-old-early-slots.txt），再修正stop清全日校准标记、按08:00实际cell坐标及页面缩放定位并预留尾部滚动空间。新增快速暂停/双start/恢复全日一次/随后短窗正反测试；全逻辑285/285 PASS（p043-all-fixed.txt）。补强全部0–8的16格不可见与8–24的32格可见断言，不降低卡高/布局约束。修正后overview7/7（p043-overview-fixed.txt）、desktop23/23（p043-desktop-fixed.txt）PASS；仍待最终干净构建及再复核。
