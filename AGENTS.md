# 番茄农场接力规则

本文件适用于 Codex、Kimi 和其他开发者。公开源码主线唯一为
`origin/codex/feishu-focus`。版本号、旧 origin 缓存、截图和安装包不能证明代码已同步。

1. 开工先看 `git status --short --branch`、`git worktree list`，保存当前未提交工作。
2. 执行 `git fetch origin --tags` 和 `npm run check:sync`。检查直接查询实时远端 SHA；未包含远端或网络无法核实时，不打包、不发布。不用本地更高版本号绕过。
3. 从已包含公开主线的 commit 建立独立任务分支。旧开发分支保留作参考；未公开的个人历史不能直接 merge/push 到公开仓。需要移植时审查逐文件差异，记录来源并回归测试。
4. 交接记录源 commit、目标 commit、工作树、已测功能和未完成项；不以“另一台同步过”代替证据。用户配置、飞书记录、凭证和私人截图不进 Git。
5. 开发完成后运行 `npm run version:prepare`，核对版本，测试并提交，再 `npm run build:focus`、`npm run package:focus`。打包不再偷偷修改版本；要求干净源码、实时远端祖先检查、未用版本和与 HEAD 对应的构建。
6. 用户说“推送”时，默认授权并要求完成：源码同步、Windows preview更新包发布、客户端更新检测验证；只有明确说“只推源码”才省略发布。源码使用 `npm run push:focus` 非强制更新；如果另一台先推送，先接回其修改并重测，不 force。完整包在固定源码tag上先创建draft prerelease，上传安装包、便携包、blockmap、preview.yml、source-version.json、SHA256SUMS.txt，核对远端大小/哈希后再发布非draft。发布后须用真实更新器从前一已发布Windows版本验证发现新版；仅push成功、存在tag或draft不算推送完成。发布前再次核对源 SHA；不可复用同一 tag 替换不同源码/安装包。不自动安装或重启用户App。
7. `npm run dev:setup` 安装仓库自带 pre-push 检查（已有其他 hooks 时先整合，禁止覆盖）。每台电脑各运行一次；新 clone 的 Git hook 不会自动启用。

验证命令与换机步骤见 `docs/DEVELOPMENT.md`；本轮整合证据见 `docs/ACCEPTANCE-integration.md`。

## Mac 个人版独立发布

用户要求 Mac 按月汇总。Mac 使用 `v0.1.0-mac.N` prerelease 和 `scripts/package-mac-personal.cjs`，详见 `docs/MAC-PERSONAL.md`。以上第5条 Windows 版本递增与打包流程不用于 Mac；其他干净源码、实时远端、授权、数据审查规则照常。Mac 不修改 Windows preview 计数/更新文件，不设 Latest，不替换旧资产，不建立定时发布。
