# P0-POMO-081 验收

状态：DONE，120已发布且本地更新已准备。四源、授权、写集、正反验收与回滚见TASK-P0-POMO-081.md。

- 当前实现：待发送的同记录edit/color合并成原before与最新after；原队列投影即时显示完整修改。发送前持久标记attempted，已发送/失败不覆盖；原quietSync按after变化重新计时。类型从所有入口写任务ID作用域偏好，同任务现有及后续加载/保存记录通过原改色队列收敛；本地任务直接改原记录。类型偏好保存在原boardLayout，任务真实项目关联不改。
- 四象限以本地saved记录投影done，部分时长仍可继续；已收显示原始数量，不更改统计权重。新投影、同任务类型及草稿合并测试7项PASS；edit-queue/board-layout/partial-tomato既有16项PASS。
- 生产CRA/TS构建PASS；初始独立tsc直接扫全renderer命中已装i18next与根TS4.9声明兼容问题，未改依赖；标准build:focus工具链成功。隐藏静音真实main/preload/renderer连续右键→修改→改类型→重载→手动同步→再编辑PASS，合成服务验证最终类型/数量与在途保护；artifacts/local-editing-desktop.json与local-editing.png。后续最终构建复跑待完成。
- 独立复核、全量回归、本地包及公开更新验证待完成。不读取个人profile，不做真实飞书测试写入。
- Learning none：现阶段复用既有原子Storage、持久意图与本地投影机制；未形成新的已验证跨任务教训。回滚基线556da01源码，保留用户数据/待同步意图与恢复副本。

- 首轮独立复核发现并修正：旧pending缺少attempted不能证明未发送，读取时保守锁定、新草稿显式false；看板偏好用tomatoType显示字段，不再污染projectType真实快照；任务选择记录当时可见历史的颜色版本边界，已应用后不覆盖另一台更高颜色版本，新本地记录仅继承一次。明确放弃修改继续沿既有恢复副本，旧选择不自动重放。补充升级/两设备顺序/恢复默认负例，21项定向PASS。
- 类型偏好是本机看板元数据；历史改色通过现有飞书记录同步。选择时尚未读取的远端记录不由旧选择自动接管，避免跨机自动互相覆盖；用户再次明确选类型可对当前已读取历史统一应用。

- c6f1268独立复核PASS，无新增P1/P2，9项独立定向PASS。完整逻辑回归496项PASS；追加真实Feishu适配器合并改色/内容修改、丢响应重试与旧版本拒绝测试后，quick-edit 18项PASS。
- 最终UI：local-editing桌面测试PASS，包含同任务后续补记继承和恢复项目默认一致，保留真实projectType。静默同步5阶段、通用桌面21项与真实冷进程恢复PASS。回归发现显示done会令补记丢失可选任务，已改为补记/修改继续使用原任务快照，完成投影只用于看板；静默同步active/paused补记正反复跑通过。
- 旧portrait-desktop在120和已安装119干净ASAR均出现相同null.getBoundingClientRect选择器错误（artifacts/p081-portrait-diagnostic.txt、p081-portrait-baseline119.txt），没有修改产品迎合旧测试。当前UI及窄窗口同步布局已由真实窗口定向测试覆盖；不声明旧portrait全部通过。首次独立全量在受限沙箱中有esbuild父路径访问拒绝；获准环境原测试496/496通过，未修改依赖。
- 交付准备120，独立源码检查点与完整产物核对后才发布；本轮没有操作真实飞书任务、自动安装或重启用户App。

## 最终交付

固定源码c3debaf13f18a13a2df74697ba52114e0c277490/preview120，最终独立复核PASS。干净build:focus产物76文件逐字节匹配成品ASAR，隐藏成品冒烟和最终生产窗口连续编辑测试PASS。NSIS解压直接包含resources/app.asar，与win-unpacked ASAR同SHA256 `53cf6aedcefe0c7144ce5199776591213491c9afbc8d390a385db196a4e7dba1`。

stage-local-update首次准备和重复回读PASS。五资产大小/SHA256全部核验后创建固定annotated tag并发布非Latest prerelease；公共核验再次确认五资产、原119资产、Latest不变。实际已安装119的更新器在独立profile发现120，errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。[120发布](https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.120)。证据artifacts/release120-package-acceptance.json、release120-installer-asar.json、release120-local-stage.json、release120-local-reread.json、release120-remote-public.json、release120-live-update.json。

首次外部发布自动审批因授权证据不足拒绝，未执行。随后用read_thread核对用户提供的原聊天中用户本人“默认推送”和“然后再上传更新github”原文；补齐私有本地授权回执后再次审批放行。原聊天/回执不进入公开Git；没有绕过审核或扩大范围。

最终Learning recorded：LEARN-P0-POMO-081-01，升级旧队列pending不能自证从未发送；原始旧格式兼容测试与真实适配器丢响应重试共同验证，同本检查点登记。前述none为当时阶段判断，最终以本项为准。剩余已知限制是旧portrait选择器基线问题与本机分类偏好的明确作用域；旧版遗留未知发送状态的意图须先完成原同步/失败处理，新建草稿正常连续编辑。
