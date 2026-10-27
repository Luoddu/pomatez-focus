# P0-POMO-070 月历整数显示验收

状态 DONE；范围、四源预检、授权与回滚见TASK-P0-POMO-070.md。局部显示T1按轻量规则自测，无子Agent或额外模型调用。HeatmapCalendar只改两处文本Math.round，小格和周合计显示整数；data-count、悬浮详情、颜色分档、目标判断和今日时段热力仍用精确有效值。概览、计时、个人数据和列布局不改。

现有effective-stats.test.cjs共14组PASS，artifacts/p070-effective-stats.txt。原0.29×3/100算术断言仍保留精确0.87/29，月历显示断言适配1/29，dataset仍等于精确值；0.29小格及周合计显示0，但dataset、周title和今日热力title仍0.29、原hm-t1仍通；整数6/14显示不变。首轮13/14因另一处旧月历显示断言仍要求0.87，保留p070-effective-stats-old-display-assertion.txt，定位后只更新该已有断言并加精确dataset复核；产品不追加修补。

固定源码/tag 2ed44483cfa3be6fbb00d4e38e4119321ae497dd / preview107 / dirty=false；原version helper生成107，p070-build-clean.txt、p070-package.txt和release107-package-acceptance.json/verify.txt确认干净构建、229个build文件与ASAR逐字节一致，必要原生资源存在，成品随机profile隐藏静音启动退出0。NSIS 84,730,751字节，SHA256 afb04e2a2067b5192930455e5344c07bd4fca8bd1de2c45572fac0661ad83bad；五资产及feed SHA512核对通过。本机原stage-local-update helper准备107，release107-local-stage.json/alreadyPrepared=false，第二次同helper完整清单与字节哈希回读release107-local-reread.json/alreadyPrepared=true；不下载GitHub包、不关闭、重启或安装用户App。

公开终验release107-draft-verify.txt/public-verify.txt及remote-draft/remote-public JSON：固定release425252658，源码非强推同步到origin/codex/feishu-focus；先draft五资产全部大小/哈希核对、无公共tag，再推annotated tag并立即公开且不设Latest。tag对象回溯固定源码，draft/public五资产ID相同，旧106发布时间/资产/哈希未变，Latest仍51。地址 https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.107 。所有发布写入一次成功，未修改网络配置。

真实前版验证：release107-prior-verification.json核对原公开106 ASAR/source51e1544f和旧NSIS SHA256 838fd5bfa93fe7c39c8155c042726914898fe112c0626ebb59956b66a1d6c42f等于其公开资产摘要。release107-live-update.json/txt以实际106更新器SHA256 9476f779e9e8650fa1eec0718155fe8a04a4618bbb8ed06bd8673cae5de0a819检测available107，文件、84,730,751字节、SHA512均等于本机feed，errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。旧tag/资产不修改。最终仅两份验收文档收口，不重新打包或改tag。

Learning-Review: none - 两处展示格式沿原有效计数与工具提示，无新机制或可跨任务新教训，不重复记录已有精度/不可变发布规则。
