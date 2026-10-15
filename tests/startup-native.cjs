// P0-POMO-061: node tests/startup-native.cjs (or invoke with Electron directly).
// Four-source precheck: TASK-P0-POMO-061; live startup.ts; Electron v34.5.8
// docs/api/app.md:1129-1170, shell/browser/browser_win.cc:128-227,574-642;
// LEARN-P0-POMO-055-01 and native-registry.test.cjs / ACCEPTANCE-P0-POMO-055.
// Own random HKCU entry only; no production main, BrowserWindow, real profile,
// registry CLI writes, login/reboot, or network-dependent operation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');

if (!process.versions.electron) {
  assert.equal(process.platform, 'win32', 'Windows native test required');
  assert.equal(require('electron/package.json').version, '34.5.8');
  const artifacts = path.join(root, 'artifacts');
  fs.mkdirSync(artifacts, { recursive: true });
  const run = fs.mkdtempSync(path.join(artifacts, 'p061-startup-native-'));
  const profile = path.join(run, 'profile');
  const env = { ...process.env, POMO_061_NATIVE_RUN: run };
  delete env.ELECTRON_RUN_AS_NODE;
  const result = require('node:child_process').spawnSync(require('electron'), [
    __filename, `--user-data-dir=${profile}`, '--disable-background-networking',
    '--disable-component-update', '--disable-sync',
  ], { cwd: root, env, windowsHide: true, encoding: 'utf8', timeout: 30000 });
  const log = `${result.stdout || ''}${result.stderr || ''}`;
  fs.writeFileSync(path.join(run, 'native.log'), log, 'utf8');
  process.stdout.write(log);
  console.log(`Evidence: ${run}`);
  // A timeout/abnormal exit is a failure, never an implicit cleanup success.
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `Native fixture failed; inspect ${run}`);
  const report = JSON.parse(fs.readFileSync(path.join(run, 'result.json'), 'utf8'));
  assert.equal(report.ok, true);
  assert.equal(report.cleaned, true);
} else {
  const { app, BrowserWindow, webContents, session } = require('electron');
  const run = process.env.POMO_061_NATIVE_RUN || fs.mkdtempSync(
    path.join(require('node:os').tmpdir(), 'p061-startup-native-'));
  const profile = path.join(run, 'profile');
  fs.mkdirSync(profile, { recursive: true });
  // Recovery is restricted to a prior fixture report, never a caller-supplied
  // arbitrary startup name. It uses the same native ownership check below.
  const recovery = process.env.POMO_061_RECOVER_REPORT && JSON.parse(
    fs.readFileSync(process.env.POMO_061_RECOVER_REPORT, 'utf8'));
  if (recovery) {
    assert.equal(recovery.task, 'P0-POMO-061');
    assert.equal(recovery.executable, process.execPath);
    assert.match(recovery.ownName, /^pomo061\.native\.[a-f0-9-]{36}$/);
    assert.ok(recovery.writes.some((write) => write.name === recovery.ownName &&
      write.path === `"${process.execPath}"` && write.args.length === 1 &&
      write.args[0] === '--start-in-tray'));
  }
  const ownName = recovery ? recovery.ownName : `pomo061.native.${randomUUID()}`;
  app.setName(ownName);
  app.setAppUserModelId(ownName);
  app.setPath('userData', profile);
  app.setPath('sessionData', profile);
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-background-networking');
  app.commandLine.appendSwitch('disable-component-update');
  app.commandLine.appendSwitch('disable-sync');
  const report = { task: 'P0-POMO-061', ownName, electron: process.versions.electron,
    executable: process.execPath, profile, checks: [], snapshots: [], writes: [],
    controllerErrors: [], cleaned: false, ok: false };
  const options = { path: `"${process.execPath}"`, args: ['--start-in-tray'] };
  const normalized = (value) => path.win32.normalize(value).toLowerCase();
  const matches = (item) => item.name === ownName && item.scope === 'user' &&
    typeof item.path === 'string' && normalized(item.path) === normalized(process.execPath);
  const read = () => {
    const result = app.getLoginItemSettings(options);
    assert.ok(Array.isArray(result.launchItems), 'Native launchItems required');
    return result;
  };
  const owned = () => read().launchItems.filter((item) => item.name === ownName);
  const safeWrite = (settings) => {
    assert.equal(settings.name, ownName);
    assert.equal(settings.path, options.path);
    assert.deepEqual(settings.args, options.args);
    const before = read();
    const items = before.launchItems.filter((item) => item.name === ownName);
    // v34.5.8 GetArgs() omits switches such as --start-in-tray. Because the
    // random AppUserModelID equals ownName, openAtLogin compares this exact
    // entry's full quoted command (path AND args), including its switches.
    assert.ok(items.length <= 1 && items.every(matches) &&
      (!items.length || before.openAtLogin === true), 'Refuse foreign/conflicting command');
    report.writes.push({ ...settings });
    app.setLoginItemSettings(settings);
    const after = read();
    report.snapshots.push({ phase: 'after-native-write', openAtLogin: after.openAtLogin,
      launchItems: after.launchItems.filter((item) => item.name === ownName) });
  };
  const check = (label, verify) => {
    verify();
    report.checks.push(label);
    console.log(`PASS ${label}`);
  };
  const controllerCheck = (phase, verify) => {
    try { verify(); console.log(`PASS controller ${phase}`); }
    catch (error) {
      report.controllerErrors.push({ phase, error: error.stack || String(error) });
      console.error(`FAIL controller ${phase}: ${error.message}`);
    }
  };
  const snapshot = (phase) => {
    const raw = read();
    report.snapshots.push({ phase, openAtLogin: raw.openAtLogin,
      launchItems: raw.launchItems.filter((item) => item.name === ownName) });
    return raw;
  };
  app.whenReady().then(() => {
    let controller;
    try {
      session.defaultSession.webRequest.onBeforeRequest((_details, callback) => callback({ cancel: true }));
      assert.equal(process.platform, 'win32');
      assert.equal(process.versions.electron, '34.5.8');
      assert.match(process.execPath, /[^\x00-\x7f]/, 'Use actual Unicode workspace executable');
      assert.match(process.execPath, / /, 'Use actual executable path with spaces');
      assert.equal(path.resolve(app.getPath('userData')), path.resolve(profile));
      if (recovery) {
        check('recover only prior fixture exact native command', () => {
          const items = owned();
          assert.equal(items.length, 1);
          assert.ok(matches(items[0]));
          assert.equal(read().openAtLogin, true);
          safeWrite({ ...options, name: ownName, openAtLogin: false, enabled: false });
          assert.equal(owned().length, 0);
        });
        report.ok = true;
        return;
      }
      // Compile only the current production controller in memory. No shared build
      // output changes and no stale compiled controller can satisfy this fixture.
      const sourceFile = path.join(root, 'app/electron/src/focus/startup.ts');
      const source = fs.readFileSync(sourceFile, 'utf8');
      report.sourceSha256 = createHash('sha256').update(source).digest('hex');
      const output = require('esbuild').transformSync(source, { loader: 'ts', format: 'cjs', target: 'node20' });
      const Module = require('node:module');
      const compiled = new Module(sourceFile, module);
      compiled.filename = sourceFile;
      compiled.paths = Module._nodeModulePaths(path.dirname(sourceFile));
      compiled._compile(output.code, sourceFile);
      const { StartupSettings, STARTUP_ARGUMENT, STARTUP_NAME } = compiled.exports;
      assert.equal(STARTUP_ARGUMENT, options.args[0]);
      assert.notEqual(ownName, STARTUP_NAME);
      controller = new StartupSettings({
        getLoginItemSettings: (value) => {
          assert.deepEqual(value, options);
          return app.getLoginItemSettings(value);
        },
        setLoginItemSettings: safeWrite,
      }, { platform: process.platform, packaged: true, executable: process.execPath, name: ownName });
      // packaged:true selects the installed-app policy only. All OS reads/writes
      // below are genuine Electron API calls; this is not a packaged-app test.
      report.actualPackaged = app.isPackaged;
      check('initial random entry absent and controller disabled', () => {
        assert.equal(owned().length, 0);
        assert.equal(snapshot('initial').openAtLogin, false);
        const status = controller.status();
        assert.equal(status.supported, true);
        assert.equal(status.enabled, false);
        assert.equal(status.registered, false);
        assert.equal(status.conflict, false);
      });
      check('enable: quoted Unicode/spaces executable and exact argument read back', () => {
        safeWrite({ ...options, name: ownName, openAtLogin: true, enabled: true });
        const raw = snapshot('enabled');
        assert.equal(raw.openAtLogin, true);
        const items = raw.launchItems.filter((item) => item.name === ownName);
        assert.equal(items.length, 1);
        assert.ok(matches(items[0]));
        assert.equal(items[0].enabled, true);
      });
      controllerCheck('enable/readback', () => {
        const status = controller.configure(true);
        assert.equal(status.enabled, true);
        assert.equal(status.registered, true);
        assert.equal(status.blocked, false);
      });
      check('readback uses same arguments; unrelated arguments do not match openAtLogin', () => {
        assert.equal(app.getLoginItemSettings({ ...options, args: ['--pomo061-unrelated'] }).openAtLogin, false);
        assert.equal(read().openAtLogin, true);
      });
      check('enable is idempotent; fresh controller reads persisted native entry', () => {
        safeWrite({ ...options, name: ownName, openAtLogin: true, enabled: true });
        assert.equal(owned().length, 1);
        assert.equal(read().openAtLogin, true);
        controllerCheck('fresh controller persisted readback', () => {
          const fresh = new StartupSettings(app, { platform: 'win32', packaged: true,
            executable: process.execPath, name: ownName });
          assert.equal(fresh.status().enabled, true);
        });
      });
      check('native enabled:false retains registration and detects Task Manager blocked state', () => {
        safeWrite({ ...options, name: ownName, openAtLogin: true, enabled: false });
        const raw = snapshot('task-manager-disabled');
        assert.equal(raw.openAtLogin, true);
        const items = owned();
        assert.equal(items.length, 1);
        assert.ok(matches(items[0]));
        assert.equal(items[0].enabled, false);
        controllerCheck('Task Manager blocked readback', () => {
          const status = controller.status();
          assert.equal(status.registered, true);
          assert.equal(status.enabled, false);
          assert.equal(status.blocked, true);
          assert.equal(status.conflict, false);
        });
      });
      check('reenable clears native block and restores allowed startup', () => {
        safeWrite({ ...options, name: ownName, openAtLogin: true, enabled: true });
        assert.equal(snapshot('reenabled').launchItems.find(matches).enabled, true);
        controllerCheck('reenable', () => {
          const status = controller.configure(true);
          assert.equal(status.enabled, true);
          assert.equal(status.blocked, false);
        });
      });
      check('disable removes own entry; repeated disable remains successful', () => {
        for (let i = 0; i < 2; i++) {
          safeWrite({ ...options, name: ownName, openAtLogin: false, enabled: false });
          controllerCheck(`disable ${i + 1}`, () => {
            const status = controller.configure(false);
            assert.equal(status.enabled, false);
            assert.equal(status.registered, false);
            assert.equal(status.blocked, false);
          });
          assert.equal(owned().length, 0);
          assert.equal(read().openAtLogin, false);
        }
        snapshot('disabled');
      });
      check('no BrowserWindow or renderer was created', () => {
        assert.equal(BrowserWindow.getAllWindows().length, 0);
        assert.equal(webContents.getAllWebContents().length, 0);
      });
      report.ok = report.controllerErrors.length === 0;
    } catch (error) {
      report.error = error.stack || String(error);
      console.error(report.error);
    } finally {
      try {
        const items = owned();
        if (items.length) {
          assert.equal(items.length, 1, 'Cleanup refuses ambiguous owner');
          assert.ok(matches(items[0]), 'Cleanup refuses mismatched path/scope');
          assert.equal(read().openAtLogin, true, 'Cleanup refuses mismatched full command/args');
          safeWrite({ ...options, name: ownName, openAtLogin: false, enabled: false });
        }
        assert.equal(owned().length, 0, 'Own native entry must be absent after cleanup');
        assert.equal(read().openAtLogin, false);
        report.cleaned = true;
        console.log(`PASS finally cleanup verified absent: ${ownName}`);
      } catch (error) {
        report.ok = false;
        report.cleanupError = error.stack || String(error);
        console.error(report.cleanupError);
      }
      fs.writeFileSync(path.join(run, 'result.json'), JSON.stringify(report, null, 2), 'utf8');
      console.log(`RESULT ${report.ok ? 'PASS' : 'FAIL'} ${report.checks.length}/${recovery ? 1 : 8} native; controllerErrors=${report.controllerErrors.length}; cleaned=${report.cleaned}; Electron=${report.electron}`);
      app.exit(report.ok && report.cleaned ? 0 : 1);
    }
  }).catch((error) => { console.error(error); app.exit(1); });
}
