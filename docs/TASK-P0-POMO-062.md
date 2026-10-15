# P0-POMO-062 补记分类菜单遮挡
状态：DONE；唯一模块状态源本卡；负责人/root。
请求/授权：用户2026-10-15报告补记独立弹窗分类菜单被毛玻璃遮挡，要求修复；本模块AGENTS默认授权验收后源码推送、Windows preview发布和真实旧更新器检测，不自动安装或重启App。
基线/资源：e2f70cede7200f11403bb6cfc9addbe0e4255379；实时fetch/check:sync同SHA且clean。任务分支task/p0-pomo-062-category-overlay复用现有独立模块checkout，无重叠活动写者；仅隔离测试profile/ignored artifacts，不占真实profile/服务/端口。
范围：轻风险T1本地UI层级与已消费键盘事件；只改app/renderer/src/focus/focus.css、components/ManualEntryDialog.tsx、tests/manual-dialog-desktop.cjs，本卡/ACCEPTANCE-P0-POMO-062.md；版本仅app/electron/package.json和SettingsPanel.tsx；ignored发布资产。CategorySelect若需界定事件/样式可在原有键盘处理范围微调，不改分类/保存业务语义。原始记录、偏好/凭证、飞书及其他电脑不写；根共享治理不写。
四源预检：①CategorySelect把fixed菜单portal至body，focus.css category-options z140，但manual-dialog-backdrop z3000，故被遮；菜单Escape preventDefault后仍冒泡至dialog文档监听并关闭父弹窗。②不适用第三方升级/新API：复用既有React16 portal/DOM/CSS，仅项目样式和事件消费约定，采用实际Chromium hit-test验证，无第三方运行机制偏离。③检索模块Learning无同域既有条目，复用已有CategorySelect和ManualEntryDialog，不造菜单；脚本build:focus/package:focus/push:focus与隐身测试封装。④tests/manual-dialog-desktop.cjs已有三窗口几何/inert/焦点/保存验收，追加分类hit-test、点选与Esc嵌套回归；060验收固定仅测整体几何未展开分类。
正反验收：横屏/竖屏/窄窗展开菜单所有选项均在遮罩之上且可点，科研等选择保留并保存正确；菜单不越视口、不挤乱背景，Esc只关菜单、再按才关dialog，Tab跳转/焦点恢复仍正常；名称/开始结束/原始时长和编辑保存仍可用。干净构建包、五资产哈希/固定tag、旧97 updater可发现新版；不自动下载安装。
预算/复核：一次有界前台交付，无新后台/依赖/费用；允许复用一个只读reviewer复核冻结diff/发布证据，不另派实现者。无副作用的定位/编辑/验证按既有授权继续，根因不明同因两次停止对应步骤；已知根因用本卡范围修复，不做范围外顺手改动。
回滚/Learning：恢复基线CSS/事件guard或使用旧97发行，不删用户数据；当前为既有UI层级协调修复，完成时判断是否新增可跨任务教训，未形成则具体说明不重复写Learning。

最终检查点：冻结源码0d5cb9f25d2b1bfd99c20846cd5f74b4cc6b8eea，clean构建/包、三窗分类交互与既有编辑保存、portrait14全部PASS；preview.98源码/五资产公开发布，97真实更新器发现98通过，独立reviewer最终PASS无P1/P2。详见ACCEPTANCE-P0-POMO-062.md。回执文档不改变固定发行tag；未自动安装/重启用户App。
