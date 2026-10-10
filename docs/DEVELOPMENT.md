# 跨电脑开发与发布

补记先选开始/结束时间，自动预填时长和每25分钟一颗的默认数量；之后调整数量不会改起止或时长。每日08:30（App本地日历时钟）自动补齐今日番茄；App未运行时下次启动补当天，专注/确认或其他写入忙时等待。按钮保留实际成功刷新时间，点击仍可手动刷新。失败不会标为成功，也不会同日自动反复重放；用户可手动重试。不会清空成果、旅程或历史，不创建系统计划任务。

公开主线是 `origin/codex/feishu-focus`。开始工作前：

```sh
git status --short --branch
git fetch origin --tags
npm run check:sync
```

检查失败时先保存本地工作，再整合远端并验证。旧分支不能仅通过提高版本号成为新版。
每台电脑首次 clone 后执行 `npm run dev:setup` 启用本仓库 pre-push 检查；已有其他 hook 会停止安装，需手工整合。Git hook 不是安全边界，仍须遵守非强制推送和审查。

发布顺序：

用户未加限定地说“推送”，默认包含下列源码同步和Windows安装版发布，并以旧版应用能够检查到新版为完成条件；明确说“只推源码”则止于第5步。用户2026-10-07明确便携包不属于默认交付；只需App内手动检查、下载并安装更新，及GitHub可接力修改源码。此授权不包含自动安装、重启用户应用或改变Mac个人版的月度发布方式。

1. 从已包含公开主线的 commit 开发，审查 diff，记录源 commit 与验收。
2. `npm run version:prepare`：查询实时远端、其他本地分支和产物，准备未用号码。它不会替你合代码。
3. `npm run test:focus:all`、`npm run build:focus`、`npm run test:desktop`，并运行命中改动的界面测试。
4. 提交源码及版本，保持干净；再次 `npm run build:focus`，生成带 commit SHA 的构建，再 `npm run package:focus`。
5. 用户授权后 `npm run push:focus`，以非强制方式更新公开主线。别的电脑抢先推送会失败，接回修改并重测。
6. 在实际干净构建的确切 commit 上创建新tag，先建draft prerelease，上传安装包、setup blockmap、preview.yml、source-version.json、SHA256SUMS.txt。发布前再核远端SHA及五资产的uploaded状态、字节大小和SHA256 digest；preview.yml的version/size/SHA512须对应实际setup。便携包只有另有明确请求才发布，不是NSIS更新依赖。然后发布为非draft的preview prerelease；已有tag与同号资产不得替换。公共preview tag创建后立即实测旧版更新链路，不能用draft状态替代可见性验证；限定事实见Learning.md。preview.71已上传的校验文件保留本地便携构建的校验行，但不表示该包已发布，也不需要下载它。
7. 使用与应用相同的固定版真实electron-updater、GitHub仓库和preview渠道，以前一已发布Windows版本检查到新版及正确setup地址。不启自动下载或安装，不触碰用户profile。若本机网络导致失败，记录原始错误并按既有官方路径修正再验证；不得以GitHub页面存在代替更新检测。回执写明源码SHA、Release URL、资产校验与检测结果后才报告“推送完成”。

构建来源位于包内 `source-version.json` 和本地 `artifacts/focus-build.json`。
打包拒绝：未包含实时远端、网络不可核实、未提交改动、已发布版本、同号本地产物、旧 commit/旧版本/脏源码构建。
打包不会再自动修改版本，避免界面、包版本和源码不一致。

电脑接力时，交接当前分支、完整 SHA、未提交文件和测试结果；另一台先 fetch + check:sync。
安装包的更新与源码同步是两件事；安装了新版不代表当前开发分支已更新。

GitHub 的 `codex/feishu-focus` 已启用禁止强推、禁止删除，并对管理员生效；普通快进推送保持可用。不要关闭保护来解决分叉，应先在独立分支整合。发布后的补充验收文档可另作提交，已发布标签继续固定实际构建的源码 commit。
