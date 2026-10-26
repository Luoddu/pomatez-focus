# Learning.md - 番茄农场独立模块工程教训

<!-- LEARNING_SCHEMA_V1 -->

仅保存本独立仓库已验证、可用于后续农场任务的工程教训；任务状态只看模块执行卡。本文件不写入、不替代澄行根Learning及根路线图。

## LEARN-P0-POMO-067-01 - 实际安装器测试隔离不能只依赖父环境

- Status: VALIDATED
- Source-Task: P0-POMO-067
- Evidence: docs/ACCEPTANCE-P0-POMO-067.md; tests/local-update-installed.cjs
- Applies-To: 本模块通过真实NSIS安装器或其他已验证外部launcher启动、重启专用合成App的隔离测试
- Lesson: 固定app-builder-lib25.1.8的StartApp走StdUtils.ExecShellAsUser，只传--updated；本机两版boot均记录incomingProfileMatches=false。仅在启动installer父进程设置POMATEZ_PROFILE/POMATEZ_HEADLESS不能证明重启仍隔离。专用fixture在require生产main前固定自己的随机profile和静音后，真实NSIS1→本地updater→NSIS2的records、暂停计时与一致备份均保留，测试产品正常卸载；独立复核已回读官方模板hash与两版boot/重启证据。
- Required-Check: 专用测试入口先固定并验证隔离profile/静音，再加载生产模块；记录实际启动链的隔离凭据和新旧版状态一致性。跨installer/launcher的测试不能只验证leaf或父进程环境；产品用户目录仍沿原配置，不借测试迁移。
- Supersedes: none
- Invalid-When: 换installer/launcher或启动方式时须重新实链验证；不泛化所有launcher都丢环境，也不授权修改生产profile或安全设置。

## LEARN-P0-POMO-065-01 - 持久恢复完成前不能进入首个控制决策

- Status: VALIDATED
- Source-Task: P0-POMO-065
- Evidence: docs/ACCEPTANCE-P0-POMO-065.md; tests/browser-control.test.cjs; app/electron/src/assets/browser-control/background.js
- Applies-To: 本模块MV3 worker从storage.session恢复已处理提醒key和绝对冷静截止、同时存在activation/install/startup可重入连接入口的后续改动
- Lesson: 冻结a4ba的正常恢复通过，但延迟storage.get并提前activation可先建原生连接，把同key旧剩余1分钟当新提醒写为完整5分钟；迟到恢复也不能立即撤销已下发页面控制。独立复核和主实现分别复现；a2beef用一次共享恢复Promise门禁让current恢复先于任何port/decision/write，deferred正反证明原截止不延长、新提醒仍通。
- Required-Check: 所有可重入连接入口共同等待同一次恢复，等待后复核epoch/owner；测试挂起恢复时并发activation/install/startup无连接/写入，恢复后同key继续原截止、新key仍正常、仅一个轮询timer。恢复失败保持fail-open、无自动重试/timer/写入且诊断有界；不能只测get立即返回的正常顺序。
- Supersedes: none
- Invalid-When: 不再持久恢复去重key/绝对截止，或改为另一已验证原子恢复/事件串行机制时重验；不泛化为所有异步读取都必须阻塞UI，不授权增加浏览器权限或建立另一统计源。

## LEARN-P0-POMO-039-01 - 草稿不能替代旧版更新链路验证

- Status: VALIDATED
- Source-Task: P0-POMO-039
- Evidence: docs/ACCEPTANCE-P0-POMO-039.md
- Applies-To: 后续番茄农场Windows preview标签和GitHub更新发布任务
- Lesson: 本仓此次公开annotated preview.71标签的虚拟条目出现在无鉴权releases.atom中，即使对应Release仍是草稿。固定electron-updater6.8.3从Atom选择同频道标签，请求该标签的preview.yml失败时回退同标签latest.yml，不会自动回退旧70；本次feed已在草稿中，但无鉴权请求404，真实旧版因此报错。不能用draft状态证明旧版更新可用，也不能泛化为所有GitHub草稿的行为。
- Required-Check: 创建公开preview标签后立即检查实际旧版更新器，记录Atom、选中版本及结果；交付时检查公开资产与真实旧版发现新版，不能以tag、draft或GitHub页面存在替代。保留身份、数据和不可变tag门禁，不用绕过hook或替换旧资产来掩盖失败。
- Supersedes: none
- Invalid-When: 更换更新器、频道或GitHub feed行为时须用新任务原始链路复验；本条不能用于断言未经测试的仓库或草稿全部可见。

## LEARN-P0-POMO-042-01 - 手动刷新须排空最新在途查询再失效缓存

- Status: VALIDATED
- Source-Task: P0-POMO-042
- Evidence: docs/ACCEPTANCE-P0-POMO-042.md; tests/activitywatch.test.cjs
- Applies-To: 同一实例内日轮询、周统计与手动刷新共享发现/覆盖缓存的后续改动
- Lesson: 固定ee0e36a源码中，手动刷新等待入口时的daily和week promise期间，新daily可以开始；清缓存后加入新daily会把其coverageStart变成null，且跳过重新发现。deferred交错测试在旧源码精确失败、修正后通过。仅等待最初捕获的promise不能证明刷新前已无读者。
- Required-Check: 等待期间重新检查最新daily/week在途查询；排空后不跨await执行缓存失效和新单飞查询启动。验证重复手动刷新合并、交错旧查询覆盖仍完整、新查询确实重新发现，以及暂停取消后未来刷新仍可用。
- Supersedes: none
- Invalid-When: 更换缓存所有者、查询调度或并发模型时须重新验证；不泛化为所有缓存都需要全局排空。

## LEARN-P0-POMO-054-01 - 逻辑去重ID不要复用为单次文件传输槽位

- Status: VALIDATED
- Source-Task: P0-POMO-054
- Evidence: docs/ACCEPTANCE-P0-POMO-054.md; tests/journey-api-desktop.cjs; app/electron/src/assets/journey-client.cjs
- Applies-To: 本农场当前用户文件请求/回应与App单实例交接接口的后续调整
- Lesson: 同一逻辑requestId需要跨超时、重试和重启保留，而单次请求文件用wx排他创建。冻结56aa旧客户端把二者合一，残留同ID输入使后续调用EEXIST，并发caller在取得请求文件前删同ID回应也会干扰第一caller。当前客户端每调用分配独立transport UUID，Journey内的逻辑ID回执仍唯一；真实CLI双实例/renderer实链证明两个相同逻辑请求都回读去重，旧instance孤儿保留且不阻塞正常重试，不删除他人响应。
- Required-Check: 重试复用完全相同逻辑ID/版本/操作，但每次传输独立文件所有权；保存回执在Journey真相源。验证同ID并发、旧实例孤儿、不同内容复用ID被拒、旧版本不能覆盖手动修改及正常新请求仍通；不能用静默删孤儿或换逻辑ID掩盖未知提交结果。
- Supersedes: none
- Invalid-When: 改成具备请求复用/租约/回执的成熟IPC通道、移除文件传输或改变去重保存机制时须重新验证；本条不泛化为所有协议都必须两个UUID，也不代表个人Hermes工具已接通。

## LEARN-P0-POMO-055-01 - 隐藏原生CLI错误文本不能按UTF8假设分类

- Status: VALIDATED
- Source-Task: P0-POMO-055
- Evidence: docs/ACCEPTANCE-P0-POMO-055.md; tests/native-registry.test.cjs; app/electron/src/focus/nativeRegistry.ts
- Applies-To: 本农场Windows原生CLI输出用于权限/缺失分类的后续改动
- Lesson: 本机Windows reg.exe从无console Node子进程输出status1与GBK中文“系统找不到指定的注册表项或值”；UTF8乱码使旧missing正则失败，首次不存在的注册被误报为权限不足。直接PowerShell显示英语不能证明隐藏App子进程同编码。当前RegistryKey结构化结果区分null缺失和Security/UnauthorizedAccess，真实临时HKCU Unicode安装/回读/重复/foreign拒绝与清理证明正常路径仍通。
- Required-Check: 保留实际spawn环境的原始bytes/status与正确解码，不把所有exit1当缺失或要求用户升权；优先公开typed返回机制，并验证真拒绝/未知类型仍拦、正常缺失/Unicode回读仍通、stdin数据不作脚本。涉及用户真实注册时仍按授权和owner边界。
- Supersedes: none
- Invalid-When: 更换本机runtime、native工具/编码、typed API或错误分类机制时须重新验证；不泛化所有Windows工具都是GBK，也不授权改系统codepage或提高权限。

## LEARN-P0-POMO-057-01 - 按日过滤的投影缓存必须依赖同一个本地日

- Status: VALIDATED
- Source-Task: P0-POMO-057
- Evidence: docs/ACCEPTANCE-P0-POMO-057.md; tests/board-midnight-desktop.cjs; app/renderer/src/focus/FocusApp.tsx
- Applies-To: 本农场以本地日筛选待同步意图、同时希望避免秒级重算的纯UI投影缓存
- Lesson: 固定95f535的board memo只依赖任务/队列/来源；其内部projectQuickTasks读取Date.now按日过滤。实际renderer同source失败新增/减少意图跨午夜且队列未变时，旧日投影继续存在；同fixture在修复后证明旧日投影清除、同日仍有效、队列字节未变。日期筛选来自环境也属于缓存的语义输入。
- Required-Check: 取稳定本地日开始时间并同时用作memo依赖和筛选参数，避免计算/依赖采用不同时间口径；验证不改任务/队列的跨午夜、同日正常、持久意图保留和零秒级偏好存储读取，不用每秒全部重排掩盖遗漏。
- Supersedes: none
- Invalid-When: 更换本地日/时区口径、队列过滤所有者或缓存生命周期时须重验；不泛化所有memo需日期，不授权更改旧待同步意图或生成阻塞策略。

## LEARN-P0-POMO-061-01 - Windows自启动switch不出现在launchItems.args

- Status: VALIDATED
- Source-Task: P0-POMO-061
- Evidence: docs/ACCEPTANCE-P0-POMO-061.md; tests/startup-native.cjs; app/electron/src/focus/startup.ts
- Applies-To: 本农场Electron34.5.8 Windows安装版自启动状态读取及后续相关修改
- Lesson: 固定版browser_win.cc:175使用Chromium CommandLine.GetArgs，仅返回非switch参数。真实中文空格路径注册--start-in-tray后，launchItems.args为空，但openAtLogin为true；仅按args数组确认完整命令会错误报告冲突。固定版619-623的openAtLogin比较当前AppUserModelId的完整quoted path和args，结合该name/user/path对应launchItem.enabled才能区分本App的启动注册和任务管理器禁用。不能用executableWillLaunchAtLogin的any-args聚合代替本项。
- Required-Check: get和set使用相同quoted path/args，测试name与进程AppUserModelId一致；原生随机owned项验证开启、TaskManager禁用、重新开启、关闭与清理，同时保留普通手动打开和自动托盘启动正反例。
- Supersedes: none
- Invalid-When: Electron/Chromium版本、Windows登录API或自启动命令策略变化时须重新验证；不泛化为所有平台或所有args字段都排除switch，也不授权读取或修改他人启动项。
