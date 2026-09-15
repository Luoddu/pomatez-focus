# 跨电脑开发与发布

公开主线是 `origin/codex/feishu-focus`。开始工作前：

```sh
git status --short --branch
git fetch origin --tags
npm run check:sync
```

检查失败时先保存本地工作，再整合远端并验证。旧分支不能仅通过提高版本号成为新版。
每台电脑首次 clone 后执行 `npm run dev:setup` 启用本仓库 pre-push 检查；已有其他 hook 会停止安装，需手工整合。Git hook 不是安全边界，仍须遵守非强制推送和审查。

发布顺序：

1. 从已包含公开主线的 commit 开发，审查 diff，记录源 commit 与验收。
2. `npm run version:prepare`：查询实时远端、其他本地分支和产物，准备未用号码。它不会替你合代码。
3. `npm run test:focus:all`、`npm run build:focus`、`npm run test:desktop`，并运行命中改动的界面测试。
4. 提交源码及版本，保持干净；再次 `npm run build:focus`，生成带 commit SHA 的构建，再 `npm run package:focus`。
5. 用户授权后 `npm run push:focus`，以非强制方式更新公开主线。别的电脑抢先推送会失败，接回修改并重测。
6. 在该确切 commit 上创建新 tag/release，上传安装包、便携包、更新元数据与 SHA256SUMS.txt。发布前再核远端 SHA；发布的 tag 与同号资产不得替换。

构建来源位于包内 `source-version.json` 和本地 `artifacts/focus-build.json`。
打包拒绝：未包含实时远端、网络不可核实、未提交改动、已发布版本、同号本地产物、旧 commit/旧版本/脏源码构建。
打包不会再自动修改版本，避免界面、包版本和源码不一致。

电脑接力时，交接当前分支、完整 SHA、未提交文件和测试结果；另一台先 fetch + check:sync。
安装包的更新与源码同步是两件事；安装了新版不代表当前开发分支已更新。

GitHub 的 `codex/feishu-focus` 已启用禁止强推、禁止删除，并对管理员生效；普通快进推送保持可用。不要关闭保护来解决分叉，应先在独立分支整合。发布后的补充验收文档可另作提交，已发布标签继续固定实际构建的源码 commit。
