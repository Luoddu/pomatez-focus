# P0-POMO-061 开机自启动验收
状态：DONE；唯一任务状态见TASK-P0-POMO-061.md。
现状与官方/复用/同类验收四源见执行卡。采用固定Electron34.5.8原生get/setLoginItemSettings公开API，未增加依赖/后台服务/计划任务；用户显式开关才写本App HKCU Run启动项，设备独立不进入飞书偏好。普通打开保留显示，--start-in-tray托盘启动，重复自启动不抢焦点，手动重复打开仍唤起。
原生证据：artifacts/p061-startup-native-bggMwP/native.log/result.json；实际Electron34.5.8、真实中文空格exe路径、随机唯一测试AppID/name，8原生+4控制器全部通过、controllerErrors=[]、cleaned=true，两次disable也通过。仅测试owned项，未改真实farm startup项/用户profile/凭证，无网络或重启电脑。
原生初验发现并修复：launchItems.args因Chromium GetArgs排除--switch返回[]，旧strictargs判冲突；根据同版browser_win.cc619-623以openAtLogin完整命令匹配+本项name/user/path/enabled判定，并保留TaskManagerdisabled区别。unit模拟真实空args结果9/9PASS；全逻辑415/415PASS，完整Electron/renderer TS PASS。独立源码初审conditionalPASS，实际nonheadless tray/manual路由fixture及最终干净构建待复验。
Learning：recorded - 模块Learning.md新增LEARN-P0-POMO-061-01，依据原生失败→公开固定版源码→正确路径原生PASS；不写根Learning/长期Memory。
回滚：用户关闭开关移除本App启动项；原96发行保留；无记录/数据迁移。开发/便携/非Windows拒写，未知输入或OS读回不符不得报告成功。

最终冻结与验证（2026-10-15）
- 源码 a5b2d455ae1a65d0c1946bb65d281ffd43ae558d；公开主线 codex/feishu-focus已验证同SHA，clean。最终build:focus/package:focus通过，ASAR source-version同SHA/dirty=false/version0.1.0-preview.97。artifacts/focus-build.json、p061-build.log、p061-package.log、p061-release-prep.log。
- startup单元9/9、全逻辑415/415、Electron/renderer TS通过；startup-desktop三模式通过：真实main/preload/UI开关、重载回读、无效IPC拒绝；nonheadless tray初始show0/manual初始show1，登录重复静默、手动重复唤起，原生窗口/托盘/监测副作用由fixture截获。首次路由fixture误试图重定义Electron不可配置Tray，已改为仅main模块require facade，生产代码未为测试绕开路径。对应p061-startup-tests.log、p061-all-tests.log、p061-startup-desktop.log。
- 最终生产构建desktop21+实际进程重启恢复、portrait14全部通过；测试profile隔离且窗口隐藏。安装包exe smoke exit0/ready(hidden)，ASAR updater576901bytes且无裸electron-updater依赖。p061-desktop.log、p061-portrait.log、p061-packaged-smoke.log、p061-asar-updater.log。
- 原生测试使用实际Electron API和随机owned测试name/AppID，8原生+4控制器、两次关闭通过，最终cleaned=true；不等于真实用户App启动项已开启。正式安装包启动已验证，未做真实重启/登录测试，未自动安装或重启用户App。
- 独立复核角色01a13d85-043d-7f61-91b4-9dc1ca566fbb对冻结源码/构建、草稿五资产、发布回读及实际旧更新器证据最终PASS，无P1/P2；只读，未触碰真实profile/联网/OS设置。

公开发行与升级
- https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.97 ，release413386110，non-draft prerelease，不设Latest；稳定Latest仍preview.51。annotated tag剥离至a5b2d455；回执后续文档提交不改变发行源码/tag。
- 五资产完整：setup.exe75512272bytes、setup.exe.blockmap79265bytes、preview.yml405bytes、source-version.json107bytes、SHA256SUMS.txt405bytes。setup SHA256 e7af8fd9e9b9338238d1c07ceb034362370af2542f3ab462de9e19aa6153a156。完整资产哈希见发行SHA256SUMS及artifacts/release97-local-assets.json；草稿/公开ID、大小、SHA256全部一致。release97-remote-draft.json、release97-readback.json、release97-tag-readback.txt。
- 公开setup HTTP206首1024bytes与本地相同；artifacts/p061-public-verification.json。便携包仅本地生成，未交付/上传。
- 从本机已装preview.96 ASAR提取真实updater验证发现preview.97，清单setup大小/sha512匹配，errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false；artifacts/p061-update-before.json、p061-update-after.json。不以静态feed代替旧客户端发现，不自动升级用户App。
- 用户路径：App检查更新升级后，设置→开机自启动→开启；登录Windows静默进入托盘，双击托盘打开；关闭可撤销。此项每机独立，升级本身不会自动开启。

Learning最终判断：LEARN-P0-POMO-061-01已随实现提交记录；后续构建/发布未形成新的可跨任务原生教训，回执引用现有条目，避免重复记录。根共享Learning和Memory未改。范围外未处理，无记录/偏好/凭证迁移。
