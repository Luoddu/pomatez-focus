# P0-POMO-031 暂停时突出继续

- REVIEW（本地验证与 preview.65 发布已核）；隔离实现者 Codex。用户要求番茄暂停时「继续」使用强调色。基线 `8460d592a2b74de94652bd03bcf2fa5bd699b4af`，分支 `task/p0-pomo-031-resume-accent`，独占当前工作树及隔离测试 profile。
- 写集：`FocusTimer.tsx`、`MiniView.tsx`、版本文件、`CHANGELOG.md`、本卡与验收。禁止飞书/用户数据写入、凭证、根控制面、用户 App 安装重启。沿用已授权的源码和 Windows 安装包发布流程。
- 四源预检：① 当前两个计时视图在暂停时都给「继续」灰色描边，而「结束」占用强调色；② 纯项目自有 JSX 样式切换，不涉及第三方运行语义；③ 复用现有 `btn-primary` / `btn-outline` 样式与静音桌面 runner，无新 Learning 候选；④ 复用现有 focus 与 desktop 回归及发布检查。
- 正反验收：暂停时「继续」为蓝色主按钮、「结束」为描边按钮；计时中「暂停」仍为描边、「结束」仍为主按钮，结束确认仍为危险按钮。完整视图及小窗一致；暂停/继续/结束动作仍正常。
- 预算 45 分钟，无子 Agent/后台任务；首次写入前已 fetch、`check:sync`、检查 worktree，提交和发布前重核。失败按根因分类，同因未知两次停止对应尝试。回滚独立提交，无数据迁移。

## 本地验收

- `npm run test:focus:all` 230/230，`npm run build:focus` 通过；静音隐藏桌面核心 21/21，重启恢复通过。
- 真实渲染器截图 `artifacts/ui-shots/app-timing-returned.png` 核对暂停态「继续」蓝色、「结束」描边。截图全套运行 1 项旧周目标进度条断言失败，与本次按钮无关；其余检查包括暂停恢复、迷你窗呈现和无渲染错误通过。
- Learning none：复用既有按钮样式的局部条件切换，无可跨任务复用新机制。
