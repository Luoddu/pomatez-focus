# P0-POMO-031 暂停后继续按钮验收

- 基线 `8460d592a2b74de94652bd03bcf2fa5bd699b4af`；任务、范围与回滚见 `TASK-P0-POMO-031.md`。
- 完整计时窗与紧凑小窗暂停态均用现有主题蓝主按钮显示「继续」，「结束」改为描边；运行态维持「暂停」描边及「结束」主按钮，结束确认保留红色提示。
- `test:focus:all` 230/230、`build:focus` 成功；静音隐藏核心桌面 21/21，进程重启恢复通过。
- 真实渲染器的 `artifacts/ui-shots/app-timing-returned.png` 目视确认完整计时窗暂停态配色。截图脚本全套另有一项周目标进度条外观断言失败，所涉组件和样式不在本次 diff；暂停恢复与紧凑小窗相关检查通过。
- 不访问真实飞书或用户记录，不安装或重启用户 App；Learning none，单纯复用现有样式。
- 发布源码 `f65a3a014db9dbc09d1e81560147ea1ca26bf35d` 与远端主线、`v0.1.0-preview.65` tag 一致。干净源码重建后打包，Windows 包静音隐藏启动退出 0；包内与旁置 `source-version.json` 都指向该 SHA。
- [preview.65 Release](https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.65) 已公开为 prerelease，非草稿；安装包、便携包、blockmap、更新元数据、来源元数据、SHA256SUMS 共 6 项远端资产与本地 size/SHA256 一致，`preview.yml` 的安装包 SHA512 与实际文件一致。
- 未安装或重启用户 App。回滚本次源码提交即可，无数据迁移；已发布 tag/资产保持不可变。
