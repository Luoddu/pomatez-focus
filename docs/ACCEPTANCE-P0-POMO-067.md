# P0-POMO-067 分段番茄与本地更新验收

源码检查点已独立PASS：453/453逻辑，真实分段桌面7组、重启备份/单飞、原更新器HTTP/SHA反例、完整隔离NSIS本地安装重启通过；固定104干净源码和包源亦独立PASS。用户最新改为稍后自行安装，未公开104随068合并为105最终交付；最终公开证据见ACCEPTANCE-P0-POMO-068。授权/四源/文件与资源/回滚见TASK-P0-POMO-067.md。

分段沿原record/plan分钟台账。cutSession调用原confirmSession记本段seconds/count0，不建挂起记录库；withTaskCredit使用source+sourceKey+planId或稳定本地/quick ID，只补原ledger未包含session IDs的分钟，包括已同步但任务回读尚未到达的片段。timeParts扣已有信用，elapsed/accepted只计本段；同任务计时重载原restore路径暂停，不把间隔算作投入。自由番茄接续从原records派生，保留原任务ID与syncedPlanId，不再生成新free行；完成后不显示接续入口。

artifacts/p067-all.txt 453/453，p067-targeted.txt 8/8：14分20秒切断+10分40秒续做只1500秒/1完成；多次切、有效剩余、暂停/恢复、异ID/异来源隔离、云已应用ID与迟到readback不重复、本地及quick身份、free同步后同plan复用；旧session/计时/科学专注/任务/旅程全部回归。stage复制/清单写入/提交失败注入后原manifest字节及旧可用包保留，合法重试通；相同版本不同字节、SHA、foreign marker、逃逸、链接、旧版拒绝；随机loopback仅固定feed/installer、无token/其他路径404，close后不可连接。

artifacts/p067-split-desktop.txt/json，真实main/preload/renderer及原Feishu适配器仅模拟HTTP：切断写失败保持原review/0记录；成功原行14分20秒、0完成、chip14:20/10:40；另任务p3计时独立、放弃不写；原p1开始仅10:40、实际重载暂停保留身份与信用；后640秒默认1，切断禁用，原分钟台账25/原行完成、其他行不动；自由番茄切断后接续原UUID/原sync新plan，最终25分钟只创建1行且入口消失。全部隐藏静音，真实云写0。fixture早期漏.cjs扩展和模拟640秒span早于session.start导致拒绝，分别精确修正fixture，无产品绕校验。

本地更新：固定目录manifest只含owner/version/源码head/固定安装包名/size/SHA256/SHA512。只在用户重启请求时serve，127.0.0.1随机port和48hex token，严格GET/host/路径、hash预验；原NsisUpdater再验SHA512，结束即close。普通重启与本地安装前读取已暂停或review的原localStorage快照，写独占备份；main单飞。安装权限只来自本次重新验证并prepare成功的localPrepared，不凭旧state.local。原远端no-active安装guard保留。

早期独立P2均关闭：①首stage失败形成无owner半成品、owned新包先copy后清单失败会自锁，现首UUID完整后rename及仅同hash重试，注入copy/write/rename正反；②state.local粘连会把远端包当本地装，现实际远端check清来源+main本次localPrepared授权。p067-updater.txt通过原public updater mock及真实HTTP404/SHA512拒绝、本地失败→远端check/download/defer来源false；③free可切断无返回入口，现有稳定接续并以真实7组链证明同plan唯一行。p067-restart-desktop.json真实主进程IPC注入备份失败0退出、页面恢复；正常一次relaunch/quit、有一致备份，重复不重启。

完整实际安装链：tests/local-update-installed.cjs，p067-installed-final.txt、p067-installed-update.json、artifacts/lu/3889d619/boot-0.1.0-preview.1.json与.2.json/restarted.json。UUID独立产品／profile／安装目录，NSIS1→App设置“重启以加载更新”→临时loopback→原公开updater验证下载→原NSIS→App2，原records与paused active深度相等、前段860秒/本段100秒/原身份与segments、备份恰1份，窗口隐藏静音。测试产品已用自身uninstaller卸载，个人App尚未由交付步骤修改。首NSIS夹具263字符内部包路径打不开，缩短测试路径后构建通；随后环境继承及beforeunload覆盖种子定位见下。

Learning recorded LEARN-P0-POMO-067-01（独立已接受，本次源码原子检查点同commit记录）：实际NSIS启动不能仅依赖父进程POMATEZ_PROFILE/POMATEZ_HEADLESS来证明隔离。固定app-builder-lib25.1.8 templates/nsis/common.nsh:123–132的StartApp走StdUtils.ExecShellAsUser，只传--updated，SHA256 281e8071663d2ef3e9f00bb27e6ef09d2c2b52b85458da07082f2b186100e259；artifacts/p067-official/manifest.json纳入相同文件/hash/行号。初轮无固定入口时预期profile未启动，改为专用fixture在require main前固定profile/静音；两版boot实证incomingProfileMatches=false且forcedIsolation=true，完整NSIS重启后原记录/计时/备份仍一致。首无固定入口的次级实例按main单例门禁退出，service无constructor写入，不把未隔离尝试算通过。此教训仅约束真实launcher/installer测试隔离，不泛化所有launcher都丢环境，也不授权生产profile迁移。重载种子改用已有CDP新文档注入，防beforeunload把直接localStorage种子覆盖；不改产品恢复语义。

官方路径：Electron34.5.8 app.md固定hash/492–538 quit/relaunch（执行beforeunload、重复relaunch会多实例），electron-updater6.8.3实际官方npm包AppUpdater.d.ts:164/185公开setFeedURL/downloadUpdate与BaseUpdater quitAndInstall；固定文件hash/许可最小快照见p067-official。没有修改protected缓存、第三方包、依赖版本、常驻服务或网络暴露；本机包优先，GitHub仍按既有039真实旧更新器和五资产tag门禁。

封版及包源已验证：冻结01dc684134f2a99304745d58e86c65fb94e431c6 / preview104 / dirty=false；最终build、7组分段桌面、原6组active任务回归通过。artifacts/release104-package-acceptance.json、release104-package-verify.txt：219个build文件逐字节匹配ASAR，原生提醒和更新资源存在；隐藏静音隔离成品启动通过，五资产size/SHA256与feed SHA512一致。setup 84,453,904字节，SHA256 5d80799ae5f00fc357eab1bf36c2e077dda5469c2c88173784ae3fc2a77c459b。review_scientific_rest独立源码PASS及最终包PASS均绑定该commit；未把包检查当作个人安装证明。

交付前通道基线：artifacts/release104-before-update.txt/json，真实公开103原更新器检测103为current，errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。本机已安装103的build/source-version.json只读核对为b3de3395bc8c343bc194014dcce911356500e2bc / dirty=false。

个人升级未执行：Windows截图通道两次超时，按钮输入报coordinate input geometry is unavailable，未获得暂停/退出证据，未强杀、未复制热LevelDB、未运行安装器。用户随后明确“我晚点自己升级”，本轮不再代关/备份/安装；保留本地最终包后继续GitHub发布。未执行的临时备份helper被独立指出枚举错误未fail closed，不纳入交付、不作为个人备份成功证明，也不用于后续安装。

Learning沿已记录LEARN-P0-POMO-067-01（01dc684同commit）；截图通道故障根因未明，不写未经验证通用教训。按用户新指令，剩余发布由068合并收口，个人安装由用户自行决定。旧103/tag/资产保留，用户原数据不迁移删除。
