# P0-POMO-068 临时事项输入验收

状态 DONE。范围/授权/四源/回滚见TASK-P0-POMO-068.md；承接067已验分段和本地更新源码，104未公开。本次只发布最终105，个人App保持原状态，用户自行本地升级。固定源码9ca4e5fb77c0fa21f7ddc3bf4d38b2285ce1c03a / dirty=false；独立源码、包源、公开终验全部PASS。

实现复用原EditQueue.kind=task与QuickTask UUID。capture=true表示尚未整理，原quickRows投影未完成番茄；drain跳过此意图，其他普通task/edit/history同步仍通。输入只新增原队列，不写CounterContext、完成数或新任务数据库；结束当前专注后原QuickTaskEntry可编辑名称、项目、象限、计划数。releaseCapture核对原payload与source/id、未形成taskRows回执，先持久化，再走既有创建/回执核验/绑定。失败保留输入或原草稿，重试用原ID；不新建周期检查。

artifacts/p068-all.txt：458/458 PASS（含新增5组队列正反），p068-targeted.txt初轮15/15（跨日新增随后由全量覆盖）。原队列持久化、hold不发与其他意图仍drain；明确整理只释放一次，旧表单不能覆盖；落盘失败内存不清可重试；空白/超长/非整数/错误象限/异scope拒绝；跨日未用事项安排到今天，已有同来源会话引用保留原日期并保护已用序号，异来源不误匹配。

artifacts/p068-capture-desktop.txt/json：真实main/preload/renderer，合成服务、随机profile、窗口隐藏音频静音、真实云写0。7组：IME组合提交0条；暂停中的原active深度相等/records0，记下仅原意图1个番茄；存储失败保留输入；持久化草稿改为昨天后实际reload仍保留原UUID及原active；保存当前成果仍可同步而待整理创建调用0；整理改名/2番茄/重要不紧急/科研项目，首次安排日为今日；网络首失败再重试仍原ID，原创建回执呈现今日2格，原成果只1条。

独立早期P2已关闭：原release保留采集日，导致昨日草稿今日整理后消失于今日看板。已按实际是否存在同source+quickID会话判断，未用安排今日、用过保留原日，新增跨日实际重载/回执和序号保护正反；最终458与7组包含修正。review_scientific_rest回读代码、原始结果并关闭该P2，最终冻结源码PASS。

artifacts/p068-active-regression.txt 原6组切换/取消/重载/消失选择/同组序号/最终同步通过；p068-split-regression.txt 原7组067切断/接续/写失败/自由番茄同ID回写通过。合成p068-capture-timing.png、p068-capture-board-portrait.png人工查看：输入在计时左区顶部；原概览列宽未改，窄屏沿原纵排滚动。没有私人截图入仓。

验证故障分类：首构建缺进程级safe.directory（已知身份上下文，补本次精确repo env，不写global）；随后CI明确要求布尔表达式括号，已修。桌面夹具注入Storage.prototype后返回function导致IPC克隆失败，末尾void0修正夹具；不改产品IPC。第一次全量sandbox esbuild读上层目录EACCES及临时HKCU受限，按既有已授权测试环境重跑458通过。原quick-entry-desktop旧夹具首断言仍要求改数量将分钟25联动50；当前公开103的ManualEntry已实现数量不改时间（本任务此文件与公开基线无diff），因此记录为陈旧契约，未顺手修改范围外功能；新的7组覆盖本轮quick创建/重试/重载，原active及split回归通过。

Learning-Review: none - 复用稳定意图、持久化先行、固定回执和按日投影；067安装测试教训已在01dc684同commit记录。本轮跨日缺陷属于既有日期归属规则在新入口的遗漏，未形成新的通用机制，不重复写Learning。

最终包源：artifacts/p068-build-clean.txt、p068-capture-clean.txt、release105-package-acceptance.json/verify.txt；224个build文件与ASAR逐字节一致，原生资源齐全，隐藏静音随机profile成品启动退出0，五资产size/SHA256与feed SHA512匹配。NSIS 84,608,301字节，SHA256 90af7e6161205c6b5e32fbb997e4e4e192c6eeabfcb3c34e2dd5630c0f11368e。独立包复核PASS；同一文件保留于本机artifacts/release105供用户自行安装，未代关/安装个人App。

公开终验：非强制源码同步既有codex/feishu-focus；release 424009010，annotated tag对象46796c9490d08b540011424eeca47929c81c098c指向固定9ca4e5f。先草稿上传五资产、核验后创建tag并立即公开，不设Latest；draft→public资产ID/size/digest完全相等。artifacts/release105-remote-draft.json、remote-public.json及public-api/tagref-public-api/tag-object-api/branch-api/old103-api原始JSON交叉核对；旧103发布时间/资产未改，latest-after仍51。公开地址 https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.105 。

公开网络分类：gh release view/git ls-remote核验分别遇schannel TLS握手失败和release查询缺失；未重传/重建release，改由官方GitHub REST固定releaseID、Git refs/tag对象查询核实相同原始事实。REST各EOF/握手超时保留错误且最多一次只读重试；旧103的GraphQL asset.id与REST node_id对齐比较，105草稿/公开numeric asset ID不变，verify105-rest-evidence.cjs结果PASS。未改变代理、TLS、客户端或网络设置。

真实旧版：release105-live-update.json/live-update-retry.txt，使用公开103原ASAR/updater（source b3de3395，updater SHA256 4fabae8cebf6859d8c4907c12bc6eced4a83318ecfdd0247f1ac13f4cc2193eb）检测available105，feed文件/84,608,301字节/SHA512与本机完全匹配，errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。首ERR_CONNECTION_CLOSED保留于updater-first-error.txt，唯一重试通过。独立终验基于这些原始回执PASS，未额外操作个人App。

个人安装按用户“我晚点自己升级”留给用户：保存/暂停计时并从托盘退出后运行本地105 NSIS即可，无需从GitHub重下；103首次升级后才有新增重启入口。当前交付不声称个人App已安装105。最终收口只改任务/验收文档，源码/tag/安装包保持冻结，不重新打包。Learning仍沿本卡具体none判断及067同commit记录，不重复增加条目。
