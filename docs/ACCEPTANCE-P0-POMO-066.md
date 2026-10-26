# P0-POMO-066 每日专注锁与秒级提醒验收

已验证（固定源码、包源及公开更新三项独立终验PASS）：445/445逻辑回归、生产前后端构建、5组真实隐藏静音桌面链路通过。授权、四源检查、写集、预算、回滚以TASK-P0-POMO-066.md为准。模块隔离实现，不写澄行根仓、个人任务、个人Edge或生产注册；新增状态只有本机承诺和截止，没有第二份计数。

源码机制：DailyFocusLock按本地日冻结goal/quotaMinutes/releaseMinutes及until，计划enabled/releaseMinutes单列。原每日已保存记录投影和权重为唯一进度，未知/昨日计数不达标。开锁默认关闭，开启须新版配套能力回执；未达标实际restSettings/browserConfigure和applyDevicePreference双入口拒绝关闭或降级，正常进度与记录路径仍通。达标需明确临时放行，到期、当日额度耗尽、进度回退都会重锁；同次放行幂等且重启不延期。普通策略编辑只改明日，面板执行今日冻结值。失联/租约/退出fail-open沿原路径，未新增服务、权限、轮询或统计账本。

早期独立复核P2：初版虽冻结目标，但额度取live settings、放行时长取全局计划，导致达标后60→480／15→60立即放宽当天。修正为day冻结三值，新增tests/daily-focus-lock.test.cjs当日60/15不变且次日480/60生效、首次启用当前90/23、重启仍冻结的正反。写盘失败测试最初被未达标guard提前拦截，现先达标再注入synthetic full disk，断言真正写入一次、原文件和计划均不变；损坏/foreign文件不冒充有效锁定。

artifacts/p066-all.txt：445/445，包含每日锁7项、旧worker冷静恢复/异步session初始化/串行epoch竞争、原生stdio状态/回执/来源/超限、秒数5/7/15/30/90/3600有效而非整秒/超界拒绝、15秒阈值/重启去重、旧分钟及偏好双端往返、秒单位diff。新host测试因冻结测试时钟早于实际子进程回执导致age负数，将该真实stdio测试改用真实Date.now；产品租约未放宽。原AW约5秒频率与7秒有效投影不变。

artifacts/p066-build.txt：生产构建PASS。artifacts/p066-desktop.txt / p066-desktop.json：真实main/preload/renderer选择15秒保存再打开，缺失新版能力拒启；用注入registry adapter安装隔离CMD（真实注册写0），真实Electron Node原生4字节消息回传新版能力后UI可开启。11/12界面禁改且设置IPC／两类偏好导入拒绕，release拒绝；原content作用于真实静音canvas HTML video，遮罩11/12、暂停且重播拒绝。原确认记录增加第12个后经真实renderer重载和计数投影达标，仍须显式15分钟放行，幂等不延期，随后能播；仅合成类时钟推进截止后恢复遮罩/暂停，不改系统时间。

同一桌面链路：达标后保存计划60分钟放行／480分钟额度，设置框显示60，今日按钮仍15，今日额度仍60；实际累计3600秒后实际IPC拒放且遮罩，圆环今日超额显示0:00:00起。失联投影解除并能播，恢复有效投影再次暂停。检查持久文件冻结三值、无count；所有窗口始终隐藏/静音，无个人App安装重启或真实浏览器操作。测试中两处fixture错误：遮罩在documentElement下而非body；不可变同ID同版本记录不能直接改数量，改为新增第12个确认记录。均精确查明后修正测试，未因此改产品记录语义。

Learning判断：沿用已记录065初始化门禁和039不可变更新交付；当前新增为本功能业务规则及测试夹具错误，尚无经过独立确认、可跨任务复用的新教训，不重复登记。回滚显式revert本功能／版本，新承诺文件在旧版无读者，不迁移删除用户记录。

最终交付已验证，详情如下；个人Edge实际更新／重新加载尚由用户完成，不声称已在个人浏览器拦截。

最终封版：b3de3395bc8c343bc194014dcce911356500e2bc / preview.103 / dirty=false。review_scientific_rest独立读取固定diff、445/445、clean构建和5组实链给出源码PASS；早期P2关闭。原始release103-package-acceptance.json独立重算211个build文件与ASAR逐字一致，成品隐藏静音随机profile启动exit0；NSIS-only无便携包。setup84335068字节，SHA256 ec8f4aec01ccb936336d18aa4d89e9c1155c3ec7923d27ba7a42339ff7893548，blockmap89978字节/SHA256 5d8dafc03768f77cc9e69ebf84ddc7e7af63025aa45065cf9dcb767e9bf3ea74；五资产完整hash/size及SHA512见JSON/feed/SHA256SUMS.txt。独立包源PASS。首次打包前ls-remote只读超时门禁中止，因未生成103，第一次verify正确拒绝旧102 win-unpacked；只读核对重试一次后成功打包，未绕门禁或重打覆盖103。

公开 https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.103 。source push门禁后唯一draft目标精确b3，五资产上传核SHA，再同clean HEAD annotated tag经hook推送，公开prerelease且latest=false。release103-remote-draft.json / remote-public.json确认五资产size/digest、草稿到公开assetID不变、tag==b3、旧102发布时间和原资产ID/hash完整保留；release103-latest.json稳定Latest仍51。公开后首次只读ls-remote超时，按规则一次重试成功；上传／tag／publish均未重放。

真实旧更新器：release103-old102-before.json与公开102安装器digest/size一致；p066-old102-asar.json记录仅提取ASAR、不安装，previousSource a2beef74d9531043602e6fc4c3357849493d534d、dirty=false、previous102。release103-before-update.json发布前current；release103-live-update.json / live-retry.txt发布后available103、安装器URL/84335068字节/SHA512与新feed完全匹配，errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。首次检查60秒deadline只读超时，保留updater-first-timeout.txt，一次只读重试成功；未改更新器、网络、个人App或代理配置。

独立review_scientific_rest最终公开交付PASS，结合此前源码／包源PASS完成本卡正反验收。Learning最终none：本次为已确认业务规则的执行与计划隔离，生命周期继续沿065、发布沿039，无新增经验证可跨任务复用候选；不重复记录、不写根Learning。最终收口只改本卡与验收记录，运行源码/tag/五资产保持冻结值。

用户生效：App设置手动检查安装103；科学专注设置点击“安装／更新浏览器配套”，Edge扩展页重新加载1.1.0，刷新原B站／小红书页，连接能力确认后保存每日目标并手动开启每日锁。提醒间隔选秒即可设15／30／90等整秒，范围5–3600秒，可能有约5秒采集延迟。个人安装、重启、扩展加载未代办；不新增后台进程或逐秒写盘，不扩大当前电脑／当前用户范围。