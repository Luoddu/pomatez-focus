# P0-POMO-061 Windows开机自启动
状态：DONE；负责人/root；唯一模块状态源本卡。
授权：用户2026-10-15要求番茄农场开机自启动功能；沿用默认源码推送和Windows preview发布授权。提供本机设置开关，只有用户在App开启才注册当前用户启动项；不随飞书偏好同步，不自动安装或重启用户App。
基线：ba44635c5e0a17d7912dbb65d30d170589511fc5；fetch/check:sync通过，clean，task/p0-pomo-061-autostart独立分支，无重叠活动写者；根治理不写，无服务/端口/数据库占用。
范围/写集：app/electron/src/focus/startup.ts、main.ts、preload.ts；app/renderer/src/focus/components/StartupSettings.tsx、SettingsPanel.tsx；tests/startup.test.cjs、startup-native.cjs、startup-desktop.cjs；本卡与ACCEPTANCE-P0-POMO-061.md；版本仅electron/package.json/SettingsPanel；ignored artifacts。原始记录、凭证、用户真实profile、其他启动项/全局设置不写。Windows安装版可设置，开发和其他平台不给错误的成功提示。
官方路径：固定Electron34.5.8 docs/api/app.md:1129-1170 与 shell/browser/browser_win.cc:128-139/141-215/574-642（官方tag原文2026-10-15读取）；使用app.get/setLoginItemSettings，不造计划任务/服务或自制全局registry写。相同quoted exe path/args读回，准确识别本App user launchItems与TaskManager enabled，不用any-args aggregate冒充本项。WindowsopenAsHidden不适用，固定--start-in-tray命令参数控制托盘启动；正常手动启动仍显示，重复自启动实例不抢焦点，手动二次启动仍可唤起。无依赖升级。
四源：当前main ready-to-show调用show且无自启动IPC/UI；官方固定源码如上；命中模块Learning055原生错误不可按UTF8猜测，故复用原生结构化API；现有trusted main/preload IPC、单实例/tray、406logic及desktop21/portrait14验收复用。
验收正反：合法布尔开关enable/readback/disable及重启读取正常；无效输入/未打包/不支持平台拒绝且不调用OS写；Windows任务管理器禁用不显示已开启，普通启动行为不变；quoted Unicode带空格路径、idempotency、native回读失败显示错误；实际Electron原生API在随机唯一测试name/AppID下开启/禁用并清理，只碰测试owned启动项，不碰真实farm条目；headless production IPC/UI和tray参数/二次实例处理测试，计时/records不写；固定clean构建/包、五资产、实际96→97更新发现。
预算/分派：一工作周期；复用Parfit仅独写tests/startup-native.cjs纯测试及其ignored日志（可实际原生临时启动项但必须随机ownname、finally清理，不重启/登录）；Heisenberg只读独立复核root源码和证据；root写其余。无后台自动化/额外服务/新费用。
回滚：关闭开关移除本App启动项；旧96发行保留；无原始数据迁移。Learning最终验收判断；不写根共享Learning/Memory。

原生验证修正：Electron34.5.8 browser_win.cc:175调用Chromium GetArgs，不返回--switch；launchItems.args为空不能判定flag丢失。按619-623完整命令比较openAtLogin确认quotedpath+固定args，与owned user launchItems path/name/TaskManager enabled结合。测试override name时AppUserModelId必须同名。允许模块Learning.md记录这一实际原生教训，根Learning/Memory仍不写。

本轮角色：native worker01a13d85-03b2-7923-8248-84089c1df5f2，reviewer01a13d85-043d-7f61-91b4-9dc1ca566fbb；此前会话Agent已不存在，按原预算2个互不争写角色新建，未扩大写集。原生12项已PASS且cleaned=true；Learning候选061-01已纳入模块Learning.md同批提交。

最终检查点：源码 a5b2d455ae1a65d0c1946bb65d281ffd43ae558d，clean构建/打包，源码已同步公开主线。preview.97正式prerelease五资产核验及实际已装96 updater发现97全部PASS；独立reviewer最终PASS，无P1/P2。详见ACCEPTANCE-P0-POMO-061.md。模块Learning061-01已记录，本次回执未新增独立教训。未安装/重启用户App，未替用户启用自启动，未做真实重启登录验收。
