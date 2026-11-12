# P0-POMO-083 统计页两列卡片

- IN_PROGRESS；模块状态源本卡，owner/root；基线ab9dd09ec534bb90a7abc0ea669190bd510682b0，task/p0-pomo-083-stats-cards。用户明确否定仅限宽的单列，要求两列、多卡片及去掉鼓励话术。局部T1展示与文案，不变业务逻辑；根仓只读。
- 写集：app/renderer/src/focus/components/{StatsPanel,StatsTrendChart,ResearchProgress,RoutinePanel}.tsx、focus.css，本卡及ACCEPTANCE-P0-POMO-083.md、CHANGELOG.md、version:prepare既有输出；artifacts为忽略的合成验证与发行产物。禁止修改计算/持久化/同步/依赖或真实用户数据。
- 四源：①121虽限宽仍单列，ResearchProgress/RoutinePanel存在重复鼓励段落；②不适用，既有React JSX和CSS布局，不采用或改变第三方语义；③复用stats-layout隐藏合成窗口与build/版本/发行helper、Learning既有发行门禁；④P082四尺寸几何与截图验收，补充两列真实位置/窄窗堆叠/旧话术消失和原筛选正例。
- 验收：桌面两个独立卡片栏（科研/趋势/收获，合计/作息/时段），不横向铺长；去掉节奏鼓励/劝导文案，数据说明保留；窄窗自动一列、四区间/分类/返回正常，宽窄截图目视复核。固定源码独立只读发行复核后本地包优先、默认公开preview及真实旧更新器检测，不自动安装或重启个人App。
- 资源为现有独占任务worktree与随机隐藏静音合成profile；fetch/check:sync干净同基线，无重叠写者，提交前再核对；无真实云写。90分钟前台有界，沿既有失败停止规则；仅复用既有review_local_editing做模块发行规定的只读复核，不新建子Agent。回滚恢复121展示后用新版本交付，不覆盖公共资产。Learning判断随验收。
