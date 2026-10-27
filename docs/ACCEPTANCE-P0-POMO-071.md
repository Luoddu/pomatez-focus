# P0-POMO-071 专注积累圆形＋验收

状态 DONE；范围、四处预检、资源、授权、回滚和reviewer输入见TASK-P0-POMO-071.md。HistoryPanel记录行修改旁复用adjust-btn圆形＋，默认淡出、行悬浮/键盘focus显示，触摸模式常显。当前连接且任务就绪时，同来源、有稳定taskId的已绑定任务才可追加；自由、quick未绑定和其他来源没有该入口。FocusApp调用原adjust/EditQueue，当前任务存在时优先其元数据；不存在时仅用同来源任务快照给今天从1创建，保留原任务ID，旧日期的计划/完成数不带入今天。无新API或持久化格式。

artifacts/p071-build-working.txt构建PASS；p071-append-working.txt原真实main/preload/renderer夹具三阶段PASS：四象限与已完成任务连续加、序号/失败意图保留、冷启重试同一ID及原session重绑；新增history阶段证明修改相邻/圆形/初始隐藏/DOM焦点最终规则，连续追加今日4/5与过去日期任务今日1/2，项目/象限/稳定ID正确，active与旧records字节不变，合成回执后仍不变，原修改入口仍开。全程随机profile隐藏静音，真实飞书写入0，不操作个人App。

夹具旧补记selector仍找“第4个”已不符合现行只选任务，适配为只选Synthetic iu，原自动选4和后续冷启断言仍通过。首次构建缺既有进程级safe.directory，保留p071-build-safe-directory-error.txt，沿已验仅本进程配置重跑，不改系统/Git全局配置。history首次在手动同步就绪前点击，p071-append-before-ready.txt；随后等待原按钮enabled。隐藏窗口CSS过渡不进帧，p071-append-hidden-transition.txt；仅夹具禁用该过渡后DOM焦点/最终规则通过，不改产品动画、不据此声称真实悬浮动画已录屏。测试退出时偶有未完成刷新IPC被原Untrusted sender拒绝，发生在PASS后退出，无产品权限补丁；原始输出保留。

独立只读review_history_append复核固定f288ef3f2fdf34a5a582c4d9b1811639be904e82（基线6575d04），原始diff、当前实现、队列/回执及三阶段证据后PASS，无阻断项；回执artifacts/p071-independent-review.txt。来源隔离通过HistoryPanel和adjust两层guard静态核查；夹具动态排除仅free/unbound，不声称动态异源测试。未额外运行测试、访问个人profile或外部写入。

固定源码/tag f288ef3f2fdf34a5a582c4d9b1811639be904e82 / preview108 / dirty=false；artifacts/p071-build-clean.txt构建成功，p071-append-clean.txt同三阶段PASS。p071-package.txt及release108-package-acceptance.json/verify.txt确认234个build文件逐字节等于ASAR，必要原生资源存在，成品随机profile隐藏静音启动退出0。NSIS 84,768,376字节，SHA256 6c1f05d490c45163c5969acbb268c70b347b61c6161d0777b34cb486edd9ea39，五资产/preview feed SHA512一致。原stage-local-update helper先准备108，再完整清单和字节回读alreadyPrepared=true（release108-local-stage.json/local-reread.json）；未关闭、安装或重启个人App。

公开：release108-draft-verify.txt/public-verify.txt及remote-draft/remote-public JSON确认release425397822先草稿五资产大小/哈希相等、无公共tag，再推固定annotated108 tag并立即公开且不设Latest；source/tag commit同f288ef3，草稿/公开资产ID不变，旧107发布时间/资产/摘要不变，Latest仍51。地址 https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.108 。源码按原push:focus非强推同步，所有发布写入一次成功，不改网络配置。

真实前版：release108-prior-verification.json核对保留的公开107成品ASAR/source2ed4448，旧NSIS SHA256 afb04e2a2067b5192930455e5344c07bd4fca8bd1de2c45572fac0661ad83bad等于其公开资产；release108-live-update.json/txt使用实际107原updater SHA256 9476f779e9e8650fa1eec0718155fe8a04a4618bbb8ed06bd8673cae5de0a819，发现available108，文件/84,768,376字节/SHA512匹配本机feed，errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。最终仅两份文档提交，不重新打包或改tag。

Learning-Review: none - 新入口复用已验稳定任务ID、持久意图和原发行链；独立复核无新候选，隐藏合成样式检查不将未查明机制写为通用教训。
