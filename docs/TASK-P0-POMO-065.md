# P0-POMO-065 冷静期中断后恢复剩余时间

状态 IN_PROGRESS；owner/root，隔离番茄模块实现/已授权Windows预览更新，唯一任务源本卡。用户2026-10-25要求定位、修改、更新。baseline_commit c206ed82a39faba0bb9c836f71c93ebda623346b；实时fetch/check:sync确认公开主线同SHA、100版、clean，单worktree task/p0-pomo-065-cooldown-resume，无并行写者/共享资源冲突。

目标：督促短暂关闭/重新开启、短暂投影过期和NativeMessaging断连恢复后，未结束的冷静期恢复原截止时间，不能被相同提醒key去重吞掉。关闭/失联仍立即释放页面，恢复前不施加控制；截止后旧提醒不能重新惩罚，新提醒仍正常启动新冷静期。模式切换、跨日、暂停/镜子/额度语义保持。非目标：不改变提醒累计账本、统计、番茄计时、用户策略、自动安装或强行控制个人浏览器；不改网络/注册权限/协议/新后台。

写集：app/electron/src/assets/browser-control/background.js、manifest.json（仅配套补丁版本）；tests/browser-control.test.cjs、tests/browser-control-desktop.cjs；docs/BROWSER-CONTROL.md、本卡、docs/ACCEPTANCE-P0-POMO-065.md、CHANGELOG.md；现有版本helper的app/electron/package.json、app/renderer/src/focus/components/SettingsPanel.tsx。ignored artifacts只含合成profile/回执/有界验证脚本及包/发布证据。禁止根治理/路线图/组件锁/Learning/真实profile、注册/个人任务/飞书/Edge设置写入。无数据库/schema/端口/服务控制；独占本clone build/dist及随机静默测试资源。

四源预检：①本机只读确认cooldown5、supervise=true、有新鲜connected回执但pauseKey为空；当前代码确证decide在off/过期清until却保留key，release也清until，原key恢复不fresh而不再阻挡；小型复现first blocks=true/off=false/on同key=false/新key=true。只承诺该确定根因，不把其等同所有晚上漏拦。②第三方运行语义不变：沿固定Electron34.5.8/原MV3 NativeMessaging和storage.session公开API，不改安装/通信/租约7秒、串行epoch所有权或5秒轮询；本改动是项目自有绝对截止时间的状态保留，无新官方能力采用/升级。既有固定协议/生命周期依据见BROWSER-CONTROL.md、P053/P054官方证据与验收。③复用原decide/release/session恢复和content的租约校验；不造新计时器/调度器/统计源；Learning039固定源五资产和真实旧更新器门禁命中，042跨await所有权邻接但不更改串行链。④browser-control.test.cjs已有off/expiry/day、原服务worker并发/旧端口交错/真实stdio正反；browser-control-desktop.cjs有真实CMD→host→生产content→静默HTML视频链，扩充其恢复/到期/新提醒。

完整调用链分类：配置关闭会清当前提醒但保留累计阈值；worker无效状态/断连清截止时间而仍保留提醒key，失联恢复无法重建已丢冷静期。保留同日旧绝对until，控制投影仍清零；新鲜合法消息恢复时按剩余时间投影，过期until不重放。release和session重启同一路径复核，不加局部重试。无新的IPC/schema，未改第三方生命周期。

验收正反：同key重复心跳不延长；off/无效租约期间不遮罩、恢复未到期仍遮罩/暂停且截止不变；断连/worker重载恢复同义，原epoch防旧clear覆盖新连接仍通；原截止后旧key不再遮罩或pause，新key仍生效；模式切镜子/暂停与跨日不遗留冷静阻挡，额度用完仍按当日限制。生产CMD/host/content静默视频链验证off释放能播、on剩余期拒播、到期能播、新提醒再暂停。全逻辑/生产构建、独立源码/包源/公开交付复核后方发布。

执行预算：本轮2小时有界修复/验收/发行；只复用既有review_scientific_rest只读独立复核，禁止新增Agent/自动化/后台服务。未查明同根因两次停相关尝试；已明确根因可在写集内修正，超界升级。首次写入、冻结、提交、推送核对status/diff/worktree及实时远端；绿灯继续，冲突只停受影响步骤。

发布：用户本轮修改更新及模块默认推送授权，干净固定源码、NSIS-only、五资产先draft核哈希，再同HEAD annotated tag后公开prerelease不设Latest；用真实上一已发布100 ASAR更新器验证发现新版本，0下载/0安装，不重启个人App。扩展需用户安装App后点击安装/更新配套并在Edge重新加载，不能把代码包通过冒充个人实际生效。

回滚：显式revert本次worker内部截止保留，无用户数据迁移；旧100资产不变，修正用新tag。Learning初判none：沿原绝对截止/临时租约分离的恢复修正，若独立复核提出跨任务候选，封版前明确采纳或拒绝；不自行写根Learning。
