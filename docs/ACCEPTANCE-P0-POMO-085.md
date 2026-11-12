# P0-POMO-085 数据未就绪同步恢复验收

四源/T0分类/范围/授权/回滚见TASK-P0-POMO-085.md。官方飞书说明（https://aily.feishu.cn/hc/1u7kleqg_at7e1vkm，2026-10-12更新，lines191–198）将1254607解释为Data not ready并建议稍后重试；用户截图不能确定具体失败方法/远端原因。本次通过合成同错误严格复现本机原路径会直接失败且泛化权限提示，未读取私人云数据。

实现：HTTP只生成带code的FeishuRequestError，错误提示区分读取/写入、无私人路径/服务原文。仅FocusService.sync/archiveHistory在完整原有回读/核对操作边界处理1254607，等待1500ms重试一次；写锁贯穿两次，固定输入快照与client检查避免切源写入。其他错误不自动重放；无新后台、无裸HTTP写重试，原5分钟队列策略不变。1500ms为有界默认，不承诺飞书必在此时恢复。

60/60相关测试PASS（artifacts/p085-unit.txt）：真实HTTP解码只发一次且准确分类，读失败后正常写；真实service→Feishu→合成API的已落地PUT错误响应重试回读账本，仅一笔12分钟/一个ID；历史PUT错误后重读，仅一个历史快照/无再计时；持续busy共两次、权限/普通错误一次、锁阻挡并发、切源取消、输入快照固定。既有plan/feishu重复、离线、冲突负例仍通。

首轮新测失败已定位为TS当前降级Error子类原型导致instanceof不成立，显式恢复原型后全链通过；另服务mock缺config已补。没有网络/身份试错。Learning判断暂none：当前机制为既有幂等核对边界的有界暂态恢复，独立复核已确认无新候选。未操作实际积压，不宣称用户这条记录已同步。最终交付如下。


最终干净构建7f4d2d成功；p085-final-chain.txt新5项真实decoder/service/adapter测试全部通过；原test-sync-recovery.cjs生产main/preload/renderer隐藏静音合成回归5项PASS：原失败记录/阶段/原因不被后续成功清掉，手动重试同ID且不影响活动/暂停专注，回读失败不撤销已同步回执，窄窗详情可读。review_local_editing独立冻结复核PASS并独立5/5测试，无新增P1/P2；未实际云写。

verify-package124核验91个build文件与ASAR逐字节一致，成品隐藏隔离启动退出0，NSIS解包ASAR与已验成品一致。安装包82,945,675字节，SHA256 cb31d1061817da2cd4e51e43672656ad9905ed24305683da1b8a122148c7f7c1。本地stage及alreadyPrepared=true回读PASS，无自动安装/重启。

公开release442649635非draft prerelease、非Latest：https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.124 。release124-remote-draft/public.json确认五资产大小/摘要、annotated124 tag指向7f4d2d、旧123资产未变、Latest不变。初次安装包上传HTTP408，先只读核对草稿已存在四个有效文件且安装包缺失，再仅补传缺失安装包成功，没有覆盖旧版/有效资产。真实123 ASAR/sourcef0cae18更新器发布前current123、后available124，feed同源，errors=[]、downloads=0、autoDownload/autoInstallOnAppQuit=false（release124-before-update/live-update.json）。

收口绿灯：公开分支与固定源码一致、仅本卡/验收收口，无重叠写者；文档提交不改发行标签/包。Learning无新跨任务候选（见独立复核）；回滚新版本恢复原行为、不删记录。实际用户积压未由Agent读取/写入，结果待用户加载124并手动同步后验证；不得把本机合成PASS写成用户已同步或远端根因已完全确认。
