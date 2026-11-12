# P0-POMO-084 整理项目列表等待优化

- DONE；owner/root，模块本卡为状态源，基线da2a1645d74c7d2dd2ae388a40ebb019597eba60，task/p0-pomo-084-project-cache。用户要求优化每次整理项目加载慢。T1可逆本地实现，涉及表单及缓存业务行为，完整卡与独立复核；根仓只读。
- 目标：同一应用会话同来源复用已成功项目目录，显式刷新取新项目；并发合并；首次加载/失败不阻塞明确暂不归属整理；刷新保留旧列表与选择，失败可重试；来源隔离及原有同步验证不变。
- 写集：renderer focus/FocusApp.tsx、projectCatalog.ts、components/{QuickTaskEntry,FocusCapture,QuadrantBoard}.tsx；tests/project-catalog.test.cjs、tests/project-catalog-desktop.cjs及相应本地runner；任务/验收文档、CHANGELOG、既有版本helper输出。artifacts忽略。禁止真实飞书请求/写入、凭证、网络配置、依赖升级、磁盘项目目录持久化、根共享文档、自动重启/安装。
- 四源：①FocusApp:965缓存60秒后失效；QuickTaskEntry loading禁用整理且重试清空列表；feishu.projects→projectTaskTable→projectCatalog顺序读取schema/字段/记录，加载耗时被暴露为UI阻塞。②本次不改变第三方网络/API语义，不适用采用升级Gate；根因来自本项目源码，不归因DNS/代理或服务故障。③复用当前Promise去重/source校验、既有项目后端校验、隐藏Electron与发行helper；Learning未命中缓存目录教训。④task-projects-desktop/focus-capture-desktop/quick-edit测试，前者旧版真实项目菜单已被081替换，不宣称整套旧菜单验收仍适用。
- 正反验收：成功列表过60秒仍可立即复用；显式刷新带来新列表且并发只读一次；首次失败可重试、刷新失败仍可用旧列表；来源切换不复用其他来源/迟到响应；选择仍提交正确项目，没选时明确暂不归属可整理，不自动改已选项目；数据变动使所选项目消失需提示并要求重新选择。隐藏合成生产页面验证未完成远端读取下仍能整理、重复打开请求计数稳定、手动刷新/错误/恢复；0真实云写。
- 资源：既有独占worktree、随机hidden/muted profile，无共享端口。fetch/check:sync干净匹配基线，旧worktree只读无重叠。120分钟前台预算；只复用review_local_editing有界只读冻结diff复核，不新建子Agent。按根失败规则停止未知同因两次，已知fixture问题修正并记录。
- 回滚恢复基线源码、发新版本，不迁移或删除用户队列。沿用户默认推送/本地优先授权，本地包与不可变preview、真实旧更新器均通过才DONE，不自动安装。Learning判断在验收中，提交前复核HEAD/写集/资源。

- 固定源码f0cae18b82292bf2db5b9fef325b0c886a0e071a：27测试、最终隐藏UI与空目录边界、独立复核、123本地准备/回读、五公开资产和真实122更新器全部通过，详见验收。
