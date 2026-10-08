# P0-POMO-045 验收

- DONE（本地源码）。授权、四处预检、基线、写集、资源、正反完成定义和回滚见TASK-P0-POMO-045.md；最终运行源633ed8a14fe21e05309665dfc875167a94cfbf6d / 本地preview.79，尚未推送、打包或发布，未安装或重启用户App。
- 已验证：journey + journey-templates共18组纯逻辑，默认16/8/12/20/24及空小时、逆序/越界拒绝；按来源保存默认、未来新日使用默认而旧日/其他来源保持原样；坏JSON、重复/缺失/超量拒绝且原配置保留，写失败后正常仍可读写；模板只保存安排，应用保护实际完成/关联任务，活动今日拒绝、明天可安排；旧日旅程可选字段兼容；当前/休息阶段健身可用、结束后隐藏。原拖动、稳定任务引用、实际完成/放弃0、记录修正和日期隔离继续通过。
- 已验证：真实main/preload/renderer两进程20组（artifacts/journey-plan-checks.json、journey-resume-checks.json），真实UI复制/命名/计数与图案实时预览、默认保存不改今日，新明日采用15个测试模板、明确应用恢复16；创建/移除/设默认、逆序及quota故障保原；第二进程恢复具名模板/default及次日稳定任务。原DOM DragEvent/DataTransfer、真实计时开始/更换/确认/放弃、损坏/保存/恢复失败、午夜任务刷新仍通。所有进程headless并中央静音，实际用户profile未访问。
- 已验证：真实ActivityWatch形状合成loopback与原生置顶窗24组（artifacts/activitywatch-desktop.json）：蓝色边框、当前第三段健身显示第三按钮，点击暂停真实计时并持久休息节点，结束后隐藏，伪造不可用gym拒绝；gym旅程quota失败不暂停、不确认提醒，成功重试可通。原5/10/15分钟、12个目标、额度、设置、隐藏/紧凑窗、回执失败重试、秒显示/悬浮/断连校准仍通；无真实AW/飞书/浏览器数据。
- 已验证：最终全部逻辑304/304（artifacts/p045-logic-tests.txt），含当前日boolean gym输入正反测试。构建使用现有固定工具链，sandbox esbuild读取上级目录被拒，定位精确拒绝后仅构建用受限放行；Git所有权用命令级safe.directory，不改全局配置。模板测试首次复开选中默认模板导致保存按钮disabled，修正测试显式选中目标，非产品故障；新增隐藏按钮后的旧全部button计数/disabled断言改为可见按钮，原行为未变。
- 性能：不新增setInterval、工作进程或后台；旅程投影通过现有进度通道事件发送boolean，操作时重读当前来源/日期/真实记录，前台秒tick不读写旅程。默认16按卡片宽度缩放，大安排自身横滚，外层四象限/概览比例不改；农场小条纯渲染，移除旧900ms旗动画状态，原里程碑通知保留。实际长期性能与用户鼠标拖动不由合成短测声称保证。
- 已验证：overview7（p045-overview.txt）、portrait14（portrait-test.json）、通用desktop21与两进程恢复（p045-desktop.txt）通过；旧desktop曾查已隐藏的总番茄卡导致null错误，原文定位后更新测试为读取迁移后累计条，未补回已隐藏产品UI。默认旅程条内部无横向溢出、实际科研填色、原外列等宽；农场累计条每25粒旗，既有任务区比例保持。原生蓝框三按钮截图scientific-focus-native-gym.png和journey-actual.png、journey-template-editor.png经目视检查；仅合成界面，截图不进Git。
- 本轮源码与本地验证已完成；后续明确“推送”再独立完成实时主线核验、干净构建、NSIS包源、GitHub发布和真实客户端更新检测，不以本地DONE声称已收到App更新。
- Learning判断none：复用已验证计时回执、本地有界配置和静音链路；本轮布局/模板/boolean投影为模块业务实现，未产生新的可跨任务工程教训。
- 冻结4a9d8f8独立复核发现P2：今日gym投影只由展示的TodayJourney上报，明日页新增当天记录或冷启动compact没有当前投影。已改为FocusApp按ready/source/day/records/active-id事件只读reconcile当前日，gym判断memo；展示组件只传人工安排更新，仍无每秒存储或新计时器。真实AW新增正反：明日页补记7后gym出现；真实UI切小窗后reload保持可用；坏今日JSON使gym=false且字节保留，恢复配置再reload可用；原gym失败回执/结束隐藏继续通过，25/25（p045-aw-review-fix.txt）。旅程两进程20/20继续通过（p045-journey-review-fix.txt）。
- 测试诊断：首次直接调用windowMode仅改变原生窗口而未调用前端状态setter，compact UI等待超时；精确定位失败行397与既有UI wrapper后改为实际“切换小窗”按钮，不改产品窗口机制。隐藏截图改为invalidate+250ms+公开capturePage stayHidden/stayAwake等待绘制；生产源不受影响。
- 首冻结clean build source-version=4a9d8f8 / dirty=false / preview.79（p045-build-clean.txt）；修复后的独立复核与最终clean build待补。无新Learning候选。
- 最终独立源码PASS绑定633ed8a，P2关闭；reviewer逐文件原文、原始25AW/20journey证据独立核验，无其他实质问题，Learning none。最终clean build成功（p045-build-fixed-clean.txt），实际source-version head=633ed8a / dirty=false / preview.79，Git工作树干净；本轮无发布/安装。
- 可视证据限制修正：原生三按钮蓝框和journey-actual.png经目视确认；模板编辑截图journey-template-editor.png仍为隐藏compositor旧帧，因此不作为模板视觉PASS证据。模板已通过真实DOM预览15轮廓、编辑/保存/应用与重启功能断言；既有用户批准前端预览及生产CSS/geometry审查保持，不声称合成截图显示了当前编辑器。没有因此修改产品渲染机制或显示测试窗口。
