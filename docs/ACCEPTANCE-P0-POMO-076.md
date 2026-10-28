# P0-POMO-076 浏览器控制一致性验收

DONE（实现与发行，个人Edge待用户加载）；授权/目标/四源/范围/完整链与回滚见TASK-P0-POMO-076.md。基线085faaf、实时114同源、单worktree任务分支。写前p076-t0-repro.txt用114编译控制器和原worker重现：0秒发布7秒有效状态，4秒扩展读取，5秒农场健康更新，但页面7秒先解除到9秒再次读取才重锁；9/12始终未达标。不是把用户截图当作内部时序证明。

修复只分开AW采样新鲜度与控制消息交付有效期：AW仍7秒；发布完成时生成独立租约，新host/worker实际回执control-lease-v2后20秒、旧配套7秒，午夜截断。host与worker严格识别leaseVersion1/2及各自7/20秒上限，过期不续；new host向old worker截为v1/<=7秒，避免App先升级造成全部拒收。v1帧、权限/key/origin/频率不变，没有新timer/进程/逐秒I/O。旧配套UI明确待更新，用户须App更新配套→Edge重新加载→刷新两站，不能冒称个人Edge已生效。

content pageshow重新取控制、pagehide清理，复用原1秒计时器重挂断开overlay；document_start根未就绪不报错。请求epoch防止迟到getControl解除后到的新push，不额外建立观察器/轮询。显式ready=false/断连仍解除，真正停止更新最多20秒后过期；原目标/放行/额度/进度及冷静恢复不改。

p076-policy-tests.txt 22/22 PASS：control-lease新增15组phase(0/1/2/3/4秒)×queryDelay(0/2/6秒)各120秒100ms模拟，9/12在首次交付后无空档；旧/过期/foreign回执不启v2，AW失效/关闭/午夜仍释放，未知/过长/NaN/过期lease拒绝，达标显式放行仍通。原worker恢复门禁/epoch/串行/单连接、真实host framing/origin/超长/私字段去除、每日锁冻结/重启/源等继续通过；真实host新增新能力协商与旧worker输出截断正反。

p076-build-working.txt构建成功；p076-full-chain.txt原daily-focus-lock真实隐藏静音main/preload/UI→实际生成CMD/Electron Node host四字节帧→真实worker源码(合成Chrome transport)→真实静音canvas视频，原任务链+新错相80次200ms采样连续遮罩/暂停，一条native连接。AW发布刻意与native轮询错开2秒；DOM删除后复位、pagehide/pageshow恢复、迟到无控制callback不能抹新锁，页面始终仅一个计时器。结束断连清罩/清timer，原12/12显式放行/到期/额度/拒降级/存储边界仍通。合成注册adapter，真实注册/个人Edge/profile/云写均0；测试transport不是个人浏览器平台验收。

官方原文核对Chrome Native Messaging与HTML Standard生命周期链接见执行卡；当前公开文档不冒充固定版安装或个人实机成功。固定依赖未更新，实际4字节协议与页面DOM能力由本机完整链验证。待冻结独立复核与最终同源包/本机stage/公开五资产/真实114原更新器验收。

review_scientific_rest独立只读复核固定27a1f5e90eb3f4ce786d23372ba1ed20c1a86981 PASS，无阻断；新旧协商、7/20秒上限、绝对截止不续、午夜/失联释放与页面epoch逐项核对，原始22/22及全链6组证据匹配。p076-build-final-clean.txt干净同源构建成功，p076-policy-final.txt22/22、p076-full-chain-final.txt实际静音全链6组通过；p076-manifest-check.txt固定114 manifest相比只version变1.2.0，permissions/key/范围均不变。

p076-package.txt、release115-package-acceptance.json/package-verify.txt：成品273个build文件与ASAR逐字节一致，必需原生资源存在，随机profile成品静音隐藏启动退出0。NSIS85,712,377字节/SHA256 6761c022b9dadc0065d31db48bf66f0d1b9ddeecd241835db02b85cbcb8db1a3；五资产及feed SHA512一致。先stage本机115，再完整回读alreadyPrepared=true（release115-local-stage.json/local-reread.json），不从远端下载，不自动安装/重启个人App或重载个人Edge。

release115-draft-verify.txt/public-verify.txt与remote-draft/public.json：草稿426473469五资产大小/摘要核对通过且无公共tag，推固定annotated115 tag后立即公开非Latest，asset IDs保持；旧114资产和发布时间不变，Latest仍51。地址https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.115 。源码原push:focus非强推成功；最终仅本卡/验收/模块Learning收口，不改已发布tag与安装包。

release115-prior-verification.json核对114安装包SHA256 a09b7e75957f3b49b9eb7f9f20901f075931277868e5318f7629ec7e70b81e01等于公开摘要；release115-live-update.json/txt用实际原114 ASAR/source7598fdc及其原updater发现available115，文件/85,712,377字节/SHA512与本机feed一致，errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。

用户生效步骤：设置→重启以加载更新；科学专注→设置策略→安装／更新浏览器配套；Edge扩展页重新加载番茄农场，再刷新B站／小红书。面板在新能力实际回执后显示稳定连接已确认。当前未验证个人Edge，也未把用户截图内实际相位当作取证；这是交付后用户需完成的配套加载步骤，不自动扩大权限。

Learning-Review: recorded - LEARN-P0-POMO-076-01。独立review_scientific_rest接受多级采样/交付租约分离候选，证据为旧空档反例、15组相位/延迟模拟与实际错相全链；仅本模块Learning同原子提交记录，20秒不作为通用默认值。沿用065恢复顺序/039不可变发布/067测试隔离，原candidate检查点已处置。
