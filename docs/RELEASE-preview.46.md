# 番茄农场 preview.46

公开源码 `f5583c1a70e8b37d6decd9260a7729f7aaf3274e`（codex/feishu-focus），
在 preview.45 之上新增统计页分享卡片，并修复 45 的启动崩溃。

## 重要修复：preview.45 启动崩溃

preview.45 发布包 asar 内的 `focus/updater.js` 是 tsc 未打包输出（裸
`require("electron-updater")`），安装后启动即崩。根因：build-focus 的
esbuild updater 打包步骤曾静默未写产物。本次在 `scripts/build-focus.cjs`
打包步骤后加护栏（产物 <100KB 或含裸 require 即中止构建），并新增
`scripts/check-asar-updater.cjs` 对任意打包目录做 asar 级验证；46 的
asar 已验证为正确打包产物（575863 字节、0 个裸 require）。
崩溃发生在启动阶段，自动更新救不回来：装着 45 的设备需手动下载 46
覆盖安装，数据目录不受影响。

## 新功能：统计页分享卡片

- 统计页标题栏新增「📸 分享」：一键把当前区间渲染成 1080×1520 成就图 PNG
  并导出（文件名含区间标签）。
- 卡片内容：番茄农场品牌头 + 节气 pill（节气名 + 第几天）、番茄主数字 +
  专注时长 + 连续收获天数、收获柱状图（复用 `barTone` 成就色：1–9 红系
  渐深、≥10 金系渐耀带光晕）、7×24 时段热力（复用 hm-t 色板）、时段偏好
  与象限分布双联小卡、页脚累计收获里程碑进度条 + 水印。
- 隐私安全：`shareCardModel` 纯函数装配的全部字段不含任何任务名（有单测
  断言 JSON 中不出现任务名），可放心截图分享。
- 实现：`app/renderer/src/focus/shareCard.ts`（模型纯函数 + Canvas 2D
  绘制分离）；`StatsPanel` 注入分享按钮；`__SHARE_CARD_HOOK__` 测试钩子让
  shot-app 断言 PNG 生成并落盘 artifacts/ui-shots/share-card.png 供人工
  检查。

## 工程备注

本机代理（Clash 7890/7891）对 curl schannel 的大文件 POST 极不稳定
（bytes sent: 0 / 握手失败 / 连接中途被重置），改用
`scripts/upload-asset-socks5.py`：Python OpenSSL + SOCKS5（7891）通道，
自带 chunked 响应解析、starter 资产自愈清理与「已上传且大小一致即跳过」
幂等逻辑；`scripts/finish-release-uploads.py` 以后台 worker 方式对 45/46
两个 Release 的全部资产做断点续传式补齐。`.gitignore` 把 dist-preview*
通配纳入忽略（45c/46 打包目录不再误入版本库）。

Windows x64：下载 setup.exe 安装版或 portable.exe 便携版。正常退出旧版后
运行新版，沿用原应用数据目录、飞书配置与历史记录。本次没有数据迁移，
不需要复制凭证文件。

验收：188 项单元测试通过（新增 shareCardModel/heatTier 6 项）；110 项界面
检查通过（新增分享按钮 PNG 断言）；桌面端横屏 21 项 + 竖屏 12 项集成检查
通过；真实 NsisUpdater 伪装 0.1.0-preview.45 从线上 Release 检测到
0.1.0-preview.46 并取回 setup.exe 元数据（tests/verify-update-desktop-46.cjs）。
校验文件 preview.yml（SHA-512）随包发布。仅验证 Windows x64，仍是未签名
预览版。
