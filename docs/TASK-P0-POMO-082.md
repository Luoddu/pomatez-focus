# P0-POMO-082 统计页宽度与图表比例

- IN_PROGRESS；模块独立状态源本卡，owner/root，基线4794a7eeae521f71f1e4b132d19f670cb49022fa，task/p0-pomo-082-stats-layout。用户2026-11-12要求修正统计页过宽、观感差；轻风险T1显示样式，实现者按how-to-dispatch轻量卡自测，无业务语义变更。
- 允许：app/renderer/src/focus/focus.css、components/StatsPanel.tsx（位于同focus目录）、tests/stats-layout-desktop.cjs、本卡、ACCEPTANCE-P0-POMO-082.md、CHANGELOG.md及version:prepare既有版本输出；artifacts仅本地忽略验证/发行产物。禁止修改统计口径、数据、同步、依赖、根治理和私人App。资源为既有本任务独占工作树、随机隐藏静音合成profile；无端口/真实飞书写入。
- 四源预检：①StatsPanel直属内容随content拉满，focus.css:2991无宽度上限、3154趋势高度固定166px、routine-panel额外16px外边距叠加；②不适用，纯项目CSS布局，不改变第三方语义或版本；③复用隐藏Electron测试、build-focus、版本/本地更新/发行helper，Learning无命中布局教训，既有发行约束保持；④research-desktop与ACCEPTANCE-P0-POMO-075的宽窄窗口几何/截图验证可复用。
- 验收：宽屏内容居中且不再铺满；趋势不被拉成扁带；窄窗不横溢出，区间、分类、返回仍可操作；统计数字和原有业务路径不变。检查1440/2280宽屏、760窄窗、1080竖屏并查看合成截图。沿既有默认推送授权完成本地安装包准备与公开preview；不自动重启或安装。
- 开工绿灯：fetch/check:sync远端与基线相同，工作树干净，仅旧只读参考worktree；无重叠写者。关键提交再核对。一次前台有界90分钟，无新后台/子Agent；未知同因失败两次暂停对应步骤。回滚为恢复基线显示样式后新版本交付，不覆盖公共资产。Learning判断见验收；纯显示修正暂无新跨任务工程教训。
