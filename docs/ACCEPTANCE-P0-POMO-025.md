# P0-POMO-025 验收

- 基线 264f779；自有表单端点变更未联动认可时长，保存按有效片段裁剪校验，造成不直观的拒绝。四源预检及范围见 TASK-P0-POMO-025.md。
- manualWindow 统一预览与保存口径；端点缩短只下调超过上限的时长（向下保留两位分钟），不改变数量；延长不自动增加；允许小数微调，输入变更清除旧错误。
- 已验证：test-focus-all 220/220；category-review-desktop 6/6；test-desktop 21/21 + 独立进程重启恢复；完整 build-focus 通过。
- 正反验收：超额仍拒绝且提示准确上限，缩短后可直接保存；延长保留已认可时长；暂停不计入，数量/身份/分类不变；跨日平移和补记仍通过。隐藏真实 Electron renderer/main/preload 经模拟适配器完成纠正回写；真实飞书写入为零。
- Learning：none，局部输入联动缺失，未形成新的跨任务工程结论。回滚独立提交，无迁移；未修改真实记录、凭证或正在运行的用户 App。
- portrait-desktop 14/14；git diff --check 通过，提交前实时远端祖先核对通过。源码提交 f371a43c1e328782cda311dad581cb8c5cec8c7d。
- preview.60 已正式发布为 prerelease：2026-09-26T15:35:41Z，https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.60 。公开分支与 tag 均核对为该源码 SHA。
- 干净提交重建后打包；asar 内 source-version 与源码 SHA/版本一致且 dirty=false；包内无凭证/测试 profile/日志。隐藏包启动退出 0。preview.yml 的 SHA512 与 setup 一致；六个公开附件全部 uploaded、大小及 GitHub SHA256 digest 与本地一致。
- 尚未在用户运行中的 App 点击安装，避免打断当前使用；可通过设置检查更新安装。未声称独立 reviewer 完成，维持 REVIEW。
