# P0-POMO-089 · CP1 开源纯策略适配

部分确认；任务仍IN_PROGRESS。此回执仅覆盖纯策略源码，不是系统封禁、15分钟严格执行或晚间提醒的完成证明。

- 基线4b550bd46f3074f07c5b1f9483eb019b1194d282；开工卡22bfd38d21c01119fb895ab9bfd0bddccf233d35。实时remote同基线，独立worktree无重叠写者。四源结论见任务卡与third-party/focuser/SOURCE.md。
- 固定Focuser v0.11.5 / 14cbfdb3d55d3bc669bc9a39a6eddb9915e61844，六个原文快照SHA-256重新计算一致，MIT完整保留。只移植域名边界、精确进程匹配和关闭阶段，没有运行上游二进制/下载代码。
- `node node_modules/typescript/bin/tsc --project app/electron/tsconfig.json` PASS；首次发现本仓低target不支持直接遍历Map，改为Array.from后编译通过，未变更编译器或target。
- `node --test tests/strict-supervision.test.cjs` 6/6 PASS。正反覆盖明确平台/游戏目录和工作程序/相邻目录；HTTP(S)域名与恶意后缀/查询参数；系统/self/未知身份排除；30秒宽限及单次terminate意图；退出清理、PID复用、动作前身份复核；时间回退/NaN后恢复。
- 独立review_local_editing对原文、diff与测试只读复核：初次P2指出回退后lastNow未重置导致长期无动作；已修正并增加恢复正例，二次独立6/6 PASS，结论检查点可保留。没有把review结论泛化为全功能DONE。
- 不存在实际进程终止、系统设置修改、个人App重启、云数据写入或扩展权限变化。当前模块没有运行调用方，仅纯策略；后续必须接入经过身份重读验证的执行器，不可直接将动作数组当授权进程清单。
- 已知剩余：Windows执行器与隔离fixture完整链；请求级游戏网站/下载阻断及扩展权限；工作日设置门禁/累计900秒许可与失联保护；22:59提醒与启动/休眠/退出边界；完整UI与实际打包验收。详情见STRICT-SUPERVISION.md。未发布未验收产物，客户端仍126。
- Learning-Review: none — 本检查点是窄移植及实现缺陷修正，尚无新完整运行链证据；上游机制和设计边界保留在来源记录，不充作已验证本机教训。
- 回滚：还原本检查点显式新增源码、测试和文档即可；无运行数据/系统改动需要撤销。下一步仍按P089卡逐项集成，不能只凭这些测试启用个人环境拦截。
