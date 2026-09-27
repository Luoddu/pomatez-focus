# P0-POMO-029 验收

状态 REVIEW：实现与本机合成回归已验证，独立复核未执行，发布结果待补。

- 源基线：032317872ea6c57c260e5babacf95c052f899f5b；发布前纳入4b976a40534f87f1134cc3fbc5c44d1d88d3bdd9的Mac独立发布路径，没有改写其他分支。允许写集及四源检查见 TASK-P0-POMO-029.md。
- 科研目标默认40、同北京时间周一归周、只覆盖所选当前周；本机存储方式与既有总周目标相同。总目标和历史分类、同步协议保持。
- 统计以已保存记录的 recordCategory（含手工分类覆盖）为准，完成数不由分钟推算；同日投入天数去重。8周图以空缺符号区分无记录，以0表示有记录但无科研番茄，当前周明确未结束。
- 任务仅在原象限内科研优先，同类保持原序，科研/普通任务均可选；不改紧急程度。农场仍按真实分类配色，科研果体放大8%并描边，本周数量按同一记录颜色序列计算。
- 验证：build-focus通过；test-focus-all 230/230（含新科研5项与纳入Mac4项）；research-desktop通过8组：目标默认、保存重载独立性、象限稳定排序、红果/计数、小屏760×650与竖屏1080×1840目标可见可点击、8周图与分类切换、普通任务计时、隐藏静音。
- 回归：category-review桌面8/8；portrait桌面14/14；test-desktop 21/21，加完整进程重启通过。后一次构建包含Mac基线后重跑逻辑/科研专项/核心桌面。全部隐藏并传--mute-audio，独立测试profile，没有真实飞书写入或操作用户App。
- 证据（本地忽略目录）：artifacts/research-build.log、research-logic.log、research-desktop.log、research-desktop-regression.log。隐藏窗口capturePage会保留旧帧，未把research-stats.png误称统计视觉证据；使用独立offscreen同生产renderer截图research-stats-visual.png检查统计布局，真实main/preload验收以DOM几何、命中和实际点击为准。
- 测试修正：测试最初将开始按钮写为不存在的btn-primary，查明实际为btn-begin后修正；追加科研选择检查在现有看板执行，避免异步刷新竞态。产品未为测试改同步/计时逻辑。
- 不包含真实任务名、凭证、运行配置、用户数据或截图；无新增依赖/声音。回滚本次独立功能提交即可，独立科研目标键可保留。
- Learning-Review none：复用既有分类、周目标及测试设施，没有新跨任务机制；不写根Learning。
