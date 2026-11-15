# P0-POMO-096 合并验收

状态 DONE（合并发行与交接范围）；唯一状态源 TASK-P0-POMO-096.md。最终独立复核PASS；NAS部署、个人安装与物理双机验收不在完成声明内。

## 来源与四源

公开基线88d93b34e626eb62e79bc2f35130ffba628f3067，包含134产品b8e1b73及133睡眠接口。逐文件移植dc74c191的whole-task修复，不引入旧个人历史；旧P094编号与公开睡眠P094冲突，公开原卡不覆盖。四源预检、写集与资源详见任务卡。未修改134共享/统计/睡眠实现或既有政策。

## 本机合并验证

- 官方固定Node24.22.1 win-x64/node.exe SHA256 d702daa815eabbff763c7d3808e235cf031cf2ca70211b56847bc72f51e240e5，经官方SHASUMS256核验；仅隔离验证目录，不安装系统运行时。
- scripts/test-focus-all.cjs：576通过，0失败，artifacts/p096-all.log。
- scripts/test-whole-task.cjs：2组真实Electron/preload/service/Feishu合成HTTP链路通过。即时隐藏同任务所有格、离线持久、重试仅写原任务完成一次、跨重启次日不重现，正常日常任务仍生成且无虚构专注记录；artifacts/p096-whole.log。
- scripts/test-shared-entertainment-desktop.cjs：12项通过，真实HTTPS双客户端、safeStorage、Native Messaging、重启余额、统计、配套过旧拒绝、真实静音视频合法播放与墙钟回退后单调许可到期暂停；artifacts/p096-shared.log。此为同机隔离客户端，不是物理两机验收。
- scripts/test-daily-usage-desktop.cjs：8项通过；scripts/test-sleep-api-desktop.cjs：11项通过；原静默同步5阶段通过。artifacts/p096-daily.log、p096-sleep.log、p096-quiet.log。一次误写test-quiet-sync.cjs得到MODULE_NOT_FOUND，核对目录后使用实际既有test-quiet-sync-desktop.cjs通过，无产品补丁。
- npm run build:focus通过；源未冻结时构建仅作验证，发行须干净commit重建。
- 独立review_local_editing对当前限定移植复核PASS，无P1/P2；五个产品文件及相关测试与dc74一致，共享/睡眠/main/preload未覆盖，已核原始576与whole-task证据；冻结后再检查漂移。

## 现场与边界

本机安装ASAR包版本132；未关闭、安装或重启个人App。只读督促配置：strict启用，目标12，quotaMinutes15，releaseMinutes15；未发现共享已连接证据。旧浏览器回执断连且无shared能力，不能当作当前活连接。Windows窗口捕获两次超时，未能可靠观察当前计时；不冒称已备份或暂停。NAS客户端未在本机应用/窗口清单发现，需用户提供入口；未改NAS。凭据、个人记录、访问地址不进入本回执。

## Learning与回滚

无新增跨任务实证教训，沿用039发行、054幂等及057跨日投影。旧版回滚前须排空wholeTask意图，保留共享服务状态；不删除个人数据。既有category-review旧即时写断言不适配QuietSync，不纳入本次通过声明。

## 固定发行回执

- 独立reviewer冻结83ffc196beafe5cb8613ede663c8610df793f003复核PASS，无P1/P2，工作树干净。干净构建、NSIS成品内ASAR与win-unpacked一致；131个构建文件逐字节核验；隐藏隔离成品启动通过。artifacts/p096-release-build.log、p096-package.log、p096-package-verify.log、p096-inner.log。
- 五资产远端大小/SHA256与本地全部一致，固定annotated tag指向83ffc196；公开135为prerelease且未设Latest，旧134资产未变。artifacts/release135-remote-draft.json、release135-remote-public.json。发行页https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.135 。
- 真实公开134安装包下载SHA256与原验收一致，包内b8e1b73/134 provenance核验；其实际updater发现135，errors=[]、下载0、自动安装false。真实132 updater同样发现135。artifacts/release135-live-update.json、release135-live132.json。未伪改旧版本号冒充更新检测。
- 本地135包已通过stage-local-update原子准备，未安装/重启。用户后续截图确认NAS Docker开关关闭、已有本地数据卷；一台电脑需外网访问。详细待实施项、候选配置与正反验收见HANDOFF-P0-POMO-096.md，不含私人地址/凭据。
