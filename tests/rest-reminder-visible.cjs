// Brief synthetic windows only: no browser access, ActivityWatch or personal profile.
const { app, BrowserWindow, ipcMain } = require("electron"), { spawnSync } = require("node:child_process");
const assert = require("node:assert/strict"), path = require("node:path"), fs = require("node:fs");
if (!process.env.POMATEZ_PROFILE || process.platform !== "win32") throw Error("Isolated Windows test required");
app.setPath("userData", process.env.POMATEZ_PROFILE);
const { RestReminderWindow } = require("../app/electron/build/focus/restReminderWindow");
const root = path.resolve(__dirname, ".."), wait = ms => new Promise(r => setTimeout(r, ms));
const until = async fn => { for (let n = 0; n < 100; n++) { if (await fn()) return; await wait(30); } throw Error("Visible test wait"); };
const hwnd = window => window.getNativeWindowHandle().readBigUInt64LE().toString();
app.whenReady().then(async () => {
  let fixture, controller;
  try {
    fixture = new BrowserWindow({ width: 800, height: 600, show: false, title: "番茄农场 · 隔离视频层级测试", webPreferences: { sandbox: true } });
    await fixture.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<body style="background:#1b2535;color:white;font:24px system-ui;display:grid;place-items:center;height:90vh">隔离的全屏视频测试窗口</body>'));
    controller = new RestReminderWindow(path.join(root, "app/electron/build"), false, () => {}, () => {}, () => {});
    ipcMain.handle("rest-reminder:state", event => { if (!controller.owns(event)) throw Error('Untrusted'); return controller.snapshot(); });
    const state = { settings: { supervise: true, pomodoroGoal: 12 }, status: 'recording', progress: { completedCount: 10 },
      reminder: { key: 'synthetic/zorder', kind: 'focus', watchedMinutes: 55, completedCount: 10 } };
    const checks = [];
    for (const mode of ['normal', 'maximized', 'fullscreen']) {
      fixture.setFullScreen(false); fixture.unmaximize();
      if (mode === 'maximized') fixture.maximize();
      if (mode === 'fullscreen') fixture.setFullScreen(true);
      fixture.show(); fixture.focus();
      await wait(200);
      controller.update(state);
      let alert;
      await until(() => { alert = BrowserWindow.getAllWindows().find(w => w !== fixture); return alert && alert.isVisible() && !alert.webContents.isLoadingMainFrame(); });
      await until(() => alert.webContents.executeJavaScript("!document.querySelector('button').disabled"));
      const script = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class RestZOrder { [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h,uint c); }'; $cursor=[IntPtr][long]${hwnd(fixture)}; $target=[IntPtr][long]${hwnd(alert)}; $seen=@{}; $above=$false; for($n=0;$n -lt 200;$n++){ $cursor=[RestZOrder]::GetWindow($cursor,3); if($cursor -eq [IntPtr]::Zero -or $seen.ContainsKey($cursor.ToInt64())){break}; if($cursor -eq $target){$above=$true;break}; $seen[$cursor.ToInt64()]=$true }; if(-not $above){throw 'Reminder is not above fixture'}; Write-Output 'ABOVE'`;
      const proof = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
      assert.equal(proof.status, 0, proof.stderr);
      assert.ok(proof.stdout.includes('ABOVE'));
      assert.equal(alert.isAlwaysOnTop(), true);
      assert.equal(fixture.isAlwaysOnTop(), false);
      if (mode === 'fullscreen') {
        const png = await alert.webContents.capturePage();
        assert.equal(png.isEmpty(), false);
        fs.writeFileSync(path.join(root, 'artifacts/p040-native-reminder.png'), png.toPNG());
      }
      controller.update({ ...state, reminder: null });
      assert.equal(alert.isDestroyed(), true);
      assert.equal(fixture.isAlwaysOnTop(), false);
      checks.push(`actual Win32 z-order: reminder visible ABOVE ${mode} synthetic browser, then disposed; fixture remains unpinned`);
    }
    fixture.destroy();
    fs.writeFileSync(path.join(root, 'artifacts/p040-zorder.json'), JSON.stringify({ checks, personalBrowserAccess: false }, null, 2));
    console.log(JSON.stringify({ checks }, null, 2)); app.exit(0);
  } catch(e) { console.error(e); controller?.close(); if (fixture && !fixture.isDestroyed()) fixture.destroy(); app.exit(1); }
});
