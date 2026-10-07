# P0-POMO-042 验收

- 已交付preview.75，固定源码790bdcf0cb5dda9c372a2176bb6bc0d55c478dcf。四处预检、授权、官方冻结路径和回滚唯一见TASK-P0-POMO-042.md。固定Electron34.5.8实际Node20.19.1；采用公开spawn detached/stdio-ignore/unref与execFile固定参数，无shell/任意命令桥。
- 已验证：原实现275逻辑PASS（artifacts/p042-logic.txt）；修正后新增交错/取消共28个ActivityWatch单测PASS（p042-refresh-race.txt）。六个runtime正反测试覆盖健康服务零启动/进程查询、并发一次启动、已有launcher/缺安装不重复启动及后续恢复、退出/暂停中探测不再启动、启动错误与就绪等待有界、真实合成manager→server子孙→loopback完整链路。
- 已验证：固定旧ee0e36a源码运行相同交错测试，coverageStart由应有当日起点变成null（p042-old-race.txt，精确断言失败）；修正排空最新在途查询、无await失效缓存并启动新daily，保留覆盖且重新发现一次，暂停取消后下一次合法刷新仍成功。旧源码负例只在忽略artifacts编译/执行，不更改当前源码。
- 范围外测试日期问题已查明：00:04左右未改时钟全套277项中275PASS、plan.test.cjs两项失败（p042-logic-final.txt）。plan-fixture.cjs record以Date.now减去时长生成start；25/12分钟记录跨到前一天，today默认实际今天，因此断言假定同日不成立。未修改计划产品或旧fixture。仅plan.test.cjs进程使用本地正午测试时钟，其他套件时钟不变，全套277PASS（p042-logic-noon.txt、p042-plan-noon.cjs）；此结果不冒充午夜默认时钟全通过。本次AW凌晨/跨日场景使用自带明确fixture并通过。
- 已验证：真实本机AW已有服务分支ensure成功，官方REST聚合为recording（p042-local-aw.json），未停止或重复启动用户AW、未导出原始历史。没有强停用户AW来验证其实际冷重启；默认spawn固定exe分支有源码/官方机制和合成完整链路证据，不能声称用户AW冷启动已实测。
- 已验证：真实生产main/preload/renderer、合成HTTP，刷新按钮禁用/一次请求、重新discover、用量与周缓存更新、故障保留同日总量和恢复；策略/休眠/原生督促/计时20组PASS（p042-ui-final.txt、activitywatch-desktop.json）。P041六组真实尺寸/无溢出/状态热力和14原布局PASS。ff8eda2干净构建后20desktop（p042-ui-fixed.txt）、6overview（p042-overview-fixed.txt）、14portrait（p042-portrait-fixed.txt）均PASS。desktop测试原合成AW为正午，补记依赖实际00:xx会跨昨日；测试main/renderer统一推进正午以匹配合成数据，不修改生产时钟/原断言。
- 独立复核：ff8eda2源码PASS，原刷新P2已关闭；Learning同commit成立；范围外午夜plan失败如实记录，不阻塞P042。790bdcf最终测试时钟及回执只读复核PASS，生产代码与ff8eda2一致。
- Learning判断：交错缓存失效已由固定旧源码失败和修正正例验证，登记模块LEARN-P0-POMO-042-01；发布沿用039。午夜旧测试问题只作为范围外缺陷记录，不改根治理或扩展修复范围。

- 最终干净源码790bdcf构建后desktop20再通过（p042-ui-release.txt）。包内89个build文件逐字节匹配、成品隐藏隔离启动退出0，原生提醒文件在包中；五安装资产含setup、blockmap、preview.yml、source-version.json、SHA256SUMS.txt，未交付portable。包源复核由review_scientific_rest独立重算PASS。
- 公开发布https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.75，非draft/prerelease/nonlatest；源码tag指向固定790bdcf，本次canonical收口只追加卡和回执文档，发布tag固定。五资产大小和SHA256与本地匹配，draft到公开资产ID不变，旧73tag/资产/发布日期不变。原始证据artifacts/release75-package-acceptance.json、release75-remote-draft.json、release75-remote-public.json。
- 真实生产FocusUpdater/NSIS updater在隔离Electron进程以实际前一公开73版本和同一preview GitHub provider配置检查，发现75/available，setup URL/size/SHA512完全匹配公开feed；autoDownload=false、autoInstallOnAppQuit=false、0下载、0安装、0错误（release75-live-update.json）。这是更新器检测验证，不声称已替用户下载/安装，也不声称运行了用户现有安装进程。官方AW实际冷启动限制及默认午夜旧plan测试两项失败记录继续保留。
- 最终Learning：刷新竞态在ff8eda2原子检查点已记录042，本发布遵守039；公开校验和回执更新无新增未处理候选。回滚仍为使用旧73不可变安装版和显式源码恢复，不删除本地记录或替换tag。

- 发布传输异常：首次五文件gh上传被本地300秒helper期限终止；读取远端草稿确认仅四小文件已上传且setup不存在后，只补传同一固定setup，无clobber/重复资产/旧版替换。最终公开五资产重新逐项核对。

- 最终独立交付复核：review_scientific_rest对公开五资产ID/size/digest、旧73不变、旧73→75真实检测原始证据及上传补传范围给PASS，绑定790bdcf/preview.75。传输超时未确认网络根因，不将其推测写入Learning。
