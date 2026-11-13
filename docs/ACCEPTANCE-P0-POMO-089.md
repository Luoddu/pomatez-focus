# P0-POMO-089 · CP1 开源纯策略适配

部分确认；任务仍IN_PROGRESS。此回执仅覆盖纯策略源码，不是系统封禁、15分钟严格执行或晚间提醒的完成证明。

- 基线4b550bd46f3074f07c5b1f9483eb019b1194d282；开工卡22bfd38d21c01119fb895ab9bfd0bddccf233d35。实时remote同基线，独立worktree无重叠写者。四源结论见任务卡与third-party/focuser/SOURCE.md。
- 固定Focuser v0.11.5 / 14cbfdb3d55d3bc669bc9a39a6eddb9915e61844，六个原文快照SHA-256重新计算一致，MIT完整保留。只移植域名边界、精确进程匹配和关闭阶段，没有运行上游二进制/下载代码。
- `node node_modules/typescript/bin/tsc --project app/electron/tsconfig.json` PASS；首次发现本仓低target不支持直接遍历Map，改为Array.from后编译通过，未变更编译器或target。
- `node --test tests/strict-supervision.test.cjs` 6/6 PASS。正反覆盖明确平台/游戏目录和工作程序/相邻目录；HTTP(S)域名与恶意后缀/查询参数；系统/self/未知身份排除；30秒宽限及单次terminate意图；退出清理、PID复用、动作前身份复核；时间回退/NaN后恢复。
- 独立review_local_editing对原文、diff与测试只读复核：初次P2指出回退后lastNow未重置导致长期无动作；已修正并增加恢复正例，二次独立6/6 PASS，结论检查点可保留。没有把review结论泛化为全功能DONE。
- 不存在实际进程终止、系统设置修改、个人App重启、云数据写入或扩展权限变化。当前模块没有运行调用方，仅纯策略；后续必须接入经过身份重读验证的执行器，不可直接将动作数组当授权进程清单。
- 已知剩余：Windows执行器与隔离fixture完整链；请求级游戏网站/下载阻断及扩展权限；工作日设置门禁/累计900秒许可与失联保护；22:59提醒与启动/休眠/退出边界；完整UI与实际打包验收。详情见STRICT-SUPERVISION.md。未发布未验收产物，客户端仍126。
- Learning-Review: none — 本检查点是窄移植及实现缺陷修正，尚无新完整运行链证据；上游机制和设计边界保留在来源记录，不充作已验证本机教训。
- 回滚：还原本检查点显式新增源码、测试和文档即可；无运行数据/系统改动需要撤销。下一步仍按P089卡逐项集成，不能只凭这些测试启用个人环境拦截。


## CP2 集成验证（待最终发布收口）
- 当前版本分配0.1.0-preview.127；原安装版只读核对为126，未因此宣称已安装127。
- 实现：StrictSettings持久单向启用；DailyFocusLock工作日12/900不可改，继续复用有效记录与AW合计。AW投影现有watcher最早已确认时间水位；未知尾部按最坏连续使用扣减可许可截止，没有第二账本。旧每日锁/周末路径仍可用。
- 真实进程链：GameGuard通过Windows PowerShell/.NET Process执行，持有句柄后复核PID/创建时间/路径，同会话、低PID/自身排除；30秒宽限、一次终止意图、失败按身份保持可见。两个唯一名称自建C#程序证明目标关闭、工作邻居存活；原生错身份拒绝。tests/game-guard-native.test.cjs 2/2 PASS，不把同名个人PowerShell当目标。
- 浏览器配套1.3：DNR动态规则只阻断列明游戏域名；显式resourceTypes包括main_frame。固定实测Edge157.0.4341.46 / Chromium revision a0c6bd61d7884b3c402a34c67d05100107a9e5e4；scripts/test-strict-browser.cjs真实浏览器testMatchOutcome正反、映射至loopback的模拟setup.exe被ERR_BLOCKED_BY_CLIENT阻断且服务器零命中，正常科研页面命中，重启规则保留。无真实外部下载/个人profile。
- 官方依据：https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest/（当前官方文档注明Chrome84+、testMatchOutcome103+，resourceTypes默认排除main_frame）；Edge所报revision不在Chromium GitHub镜像（固定ref404），没有伪称取得匹配源码。采用公开API并以已记录固定本机版本实测，不改上游包。Windows接口依据.NET Framework4.8 Process.CloseMainWindow官方文档，强制终止范围只在目标身份复核后执行。
- 测试工具定位：最初按background.js误选Gemini内置扩展，改为manifest公钥ID；长隔离路径引起LevelDB创建失败后使用短临时profile；私有块级函数不能从CDP全局调用，改为公开storage+重启路径。以上是测试定位，未修改个人浏览器。
- 失效路径：严格标志先锁存内存再做存储/DNR；恢复/getControl串行等待，失败保守限制娱乐页面；内容脚本初始和许可过期均保护，配套断线不获得免费额度。存储写失败、DNR失败、native不可用、之后修复恢复均有正反测试；网站规则单独回执，失败不声称网站已覆盖。
- 晚间提醒：22:59一次，稍晚启动补提示，回读防重复；失败当天不高频重试。原生warning对话框、农场置顶/提示音，结束后恢复原置顶。没有自动保存/关机/关闭工作应用；退出App或系统强制结束后不声称仍提醒。
- node scripts/test-focus-all.cjs：527/527 PASS（原始artifacts/p089/all-tests.txt）；随后新增GameGuard完整进程链2/2，以及激活副作用失败/恢复和目录保护回归通过。受影响最后一组strict-integration共11项PASS。生产构建PASS。
- node scripts/test-strict-desktop.cjs：真实main/preload/renderer启用能力门禁、持久启用、达标后checkbox仍勾选且禁用、设置拒绝绕过、headless不扫描个人游戏、实际内容脚本冷启动/过期/正常放行PASS。旧node scripts/test-daily-focus-lock.cjs六组桌面链PASS，旧模式断线释放未变。
- 自定义目录只能通过具体目录选择器增加，拒绝用户/系统宽泛根及系统/农场子树，持久回读与重复添加测试通过；headless不打开个人选择器。默认范围是列明平台名称及Steam/Epic默认目录；未宣称识别所有未知游戏/镜像或覆盖未安装配套的浏览器。
- 独立复核指出的关闭失败丢失、冷启动恢复竞态、首次严格激活副作用失败回退已逐项修复并回归；最终冻结diff复核待回执。
- Learning：新增LEARN-P0-POMO-089-01，证据为本回执及真实浏览器测试。其他缺陷是本轮实现修正，未另造重复教训。

- 最终回归：artifacts/p089/final-tests.txt 531/531 PASS；最终生产构建与strict desktop PASS。独立review_local_editing再复核当前diff、受影响23项独立PASS、原始531结果和Learning，未发现剩余P1/P2，可进入冻结和发布门禁；个人激活不在合成结果内。


## CP3 固定包与发布验收
- 已验证：产品冻结commit386bdff3331045bdc73bba494a31d418a54427fa，版本0.1.0-preview.127；独立review_local_editing对冻结commit复核PASS。仅本卡及验收文档收口，无产品代码再次变更。
- 531/531回归、生产构建、隔离打包smoke及108个构建文件逐字节核对通过。NSIS解出的app.asar与win-unpacked一致，SHA256为4fa6be437f977260ecb23c12f9cb668ecb515f5b90af2ef2a5eb6ba07aef729e。
- 安装包83125324字节，SHA256为89e81e5d26a3345b433d26b4d1cd52a9ffeba49c7c9780a616e9e38b848051ac。原始证据artifacts/release127-package-acceptance.json及artifacts/p089/package.txt。
- 已验证：本地stage helper准备127，同字节再次执行返回alreadyPrepared=true；没有结束个人App或直接替换运行ASAR。个人安装版只读回读仍126，不能把准备包视为安装完成。
- 已发布：https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.127 ，release443827221；预发布保持prerelease=true，Latest不变。五资产远端size/SHA256均匹配，旧126资产及发布时间未改；annotated tag固定到上述产品commit。证据artifacts/release127-remote-public.json。
- 原126真实updater在发布前判定current126，发布后判定available127，feed文件与固定包一致，errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。证据artifacts/release127-live-update.json。
- 待完成：个人App安全重启安装、浏览器配套1.3重新加载并确认权限、严格模式启用及真实状态回读。Windows窗口激活失败且截图FrameArrived超时，已停止不可靠UI尝试并请用户使用现有“重启以加载更新”入口；不强制杀进程，不宣称个人防护已生效。
- 并发：冻结后status干净、HEAD未漂移，另一worktree无本任务写集/运行资源冲突；本检查点仅两份文档。四源预检沿本卡，无新第三方运行语义。
- Learning-Review: none — 同一发布验收链的DNR教训已在386bdff的LEARN-P0-POMO-089-01记录；本次包摘要和发布回读未产生新的通用工程结论。
- 回滚：保留126公开安装包及个人App原状态，127仅通过保存/备份入口安装；不迁移或删除专注记录。未完成个人激活前任务保持REVIEW，不标DONE。


## CP4 128修复验收（冻结前）
- 已验证：127安装及1.3.0配套字节一致，Node20.19.1/Electron34.5.8宿主启动正常。初查严格模式未启用，之后窄回读发现已启用且曾strictCapable/gameRulesReady=true，但当前连接断开。截图的版本更新与连接激活是不同状态。
- 卡顿分类：日常偶发整窗停顿的完整个人复现仍unknown。5秒采样曾见主进程1.5625 CPU秒，渲染/GPU各0.015625秒，不据此归因。没有读取浏览历史或记录内容，没有关闭个人程序。
- 确证缺陷一：同步registry读取231ms期间0ms定时器不能执行，232ms后才触发。Node20.19.1官方child_process文档L190/L767明确阻塞机制；现改execFile异步、固定脚本/stdin数据、10秒timeout及16KB输出边界保持。实际隔离registry读取200ms期间13次timer，安装互斥拒绝重入、失败后正常再安装。来源 https://nodejs.org/download/release/v20.19.1/docs/api/child_process.html 。
- 确证缺陷二：原strict worker收到阻断状态后反复receipt，宿主回复状态构成闭环，无心跳100ms触及21消息上限；1.3.1按连接/日/提醒/reason去重确认，放行和断线清理。新增真实native host加worker完整闭环证明首次2帧、1次回执，心跳不重复，新提醒回执仍通，断线仍限制。
- 目标测试18/18 PASS（artifacts/p089/cp4-targeted.txt），全回归534/534 PASS（artifacts/p089/cp4-all-tests.txt），生产构建PASS。桌面首次失败是清理阶段未await新异步read，产品链已执行；补齐测试等待后桌面六组PASS及每日锁六组PASS。未通过失败样例不充作成功证据。
- 独立review_local_editing无P1/P2；其独立17/18 PASS，剩余随机HKCU测试项在fixture创建时遭沙箱拒绝，未进入产品断言。主执行方在获准隔离注册测试环境18/18通过，明确区分两份证据。独立真实宿主闭环及事件循环响应通过。
- Learning已记录LEARN-P0-POMO-089-02；原生同步阻塞沿官方机制及本次验收保存，没有把推测性日常性能根因写入Learning。发布/个人128安装及1.3.1重载另行回读，当前不标DONE。

- 严格桌面验证曾失败：原fixture返回空history，renderer的0进度异步覆盖手工注入12；已使用合成12记录并等待真实renderer投影完成后注入监测。cp4-strict-fixed.txt PASS，未修改产品计数或放行门禁。浏览器桌面清理的成功/异常路径均已await异步注册读回。
- 最终独立复核PASS：复核534原始结果、修正后的三条桌面链及Learning，未发现P1/P2，允许冻结CP4；个人卡顿和断线恢复仍须交付后确认。


## CP4 固定128交付
- 产品commit c7268d94daa258dd11b8ee077c7f932cc46f820e，独立冻结核对PASS、工作树干净；干净生产构建、108文件包源对照及隐藏smoke PASS。NSIS内ASAR SHA256 cd4acbd5a524facdfa0faa8c6c0cb9ede2988898288315e300ef9fb5751089c3，与win-unpacked一致。
- 128安装包83130514字节，SHA256 d9d4b4dc40e35e3792514a3784b3182c6f03418f8ae92bc28114d4a47611aac1；stage-local-update两次回读已准备/幂等通过。
- 已发布 https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.128 ，release443866904，annotated tag固定上述产品commit；五资产远端size/digest一致，旧127和Latest保持。证据artifacts/release128-remote-public.json。
- 真实127更新器发布前current127、发布后available128，feed匹配，errors=[]、downloads=0、自动下载和退出自动安装均false（artifacts/release128-live-update.json）。
- 既有个人配套更新为1.3.1：先核原五文件与127包一致，再核key/permissions/host_permissions/content_scripts与新版完全一致，调用既有BrowserControl.install，五文件读回匹配。未扩权限、未另建注册项、未关闭个人进程；浏览器实际重载仍待用户。
- 最终窄回读：个人App127、配套文件1.3.1、严格配置存在且此前已确认strictCapable/gameRulesReady，当前receipt disconnected且过期。128包准备不等于安装完成，配套文件更新不等于worker重载，不标个人链DONE。
- 未完成项：用户从保存/备份入口重启到128、Edge重新加载配套，再验证连接与正常使用响应。日常偶发整窗卡顿没有完整现场复现，本次仅关闭两项有证据缺陷，不声称全部根治。
- 回滚：127公开安装包和固定源码保留，配套原字节可从127包恢复；不回写或删除个人番茄历史。Learning沿c7268d9的089-02，本发布读回没有新增可复用结论。
