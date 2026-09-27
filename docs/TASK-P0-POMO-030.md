# P0-POMO-030 科研视觉简化

- REVIEW（代码与回归通过，待发布验证）；隔离实现者/上下文负责人Codex。用户明确删除任务科研标识、侧边强调和农场科研数量；保留浅红底、科研排序/周目标/统计/果体。基线347574bed2fc082d1d499c56e544287fab35cd70，独占task/p0-pomo-030-research-style分支及当前隔离工作树/合成profile。已fetch/check:sync/并发路径检查。
- 写集：QuadrantBoard.tsx、FarmField.tsx、focus.css、既有research-desktop测试、版本文件、CHANGELOG、本卡与验收。禁止真实记录、飞书写入、凭证、新依赖、根控制面、用户App安装重启；既有源码与Windows安装包发布授权延续。
- 四源预检：① 前轮三处展示代码明确定位；② 纯项目自有JSX/CSS，无第三方语义变化；③ 复用既有任务分组、科研统计和静音runner，无新Learning命中；④ 复用research-desktop、完整逻辑/桌面验收。
- 正反验收：不再显示标识、侧边线或农场科研数量；浅红背景仍在，科研排序/目标/果体和普通任务启动照常。更新已有断言，不增镜像单测。隐藏静音测试。
- 预算45分钟，无子Agent/长期后台；同因未知失败两次停止对应尝试；提交/发布前复核远端。Learning none：纯展示删减，无新工程机制。回滚独立提交，无数据迁移。
