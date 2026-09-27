# 番茄农场 · Mac 个人版（Apple Silicon）

面向 M1/M2/M3/M4 等 M 系列 Mac，macOS 12 或以上。Intel Mac 不包含在此版本。
与 Windows 共用源码和功能，Mac 按月挑选经过验证的版本汇总发布；不跟随 Windows 每次小更新。

## 下载与安装

在 [Mac 发布列表](https://github.com/Luoddu/pomatez-focus/releases?q=mac&expanded=true) 选择最新 `v0.1.0-mac.N`，下载名称包含 `mac-arm64.dmg` 的文件。
打开 DMG，把 Pomatez Focus 拖到“应用程序”，然后从“应用程序”打开。ZIP 是备用分发格式。

本版有 ad-hoc 完整性签名，但没有 Apple Developer ID 签名和公证。
首次启动若提示无法验证开发者，请先确认下载来自本仓库，再到“系统设置 → 隐私与安全性”找到该应用并选择“仍要打开”（[Apple 官方说明](https://support.apple.com/102445)）。不要关闭全局 Gatekeeper。
如果系统提示应用损坏、恶意软件或没有允许入口，请保留具体提示用于排查，不运行网上的全局安全关闭命令。

不配置飞书也可使用自由专注和本地记录。要同步时请连接你自己的飞书应用和多维表格；安装包不包含作者的账号、任务、Secret 或历史记录。
Windows 加密连接配置不能直接复制到 Mac；在 Mac 设置中填写自己的连接信息。

## 更新

设置中的“查看 Mac 月度版本”打开 Mac 发布列表。先保存当前专注并退出 App，再下载新 DMG、替换“应用程序”内的 App。不要删除用户资料目录，正常替换应用会保留本机记录。
个人版不进行后台下载安装。Windows 仍用原来的 `preview` 通道和 NSIS 自动安装流程。

## 维护者每月发布一次

1. 获取并验证 `origin/codex/feishu-focus`，选择已经稳定的源码；按功能比较与上个 Mac 源码 SHA 的变化。
2. 只递增 `app/electron/electron-builder/mac-personal.cjs` 的 `0.1.0-mac.N` 和 `buildVersion`；不调用 Windows 的 `version:prepare`，不修改 Windows preview 版本。
3. 测试并提交、按仓库规则推送公开主线。手动运行 Actions → **Mac personal snapshot**，选择该分支。
4. CI 在原生 arm64 Mac 构建 DMG/ZIP，检查签名、实际打包 App 启动、桌面与重启恢复回归；下载 `mac-personal-arm64` artifact，核对 SHA256SUMS 和 mac-build-verification.json 的源码 SHA。
5. 新建同仓库 **prerelease** `v0.1.0-mac.N`，目标是该精确 SHA，上传 DMG、ZIP、校验及构建回执；不设置 Latest，不上传/改写 `preview.yml`、Windows EXE 或旧 tag。先建草稿、核验后发布。
6. 核验 Windows 检查更新仍选择 preview；记录朋友设备上的首次安装、菜单粘贴、专注/暂停/保存、退出重开验收。

仅手动触发，没有月度定时任务。遇到必要的安全修复可提前发布。源码仍只有一个主线，无长期 Mac 分叉。

## 验证边界

CI 成功证明原生 Mac 构建和指定回归通过，不等于已在朋友的真实 Mac 上验证了 Gatekeeper、声音、菜单栏或其飞书账号。首次使用请完成上面的短验收。此版本沿用项目 Electron 34.5.8，不宣称升级了运行时安全基线。
