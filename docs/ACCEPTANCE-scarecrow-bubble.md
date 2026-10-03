# P0-POMO-034 分类色点与浮动伙伴验收

- 基线：def621e2b5d15450fbfcde3f6ff8edff1d15e56b；完整范围、四源和回滚见 TASK-P0-POMO-034.md。固定现有 React 16.14.0；在处理器内冻结按键值，避免合成事件回收影响延后状态更新。无新依赖/权限/后台服务。
- 已验证：`npm run test:focus:all` 241/241；`npm run build:focus` 成功；companion-desktop 17组包含真实main/preload/renderer、静音隐藏合成profile；原桌面21组+进程重启、portrait14、分类8、快速补记12、科研8均通过，共80组及重启。
- 分类：六种圆点与原PROJECT_TONES精确一致，已选项带同色点，键盘Home/方向键/Enter实际改变分类，保存后颜色revision、关联计划、有效分钟和同步不变。菜单通过portal避开表单裁切，仍可补记和专注。
- 气泡：默认不渲染横栏；前后farm-field矩形尺寸一致。稻草人SVG支持鼠标与Enter/空格，Escape和外部点击收起；开启气泡不会改变农田布局。480×640气泡在视口内、日记可滚动，收起重开草稿不丢。
- 提醒：北京时间08:00–09:30、22点、23点分开；每天各时段一次，读回同来源同日澄留言后提示，同UUID不重弹。实等30.5秒检查自动收起、重载不再弹。夜间和官方休息日不工作催促，平常计时仍可通；返回App只读获取新留言，不调用saveJournal、不轮询失败上传。
- 保持原日记正反链路：保存先落本机、失败不轮询、明确重试同UUID不重复；切计时页面的迟到回执仍合入最新磁盘；双待同步日记首行失败不形成重试环。HTML只作为纯文本，跨Base校验保留。
- 截图均为合成任务，通过隐藏窗口CDP实拍：artifacts/bubble-category.png、bubble-morning.png、bubble-journal-small.png；人工查看色点、气泡位置、窄屏编辑，私人用户截图不进入仓库。
- Learning判断：none。复用既有UUID、同步队列和本地优先交互；React事件快照是固定版本常规正确用法，本次没有新增根架构/权限治理教训。根Learning不写。
- 未完成/限制：真实澄服务未接入，实际飞书业务数据未用于测试；预留接口只有安全纯文本留言和日记。App退出不发系统提醒；进行中的计时保留当前计时界面，不弹日记打断。
- 已发布：源码5b9abc31e1c03aec3ca57d3e02cd097f19bc1ab7，固定tag v0.1.0-preview.68。干净构建及package通过，包内source-version和外部清单同源，隔离隐藏静音启动通过；six assets size/SHA256、preview.yml SHA512正确。公开Release：https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.68 。同款FocusUpdater/NsisUpdater以合成旧版preview.67实读公开GitHub feed，phase=available/version=68，autoDownload及autoInstallOnAppQuit均false。用户App未安装/重启。
