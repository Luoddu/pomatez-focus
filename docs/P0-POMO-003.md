# P0-POMO-003 — 近日行动生成与手动应用更新

状态 REVIEW；角色/owner codex 独立模块实现者；基线 8272ac2d5f6afa938938d64b958559e76879e893；状态源本卡。用户明确要求修复生成、添加检查/手动更新/进度/安装后重启，沿用既有公开仓发布和本机部署授权。实现、测试、实际飞书生成和本机入口部署已核验，公开发布待最终核对。

允许写集：electron focus/generate/feishu/updater 与 main/preload，renderer focus 设置/更新组件与生成提示，相关测试、build/package 脚本、package/锁文件、README/FEISHU/CHANGELOG/本卡/验收与 release 文档。可读主机已有飞书连接，真实生成只允许按当前用户勾选及数量增加今天缺失序号，保留所有既有任务、完成与专注行。公开产物不含私人任务/凭证。根仓、打印 App 不可写。

四处自检：① generate.ts:94 固定任务计划日，feishu.ts:507 要求日期字段且 UI 零候选误报已齐全；② 固定安装包 electron-updater 6.8.3（本地现存版本）、Electron 34.5.8、electron-builder 25.1.8。官方 AppUpdater.js:111/254，BaseUpdater.js:12/69，NsisUpdater.js:36/83/99，GitHubProvider.js:39，nsisOptions.d.ts:57。采用 NsisUpdater 官方 check/download/quitAndInstall 及 GitHub preview.yml/sha512，不自研替换 EXE 脚本。当前官方网页为新版，仅辅助，不外推覆盖本地固定源码；③ 打印 App tools/update_formal_app.ps1 是 Git 源码更新与自定义进度协议，复用手动确认与进度体验，不移植其 Git 更新实现到 Electron。沿用现有隐藏执行/打包/元数据校验 helper；④ 复用 generate/desktop/cloud 验收，新增近日行动筛选、重复生成、空候选，以及更新状态、下载失败/校验失败不安装、活动计时保护、重启后历史保持。

实现约定：任务表有“近日行动”复选框时优先勾选模式；没有时兼容旧日期模式，错误类型明确拒绝；已完成/放弃不生成。番茄表的计划日仍写今天。更新仅用户点击检查/下载触发，下载完成无活动计时则安装重启；有运行/暂停/待确认专注先保留，待用户结束后再点击安装。关闭应用不自动安装。GitHub 来源固定 Luoddu/pomatez-focus，preview 通道，不需要 GitHub token。

安装更新采用官方 NSIS per-user 模式。同时保留 portable 供旧用户一次过渡；后续更新使用 setup 包并建立固定安装入口，保留 appId/productName/userData/存储键。无新服务器/开机启动/长期监控/通知推送。用户无需配置开发环境。

上下文：上述代码/测试/固定官方源码、已读治理版本/派发规则；不读无关根架构/其他人数据。网络/安装后果仅在上述授权内；遇同根因未知失败两次停止相应尝试并定位。不做子 Agent、自动化；单独工作树/本分支、随机测试 profile；发布前检查 HEAD/写集与隐私。回滚保留 preview.19 与旧配置历史，不重置数据。正例合法选择生成及合法更新可通；反例未选/已完成不写、重复不增、失败不退出，检查更新不自动下载。

验收见 `docs/ACCEPTANCE-planning-updates.md`；88/88 逻辑测试、21/21 桌面回归及重启、实际 HTTP/校验负例、真实独立 NSIS 安装重启通过。主机真实生成 5 项/16 行，重复新增 0，18 条历史未改。本机 shortcut 换 preview.20，旧进程保留。Learning 判断 none：项目特有字段适配与官方更新路径，无新增跨任务规则。
