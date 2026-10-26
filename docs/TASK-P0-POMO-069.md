# P0-POMO-069 安静的专注随手记入口

- 任务/负责人/基线：P0-POMO-069 / root模块实现者 / 68df25bebcb934cf44b0fa0d752c2e56776955d6；DONE。单worktree task/p0-pomo-069-quiet-capture；开工实时fetch/check:sync同公开主线、maxPreview105、clean。模块内部任务，不写根仓或组件锁。
- 请求与范围：用户2026-10-26明确只在番茄专注期间需要随手记，默认透明背景/细边框/低对比小按钮，点击才展开长条。计时页（含暂停）保留入口，成功记下收起，手动收起不清未提交文字；四象限/review无新增输入入口，已有待整理内容仍可结束后整理。只改FocusCapture.tsx、FocusApp.tsx、focus.css、原tests/focus-capture-desktop.cjs；本卡/ACCEPTANCE-P0-POMO-069.md、CHANGELOG及原版本helper两文件；ignored合成证据/本地NSIS/固定发布helper。不改EditQueue、计时、持久化格式、同步、Electron、科学专注或列宽。
- 风险与资源：局部可回滚显示交互T1，原队列与业务逻辑不变；原display组件内useState控制展开，不增后台、定时器、依赖或存储。一次前台45分钟有界交付；本worktree构建/随机测试profile独占。显示实施按轻量规则自测收口，不新增子Agent/额外模型调用。GitHub发布属于既有明确默认推送授权，沿用模块AGENTS固定源码/干净包/五资产/tag/实际旧更新器门禁；先保留本地同源包，用户自行安装，不控制个人App。
- 验收与回滚：空闲四象限没有随手记输入或按钮，仍能原四象限新增任务；计时页默认只有透明小边框按钮，输入不存在，点击展开并聚焦，提交仍原稳定意图且当前计时不改；成功收起、手动收起/再开文字保留；重载默认收起、待整理跨重载/跨日及结束后整理仍通；写失败不收起或丢字、IME不误提交。原同一7组静音隐藏桌面验收扩展显示断言，合成展开/收起图人工查列宽和可读性。回滚显式revert本次源码，无数据迁移；105/tag/资产保留。
- 四处预检：①现状FocusCapture常驻整条form，FocusApp同capture传计时/review/四象限，故空闲页也出现输入；②不改变第三方关键运行语义，无采用/升级，React16.14原受控输入/组件state沿现源码，不适用额外官方网络调研；③命中原FocusCapture、原test-focus-capture、版本/包/推送helper和Learning稳定意图/不可变发行，队列与更新器复用不改；④ACCEPTANCE068及原focus-capture-desktop的7组已覆盖IME/失败/重载/跨日/分类，扩展同脚本而不新增镜像测试。旧补记夹具陈旧契约仍范围外，不顺手修。
- 执行默认：引用governance/how-to-dispatch.md轻量T1与既有模块发布授权；仅本任务显式路径提交，学习结论本卡与验收统一记录，不重复新增通用教训。源码、成品、发布与实际用户安装分别记录，不把保留本地包说成安装成功。

交付：固定源码/tag 51e1544fdd9b35d0c8f4996e4e45995858ac4cb6 / preview106 / dirty=false，9组隐藏静音实链PASS，227文件ASAR同源及五资产/真实105→106更新器0下载PASS。沿用户原本机更新授权，使用原067 stage helper将同源106准备进固定当前用户local-update收件目录（只包与清单，不动热记录/计时/进程）；本机安装版只读确认为105，重启安装由用户自行点击。已公开106，旧105/Latest51不变。Learning与截图限制见ACCEPTANCE-P0-POMO-069.md；最终收口只改本卡及验收，不改源码tag或安装包。
