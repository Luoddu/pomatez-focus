# P0-POMO-076 浏览器控制一致性验收

REVIEW准备；授权/目标/四源/范围/完整链与回滚见TASK-P0-POMO-076.md。基线085faaf、实时114同源、单worktree任务分支。写前p076-t0-repro.txt用114编译控制器和原worker重现：0秒发布7秒有效状态，4秒扩展读取，5秒农场健康更新，但页面7秒先解除到9秒再次读取才重锁；9/12始终未达标。不是把用户截图当作内部时序证明。

修复只分开AW采样新鲜度与控制消息交付有效期：AW仍7秒；发布完成时生成独立租约，新host/worker实际回执control-lease-v2后20秒、旧配套7秒，午夜截断。host与worker严格识别leaseVersion1/2及各自7/20秒上限，过期不续；new host向old worker截为v1/<=7秒，避免App先升级造成全部拒收。v1帧、权限/key/origin/频率不变，没有新timer/进程/逐秒I/O。旧配套UI明确待更新，用户须App更新配套→Edge重新加载→刷新两站，不能冒称个人Edge已生效。

content pageshow重新取控制、pagehide清理，复用原1秒计时器重挂断开overlay；document_start根未就绪不报错。请求epoch防止迟到getControl解除后到的新push，不额外建立观察器/轮询。显式ready=false/断连仍解除，真正停止更新最多20秒后过期；原目标/放行/额度/进度及冷静恢复不改。

p076-policy-tests.txt 22/22 PASS：control-lease新增15组phase(0/1/2/3/4秒)×queryDelay(0/2/6秒)各120秒100ms模拟，9/12在首次交付后无空档；旧/过期/foreign回执不启v2，AW失效/关闭/午夜仍释放，未知/过长/NaN/过期lease拒绝，达标显式放行仍通。原worker恢复门禁/epoch/串行/单连接、真实host framing/origin/超长/私字段去除、每日锁冻结/重启/源等继续通过；真实host新增新能力协商与旧worker输出截断正反。

p076-build-working.txt构建成功；p076-full-chain.txt原daily-focus-lock真实隐藏静音main/preload/UI→实际生成CMD/Electron Node host四字节帧→真实worker源码(合成Chrome transport)→真实静音canvas视频，原任务链+新错相80次200ms采样连续遮罩/暂停，一条native连接。AW发布刻意与native轮询错开2秒；DOM删除后复位、pagehide/pageshow恢复、迟到无控制callback不能抹新锁，页面始终仅一个计时器。结束断连清罩/清timer，原12/12显式放行/到期/额度/拒降级/存储边界仍通。合成注册adapter，真实注册/个人Edge/profile/云写均0；测试transport不是个人浏览器平台验收。

官方原文核对Chrome Native Messaging与HTML Standard生命周期链接见执行卡；当前公开文档不冒充固定版安装或个人实机成功。固定依赖未更新，实际4字节协议与页面DOM能力由本机完整链验证。待冻结独立复核与最终同源包/本机stage/公开五资产/真实114原更新器验收。

Learning-Review: none - 暂沿065恢复顺序/039不可变发布/067测试隔离；两级时钟边界可能形成候选，但尚未独立确认其跨任务适用范围，当前不写通用教训。
