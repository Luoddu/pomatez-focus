const { spawnSync } = require("node:child_process");
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const root = path.resolve(__dirname, "..");
const env = { ...process.env, POMATEZ_HEADLESS: "1", POMATEZ_PROFILE: fs.mkdtempSync(path.join(os.tmpdir(), "pomo-rest-window-")) };
delete env.ELECTRON_RUN_AS_NODE;
const result = spawnSync(require("electron"), [path.join(root, "tests/rest-reminder-desktop.cjs"), "--mute-audio"],
  { cwd: root, env, windowsHide: true, stdio: "inherit", timeout: 45000 });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
