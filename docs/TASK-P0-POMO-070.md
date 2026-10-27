# P0-POMO-070 月历紧凑整数显示

- 任务/负责人/基线：P0-POMO-070 / root模块实现者 / f6b73b990617186eb3ff9aa0cb03a0eeeeab2d88；DONE。单worktree task/p0-pomo-070-calendar-rounded；实时fetch/check:sync同公开主线、maxPreview106、clean。隔离工具内部，不写根治理/路线图/组件锁。
- 请求/写集：用户2026-10-27要求月历小空间的番茄数字四舍五入。只将HeatmapCalendar.tsx小格和底部每周合计的文本改为Math.round，title/悬浮详情/data-count/配色分档/达标/原始有效值不变；不改概览、目标或今日时段。允许该组件、原tests/effective-stats.test.cjs中受影响已有显示断言、本卡/ACCEPTANCE-P0-POMO-070.md、CHANGELOG及原版本helper两文件、ignored证据/发布helper/本地NSIS；沿既有本机更新授权用原stage helper仅准备固定local-update包与manifest，不操作用户计时/记录/安装/进程。
- 风险/资源/默认：可完整回滚的显示T1，Math.round仅作用两个JSX文本，无持久化/API/依赖变化；一次前台40分钟有界交付，本worktree build/dist和合成测试独占。按轻量T1自测，不新增子Agent或额外模型调用；无后台/定时任务。默认发布授权及固定源码/干净包/五资产/tag/真实前版更新器门禁沿模块AGENTS；先本机准备，用户自行重启。
- 四源：①已确认两处formatEffective将小数画进小格/周合计，title与data-count另走精确值；②仅项目自有JSX显示格式，无第三方采用/升级/关键运行机制，不适用额外官方网络研究；③沿原effectiveCount/formatEffective、版本/包/本地stage/发布helper与Learning有效值单次折算/不可变发行，不新增计数源；④tests/effective-stats.test.cjs现有month calendar用0.29检查分档与今日热力精确值，更新其显示断言并保留原精度负例；不为两行格式新增镜像测试。
- 验收/回滚：月历文本整数（例如5.6→6、14.4→14）；真实0.29不在小格挤小数而显示0，但data-count/tooltip/热力质量仍0.29，配色/周目标依旧按真实数；整数原显示仍通。运行现有effective-stats受影响套件及干净构建/同源包，更新链实际106→新版只读0下载。显式revert该源码即可回滚，无数据迁移；106/tag/资产保留，不替换公开tag。Learning只在验收作具体判断，没有新机制不重复记录。
- 交付：源码/tag 2ed44483cfa3be6fbb00d4e38e4119321ae497dd / preview107，14/14受影响套件、干净构建、229文件同源ASAR、隐藏静音成品、五资产及真实公开106→107更新器均PASS。本机原helper准备并回读107/alreadyPrepared=true，安装由用户自行操作。公开release425252658，旧106未变、Latest仍51。详细原始证据与Learning判断见ACCEPTANCE-P0-POMO-070.md；最终仅两份文档收口，不重打包、不改tag。
