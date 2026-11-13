# P0-POMO-092 验收

- 用户纠正130版展示误解：仅整点、位置正确；恢复紧凑样式，未改记录、模板或计时。四源预检见执行卡。
- 原129阶段边界锚定不能代表记录首番茄；本次沿用记录首末投影，开始整点贴真实记录首格，跨阶段不重标；末尾结束仅全旅程末格保留。精确起止、预计/计划保留tooltip，非等距小时轴。
- 全回归536/536 PASS（artifacts/p092-regression.log），真实Electron旅程plan/resume/times/complete四阶段PASS（p092-desktop.log），构建PASS（p092-build.log）。
- 新案例上午2个+13:32–15:05下午3个：完成总数5；13位于第3格，第5格无重复标记；所有可见刻度仅整数；精确13:32可悬停。记录修改/活动/原模板/动态截断/拖放/失败保存/重启等原验证仍通过。
- 780/520标签矩形无交叠、纵向裁切；已查看artifacts/p092-journey-520.png实际呈现13在下午首格、原紧凑大小恢复。仅合成数据截图，不入Git。
- 独立review_local_editing代码PASS无P1/P2，末次证据及截图复核PASS，可冻结。Learning-Review: none — 用户纠正后的局部展示调整，既有投影原则不变，不形成新的工程机制。
- 基线69aea1de2b6250a2ae1739306986049889145718；个人数据及配套未改。待固定131安装包、本机stage和公开发布/旧更新器；不声称个人已安装。回滚130，无迁移。

## 固定交付
- 产品commit083818f7b9bcdb9c2d9af2b060251daad985105c；独立冻结复核PASS、干净源码。干净构建、119文件包内比对、隐藏隔离启动通过。
- NSIS内部ASAR SHA256 920e1d90ecab8c783640bf82c8b3ba269d2e20a03e8d2fc758a238865ca86a20，与win-unpacked一致。安装包83296530字节，SHA256 1ebc9e9418ac2835833ef1f29608c2a7e0795e72ff28d2c7d9cca768831f0a2e。
- 本机stage成功、二次回读alreadyPrepared=true；未关闭个人App。源码和公开131五资产、固定annotated tag通过，旧130与Latest不变；release443988263：https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.131 。
- 真实130更新器发现131，errors=[]，downloads=0，自动下载/退出安装false；证据artifacts/release131-live-update.json、release131-remote-public.json及release131-package-acceptance.json。
- 软件交付DONE；个人设置重启加载131后生效，未将本机准备当作已安装。包含既有按钮修复、配套不变。回滚130，无历史迁移。
- Learning-Review: none — 沿本检查点判断，按既有固定发布流程验收，无新通用工程机制。
