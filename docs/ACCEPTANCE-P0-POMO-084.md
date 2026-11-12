# P0-POMO-084 项目加载体验验收

目标/四源/授权/范围/回滚见TASK-P0-POMO-084.md。根因为60秒缓存和表单loading锁定叠加多次项目schema/记录读取，不声称已测真实网络耗时或存在网络故障。修复仅renderer会话目录复用、并发Promise合并、显式刷新与可选归属表单；不增加后台轮询或磁盘目录、不改变后端API和项目存在性校验。

已验证：缓存/队列/后端quick-edit相关27测试PASS（artifacts/p084-unit.txt），覆盖过60秒复用、刷新/并发、失败恢复、来源隔离与迟到返回。生产隐藏静音合成测试project-catalog-desktop验证悬挂目录时可明确暂不归属整理原intent、重新打开无新增请求、刷新保留选中/失败恢复、消失项目阻止静默保存、正常选项目保留正确ID/type；无真实云写。最终空目录可清除旧选择边界及同一固定源码干净构建/隐藏UI复验均PASS。

首次构建因effect cleanup引用ref的eslint警告失败，已按现有React规则捕获同一catalog实例，随后构建通过；非网络/系统故障。Learning-Review none：本轮是本项目缓存有效期/表单阻塞策略修正，无已验证的新跨任务机制教训。最终交付证据如下。


review_local_editing独立只读复核冻结f0cae18相对da2a164：无P1/P2阻断，独立缓存3/3通过，核对27项原始结果及UI正反脚本。最终hidden/muted生产页面脚本PASS，projectReads=6（含启动/reload和明确手动刷新），反复开关表单不增加请求，初始悬挂可整理、失败保留选择、消失项目阻断、空目录可清空及正确项目ID/type均成立；无真实飞书请求/写入。首次读取仍依赖飞书响应，云目录变化需手动刷新，缓存只活在当前应用会话，不声称真实网络性能已改善。

verify-package123核验88个build文件与ASAR逐字节一致，隔离成品启动退出0，NSIS解包ASAR摘要与已验成品一致。安装包82,941,605字节，SHA256 c700ecced53419f8a2782e424b2d93a907a6ac3adf54a37f89a4f96bb57e7f6f。stage-local-update及alreadyPrepared=true回读PASS，无自动安装/重启。

公开release442585260为非draft prerelease、非Latest，固定annotated123标签对应f0cae18；五资产大小/摘要、旧122资产保留、Latest不变均由release123-remote-draft/public.json确认。 https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.123 。真实122 ASAR/source0b2dadc原更新器：发布前current122，发布后available123，feed同源，errors=[]、downloads=0、autoDownload/autoInstallOnAppQuit=false。证据在忽略artifacts/release123-*，不纳入私人用户信息。

初次发布请求被自动审批以未识别持续授权拒绝，未执行；重新从用户明确指定的原聊天读取用户原始默认推送/本地优先指令后，重新审批通过。不是绕过审批或新增授权。收口绿灯：固定源与公开分支一致、工作树仅本卡/验收；后续文档提交不改变发行标签或包。Learning判断同前，无新候选；回滚用新版本恢复旧缓存/表单，不改用户队列或覆盖123资产。
