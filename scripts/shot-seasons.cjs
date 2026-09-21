// 四季装饰验证：mock 北京时间 4/7/10/1 月中旬正午，截取农场卡片。
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const html = path.join(root, "app", "renderer", "build", "index.html");
const outDir = path.join(root, "artifacts", "ui-shots");
fs.mkdirSync(outDir, { recursive: true });
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "farm-seasons-")));
app.commandLine.appendSwitch("force-device-scale-factor", "1");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const deadline = setTimeout(() => { console.error("timeout"); app.exit(2); }, 90000);

// 北京时间正午 12:00 = UTC 04:00；取每月 15 日
const seasons = [
  ["spring", Date.UTC(2026, 3, 15, 4, 0, 0)], // 4 月
  ["summer", Date.UTC(2026, 6, 15, 4, 0, 0)], // 7 月
  ["autumn", Date.UTC(2026, 9, 15, 4, 0, 0)], // 10 月
  ["winter", Date.UTC(2026, 0, 15, 4, 0, 0)], // 1 月
];

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    useContentSize: true,
    webPreferences: { offscreen: true, sandbox: true },
  });
  for (const [name, ts] of seasons) {
    await win.loadURL(`${pathToFileURL(html).href}?farmNow=${ts}`);
    await wait(600);
    await win.webContents.executeJavaScript(
      "document.fonts ? document.fonts.ready.then(()=>true) : true",
      true
    );
    await wait(400);
    // 只裁农场卡片区域
    const clip = await win.webContents.executeJavaScript(`(()=>{
      const el=document.querySelector('.farm-field');if(!el)return null;
      const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};
    })()`, true);
    const image = clip
      ? await win.capturePage(clip)
      : await win.capturePage();
    fs.writeFileSync(path.join(outDir, `season-${name}.png`), image.toPNG());
    console.log(`captured season-${name}.png clip=${Boolean(clip)}`);
  }
  // 修改按钮悬浮显现：真实鼠标移入第一条记录行
  await win.loadURL(pathToFileURL(html).href);
  await wait(600);
  const target = await win.webContents.executeJavaScript(`(()=>{
    const li=document.querySelector('.record-list .record');
    const btn=document.querySelector('.record-list .record .record-edit');
    if(!li||!btn)return null;
    const r=li.getBoundingClientRect();
    return {x:r.x+r.width*0.6,y:r.y+r.height/2};
  })()`, true);
  if (target) {
    win.webContents.sendInputEvent({ type: "mouseMove", x: target.x, y: target.y });
    await wait(400);
    const rec = await win.webContents.executeJavaScript(`(()=>{
      const li=document.querySelector('.record-list .record');
      const r=li.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height*2.4};
    })()`, true);
    fs.writeFileSync(
      path.join(outDir, "record-hover-edit.png"),
      (await win.capturePage(rec)).toPNG()
    );
    console.log("captured record-hover-edit.png");
  }
  clearTimeout(deadline);
  app.exit(0);
});
