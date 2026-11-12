# P0-POMO-082 统计页布局验收

目标/四源/范围/回滚见TASK-P0-POMO-082.md。显示实现仅focus.css：统计直属内容最大1080px并居中、不被flex压缩；移除routine额外外边距；趋势绘图区180–240px响应高度。统计数据、过滤和同步代码未变。

已验证：标准build-focus生产构建成功；隔离隐藏静音Electron生产页面使用research-desktop的合成服务夹具，2280/1440/760/1080竖屏四尺寸均无页面横溢出、8周完整，宽屏卡片1080px、窄窗718px、竖屏1049px，绘图区240/240/180/238px。月切换、上一区间、查看科研时长趋势分类选择均通。artifacts/stats-layout-{width}.png及stats-layout-desktop.cjs保存本地原始证据；已人工查看1440和760截图，无私人任务数据。未自动关闭、安装或重启个人App。

Learning-Review none：局部CSS布局使用现有标准属性，没有新跨任务机制或教训。发行证据如下。


发行完成：review_local_editing按模块发行门禁只读复核5940a3e相对4794a7e并查看1440/760截图，PASS，无阻断。固定提交干净生产构建和同一四尺寸测试再次通过。verify-package121：79个build文件与ASAR逐字节一致，成品隔离隐藏启动退出0；NSIS解出resources/app.asar与被验成品摘要一致。安装包82,864,678字节，SHA256 108e3ae88ebf426788f2df3b4aeee1bb3bde28c70ec3eca9dc75790d323ab044；stage-local-update先准备本机，再回读alreadyPrepared=true。未代用户重启/安装。

release121-remote-draft/public.json核验五资产大小与SHA摘要、源5940a3e、固定annotated121 tag一致，旧120五资产未变、Latest不变。公共release442415970为非draft prerelease：https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.121 。真实上一版120 ASAR/source c3debaf的原更新器在发布前检测current120，发布后available121，feed与本地包完全匹配，errors空，downloads=0，autoDownload/autoInstallOnAppQuit=false（release121-before-update/live-update.json）。未访问或修改真实飞书任务。最终文档提交不更改固定发行源码或资产。

收口绿灯：公开分支与固定源码一致，工作树仅本卡/验收文档收口；其他worktree无重叠写入。回滚按卡发新版本恢复CSS，不替换121资产。Learning判断同上，暂无待记录候选。
