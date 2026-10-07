# P0-POMO-037 更新发布验收

- REVIEW；当前仍待本轮干净源码构建、GitHub六资产校验、非draft发布和真实更新检测。授权、四源、写集与停止/回滚以TASK-P0-POMO-037.md为准，未全部满足不报告推送完成。
- 源基线为已公开c1dcae6，运行科学休息代码与035独立复核PASS版本相同；本次运行改动仅preview.69到preview.70两处版本值。69本地包保留，70由既有版本工具选择，未手改版本守卫。
- 规则明确在AGENTS.md第6条与DEVELOPMENT发布流程：普通“推送”包括源码/完整Windows prerelease/客户端检测；明确“只推源码”仍单独止于源码。未授权安装/重启不做，Mac个人版仍独立月度。
- 已读取固定electron-updater6.8.3 GitHubProvider公开发布feed和preview.yml选择逻辑，gh2.97.0官方help的draft/target/verify-tag/assets/edit参数；使用官方CLI自身认证，不提取或存储token，不使用旧无限重试发布脚本。
- 本轮测试、复核、实际构建源、包哈希、远端资产和更新检测证据将在收口段填写。包/临时profile/日志均不进Git，公开release仅六个明确附件。
- Learning判断none：复用原版本、构建、GH发布和官方更新器生命周期；产品“推送”含义由用户明确修正，无新增跨任务验证教训。
