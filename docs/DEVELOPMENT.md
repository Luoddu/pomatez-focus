# 跨电脑开发与发布

补记先选开始/结束时间，自动预填时长和每25分钟一颗的默认数量；之后调整数量不会改起止或时长。每日08:30（App本地日历时钟）自动补齐今日番茄；App未运行时下次启动补当天，专注/确认或其他写入忙时等待。跨日先读取今日任务，不继续显示昨日缓存；旧失败意图保留但不永久阻挡新日。自动失败5分钟后补试一次，第二次失败停止自动重放，仍可手动重试。按钮保留实际成功刷新时间，失败不标成功。不会清空成果、旅程或历史，不创建系统计划任务。

112起，新建/完成/补记/修改等仍立即保存在原本地队列，最后一次本地操作后安静5分钟才统一串行同步；继续操作重置窗口，拖动安排也延后待发送批次，网络回执不重置。原截止时间持久保存并跨重启恢复；手动同步/重试立即发送。在途请求完成后，下一条前重新核对是否有新操作。失败保留原意图等待明确重试，不用聚焦事件反复重放。全局偏好原同步协议不变。`scripts/test-quiet-sync-desktop.cjs`用隐藏静音的真实主进程/预加载/生产页面及合成服务验证完整链，不读写个人profile或真实飞书。

113的失败“记录修改”行显示任务名与“放弃这次修改”。用户点击仅停止本机该失败edit意图重试：先保存并逐字节回读`pomatez-discarded-edit-v1:<intent-id>`恢复副本，再移出原outbox；原timer记录不改，其他意图不动。异源、非edit、未失败或队列运行中拒绝；备份失败不移除。副本不自动回放，需恢复时核对原before/after与云端当前revision后再决定；停止重试不是云端回滚，已写入的部分不撤回。112成品已生成但无公共tag，保留未公开草稿；用户只需安装合并113。

114补齐failed color同等入口，并明确标为“颜色修改”。仍只允许failed edit/color，source、运行中和恢复副本回读门禁不变。HarvestProgress在HistoryPanel的专注积累标题中显示无动画的小标签，done立即卸载；没有固定浮层/果筐/成功动画。116起busy直接显示短阶段与百分比，error点击“同步未完成”展开记录时间、任务、失败步骤和原异常；自动不弹toast，明确手动请求仍可显示结果，5分钟调度不变。失败revision的原因随原防重放标记在进程内保留，后续其他记录成功不会清掉；原记录已cloudSynced、新revision或明确重试时才清理对应诊断，不另存第二记录源、不增加轮询。重启后原pending记录仍在，下次原同步尝试会重新产生详情。

当前专注不再阻止补记。新补记默认开始=当前专注开始前25分钟、结束=当前专注开始，用户可调整过去时间；ManualEntry与CounterContext均拒绝与当前专注区间重叠。仅upsert补记记录，保留active身份、任务、状态、segments和原计时循环，不结束、暂停或重置当前番茄。

公开主线是 `origin/codex/feishu-focus`。开始工作前：

```sh
git status --short --branch
git fetch origin --tags
npm run check:sync
```

检查失败时先保存本地工作，再整合远端并验证。旧分支不能仅通过提高版本号成为新版。
每台电脑首次 clone 后执行 `npm run dev:setup` 启用本仓库 pre-push 检查；已有其他 hook 会停止安装，需手工整合。Git hook 不是安全边界，仍须遵守非强制推送和审查。

发布顺序：

用户2026-10-10确认“默认推送”：完成已授权修改并通过验收后直接执行下列源码同步和Windows安装版发布，以旧版应用能够检查到新版为完成条件，不再等待另一句“推送”。明确说“只推源码”则止于第5步；明确暂不发布则按该要求，不发布失败或未验收的修改。用户2026-10-07明确便携包不属于默认交付；只需App内手动检查、下载并安装更新，及GitHub可接力修改源码。此授权不包含自动安装、重启用户应用或改变Mac个人版的月度发布方式。

1. 从已包含公开主线的 commit 开发，审查 diff，记录源 commit 与验收。
2. `npm run version:prepare`：查询实时远端、其他本地分支和产物，准备未用号码。它不会替你合代码。
3. `npm run test:focus:all`、`npm run build:focus`、`npm run test:desktop`，并运行命中改动的界面测试。
4. 提交源码及版本，保持干净；再次 `npm run build:focus`，生成带 commit SHA 的构建，再 `npm run package:focus`。
5. 按上述默认授权 `npm run push:focus`，以非强制方式更新公开主线。别的电脑抢先推送会失败，接回修改并重测。
6. 在实际干净构建的确切 commit 上先建draft prerelease（暂不创建公共tag），上传安装包、setup blockmap、preview.yml、source-version.json、SHA256SUMS.txt。发布前再核远端SHA及五资产的uploaded状态、字节大小和SHA256 digest；preview.yml的version/size/SHA512须对应实际setup。便携包只有另有明确请求才发布，不是NSIS更新依赖。核验通过后创建固定源码的annotated tag，立即发布为非draft的preview prerelease且不设Latest；已有tag与同号资产不得替换。公共preview tag创建后立即实测旧版更新链路，不能用draft状态替代可见性验证；限定事实见Learning.md。preview.71已上传的校验文件保留本地便携构建的校验行，但不表示该包已发布，也不需要下载它。
7. 使用与应用相同的固定版真实electron-updater、GitHub仓库和preview渠道，以前一已发布Windows版本检查到新版及正确setup地址。不启自动下载或安装，不触碰用户profile。若本机网络导致失败，记录原始错误并按既有官方路径修正再验证；不得以GitHub页面存在代替更新检测。回执写明源码SHA、Release URL、资产校验与检测结果后才报告“推送完成”。

构建来源位于包内 `source-version.json` 和本地 `artifacts/focus-build.json`。
打包拒绝：未包含实时远端、网络不可核实、未提交改动、已发布版本、同号本地产物、旧 commit/旧版本/脏源码构建。
打包不会再自动修改版本，避免界面、包版本和源码不一致。

电脑接力时，交接当前分支、完整 SHA、未提交文件和测试结果；另一台先 fetch + check:sync。
安装包的更新与源码同步是两件事；安装了新版不代表当前开发分支已更新。

GitHub 的 `codex/feishu-focus` 已启用禁止强推、禁止删除，并对管理员生效；普通快进推送保持可用。不要关闭保护来解决分叉，应先在独立分支整合。发布后的补充验收文档可另作提交，已发布标签继续固定实际构建的源码 commit。
