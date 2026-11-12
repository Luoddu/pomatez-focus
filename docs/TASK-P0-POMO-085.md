# P0-POMO-085 飞书数据未就绪同步恢复

- DONE（实现/交付；个人积压恢复待用户验证）；owner/root，模块状态源本卡；基线33f9cf9a5ede74cfea51c4cf0c4c13e9e85cda02，task/p0-pomo-085-sync-ready。用户报告反复HTTP400/code1254607，要求处理。T1本地可逆同步逻辑修复，完整卡和独立复核；不修改根共享服务。
- T0分类：截图精确错误1254607；service.ts:43所有API错误映射为检查权限，未区分暂态；Feishu.call无暂态恢复，FocusService.sync/archiveHistory已有来源校验/记账ID去重/回读及写锁。官方飞书Aily更新记录文档（2026-10-12版，https://aily.feishu.cn/hc/1u7kleqg_at7e1vkm lines191–198）解释Data not ready：前置写尚未结束或服务计算超时，建议等待重试；使用现有Bitable v1，未升级SDK。无法从截图证明实际失败HTTP方法或飞书服务端具体原因，均标unknown；不归因本机DNS/权限，不读凭证或现场私人数据库。
- 四源：①上述本机原文；②上述官方同Bitable错误语义，open.feishu.cn列出记录页面无可读正文，以飞书自有官方说明补证；不声称固定SDK源码或真实服务端复现。③复用Feishu.sync/writePlan/archiveHistory的稳定ID/回读及service写锁，Learning原有不可凭pending判未发送原则；④feishu.test/plan.test的响应丢失、重复同步与冲突保护，P077诊断验收仅改善显示且明确未溯源原始错误。
- 修复边界：新增结构化Feishu请求错误，只针对code1254607在既有幂等同步/历史归档操作边界等待1500ms并重做完整回读一次（共2次）；不裸重放HTTP写请求，不对权限/身份/网络不明/冲突错误自动重试，不改变用户5分钟合并同步或新建长期重试器。1500ms为保守有界工程默认，官方未给固定恢复时间，不承诺必恢复。保留同client/source与原数据快照、写锁贯穿等待。
- 写集：app/electron/src/focus/{service.ts,feishuErrors.ts}；tests/{feishu.test.cjs,plan.test.cjs,sync-ready.test.cjs}及必要合成隔离runner；CHANGELOG、TASK/ACCEPTANCE-P0-POMO-085.md、版本helper输出、忽略artifacts。禁止真实飞书请求/写入、凭证/私数据、删除队列、清空失败标记、改API权限/网络/数据库、自动安装重启。
- 验收：1254607读失败后恢复；已写入但错误响应时整操作重试不重复时长/番茄/历史且重读后核对；持续1254607仅2次并保留原记录；其他错误一次即停；写锁覆盖等待、切换来源取消旧操作、不写新来源；错误准确说数据暂未就绪并区分读写。正常同步与冲突保护仍通。真实用户待同步结果需用户重试回报，不以合成PASS宣称已清除。
- 资源/预算：既有独占worktree、随机hidden/muted profile、合成API无云写；开工fetch/check:sync一致，旧worktree无重叠。前台120分钟，遵守未知同因两次停止及同层补丁复发扩大链路规则，本轮已检查请求→服务锁→账本/历史→renderer失败保留链。只复用review_local_editing做冻结只读复核。回滚新版本恢复基线、不覆盖资产、不删记录。沿已核验默认推送/本地优先授权交付；Learning判断在验收。

- 固定7f4d2d25983ea19b9b94c6248fdc9abe0c07513f：60项测试、最终链路与隐藏桌面、独立复核、124本地准备及公开五资产/真实123更新器均PASS。未触碰用户真实记录；请用户加载后手动同步以确认实际积压。
