# P0-POMO-081 验收

状态：REVIEW，未发布。四源、授权、写集、正反验收与回滚见TASK-P0-POMO-081.md。

- 当前实现：待发送的同记录edit/color合并成原before与最新after；原队列投影即时显示完整修改。发送前持久标记attempted，已发送/失败不覆盖；原quietSync按after变化重新计时。类型从所有入口写任务ID作用域偏好，同任务现有及后续加载/保存记录通过原改色队列收敛；本地任务直接改原记录。类型偏好保存在原boardLayout，任务真实项目关联不改。
- 四象限以本地saved记录投影done，部分时长仍可继续；已收显示原始数量，不更改统计权重。新投影、同任务类型及草稿合并测试7项PASS；edit-queue/board-layout/partial-tomato既有16项PASS。
- 生产CRA/TS构建PASS；初始独立tsc直接扫全renderer命中已装i18next与根TS4.9声明兼容问题，未改依赖；标准build:focus工具链成功。隐藏静音真实main/preload/renderer连续右键→修改→改类型→重载→手动同步→再编辑PASS，合成服务验证最终类型/数量与在途保护；artifacts/local-editing-desktop.json与local-editing.png。后续最终构建复跑待完成。
- 独立复核、全量回归、本地包及公开更新验证待完成。不读取个人profile，不做真实飞书测试写入。
- Learning none：现阶段复用既有原子Storage、持久意图与本地投影机制；未形成新的已验证跨任务教训。回滚基线556da01源码，保留用户数据/待同步意图与恢复副本。

- 首轮独立复核发现并修正：旧pending缺少attempted不能证明未发送，读取时保守锁定、新草稿显式false；看板偏好用tomatoType显示字段，不再污染projectType真实快照；任务选择记录当时可见历史的颜色版本边界，已应用后不覆盖另一台更高颜色版本，新本地记录仅继承一次。明确放弃修改继续沿既有恢复副本，旧选择不自动重放。补充升级/两设备顺序/恢复默认负例，21项定向PASS。
- 类型偏好是本机看板元数据；历史改色通过现有飞书记录同步。选择时尚未读取的远端记录不由旧选择自动接管，避免跨机自动互相覆盖；用户再次明确选类型可对当前已读取历史统一应用。
