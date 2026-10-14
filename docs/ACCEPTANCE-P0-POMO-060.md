# P0-POMO-060 飞书全局偏好同步验收
状态：REVIEW；实现与逻辑已通过，生产桥接与发行待验证。唯一任务状态见TASK-P0-POMO-060.md。
功能：白名单六组偏好（比例、周目标、科研目标、计时时长、科学休息、浏览器干预）；同一Base专用“农场偏好”表append-only版本，parents DAG保留历史与并发冲突。初次云空只有用户启用才写；云非空不同值须选本机/飞书。暂停持久化；离线保存、lost reply exact-ID对账；应用失败保留待应用选择，不能将旧本机值反向上传。字段/schema/来源/secret检查、同名不匹配不覆盖，不删除业务记录。凭证/设备安装/窗口/真实计时记录不进入偏好。
四源与官方公开bitable v1路径见执行卡，现有飞书connection/service/trusted IPC薄复用；无新SDK、服务或依赖。未知建表结果跨重启持久标记，后续只读对账，不自动重复创建。
证据：backend23项PASS+frontend10项PASS（artifacts/p060-preference-tests.log）；402项完整逻辑PASS（p060-all-tests.log）；renderer和electron完整TS PASS，定向renderer ESLint PASS。独立初审2P1已按复现修复并纳入自动测试（首次不同值明确选择、暂停重启、选择云设置但本机应用失败后重启恢复不上传旧值）。
资源：全部合成数据/隔离profile，Agent未读取真实用户profile或凭证、未写真实飞书。当前专注/休息的已保存时长保持；新默认仅下次。计时偏好独立key，不修改raw records。跨电脑实网首次启用由用户App现有安全连接完成，未伪称已读取用户实际云值。
回滚：暂停同步保留本机配置与云版本；95发行及原始记录保留。Learning none - 现有幂等日记传输/可信IPC/离线保留流程薄复用，任务特定新协议尚不扩散为通用规则；最终检查点再核对。
