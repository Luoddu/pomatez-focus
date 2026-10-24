# P0-POMO-064 任务级选择验收

部分确认：按任务选择实现/正反与构建通过；冻结独立复核、最终包源/公开更新待补。四源/授权/允许范围/回滚引用TASK-P0-POMO-064.md。根仓/真实用户App/profile/飞书数据未读写，保留当前99来源、权重/偏好/启动等其他电脑已发布变更。

FocusTimer复用groupTasks原稳定taskId/local id分组与parseTitle去序号/排序。select value为group.key，显示group.name，不加番茄序号/重复象限前缀；自由番茄保留。确认时才把所选group映射到最新候选的第一个未done/pending/free行的精确id；当前group优先active.task.id，不倒退到最小序号。当前组完全不在候选时显示当前任务保留项。失效group不能确认，也不回退误绑自由或同名其他任务。原onChangeTask/withPendingCredit/timer.changeTask保持，不改业务计时/记录/同步实现，没有新存储/schema/后台或每秒I/O。

artifacts/p064-all.txt 全逻辑429/429；p064-prebuild.txt生产构建成功，未安装/升级依赖。p064-desktop.txt实际main/preload/renderer合成实链6组：8槽位合并为一个task选项且无序号；不同taskId同名仍分两项；raw无序时自动选最小可用2（done1排除）、准确p1；free→task保持session/start/elapsed、不提前sync；取消继续tick、暂停时task/free更换保留所有计时字段；重载仍原归属且描述更新/清空正常；所选t2刷新消失但同名另一任务存在时仍禁止确认且保持p1，恢复t2能正常选p2；最终仅一次确认sync精确p1，之后直接从看板启动p3，重选同任务不会退p1，当前组完全失效仍保留p3的暂停计时快照、无第二次保存。测试随机隔离profile、headless窗口不可见、--mute-audio；未触及真实任务/网络传输，合成sync调用只计断言，不是实际云写。

旧版基线：下载公开99 setup/source/SHA256SUMS到ignored public99；与GitHub公开asset.digest/size及已记录SHA256 1b29ef6ea71b46a605ce25f10b007d85d2bbbe428d307c706a8b44705b2f60c3匹配。7za仅提取resources/app.asar，不执行安装器；包内版本99/source3a129a8bebe6908b81c323f745b920b71ee11669/dirty=false与公开来源JSON一致。p064-public99-asar.json、extract原始输出保留。tests/verify-published-update.cjs真实旧99 updater发布前current，errors=[]、downloads0、autoDownload/autoInstallOnAppQuit=false，release100-before-update.json；不把当前个人已安装版本当测试来源。

Learning none：本轮是既有稳定ID任务分组与精确plan切换的薄UI映射，未形成新的跨任务运行/安全/缓存机制；记录业务正反证据，不重复新增根或模块Learning。独立复核若有候选先处置再封版。回滚选择框/版本提交，无数据迁移，旧99和已发布版本资产保留；用户仍手动检查安装新版本。
