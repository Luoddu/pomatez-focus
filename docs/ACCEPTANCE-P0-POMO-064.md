# P0-POMO-064 任务级选择验收

已验证：按任务选择实现、正反/构建、独立源码/包源/公开交付复核均通过；preview.100已发布，真实公开99更新器能发现100。四源/授权/允许范围/回滚引用TASK-P0-POMO-064.md。根仓/真实用户App/profile/飞书数据未读写，保留当前99来源、权重/偏好/启动等其他电脑已发布变更。

FocusTimer复用groupTasks原稳定taskId/local id分组与parseTitle去序号/排序。select value为group.key，显示group.name，不加番茄序号/重复象限前缀；自由番茄保留。确认时才把所选group映射到最新候选的第一个未done/pending/free行的精确id；当前group优先active.task.id，不倒退到最小序号。当前组完全不在候选时显示当前任务保留项。失效group不能确认，也不回退误绑自由或同名其他任务。原onChangeTask/withPendingCredit/timer.changeTask保持，不改业务计时/记录/同步实现，没有新存储/schema/后台或每秒I/O。

artifacts/p064-all.txt 全逻辑429/429；p064-prebuild.txt生产构建成功，未安装/升级依赖。p064-desktop.txt实际main/preload/renderer合成实链6组：8槽位合并为一个task选项且无序号；不同taskId同名仍分两项；raw无序时自动选最小可用2（done1排除）、准确p1；free→task保持session/start/elapsed、不提前sync；取消继续tick、暂停时task/free更换保留所有计时字段；重载仍原归属且描述更新/清空正常；所选t2刷新消失但同名另一任务存在时仍禁止确认且保持p1，恢复t2能正常选p2；最终仅一次确认sync精确p1，之后直接从看板启动p3，重选同任务不会退p1，当前组完全失效仍保留p3的暂停计时快照、无第二次保存。测试随机隔离profile、headless窗口不可见、--mute-audio；未触及真实任务/网络传输，合成sync调用只计断言，不是实际云写。

旧版基线：下载公开99 setup/source/SHA256SUMS到ignored public99；与GitHub公开asset.digest/size及已记录SHA256 1b29ef6ea71b46a605ce25f10b007d85d2bbbe428d307c706a8b44705b2f60c3匹配。7za仅提取resources/app.asar，不执行安装器；包内版本99/source3a129a8bebe6908b81c323f745b920b71ee11669/dirty=false与公开来源JSON一致。p064-public99-asar.json、extract原始输出保留。tests/verify-published-update.cjs真实旧99 updater发布前current，errors=[]、downloads0、autoDownload/autoInstallOnAppQuit=false，release100-before-update.json；不把当前个人已安装版本当测试来源。

Learning none：本轮是既有稳定ID任务分组与精确plan切换的薄UI映射，未形成新的跨任务运行/安全/缓存机制；记录业务正反证据，不重复新增根或模块Learning。独立复核若有候选先处置再封版。回滚选择框/版本提交，无数据迁移，旧99和已发布版本资产保留；用户仍手动检查安装新版本。

封版与发布：源码3cd33818dfa2e1ccf3a7d61cbf78826ad02a887b，source-version dirty=false、version0.1.0-preview.100。p064-build.txt为最终clean构建；release100-package-acceptance.json / package-verify.txt逐字节比较201个build文件与ASAR，NSIS-only、隔离隐藏静默成品启动status0；feed指向唯一setup，大小/SHA512一致。安装器84044962字节，SHA256 b69e712b90b8b9dca0de6d0e8cef68fb0c7c8b68e154e7a112ffcd6f079f3fe4；blockmap SHA256 2084f1b26f91c394c64476b838aaeaeae69649a885d98dc07ff4a73bc600ffa2。其余preview.yml/source-version.json/SHA256SUMS.txt与五资产完整哈希见该JSON及release100/SHA256SUMS.txt。

公开地址：https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.100 。先draft上传5资产并核对哈希/大小，冻结HEAD annotated tag经hook推送后公开prerelease，未设Latest。release100-remote-draft.json / remote-public.json核对5资产、同asset ID、peeled tag源码3cd、旧99资产和发布时间不变。首次只读verify未继承该clone所需safe.directory环境，origin识别失败；补回已有单命令Git配置后验证通过，未重复上传、未改全局配置或产品。release100-latest.json确认稳定Latest仍preview.51。

release100-live-update.json / updater-raw.txt / live-check.txt使用实际公开99 ASAR内更新程序（source3a129a8bebe6908b81c323f745b920b71ee11669，updaterSHA256 4fabae8cebf6859d8c4907c12bc6eced4a83318ecfdd0247f1ac13f4cc2193eb），phase available、current99、version100；setup URL/size/SHA512逐项匹配feed，errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。没有运行安装器或更新个人App。

独立复核：既有review_scientific_rest对固定3cd源码、包源及最终公开交付均PASS，独立重算包文件和哈希并回读原始JSON，未发现阻断；不以实现者聊天替代证据。已完成与待用边界：合成生产实链、成品启动与旧更新器发现新版通过，个人App升级及真实任务由用户自行检查/安装。本次没有数据迁移。Learning候选无新增，独立复核认可既有薄UI分组/精确映射理由。
