# P0-POMO-054 受控旅程接口验收

已验证：正式[preview89](https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.89)，运行源/tag8a8a101d29ba4df6dc5d0460ace5bcf8db07ab01；独立review_scientific_rest源码/包/公开交付PASS，无剩余实质缺陷。功能基线3af的335/335全量及精度10逻辑/10真实UI PASS，相对3af仅两处版本元数据及已登记文档变更。模块没有注册Hermes工具、修改根组件锁或声明根接入完成。

四处与角色/写集/红黄绿引用TASK-P0-POMO-054：根脏治理文件黄灯只读，本模块单分支/单worktree绿灯；当前运行所有者为原FocusApp/Timer/Journey。固定Electron34.5.8官方app.md第二实例/单实例锁已读；原raw域名超时后从GitHub固定commit文件API取得blob a93348469d0fb60e576c3fa9a81dc03baec24fb0、67843字节，SHA原文回退manifest见ignored p054-official，无运行依赖。

已验证：

- p054-desktop-fixed.txt/JSON：4项真实当前用户客户端→第二Electron实例→主App→窄preload→实际Journey→刷新原TodayJourney→回读PASS。assign stable task、move、restActions/time；同请求重试与两个同ID并发均回读不再改安排，旧孤儿不阻塞也不删他人文件；旧version拒；FocusSession原store字节不变；第二实例退出不改primary浏览投影；foreign renderer IPC拒且正常请求仍通。全静默、0端口/真实服务写。
- journey-api tests：手动A→B→A换revision，旧写不能覆盖；完整同ID不同内容拒；跨await来源/计时/record/rest变化拒；完成/active锁定、实际休息节点不可改，未完成仍可用；invalid task/anchor/字段/日期、过去写拒，batch无部分保存；存储异常及静默无写初始化不能假成功；同版本并发一个成功一个冲突；跨午夜拒并次日正常操作可用。
- 去重元数据在同一个Journey localStorage item与安排原子保存，普通UI写入保存receipts并换版本；不碰FocusSession/实际休息log、模板配置或飞书任务数据；无第二Journey库。
- 桌面首轮完整实链PASS后独立复核发现client同UUID文件导致崩溃残留/并发EEXIST，改成每调用独立transport UUID和持久logical ID分离，不清他人响应。午夜和初始化false receipt缺口已加精确正反；最终source与成品回执均PASS。
- 额外用户时长修正：manual-category精确25分7秒+5分→30分7秒，输入中间态可恢复、明确暂停扣除；10项真实编辑UI验证新终点默认多10分并成功保存，移除冗余提示。月范围覆盖跨周fixture，不改变统计产品语义。
- 333项合并逻辑PASS后，新增生命周期/午夜回归单独PASS，最终335全量PASS。直接renderer旧TypeScript检查遇上游i18next类型新语法与旧全仓TS4.1冲突；官方现有build:focus CRA完整构建通过，不升级依赖或绕开发布构建。一次普通沙箱esbuild祖目录拒绝，按既有escalated构建路径PASS，非产品补丁。

范围/风险：Windows当前用户AppData继承ACL为边界，同用户进程/管理员可信；没有公网/HTTP/Secret。客户端要求App已运行，首次single且带API参数立即退出，不新起农场；只支持今天/未来写，历史只读，每日256次API写回执满拒，不遗忘去重。Hermes接口说明/样例见JOURNEY-API.md，真实Hermes接入需后续明确任务。用户App不自动安装/重启。

Learning recorded LEARN-P0-POMO-054-01：独立review提出并确认逻辑ID/transport UUID分离的窄复用条件，已同检查点记录本模块Learning；早期none是当时预判。串行lease所有权与既有LEARN-P0-POMO-042-01跨await调度教训邻接，不重复泛化记录；专项证据保留本验收。根Learning未写。回滚源码revert、停App停入口，原记录/计时数据不迁移，字段兼容原Journey校验。

最终包验收：release89-package-acceptance.json绑定clean8a/0.1.0-preview.89，182build文件逐字ASAR对应，journeyGateway/client/nativehost/扩展均存在，实际App hidden启动成功，setup/blockmap/feed/source-version/sha清单五资产内部大小/哈希一致。原88候选保留，不作为交付证明。

已验证实际安装版：release89-packaged-journey.json，真实Windows unpacked App与ASAR自带客户端（entry=null）读→write→重复replayed→回读一致，隔离静默。一次验证helper用了POSIX字符串而Windows ASAR库按本地分隔符查找，path.join后通过；包中的client原已逐字校验存在，非遗漏文件。

发布门禁分类：88草稿五资产已核验，但包后Learning/验收提交917与3af源不一致，newtag==HEAD门禁正确拒绝。88远端无tag、未公开，保留不替换；89封版后直到同8a tag公开才登记最终结果，不绕hook/force或重放资产写入。

最终公开：release89-remote-public.json非draft prerelease，五远端资产大小/digest与本地一致、tag==8a，上传后asset ID未换；旧87元数据/资产不可变，稳定Latest仍preview51。独立复核重算182文件和五资产SHA/SHA512匹配；公开状态由主实现者实时查询、reviewer独立回读原始JSON及验证脚本确认。

旧版更新：release89-live-update.json用冻结真实旧87 FocusUpdater/electron-updater6.8.3发现89，phase available，setup/feed/哈希/大小精确匹配，errors=[]，0download/0install，autoDownload=false/autoInstallOnAppQuit=false。用户仍手动检查、下载、安装，未自动重启App。个人Edge首次加载新配套/真实焦点行为仍按P053用户gate待验，旅程接口本身不依赖配套。

回滚/下一步：使用新preview修复，不替换89资产；安装89后同机同用户Hermes可用文档中的stdio入口，真实工具注册由后续任务完成。本包与发布收口无新增Learning候选。
