# P0-POMO-065 冷静恢复验收

部分确认：恢复逻辑与复核发现的启动交错已修，433项全逻辑通过；最终冻结的静默桌面、独立复核与包源/公开旧更新器链待补。四源预检、授权/禁止写集、资源/预算、根因与回滚以TASK-P0-POMO-065.md为准；未修改个人策略、扩展加载状态、生产注册或用户任务/时间数据。

根因：100版worker在督促关闭/ready失效及release清until但保留key。原同key合法消息恢复不fresh，没有截止可恢复；当时晚间现场仅证明连接/策略有效，不把此机制等同所有可能漏拦。p065-before.txt两条新增精确负例旧代码失败，first blocks/off释放/on同key不拦；p065-after.txt修后9/9专项通过。

修正：只保留内部绝对截止until；无效/关闭/断连投影仍pause=false、blockedUntil=0、expiresAt=0，保持fail-open。合法同日同mode恢复时继续原截止，模式字段防额度的次日截止误带入冷静档；有效剩余期从无控制转恢复时暂停并回传实际回执。重复心跳不延期，旧截止已过不重放；mode改变/跨日清旧截止，新key仍按既有冷静规则。storage.session沿现有字段容器保留deadline，无新文件/定时器/轮询/网络/端口/协议。旧无mode会话不继承不可确认模式的期限，未来新提醒正常；无用户数据迁移。扩展manifest1.0.1，固定key和权限保持。

p065-all.txt 431/431（既有429加2），实际原worker VM覆盖on/off、无效/过期租约、重复心跳、reminder清空、截止已过、新key、模式变化/跨日、断连重连、storage.session worker恢复、单轮询timer和原epoch旧clear竞态。原真实stdio、异来源拒绝、超限拒绝和正常status/receipt仍通。p065-prebuild.txt生产构建PASS；首次命令缺少该clone命令级safe.directory导致构建门禁拒绝，补回既有环境后通过，未改全局配置或绕过门禁。

p065-desktop.txt / p065-browser-desktop.json 6/6：隐藏实际main/preload/renderer设置IPC→生产投影→安装到隔离profile的CMD/Electron Node host→二进制NativeMessaging→原content脚本与静音canvas video；原提醒暂停/回执，关闭真实设置IPC解除遮罩能播，重新开启使当前提醒清空但仍恢复原截止/再次暂停/拒播，模拟到点后能播，新原生提醒再次暂停。该到期验证只在合成视频renderer内推进Date.now，不更改系统时间；host用真实时钟与原租约。真实临时HKCU UUID+owner测试项正常注册/回读后清理，生产注册和个人Edge写入0。过程中fixture旧receipt回复未出队、模拟时钟返回函数不可克隆、共享fixture提醒被配置清空后原弹窗断言超时，分别由具体现场修复测试数据流，不对产品追加局部补丁。最终exit0/6PASS；退出时原提醒renderer触发的readPreferences不可信sender被既有门禁拒绝，非新增权限放宽，未扩改范围外窗口代码。

旧更新器基线：release101-old100-before.json冻结公开100资产；本地保留setup SHA256 b69e712b90b8b9dca0de6d0e8cef68fb0c7c8b68e154e7a112ffcd6f079f3fe4与GitHub公开digest/size一致，经7za只提取真实安装器ASAR，未安装。p065-old100-asar.json绑定公开源码3cd33818dfa2e1ccf3a7d61cbf78826ad02a887b/dirty=false/version100。release101-before-update.json真实公开100更新器发布前current、errors=[]、downloads0、自动下载/安装关闭。

Learning暂none：本轮是既有去重标识与绝对截止/临时控制租约分离的恢复缺陷修复，没有新第三方机制；沿原epoch/串行队列守住旧回调不覆盖新连接。若复核有跨任务候选须先明确处置。回滚显式revert本次worker/版本，无用户数据迁移；旧100及资产不改。

复核修正：a4ba候选101已完成本地包，但独立reviewer与主实现分别用延迟storage.get的纯VM确认，在activation先连时原剩1分钟会被同key重设完整5分钟；p065-restore-race-before.json保存原始复现。101未tag/推送/公开，保留本地证据，不替换其包，新冻结升级102。所有connect统一等待一次session恢复Promise，恢复前无native连接/decide/写入；失败不连接/不定时重试，仅一次无敏感字段诊断，保持页面可用。p065-after.txt最终11/11，新增deferred get期间并发activation/install/startup、不写不连；恢复后单port/timer、同key保留剩余截止、新key正常；get失败0连接/0timer/0写入/一次诊断。原singleflight测试配合明确await恢复后再放行query，不改变产品期望。p065-all.txt最终433/433，取代初轮431数字；原始初轮与fixture修正叙述仍作定位证据，不代替最终验收。
