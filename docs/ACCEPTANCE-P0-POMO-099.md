# P0-POMO-099 Wallpaper Engine 例外验收

- 变更：只对受限Steam库根的直接wallpaper_engine目录中明确runtime文件放行；包括32/64、launcher、网页/界面和运行辅助组件。显式名称deny优先；未知文件、projects、其他游戏及嵌套Steam样式路径仍匹配原限制。无持久状态/额度/网络改动。
- 四源见TASK-P0-POMO-099.md。独立复核发现初版lastIndexOf会放行嵌套伪装，已改为锚定实际规则root、增加完整嵌套负例；修正静态复核PASS。
- 验证：新增纯策略正反及GameGuard动作序列测试；壁纸不出现ask/terminate，游戏仍ask后30秒terminate一次。全套默认并发首次585/586，唯一失败为浏览器native通信4秒超时；原测试单独重跑22/22（含9项严格策略）通过。保持断言不变，以文件并发2运行完整586/586通过，包含Windows原生进程完整链路测试。未用合成测试声称个人壁纸已恢复。
- 原始结果：忽略artifacts/p099-tests.log、p099-targeted-tests.log、p099-tests-bounded.log。未启动/关闭个人游戏或壁纸，不中断农场计时。用户加载新版前旧140规则仍生效。
- Learning无新增：此次复用路径边界/正反验收规则，初版问题已在独立复核阶段关闭；并发超时不作为产品缺陷或确定根因。回滚140包，个人记录保留。
- 发行验收待完成；不以代码通过代替已安装生效。
