# P0-POMO-069 随手记折叠入口验收

状态 DONE，范围/授权/四处预检/回滚见TASK-P0-POMO-069.md。本轮是显示交互T1，按轻量规则自测收口，无额外reviewer/子Agent调用。固定源码/tag 51e1544fdd9b35d0c8f4996e4e45995858ac4cb6 / preview106 / dirty=false。队列、计时、持久化格式、云API、Electron及列宽均未修改；发布沿既有默认授权，个人App不关闭或安装。

FocusApp仅在timing（含暂停）允许新增输入；FocusCapture默认透明低对比小边框按钮，点击挂载并聚焦原受控输入；成功原onCapture后收起，失败保留输入，手动收起不清父级文字。没有active的看板或review不提供新增按钮/输入，原队列已有待整理仍显示并可按原流程整理；无待整理时组件返回null，不占白色输入卡。

原静音隐藏真实main/preload/renderer夹具扩展为9组：初始四象限无入口且原新增任务按钮仍在；透明细实线按钮默认输入不存在、点击聚焦、手动收起再开留字、保存成功自动收起；IME不误提交；当前paused active深度相等且records0；写失败保留输入；跨日重载默认收起但原意图/active保留；待整理不挡原成果同步；项目/象限/数量整理正常；首网络失败重试原ID并生成今日2slot。真实云写0，测试不读写个人profile。artifacts/p069-build-clean.txt、p069-capture-clean.txt及p069-capture-desktop.json将最终9组绑定干净固定源码；本轮不改队列/计时，无新变化时不重复全量业务验证。

原始运行artifacts/p069-build-working.txt、p069-capture-desktop.txt；合成collapsed截图已人工查看，小按钮透明无白卡、原列比例不变。展开截图在200ms等待及一次既有setSize重绘后仍出现旧合成帧，停止本层截图修补，不据此声称展开图已验；展开以实际DOM挂载/焦点、受控输入及保存/收起实链核验。额外visual夹具临时检查输入宽度>200也通过，未保留重绘试探到产品或最终源码。窗口始终隐藏静音，没有改GPU/系统或控制用户App。首测试因实现者未等构建完成读到旧105页面，保留before-build-finished证据并按先构建后测试修正；随后精确1px断言遇Windows缩放计算为0.571429px，夹具改验透明/solid/0<width<=1，产品CSS仍1px。

包源/本机准备：release106-package-acceptance.json/verify.txt，227个build文件与ASAR逐字节相同，必要原生资源存在，成品随机profile隐藏静音启动退出0；NSIS 84,701,542字节，SHA256 838fd5bfa93fe7c39c8155c042726914898fe112c0626ebb59956b66a1d6c42f，五资产及feed SHA512一致。同一包保留artifacts/release106；用户原本机交付授权下，原stage-local-update helper原子准备当前用户固定收件目录，release106-local-stage.json版本106/alreadyPrepared=false。只读已安装ASAR为105/source9ca4e5f；清单106/source51e/size/SHA256回读相等，不自动关闭、安装、重启或修改计时记录。用户打开设置可自行点“重启以加载更新”。

公开终验：release106-draft-verify.txt/public-verify.txt及remote-draft/remote-public原始JSON；固定release424217154，先draft五资产全部大小/哈希核对、无公共tag，再推annotated tag并立即公开，不设Latest。Git refs/tag对象追溯51e1544f，draft→public五资产ID及哈希相同，旧105发布时间/资产未变，Latest仍51。地址 https://github.com/Luoddu/pomatez-focus/releases/tag/v0.1.0-preview.106 。校验使用既有官方REST路径，GET遇已知瞬时连接错误最多一次重试并保留日志，不重放发布写入、不改网络配置。

真实旧版：从此前已核同源公开105成品ASAR保留原更新器，同时重算旧105 NSIS SHA256等于其公开清单90af7e6...；release106-live-update.json/txt确认previous105/source9ca4e5f，原updater SHA256 9476f779e9e8650fa1eec0718155fe8a04a4618bbb8ed06bd8673cae5de0a819，检测available106，文件/84,701,542字节/SHA512匹配本机，errors=[]、downloads=0、autoDownload=false、autoInstallOnAppQuit=false。不以源码版本号代替实际旧更新链。

Learning-Review: none - 局部显示状态沿原React组件、受控输入和已验队列，无新第三方运行机制；DPI断言沿既有缩放事实，隐藏截图旧帧根因未明不写猜测为通用教训。交付闭环自测符合轻风险规则；个人安装仍由用户自行操作，不声称已安装106。最终仅文档收口，不重新打包或改tag。
