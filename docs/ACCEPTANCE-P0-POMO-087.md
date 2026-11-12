# P0-POMO-087 验收

- DONE（本卡代码/交付）；四源/安全/范围/资源及回滚见TASK-P0-POMO-087.md。未知个人故障不得标为已恢复。
- 明确缺陷：service请求error丢弃原因，timeout/超大响应均假报无法连接；收到响应后缺error/aborted/不完整close监听。固定Node20.19.1 _http_client.js socketCloseListener在res.complete=false时res.destroy触发响应错误，故请求error监听不等价覆盖响应错误。
- 修复：白名单FeishuTransportError仅传静态原因、读写、接口类别与码；未知原始错误不泄漏URL/body/token/message。响应中断拒绝一次，不继续解析/成功；保留原18秒与8Mi字符限制，无新重试/代理/超时变更。未确认的HTTP写入明确结果不明。手动toast携带已有phase。
- node --test tests/transport.test.cjs tests/sync-ready.test.cjs tests/plan.test.cjs tests/feishu.test.cjs：64/64 PASS（artifacts/p087-tests.txt）。含成功、1254607、DNS/TLS/reset/timeout/超大/abort/error/close/不完整end；敏感原文注入不显示；传输失败不进入1254607重试。
- 实际Electron34.5.8内Node20.19.1执行transport/sync-ready：9/9 PASS（artifacts/p087-electron-node-tests.txt）。真实loopback HTTP响应截断经过生产request→service→Feishu账本，已应用PUT仅一次；失败后锁释放，再手动原ID核对不重复分钟和账本。测试仅替换请求目的地为临时本机端口，不触真实凭证/业务服务器。
- node scripts/build-focus.cjs PASS；node scripts/test-sync-recovery.cjs隐藏静音五项PASS，真实主进程/预加载/renderer保留记录/计时、失败阶段及ENOTFOUND可见、原文不泄漏、恢复重试不回放已共享记录、窄窗通过。
- 初次新增测试误用两次record()生成两个随机ID导致2次写，已固定同一saved对象后通过；不是产品幂等缺陷，不用错误测试结果修改产品记账。
- Learning:none；已知Node事件机制的项目缺漏纠正，无新增超出官方机制与既有响应丢失核对原则的跨任务结论；用户实际网络原因仍unknown，不写猜测。
- 回滚：新版本恢复9c2e3c4传输处理，记录/队列不动。真实个人两条积压仍待加载后手动核验，不能把匿名公开主机可达或合成PASS当恢复证明。

## 固定版本交付
- 源commit d53028360d46ec2cbd0cf732bee32e7abc4a7d76；独立review_local_editing只读复核PASS，无P1/P2，独立transport/sync-ready 9/9 PASS，原始64项/实际Electron证据核对。未访问真实飞书。
- 最终干净构建PASS，NSIS内部ASAR匹配，99个构建文件逐字节核对，隔离隐藏包冒烟PASS。本地stage和alreadyPrepared回读通过；未自动安装或重启。
- 126安装包83115571字节，SHA256 b4dbebbb9565b3fd3c3d98eada4ab2bf61c8ce40f5cab77c8794fed2bed8b6c6。
- v0.1.0-preview.126 release442959753公开预览五资产大小/哈希与本地一致，annotated tag固定目标源commit；125资产/Latest未变。真实125更新器检测126，零下载/零安装，更新基线及发布后验证PASS。源码非强推送完成。
- 证据：忽略artifacts/release126-package-acceptance.json、release126-remote-public.json、release126-live-update.json等。Learning判断沿上文，无新候选。后续需用户加载126并手动同步核验真实积压；若失败，保留新错误码/阶段继续根因定位，不据本轮合成结果宣称个人连接已修复。
