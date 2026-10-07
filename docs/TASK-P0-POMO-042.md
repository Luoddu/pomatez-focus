# P0-POMO-042 ActivityWatch启动联动与手动刷新

- REVIEW；模块唯一任务状态源，模块协调/实现/root。用户2026-10-07新增明确请求：随番茄App启动ActivityWatch、科学休息标题旁一键刷新。沿用现有本机运行与公开源码/安装更新授权，不自动安装/重启农场，不写根控制面或OS启动项。
- 基线cada55e9b30088892a49f8970213b361732083f3，含P041本地复核PASS界面；公开主线仍28a23b5/preview.73，祖先已确认，单worktree干净，绿灯。分支task/p0-pomo-042-aw-launch-refresh；串行单写本clone，独占P042合成profile/临时loopback端口与自己启动的测试子进程。现有用户AW进程/数据库/Edge不重启、不强停。
- T0：本机API v0.13.2可用，aw-qt/server/window/AFK进程均在，Edge有最近事件；无法由用户截图证明重启导致漏记。农场现只start轮询，无AW进程联动。手动统计只refresh当前cache，无单独刷新桥。目标不是补造漏记的过去时长。
- 官方路径冻结：ActivityWatch根839d99ffabe8a0281d332a2fddfb78514266698b，aw-qt子模块43864b2f7ec3b71d5b181eafb47b4ded6c197b8f；官方main.py L18–31普通launcher、--autostart-modules/--no-gui，L65–95启动manager与自身退出时stop_all；config.py L6–13默认三个模块；manager.py L134–156避免控制台、L245–263服务器先启动。最小原始Git blob快照（main/manager/config/LICENSE）及SHA256 manifest在忽略artifacts/p042-official；不成为运行依赖。现有Electron/Node child_process公开spawn/execFile路径，无新依赖/自研watcher。
- 实现：仅Windows标准已安装AW路径；启动/刷新先检查官方loopback /info，已有服务不启动；服务不可达且aw-qt已运行不重复启动/强杀；缺安装清楚提示。只启动官方aw-qt并沿用默认配置，固定路径/参数不接受renderer命令，detached+stdio ignore+windowsHide，不捕获管道、不控制长期子孙生命周期；退出农场不杀独立AW。并发ensure单飞，启动有界等接口就绪；仍未就绪可返回原因，未来用户再次刷新而非无限重启。首次启动及系统恢复做检测，监控仍由原Rest对象拥有。
- 刷新：标题旁小按钮，点击禁用防重复，即时核对AW并重新discover buckets/coverage、当前日和统计cache；状态点title保留原故障原因，按钮反馈不占默认footer。沿用IPC sender/mainFrame边界，窄参数无URL/path/command输入。保留P041全部界面要求及督促/原计时。
- 四处预检：①main.ts L334–336只有restMonitor.start；activitywatch.ts L524/642现有单poll；ScientificRest.tsx标题无刷新。②上述固定官方源码和现有Node类型defs child_process公开API；③existing localRequest、Rest去重/失联/午夜/持久错误、安全IPC、build/version/push/helper；Learning039发布限定。④activitywatch.test.cjs及真实desktop、rest-reminder与P041几何验收；追加缺安装/已有服务/已有launcher/并发/失败、真实临时子进程→loopback链路、真实UI刷新/cache更新。
- 允许写集：本卡、docs/ACCEPTANCE-P0-POMO-042.md、docs/ACTIVITYWATCH.md、CHANGELOG.md；app/electron/src/main.ts、preload.ts、focus/activitywatch.ts、focus/activitywatchRuntime.ts；app/renderer/src/focus/components/ScientificRest.tsx、focus.css；tests/activitywatch-runtime.test.cjs、tests/fixtures/aw-runtime-launcher.cjs、tests/fixtures/aw-runtime-server.cjs、tests/activitywatch-desktop.cjs；scripts/test-focus-all.cjs；版本工具生成app/electron/package.json、SettingsPanel.tsx。忽略artifacts仅合成证据/官方快照/发布暂存。P041最终收口只改其卡和验收指针。
- 正反验收：健康服务不重复启动，缺服务已安装可经官方manager启动后就绪；并发只launch一次，已有launcher/缺安装/异常不盲目重试，下一次合法刷新仍可成功；孤立测试真子孙loopback链路，不依赖私有状态；UI刷新立即取数/更新并重发现bucket，按钮禁用/无第二poll，断连保留同日总量/原因且恢复可用；健康点/已有两按钮督促不变；原四象限/右列宽及P041热力仍通过。
- 预算/停止：一次前台有界纵切，无新后台scheduler/系统service/OS自启动注册项。允许既有review_scientific_rest冻结源码+证据独立只读复核，不写文件、不启动App、不再分派；精确问题修正后复验。真实冷启动全链若需打断现有用户采集则不用强杀，只如实报告可做测试边界。同因未知失败两次停止对应修补；根因明确有公开路径可在预算内继续。
- 回滚：基线显式文件可恢复，无用户数据迁移；固定新版本发布五安装资产及真实前一73检测，禁止替换旧tag/安装包，不自动安装。P041界面随本次最终安装版一起交付，不额外发布仅中间源码的74。
- Learning判断：暂无新可复用已验证教训；检查点审视，发布沿用LEARN-P0-POMO-039-01。只有实现、实测、独立复核和实际发布回执齐备才DONE。
