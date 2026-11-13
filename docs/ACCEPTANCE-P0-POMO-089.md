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
