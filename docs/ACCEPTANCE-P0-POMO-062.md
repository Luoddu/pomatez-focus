# P0-POMO-062 分类菜单层级验收
状态：REVIEW；唯一状态源TASK-P0-POMO-062.md。
四源/范围/回滚见执行卡。旧preview97实际renderer重现：三窗测试第一窗1080的全部7个分类菜单选项elementFromPoint命中均false，菜单rect仍在视口，故为绘制层级遮挡而非元素缺失。artifacts/p062-before.log；初次fixture计数误写8，经PROJECT_TYPES六类+继承校正7后准确重现，记录字段断言按实际colorOverride而非task projectType。
修复只把既有body portal分类菜单置于modal遮罩3000之上，并使dialog尊重已被子菜单消费的键盘事件；不改分类定义/记录保存/数据口径。扩展已有manual-dialog-desktop的几何测试，检查所有7选项实际hit target、选科研、Esc只关菜单/焦点回trigger、Tab跳时长、最终保存colorOverride科研与原始数量/真实时长。原始用户profile不读写。
Learning判断：这是既有portal/遮罩样式和嵌套事件协调，未形成超出既有浏览器行为的新增工程教训；用具体UI回归覆盖，不新增Learning条目。最终构建/发布验证待补。
