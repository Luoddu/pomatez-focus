# P0-POMO-070 月历整数显示验收

状态 IN_PROGRESS；范围、四源预检、授权与回滚见TASK-P0-POMO-070.md。局部显示T1按轻量规则自测，无子Agent或额外模型调用。HeatmapCalendar只改两处文本Math.round，小格和周合计显示整数；data-count、悬浮详情、颜色分档、目标判断和今日时段热力仍用精确有效值。概览、计时、个人数据和列布局不改。

现有effective-stats.test.cjs共14组PASS，artifacts/p070-effective-stats.txt。原0.29×3/100算术断言仍保留精确0.87/29，月历显示断言适配1/29，dataset仍等于精确值；0.29小格及周合计显示0，但dataset、周title和今日热力title仍0.29、原hm-t1仍通；整数6/14显示不变。首轮13/14因另一处旧月历显示断言仍要求0.87，保留p070-effective-stats-old-display-assertion.txt，定位后只更新该已有断言并加精确dataset复核；产品不追加修补。

沿既有版本helper准备107；固定源码、干净构建、NSIS同源、当前用户本地准备及公开更新链待后续证据填入。已保留真实公开106成品ASAR和原始公开API回执，不修改旧tag/资产。不关闭、重启或安装用户App。

Learning-Review: none - 两处展示格式沿原有效计数与工具提示，无新机制或可跨任务新教训，不重复记录已有精度/不可变发布规则。
