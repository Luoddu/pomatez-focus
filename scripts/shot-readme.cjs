// Capture the existing UI with task names removed BEFORE rasterization.
// Run with Node; the Electron child stays hidden and uses an isolated profile.
if (!process.versions.electron) {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const result = require("node:child_process").spawnSync(
    require("electron"), [__filename],
    { env, windowsHide: true, stdio: "inherit", timeout: 25000 }
  );
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
const { app, BrowserWindow } = require("electron");
const path = require("node:path"), fs = require("node:fs");
const { randomUUID } = require("node:crypto");
app.setPath("userData", path.join(__dirname, "../artifacts/test-profiles", randomUUID()));
app.commandLine.appendSwitch("force-device-scale-factor", "1");
const deadline = setTimeout(() => app.exit(2), 20000);
app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({ show: false, width: 1440, height: 980,
      useContentSize: true, webPreferences: { offscreen: true, sandbox: true } });
    await win.loadFile(path.join(__dirname, "../app/renderer/build/index.html"));
    await win.webContents.executeJavaScript("document.fonts.ready.then(()=>true)");
    await new Promise(r => setTimeout(r, 1200));
    const result = await win.webContents.executeJavaScript(`(() => {
      if (window.focusApi) throw Error('Screenshots must not connect to live data');
      const labels = [...document.querySelectorAll('.task-name, .r-task')];
      if (!labels.length) throw Error('No task labels found: inspect UI selectors');
      for (const el of labels) {
        el.textContent = '任务已隐藏';
        el.removeAttribute('title');
        el.setAttribute('aria-label', '任务已隐藏');
        el.style.cssText += ';color:transparent!important;background:#cbd0d9!important;border-radius:4px;display:inline-block;flex:none!important;width:130px!important;height:14px!important;overflow:hidden;user-select:none;';
      }
      return {redacted:labels.length, allReplaced:labels.every(el=>el.textContent==='任务已隐藏'),
        statsPreserved:document.querySelectorAll('[data-stat]').length===4};
    })()`);
    if (win.isVisible() || !result.allReplaced || !result.statsPreserved) throw Error("Redaction validation failed");
    await new Promise(r => setTimeout(r, 150));
    fs.writeFileSync(path.join(__dirname, "../docs/images/desktop.png"), (await win.capturePage()).toPNG());
    console.log(JSON.stringify(result));
    clearTimeout(deadline); app.exit(0);
  } catch (e) { console.error(e.message); clearTimeout(deadline); app.exit(1); }
});
