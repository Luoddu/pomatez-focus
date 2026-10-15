# P0-POMO-062 分类菜单层级验收
状态：DONE；唯一状态源TASK-P0-POMO-062.md。
四源/范围/回滚见执行卡。旧preview97实际renderer重现：三窗测试第一窗1080的全部7个分类菜单选项elementFromPoint命中均false，菜单rect仍在视口，故为绘制层级遮挡而非元素缺失。artifacts/p062-before.log；初次fixture计数误写8，经PROJECT_TYPES六类+继承校正7后准确重现，记录字段断言按实际colorOverride而非task projectType。
修复只把既有body portal分类菜单置于modal遮罩3000之上，并使dialog尊重已被子菜单消费的键盘事件；不改分类定义/记录保存/数据口径。扩展已有manual-dialog-desktop的几何测试，检查所有7选项实际hit target、选科研、Esc只关菜单/焦点回trigger、Tab跳时长、最终保存colorOverride科研与原始数量/真实时长。原始用户profile不读写。
Learning判断：这是既有portal/遮罩样式和嵌套事件协调，未形成超出既有浏览器行为的新增工程教训；用具体UI回归覆盖，不新增Learning条目。最终构建/发布验证如下。

最终源码与验收（2026-10-15）
- 冻结源码0d5cb9f25d2b1bfd99c20846cd5f74b4cc6b8eea，公开主线codex/feishu-focus同步同SHA；build:focus/package:focus exit0且clean。artifacts/focus-build.json、p062-build.log、p062-package.log、p062-source-push.log。
- 实际生产renderer三窗口1080×1600/1440×900/480×800：7个分类选项绘制hit target全在遮罩之上，所有项在视口内，点选科研/焦点回trigger、Esc只收菜单、再Esc关dialog、Tab到时长均正常；背景概览/月历/旅程/科学专注/记录几何不变，inert和原焦点恢复，保存colorOverride科研、原始数量1/真实时长1500秒正确。artifacts/p062-manual-dialog.log，目视p062-category-menu-portrait.png通过。
- 复用上述fixture的ignored补充p062-edit-dialog.cjs/log验证已有记录修改弹窗打开/保存正常，ID/分类/原始数量/真实时长保留；编辑记录原本无分类下拉，未改变其产品行为。portrait14横竖屏布局回归PASS，artifacts/p062-portrait.log。未读取/更改真实用户profile、偏好、记录或凭证。
- 实际安装包exe hidden smoke exit0、stderr空；ASAR来源同冻结SHA/dirty=false/version0.1.0-preview.98；updater576901bytes/裸require0。artifacts/p062-packaged-smoke.log、p062-asar-updater.log、p062-release-prep.log。仅本地生成便携包，未交付/发布便携包。
- 独立reviewer01a13d85-043d-7f61-91b4-9dc1ca566fbb只读审查冻结diff、三窗验证、包内来源/五资产和更新器证据，最终PASS无P1/P2；未联网或启动真实App。Learning本检查点无新增事实，沿用上段具体不记录理由，根Learning/Memory未改。

公开发行与回滚
- https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.98 ，release413426609，non-draft prerelease，不设Latest（仍preview.51）；annotated tag剥离0d5cb9f。后续仅两份回执文档提交不改变发行源码/tag。
- 五资产齐全：setup.exe75511196bytes、blockmap78953bytes、preview.yml405bytes、source-version.json107bytes、SHA256SUMS.txt405bytes。setup SHA256 9475ff9ac3b9bc68a10a49a4bbccdd1f40be551174b28ebf831ec43d053d97f7；远端草稿/公开资产ID、大小、SHA256与本地全部一致。完整清单见发行SHA256SUMS及artifacts/release98-local-assets.json、release98-remote-draft.json、release98-readback.json。
- 公开安装包HTTP206首1024bytes与本地匹配，tag与Latest确认见artifacts/p062-public-verification.json、release98-tag-readback.txt。
- 从已验证公开97对应的本地打包ASAR保留真实updater（sourcea5b2d455，非伪造版本），发布前正常发现97、发布后发现98，setup75511196及SHA512与清单一致，errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。artifacts/p062-update-before.json、p062-update-after.json。不声称该ASAR为当前用户已安装版本；未下载/安装新版或重启用户App。
- 用户通过App检查更新升级98；菜单显示在补记弹窗前方，Esc先收菜单保留表单。回滚可使用未替换的97发行或恢复基线两处UI代码；无需任何记录/数据迁移。范围外无顺手修改。
