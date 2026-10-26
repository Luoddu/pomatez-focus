# P0-POMO-069 随手记折叠入口验收

状态 REVIEW，范围/授权/四处预检/回滚见TASK-P0-POMO-069.md。本轮是显示交互T1，按轻量规则自测收口，无额外reviewer/子Agent调用。队列、计时、持久化格式、云API、Electron及列宽均未修改；发布沿既有默认授权，个人App不关闭或安装。

FocusApp仅在timing（含暂停）允许新增输入；FocusCapture默认透明低对比小边框按钮，点击挂载并聚焦原受控输入；成功原onCapture后收起，失败保留输入，手动收起不清父级文字。没有active的看板或review不提供新增按钮/输入，原队列已有待整理仍显示并可按原流程整理；无待整理时组件返回null，不占白色输入卡。

原静音隐藏真实main/preload/renderer夹具扩展为9组：初始四象限无入口且原新增任务按钮仍在；透明细实线按钮默认输入不存在、点击聚焦、手动收起再开留字、保存成功自动收起；IME不误提交；当前paused active深度相等且records0；写失败保留输入；跨日重载默认收起但原意图/active保留；待整理不挡原成果同步；项目/象限/数量整理正常；首网络失败重试原ID并生成今日2slot。真实云写0，个人profile不读不写。working构建及9组通过，最终clean绑定与包源/公开终验尚待。

原始运行artifacts/p069-build-working.txt、p069-capture-desktop.txt；合成collapsed截图已人工查看，小按钮透明无白卡、原列比例不变。expanded首截图因隐藏窗口尚未完成绘制仍是旧帧，夹具补200ms绘制等待，最终clean再次检查。首测试因实现者未等构建完成读到旧105页面，已保留before-build-finished证据并按先构建后测试修正；随后精确1px断言遇Windows缩放计算为0.571429px，夹具改验透明/solid/0<width<=1，产品CSS仍1px，未据此改产品。

Learning-Review: none - 局部显示状态沿原React组件、受控输入和已验队列，没有新第三方机制；绘制/DPI夹具修正是现有截图与缩放事实的应用，不重复写通用教训。最终安装包保留本机供用户自行升级；公开tag/资产与真实前版更新器完成后才DONE。
