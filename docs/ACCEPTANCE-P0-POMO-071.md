# P0-POMO-071 专注积累圆形＋验收

状态 IN_PROGRESS；范围、四处预检、资源、授权、回滚和reviewer输入见TASK-P0-POMO-071.md。HistoryPanel记录行修改旁复用adjust-btn圆形＋，默认淡出、行悬浮/键盘focus显示，触摸模式常显。当前连接且任务就绪时，同来源、有稳定taskId的已绑定任务才可追加；自由、quick未绑定和其他来源没有该入口。FocusApp调用原adjust/EditQueue，当前任务存在时优先其元数据；不存在时仅用同来源任务快照给今天从1创建，保留原任务ID，旧日期的计划/完成数不带入今天。无新API或持久化格式。

artifacts/p071-build-working.txt构建PASS；p071-append-working.txt原真实main/preload/renderer夹具三阶段PASS：四象限与已完成任务连续加、序号/失败意图保留、冷启重试同一ID及原session重绑；新增history阶段证明修改相邻/圆形/初始隐藏/DOM焦点最终规则，连续追加今日4/5与过去日期任务今日1/2，项目/象限/稳定ID正确，active与旧records字节不变，合成回执后仍不变，原修改入口仍开。全程随机profile隐藏静音，真实飞书写入0，不操作个人App。

夹具旧补记selector仍找“第4个”已不符合现行只选任务，适配为只选Synthetic iu，原自动选4和后续冷启断言仍通过。首次构建缺既有进程级safe.directory，保留p071-build-safe-directory-error.txt，沿已验仅本进程配置重跑，不改系统/Git全局配置。history首次在手动同步就绪前点击，p071-append-before-ready.txt；随后等待原按钮enabled。隐藏窗口CSS过渡不进帧，p071-append-hidden-transition.txt；仅夹具禁用该过渡后DOM焦点/最终规则通过，不改产品动画、不据此声称真实悬浮动画已录屏。测试退出时偶有未完成刷新IPC被原Untrusted sender拒绝，发生在PASS后退出，无产品权限补丁；原始输出保留。

独立复核、固定源码干净构建、成品同源/本机准备/公开更新链待补。Learning-Review: none - 新入口复用已验稳定任务ID、持久意图和原发行链；隐藏合成样式检查不将未查明机制写为通用教训。
