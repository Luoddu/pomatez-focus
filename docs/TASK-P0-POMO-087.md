# P0-POMO-087 飞书传输失败分类与中断收口

- DONE（传输错误分类/响应中断处理与交付）；个人故障根因及积压恢复待验证；owner/root，模块本卡唯一状态源；基线9c2e3c4a7ba608d5241cca421d476178cca09b24，task/p0-pomo-087-transport-errors。用户提供手动同步两处错误，分别共享明细和写回记录，均显示无法连接。
- 目标：修复传输层遮蔽错误及响应中断不收口，保留可判定的安全原因/读写/接口类别，帮助定位真实失败；不能宣称未知个人网络根因已修复。T1可回滚本地实现，实际网络根因unknown；无网络配置、凭证或云写修改。
- 四源：①service.ts:17–62把req.error所有原因丢弃，18秒timeout与response too large也被归为无法连接；res未监听error/aborted。用户两阶段都走该公共函数。无凭证公开open.feishu.cn/open-apis/ GET本机113ms返回404，仅证明当下主机可达，不证明业务请求成功。②实际Electron34.5.8/Node20.19.1；固定官方https://raw.githubusercontent.com/nodejs/node/v20.19.1/lib/_http_client.js socketCloseListener/res.destroy及request destroy/error机制；官方文档Web未取得，源码已读；不变更第三方版本/代理/重试策略。③Learning原有不可把pending当未发送，复用FeishuRequestError与service幂等记账/写锁；scripts/test-sync-recovery.cjs及plan-fixture可用。④sync-ready、plan、feishu及P085完整链验收；现有只测JSON业务码未覆盖真实响应中断。
- 写集：app/electron/src/focus/service.ts、feishuErrors.ts；renderer FocusApp.tsx仅手动同步toast保留已有phase；tests/sync-ready.test.cjs及新tests/transport.test.cjs、必要合成测试runner；任务/验收、CHANGELOG、版本helper输出、私有忽略artifacts。根仓共享文档/真实用户profile/凭证/云记录/系统代理禁止写；不自动重启安装。
- 实现边界：固定错误码白名单和静态接口类别，不传播原始URL/凭证/请求body/错误message；timeout、DNS、TLS、reset、响应过大、响应中断分别收口，不更改18秒及原字符上限；res.error/aborted/不完整close拒绝Promise一次，不继续解析残缺内容。HTTP写入响应丢失明确结果未确认，不裸重放。原1254607完整操作恢复预算不变。
- 验收正反：正常成功/原业务码仍通；合成timeout/DNS/TLS/reset/超大/abort/截断均准确分类且终结、不泄露原文；服务器已应用PUT后断流仍只发一次并由既有账本重读保持幂等；service锁释放、renderer保留失败记录与准确阶段，修复网络后手动同ID能恢复；不得清队列/重复分钟/无限自动重试。独立只读review_local_editing冻结复核；真实端到端积压需加载后手动验证，不以合成通过代替。
- 资源：独占本模块worktree与随机合成hidden/muted profile；fetch/check:sync绿灯，其他旧worktree只读。前台90分钟，未知同因两次停止且复发扩链；只读网络仅官方原文和无凭证公开探测，无真实用户飞书写。默认本地包优先/公开更新授权沿模块规则。回滚新版本还原基线传输处理，保持所有记录/队列；Learning在检查点判断，不记录未证实网络推测。
