const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { assertNoExistingArtifact } = require("./next-version.cjs");
const { assertReady, assertBuild } = require("./repo-sync.cjs");
const root = path.resolve(__dirname, "..");
try {
  const state = assertReady(root, { requireClean: true, requireNewVersion: true });
  assertBuild(root, state);
  assertNoExistingArtifact(root, Number(state.version.split(".").pop()));
  console.log(`Verified release source ${state.head} (${state.version})`);
} catch (e) {
  console.error(`version guardrail: ${e.message}`);
  process.exit(1);
}
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
