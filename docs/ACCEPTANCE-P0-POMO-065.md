# P0-POMO-065 冷静恢复验收

已验证：恢复逻辑与启动交错均已修，102最终固定源码的433项全逻辑、6组静默桌面、包源及公开旧更新器链通过，独立源码/包源/公开交付终验PASS。四源预检、授权/禁止写集、资源/预算、根因与回滚以TASK-P0-POMO-065.md为准；未修改个人策略、扩展加载状态、生产注册或用户任务/时间数据。

根因：100版worker在督促关闭/ready失效及release清until但保留key。原同key合法消息恢复不fresh，没有截止可恢复；当时晚间现场仅证明连接/策略有效，不把此机制等同所有可能漏拦。p065-before.txt两条新增精确负例旧代码失败，first blocks/off释放/on同key不拦；p065-after.txt修后9/9专项通过。

修正：只保留内部绝对截止until；无效/关闭/断连投影仍pause=false、blockedUntil=0、expiresAt=0，保持fail-open。合法同日同mode恢复时继续原截止，模式字段防额度的次日截止误带入冷静档；有效剩余期从无控制转恢复时暂停并回传实际回执。重复心跳不延期，旧截止已过不重放；mode改变/跨日清旧截止，新key仍按既有冷静规则。storage.session沿现有字段容器保留deadline，无新文件/定时器/轮询/网络/端口/协议。旧无mode会话不继承不可确认模式的期限，未来新提醒正常；无用户数据迁移。扩展manifest1.0.1，固定key和权限保持。

p065-all.txt 431/431（既有429加2），实际原worker VM覆盖on/off、无效/过期租约、重复心跳、reminder清空、截止已过、新key、模式变化/跨日、断连重连、storage.session worker恢复、单轮询timer和原epoch旧clear竞态。原真实stdio、异来源拒绝、超限拒绝和正常status/receipt仍通。p065-prebuild.txt生产构建PASS；首次命令缺少该clone命令级safe.directory导致构建门禁拒绝，补回既有环境后通过，未改全局配置或绕过门禁。

p065-desktop.txt / p065-browser-desktop.json 6/6：隐藏实际main/preload/renderer设置IPC→生产投影→安装到隔离profile的CMD/Electron Node host→二进制NativeMessaging→原content脚本与静音canvas video；原提醒暂停/回执，关闭真实设置IPC解除遮罩能播，重新开启使当前提醒清空但仍恢复原截止/再次暂停/拒播，模拟到点后能播，新原生提醒再次暂停。该到期验证只在合成视频renderer内推进Date.now，不更改系统时间；host用真实时钟与原租约。真实临时HKCU UUID+owner测试项正常注册/回读后清理，生产注册和个人Edge写入0。过程中fixture旧receipt回复未出队、模拟时钟返回函数不可克隆、共享fixture提醒被配置清空后原弹窗断言超时，分别由具体现场修复测试数据流，不对产品追加局部补丁。最终exit0/6PASS；退出时原提醒renderer触发的readPreferences不可信sender被既有门禁拒绝，非新增权限放宽，未扩改范围外窗口代码。

旧更新器基线：release101-old100-before.json冻结公开100资产；本地保留setup SHA256 b69e712b90b8b9dca0de6d0e8cef68fb0c7c8b68e154e7a112ffcd6f079f3fe4与GitHub公开digest/size一致，经7za只提取真实安装器ASAR，未安装。p065-old100-asar.json绑定公开源码3cd33818dfa2e1ccf3a7d61cbf78826ad02a887b/dirty=false/version100。release101-before-update.json真实公开100更新器发布前current、errors=[]、downloads0、自动下载/安装关闭。

Learning recorded LEARN-P0-POMO-065-01：初判none后，独立复核与原始VM确证恢复持久去重/截止前的可重入事件会重复处罚，形成窄适用范围的初始化门禁教训。已采纳，由模块owner/root在本次收口同commit记录本模块Learning；证据指向本验收和deferred正反测试，不写根Learning，不以“无新第三方机制”否认已验证教训。回滚显式revert本次worker/版本，无用户数据迁移；旧100及资产不改。

复核修正：a4ba候选101已完成本地包，但独立reviewer与主实现分别用延迟storage.get的纯VM确认，在activation先连时原剩1分钟会被同key重设完整5分钟；p065-restore-race-before.json保存原始复现。101未tag/推送/公开，保留本地证据，不替换其包，新冻结升级102。所有connect统一等待一次session恢复Promise，恢复前无native连接/decide/写入；失败不连接/不定时重试，仅一次无敏感字段诊断，保持页面可用。p065-after.txt最终11/11，新增deferred get期间并发activation/install/startup、不写不连；恢复后单port/timer、同key保留剩余截止、新key正常；get失败0连接/0timer/0写入/一次诊断。原singleflight测试配合明确await恢复后再放行query，不改变产品期望。p065-all.txt最终433/433，取代初轮431数字；原始初轮与fixture修正叙述仍作定位证据，不代替最终验收。

最终源/包：a2beef74d9531043602e6fc4c3357849493d534d / 0.1.0-preview.102 / dirty=false；p065-build.txt最终clean构建、p065-desktop.txt/JSON同源6/6。release102-package-acceptance.json / package-verify.txt独立重算205文件与ASAR逐字一致，原生配套/旅程入口均在，NSIS-only，真实成品--mute-audio随机profile隐藏启动status0。扩展1.0.1、固定key和权限未变。setup84129122字节/SHA256 f2a024a8751458f9621b98d5b0a100083b89449884a0a0879764cdfde446a33d；blockmap89799字节/SHA256 275d480ef6edb73893fa20c879438e20875315a20d1509d2c8e04c2ba51da13d；五资产完整sha/size及setup SHA512见该JSON/feed/SHA256SUMS.txt。

公开交付：https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.102 ，先draft五资产核hash，再同a2 clean HEAD的annotated tag经hook推送后公开prerelease、不设Latest。release102-remote-draft.json / remote-public.json验五资产hash/size、assetID不变、tag==a2、旧100原assets/发布时间不变，release102-latest.json稳定Latest仍51。首次create TLS握手超时后，view与list双读确认不存在才重建唯一草稿，未盲重放；公开后只读git ls-remote30秒超时一次、同检查重试通过，未重发tag/资产/公开动作。

release102-live-update.json / updater-raw.txt / live-check.txt使用前述真实公开100安装器提取的更新器，previous100/source3cd、phase available、version102，文件URL/size/SHA512与feed逐项匹配；errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。review_scientific_rest独立回读JSON/helper及包文件给出源码/包源/公开交付三项PASS，原a4初始化P2已关闭；未以聊天自述替代证据。

用户生效边界：未安装/重启个人App、未复制或重新加载个人Edge配套；用户须App设置检查安装102，然后科学专注设置点“安装／更新浏览器配套”，Edge重新加载同ID扩展，再刷新已有B站/小红书页。合成实链与公开更新可用已验证，个人浏览器实际拦截仍须更新后确认，不把先前只验证连接当完整视频拦截验收。无新增轮询/进程或用户记录迁移。
