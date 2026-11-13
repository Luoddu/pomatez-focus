# P0-POMO-093 新增番茄不继承旧完成状态

- REVIEW（修复与独立验收通过，待固定交付）；owner/root，隔离模块本卡唯一状态源。基线cdb3f7b4c8e2157943bc9a829d1a3a9ee026941d，公开远端一致，干净；独占当前worktree/artifacts/p093。
- 用户请求：完成旧番茄后新加两个分解不应自动已收，保留可选择/开始状态。仅修UI完成投影，不更改个人历史/云端状态/队列绑定协议。
- 四源预检：①localBoard.ts取quickTask.sequence优先；追加行quickRows的sequence是单次回执索引1，而title含全任务第3/4个。旧第1个记录完成2个把两条新追加误匹配为已完成。②自有语义，无第三方关键语义变更，官方新采用不适用。③复用quickRows的任务全局序号与现有完成投影、构建发布helper，Learning记录/投影分离保持。④local-editing.test.mjs和append-plan-desktop.cjs已查，原追加测试未包含旧多番茄记录。
- 写集：localBoard.ts、local-editing.test.mjs、append-plan-desktop.cjs及对应runner、本卡/ACCEPTANCE-P0-POMO-093.md、CHANGELOG及version输出；禁止根共享文档、个人数据、飞书写入、配套。
- 验收正反：旧完成2+追加2保持已收2/4且新chip3/4可选、开始/暂停、冷重启仍保留；真完成第3个仍及时消失；旧多番茄记录仍正常覆盖原1/2；quickTask.sequence仍1供回执绑定，不改协议；异日异来源排除。单测先复现失败再通过，真实Electron纵切及全回归。
- T1，独立review_local_editing只读复核精确diff/证据，禁止其写入。90分钟前台预算，同因未知两次停对应试错。验证后按默认授权固定132包、本机stage、源码/preview发布及旧更新器验证。不重启个人App，回滚131，无迁移。
- Learning判断同检查点，有通用新机制才记录，否则说明理由。
