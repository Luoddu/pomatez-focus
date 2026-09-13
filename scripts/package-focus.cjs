const { spawnSync } = require("node:child_process");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const result = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules/electron-builder/out/cli/cli.js"),
    "--win",
    "portable",
    "nsis",
    "--x64",
    "--publish",
    "never",
    // Focus has no production npm dependencies; package the already-built app.
    // Avoid reinstalling the unrelated upstream workspace dependency graph.
    "--config.npmRebuild=false",
    `--config.electronDist=${path.join(
      root,
      "node_modules/electron/dist"
    )}`,
  ],
  {
    cwd: path.join(root, "app/electron"),
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: "false" },
  }
);
if (result.error) throw result.error;
process.exit(result.status === null ? 1 : result.status);
