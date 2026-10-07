# P0-POMO-038 验收

- DONE；唯一状态源TASK-P0-POMO-038.md。用户授权本地修改提醒策略，未执行新的Push、Release或安装。基线203d19b9e3245f2c764dab1fafc22589baa01571；实施94df13229f3f8a8ea2217fbf58bd9a5e848bee31，复核修复295775e2421719a6e8f2cd81b65e5b460847aa84。
- 已验证：12番茄前合并B站/小红书，每累计5分钟提醒；12及以上额度内不提醒。超过额度即时生成提醒，其后新增5分钟继续。每日默认60、可降至5且最大60。实际呈现仍受采集与30秒轮询延迟。只提示，不禁止网站。
- 已验证：完成数来自现有timer.records中本地开始日的saved记录，与月历统计同口径；待同步的已确认记录计入，active/review/paused不计；重载等待CounterProvider ready、不把暂态空数组当成0。传主进程的只有日与完成数（未就绪为null），不持久存储第二套番茄历史。

## 四源预检

1. 现状：T0读到本机原规则额度60/督促true、48分48秒、刚更新的账本step0，所以未达到旧65分钟阈值；本次是用户明确改变规则，不是采集修复。基线Git与实时公开主线一致，绿灯，无重叠写者。真实使用量未用于合成验收或回填。
2. 官方：AW13.2采集/API语义未改，精确原文/版本/hash沿用ACTIVITYWATCH.md与035。Electron34.5.8官方声明electron.d.ts L5050–5060、L20728–20736支持capturePage与stayHidden/stayAwake；现有main sender验证、contextBridge路径不改变权限。新业务策略属于项目本身。
3. 既有模式：stats.ts inRange/summarize（saved/start-date）、原子settings账本、窄IPC与现有计时按钮。根Learning定向查AW/番茄/提醒未形成新增跨任务候选；常驻owner恢复门禁按原模式落实，不另建服务或计数源。
4. 同类：035的activitywatch逻辑/生产UI、现有desktop与实际进程restart均复用。新增goal转换、双条件、迁移与restore边界合成正反验收。

## 命令与原始证据

证据保存在忽略的artifacts，只含合成数据及元数据，不进入Git；未读取/上传真实浏览历史或飞书凭证。

| 检查 | 结果 | 原始回执 |
|---|---|---|
| node scripts/test-focus-all.cjs | 265/265 PASS | p038-logic-final.txt |
| node scripts/build-focus.cjs | PASS；固定依赖，无新依赖 | p038-build-final.txt |
| node scripts/test-activitywatch-desktop.cjs | 16组PASS | p038-desktop-final.txt / activitywatch-desktop.json |
| node scripts/test-desktop.cjs | 21组PASS＋真实进程重启PASS | p038-timer-desktop.txt |
| git diff --check / status / worktree / baseline..origin | PASS，只有任务写集，公开ref未漂移 | 本地检查点与安全提交回执 |

构建先在94df132的修复工作树运行（source-version记录dirty=true），之后相同源码冻结295775e；属于开发/验收输出，不是可发布安装包。版本未递增、不复用preview.70 tag或资产。

## 正反行为

- 299.99秒不提醒，300/600/900秒各一次；真实UI使用跨站区间证明3分钟B站＋2分钟小红书触发第一次。墙钟等待不增加提醒。
- 11→12清除待显示早期督促，额度内继续浏览无提醒；12→11不倒放旧档，新增下一档仍提醒。12及以上3600秒恰好额度不触发额度提醒，3600.01秒触发，3899.99秒无新增，3900/4200继续；未满12的60分钟仍触发早期第12档。
- 同次命中早期和额度只一条。独立reviewer复现未知完成数时65分钟先额度提醒、确认后报0同值重复的P2；295775e修复为超额同时消费早期档位。新增测试证明同值不重弹，新增70分钟仍一次，未知进度不取消总额度保护。
- 真实补记12通过hook/IPC更新；真实renderer reload仅报告null/12、无暂态0或假早期提示；active未被计成第13个。纯函数验证修改、已合并跨端记录、跨午夜开始日归属。
- 原子账本重启去重、断连无弹窗/同日数值保留、重连错过档合为一条；旧60/120额度账本迁移不补弹历史，120降为60，新增浏览正常提醒；损坏新账本暂停督促，显式设置恢复；开关关闭仍计数，重开按新基线继续。
- 生产两按钮各可操作，睡觉暂停并隐藏，下一番茄恢复同一计时；实际30秒poll在托盘继续，竖屏不横向溢出，小窗两按钮在界内。卡380宽、168高，小于月历380宽、192高。
- 原有21组桌面/实际进程重启证明计时、确认、持久记录、暂停、恢复、休眠与窄桥正常，没有可见测试窗口/渲染错误。

## 桌面截图限制与范围

前两轮harness在隐藏后CDP Page.captureScreenshot挂起，110秒deadline使pending debugger命令报target closed；8秒有界executeJavaScript无挂起。改官方capturePage后重载隐藏窗口明确报Current display surface not available for capture，定位为隐藏compositor surface，不改变产品窗口生命周期。最终保留全部真实DOM/几何/状态/行为断言，只移除后续截图副产物，16组完整通过。首张capturePage返回初始旧帧，因此scientific-rest-before12.png也不作为本轮视觉PASS；旧PNG/旧12组JSON不作为本轮证据。无新增视觉布局/CSS设计，本轮文本/按钮和几何以实际DOM验证。

## 复核、交付与回滚

独立reviewer初审94df132指出上述P2并要求真实UI收口；已修复；最终只读独立复核PASS，绑定295775e2421719a6e8f2cd81b65e5b460847aa84，核对265逻辑、16真实DOM/行为、21计时与真实重启原文，无剩余阻断。无用户App替换、安装/重启、AW写入、浏览上传或新发布。恢复到基线可回滚源码；新增账本字段保留旧step，旧版本忽略新增字段，用户记录不删除。下一步需要发布时按“推送”完整契约递增版本、发布新包并验证更新。

Learning-Review: none - 本次复用现有owner恢复、累计阈值、窄IPC和原子写盘模式；缺陷及harness现场属本任务验证，不新增根工程教训。
