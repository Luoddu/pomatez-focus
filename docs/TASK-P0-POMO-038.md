# P0-POMO-038 十二番茄前的浏览督促

- IN_PROGRESS；状态源本模块执行卡。负责人/实施者及模块协调 Codex /root。用户2026-10-07明确要求：当天完成12番茄前每累计看5分钟提醒，全天总额度不超过60分钟，超过后提醒。授权本地可回滚实施与验收；本轮没有新的推送/发布/安装指令，不操作用户App或其他设备，不改根共享控制。
- 基线203d19b9e3245f2c764dab1fafc22589baa01571；实时fetch/check:sync确认公开主线同SHA、干净。独立分支task/p0-pomo-038-rest-supervision；同clone单写，无额外worktree或重叠写者，绿灯。检查点/提交前重查status、worktree、baseline至origin/codex/feishu-focus差异。
- 目标：B站＋小红书共享累计，12番茄前5/10/15…分钟提醒；12及以上额度内停止早期督促。超过额度当即提醒，之后新增5分钟继续；同次命中合并、墙钟等待不提醒。额度仍可调低至5分钟，最大60；默认60、督促开启。已确认saved记录按本地开始日期计数，与月历统计同口径，本地待同步也计入，active/review及演示不计入。复用现有真实记录，不另存番茄历史/联网取数；旧额度大于60迁为60。
- 写集：本卡、docs/ACCEPTANCE-P0-POMO-038.md、docs/ACTIVITYWATCH.md、CHANGELOG.md；app/electron/src/focus/activitywatch.ts、app/electron/src/main.ts、app/electron/src/preload.ts；app/renderer/src/focus/components/ScientificRest.tsx、app/renderer/src/focus/FocusApp.tsx、app/renderer/src/focus/restProgress.ts；tests/activitywatch.test.cjs、tests/activitywatch-desktop.cjs、tests/restProgress.test.cjs。不改飞书写入/计时核心、AW配置/数据、现有发布物/版本或根文件。不新增依赖/系统服务/计划任务。
- 必读：适用根AGENTS/context-loading/how-to-dispatch/version-control与模块AGENTS；035/037执行卡、ACTIVITYWATCH、activitywatch/main/preload/ScientificRest、session/stats统计原文、现有逻辑/真实UI测试。根控制包此前已读，本轮无根写入；无关控制面/私人材料不加载。
- 四源自检：①真实本机aw-rest-settings读取显示额度60、督促true、累计48分48秒、提醒step0且刚更新；新规则改变既有业务，非采集故障。当前生产源码70只在65分钟提醒。②第三方采集/生命周期语义不变；固定AW13.2官方源码路径及哈希沿用035/ACTIVITYWATCH，Electron34.5.8固定contextBridge/IPC sender验证沿用main L53–62、preload L2–6；不使用新API。③复用stats.ts inRange仅saved且startedAt本地日期、现有原子提醒账本/IPC白名单/同日聚合；根Learning定向搜索AW/番茄/提醒无新增命中，生命周期owner教训要求真实生产主界面常驻验证。④既有activitywatch逻辑、12组生产UI、desktop/重启验收复用，新增阈值/12转换/迁移/进度失效/关闭/午夜正反测试。
- 接口/资源：仅本模块窄IPC传本地日与完成数，不传浏览URL、飞书凭证或整个历史；主进程记忆内消费聚合，记录真相仍由现有timer.records拥有。日期过期不信任昨日目标。测试使用隔离临时profile、隐藏静音Electron与本机合成REST端口，禁止写真实用户profile，AW5600只读。
- 正反验收：未满12时300秒提醒而299.99秒不提醒；跨站累计/停止浏览仍正确；11→12取消待办早期提醒但额度超额仍提醒，12→11不倒放旧档；60分钟未超额不弹、超额即弹且65/70继续；监督关闭不弹仍计数，重新开启只对新增档位；重启/旧账本迁移/断连/午夜不重复或串日且新日新浏览仍提醒；确认/编辑/云端合并更新目标，未确认不计；真实生产hook/IPC/弹窗两按钮/主界面与计时仍可用。
- 预算：本工作周期有界完成；沿用同一只读独立reviewer，输入卡/冻结diff/原始测试，20分钟内给PASS或行证据问题，禁止文件/运行资源/外部写入、不再派Agent。同因两次且未知停止对应步骤；已有明确根因可有证据修正，禁止局部试错级联。无自动后台任务。
- 迁移/回滚：合法旧账本按上次同日聚合建立新已观察档位，避免更新首次弹历史轰炸；新profile首次实时读到错过档位只一条。schema保留旧step供旧版兼容，新增字段可忽略；恢复基线代码，用户数据不删除。出现写盘损坏仍暂停督促而计数可用。
- Learning判断：none，现有累计阈值/常驻owner/窄IPC模式复用；如测试形成可跨任务新证据再提交候选，当前无新增教训。
