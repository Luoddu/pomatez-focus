# P0-POMO-091 验收

- 已验证：原旅程是顺序图标，不是等距小时轴；旧实现只显示阶段首格整数小时及全日末尾结束，导致单条13:32–15:05三番茄的结束不可见。四源预检见执行卡。
- journeySlotTimes复用完成绑定，按同一记录在可见旅程的首末图标投影真实起止；不估算中间番茄时间、不写原记录/模板。进行中仅显示开始；未开始的阶段/末尾明确预计或计划。标签分钟级，跨午夜未来显示24:00；上方开始、下方结束。
- 单测21/21，完整回归536/536 PASS：artifacts/p091-unit.log、p091-regression.log。涵盖跨阶段、单番茄、无效结束、零完成、异日/异来源、活动记录和原始记录不变。
- 构建PASS。真实Electron旅程plan/resume/times/complete四阶段通过（artifacts/p091-desktop.log）；实际13:32–15:05、本地未同步3番茄、08:07改08:17、运行开始、动态午夜截断、拖放、模板、存储失败、重启恢复均验证。此前测试固定图标数与禁止滚动假设不适用动态裁切/分钟标签，已按真实已完成数、容器内横向滚动和标签矩形不交叠修正，没有修改产品计数。
- 780/520窗口标签不交叠、纵向不裁切，已检查artifacts/p091-journey-520.png；较窄旅程容器横向滚动查看后续。测试截图只含合成数据，未纳入Git。原生活活动快捷按钮桌面7组PASS（p091-rest-desktop.log），上轮历史仍保持。
- 独立review_local_editing代码复核无P1/P2，独立21/21通过；末次证据复核PASS，可冻结，无剩余P1/P2。Learning-Review: none — 既有记录与显示分离原则的局部投影修正，无新的通用工程机制。
- 基线bfb4ac6536c3aae0d2dc61b7a2a31d98a6a5ba37；源版本130；不改配套、个人数据、根共享文件。软件包/本机准备/公开更新尚待完成，不等于用户安装。
- 回滚129固定安装包与源码，无数据迁移。

## 固定交付
- 固定产品commit 8ed48e7861d1d6f373348a568d2061a241b6c06b；独立冻结核对PASS，工作树干净。干净构建、117文件包内比对、隐藏隔离启动PASS。
- NSIS内部ASAR SHA256 f41a20de921b44b621976847224086eb49ec36418136489d75a843c7ccfecba7，与win-unpacked一致。安装包83294156字节，SHA256 7fd2082e2b2f37a44a8c6fd81f09901a65bd014fca1965f29130b3cf331289f4。
- 本机stage成功并二次回读alreadyPrepared=true，未关闭/重启个人App。源码与公开130五资产、固定annotated tag均验证；旧129与Latest不变。release443980956：https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.130 。
- 真实129更新器发现130，errors=[]、downloads=0、自动下载和退出自动安装false；原始证据artifacts/release130-live-update.json、release130-remote-public.json、release130-package-acceptance.json。
- 软件交付DONE；个人在设置“重启以加载更新”后生效，不把stage当已安装。包含129按钮修复，配套无修改。回滚129且无需历史迁移。
- Learning-Review: none — 沿同一检查点既有判断，构建发布沿用验证过的流程，无新通用机制。
