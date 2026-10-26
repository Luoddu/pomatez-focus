# P0-POMO-068 临时事项输入验收

状态 REVIEW，源码待固定封版/独立复核与105包源、公开终验。范围/授权/四源/回滚见TASK-P0-POMO-068.md；承接067已验分段和本地更新源码，104未公开。本次只发布最终105，个人App保持运行，用户自行本地升级。

实现复用原EditQueue.kind=task与QuickTask UUID。capture=true表示尚未整理，原quickRows投影未完成番茄；drain跳过此意图，其他普通task/edit/history同步仍通。输入只新增原队列，不写CounterContext、完成数或新任务数据库；结束当前专注后原QuickTaskEntry可编辑名称、项目、象限、计划数。releaseCapture核对原payload与source/id、未形成taskRows回执，先持久化，再走既有创建/回执核验/绑定。失败保留输入或原草稿，重试用原ID；不新建周期检查。

artifacts/p068-all.txt：458/458 PASS（含新增5组队列正反），p068-targeted.txt初轮15/15（跨日新增随后由全量覆盖）。原队列持久化、hold不发与其他意图仍drain；明确整理只释放一次，旧表单不能覆盖；落盘失败内存不清可重试；空白/超长/非整数/错误象限/异scope拒绝；跨日未用事项安排到今天，已有同来源会话引用保留原日期并保护已用序号，异来源不误匹配。

artifacts/p068-capture-desktop.txt/json：真实main/preload/renderer，合成服务、随机profile、窗口隐藏音频静音、真实云写0。7组：IME组合提交0条；暂停中的原active深度相等/records0，记下仅原意图1个番茄；存储失败保留输入；持久化草稿改为昨天后实际reload仍保留原UUID及原active；保存当前成果仍可同步而待整理创建调用0；整理改名/2番茄/重要不紧急/科研项目，首次安排日为今日；网络首失败再重试仍原ID，原创建回执呈现今日2格，原成果只1条。

独立早期P2：原release保留采集日，导致昨日草稿今日整理后消失于今日看板。已按实际是否存在同source+quickID会话判断，未用安排今日、用过保留原日，新增跨日实际重载/回执和序号保护正反；最终458与7组已包含修正。等待独立关闭意见。

artifacts/p068-active-regression.txt 原6组切换/取消/重载/消失选择/同组序号/最终同步通过；p068-split-regression.txt 原7组067切断/接续/写失败/自由番茄同ID回写通过。合成p068-capture-timing.png、p068-capture-board-portrait.png人工查看：输入在计时左区顶部；原概览列宽未改，窄屏沿原纵排滚动。没有私人截图入仓。

验证故障分类：首构建缺进程级safe.directory（已知身份上下文，补本次精确repo env，不写global）；随后CI明确要求布尔表达式括号，已修。桌面夹具注入Storage.prototype后返回function导致IPC克隆失败，末尾void0修正夹具；不改产品IPC。第一次全量sandbox esbuild读上层目录EACCES及临时HKCU受限，按既有已授权测试环境重跑458通过。原quick-entry-desktop旧夹具首断言仍要求改数量将分钟25联动50；当前公开103的ManualEntry已实现数量不改时间（本任务此文件与公开基线无diff），因此记录为陈旧契约，未顺手修改范围外功能；新的7组覆盖本轮quick创建/重试/重载，原active及split回归通过。

Learning-Review: none - 复用稳定意图、持久化先行、固定回执和按日投影；067安装测试教训已在01dc684同commit记录。本轮跨日缺陷属于既有日期归属规则在新入口的遗漏，未形成新的通用机制，不重复写Learning。

待完成：固定源码独立PASS、干净构建/同源NSIS及独立包PASS、本地包保留、默认非强制源码同步与五资产/固定tag/public发布、真实103更新器0下载发现105；届时任务才DONE。个人安装已由用户改为稍后自行操作，不作为本轮未完成自动安装项。
