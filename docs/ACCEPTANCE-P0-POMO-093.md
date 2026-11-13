# P0-POMO-093 验收

- 已验证根因：localBoard把追加行quickTask.sequence回执索引1当任务序号，旧第1个记录完成2个时把新第3/4个也标done。单测先复现9通过1失败（artifacts/p093-before.log），修复后11/11（p093-after.log）。
- 修复只在完成显示投影读取系统末尾“第N个番茄”的全任务序号；回执sequence不变。末尾锚定避免正文“复盘第1个番茄”误匹配。未改存储schema、历史记录、云端或队列绑定协议。四源预检见任务卡。
- 全回归538/538 PASS（p093-regression.log），构建PASS（p093-build.log）。新增旧2+追加2为2/4，新3/4未完成；真完成3仍显示3/4；正文同名短语不会覆盖末尾序号；既有同日/同来源与多番茄投影测试保持。
- 真实Electron四阶段PASS（artifacts/p093-desktop.log）：boundary实际增加两次、chip3/4、开始暂停、重载后恢复同一计时、放弃测试计时后仍2/4，旧记录逐项一致且上传0；seed全象限重复新增/刷新/离线保留；restart同一活动/保存记录绑定回执一次同步；history历史入口追加、昨日序号重置、当前计时不变。
- 测试适配原证据：需悬停才显示加号；活动计时重载后须结束/放弃才能见四象限。旧append测试假定即时自动同步，现改显式手动同步；已完成应隐藏，故绑定测试使用10分钟0番茄的未完成片段；只发送了先前批次的失败，后来意图仍pending且全部持久保留。未改产品同步或计时来迁就测试。历史最后队列清空超时同因未手动触发，补入口后四阶段全部通过。
- 独立review_local_editing发现正文序号歧义P2已修复并独立11/11通过；末次四阶段证据复核PASS，可冻结，无剩余P1/P2。Learning-Review: none — 局部完成投影的序号语义纠正，未引入新可复用工程机制。
- 基线cdb3f7b4c8e2157943bc9a829d1a3a9ee026941d，个人数据/根治理/配套未动。待固定132包、stage/发布/旧更新器，不称个人已安装；回滚131，无迁移。

## 固定交付
- 产品commit a67037e1a60b631c372e0e094f9d49c27ca605a8；独立冻结复核PASS、干净源码。构建、123文件包内比对、隐藏隔离启动通过。
- NSIS内部ASAR SHA256 e6493b649393e81ad71065e9a29ccca2d2e88d203585ccd1e8f7bc65a434003d，与win-unpacked一致。安装包83301913字节，SHA256 f4c109e6eea3c11e2d45932725dcd89e0eed2fb3663e6b86adec9423ba52fd9f。
- 本机stage成功且重复幂等，未关闭个人App。已公开132固定annotated tag和五资产，大小/摘要一致、旧131及Latest不变；release444283740：https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.132 。
- 真实131更新器发现132；errors=[]、downloads=0、autoDownload/autoInstallOnAppQuit=false。证据artifacts/release132-live-update.json、release132-remote-public.json、release132-package-acceptance.json。
- 软件交付DONE；个人设置重启后加载132，本机stage不等于已安装。原数据没有迁移或代改，配套不变。回滚131。
- Learning-Review: none — 本检查点既有判断延续，固定构建发布未引入新工程机制。
