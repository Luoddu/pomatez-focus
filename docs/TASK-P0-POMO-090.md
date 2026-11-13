# P0-POMO-090 旅程生活活动按钮按番茄进度刷新

- IN_PROGRESS；本模块本卡为唯一状态源；owner/root（隔离模块实现）。基线69f5e0256e32b7883cc47427118636b2103d6130，实时远端一致、工作树干净；独占当前worktree及artifacts/p090。
- 用户请求：完成新番茄后，吃饭/小憩等快捷按钮应恢复未记录状态，再次点击新增本轮活动，不取消旧轮历史。目标覆盖meal/nap/gym；不改变历史记录、计时、云同步或休息时长算法，不批量清除旧事件。
- 四源预检：①TodayJourney.tsx quick与按钮渲染均取当天同类最后事件，因此完成新番茄后仍选中旧事件并cancel。restLog.afterCount已保存活动所在番茄边界，completedBeforeRest沿同来源同日原始完成数，可直接投影当前轮次。②纯项目自有UI投影与既有数据字段，不改第三方关键语义，不适用新第三方采用。③复用restLog/openRest/completedBeforeRest、现有localStorage读回、构建发布helper；Learning中UI按日缓存与原始记录不可改边界保持，本次不建新账本。④tests/rest-backfill-desktop.cjs、rest-log相关测试及旧旅程验收已查。
- 允许写集：app/renderer/src/focus/restLog.ts、components/TodayJourney.tsx；相关tests及必要新纯函数/桌面测试和scripts包装；docs/TASK-P0-POMO-090.md、docs/ACCEPTANCE-P0-POMO-090.md；CHANGELOG、version:prepare输出；如形成已验证通用教训由模块owner单写Learning.md。根仓共享文件、个人记录/注册、飞书和浏览器配套禁止修改。
- 验收正反：当前轮按钮可反选撤回本轮事件；新增saved有效番茄即恢复planned，再点击只新增，上一轮meal/nap/gym及时间轴保留；零完成片段、其他日期/来源不误重置；进行中休息保持可见；本地未同步即生效；关闭重开投影一致。完整桌面真实确认路径和本地存储验证，不仅测样式。
- 风险：T1业务投影，须独立review_local_editing只读复核精确diff/测试；不新建子Agent，不并发写文件。预算前台90分钟，同因未知两次停止相关试错；个人数据不进入Git/测试。
- 发布：沿模块AGENTS既有用户默认发布授权，验收复核后固定新preview包、stage本机并发布；不强制重启个人App。回滚上一固定128版本；无schema或历史迁移。
- Learning：检查点同批判断，有证据才记录，未命中须说明。阶段/范围/权限实质变化升级；路径互不重叠继续，提交前复核status/worktree。
