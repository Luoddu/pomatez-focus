const fs = require("node:fs"), path = require("node:path");
const { spawnSync } = require("node:child_process");
const { assertReady, assertBuild, git } = require("./repo-sync.cjs");
const root = path.resolve(__dirname, "..");
const config = require("../app/electron/electron-builder/mac-personal.cjs");
const version = config.extraMetadata.version;
if (process.platform !== "darwin" || process.arch !== "arm64") throw Error("Native Apple Silicon macOS runner required");
if (!/^0\.1\.0-mac\.[1-9]\d*$/.test(version)) throw Error("Mac channel/version required");
const state = assertReady(root, { requireClean: true });
const tags = git(root, ["ls-remote", "--tags", "origin", `refs/tags/v${version}`]).stdout.trim();
if (tags) throw Error("Mac tag already exists; never overwrite a release");
function run(args, cwd = root, env = {}) {
  const result = spawnSync(process.execPath, args, {cwd, stdio: "inherit", env: {...process.env, ...env}});
  if (result.error || result.status !== 0) throw result.error || Error(`Command failed: ${args[0]}`);
}
run(["scripts/build-focus.cjs"], root, {REACT_APP_MAC_VERSION: version});
assertBuild(root, state);
// Record both source Windows version and independently shipped Mac snapshot.
fs.writeFileSync(path.join(root, "app/electron/build/mac-release.json"), JSON.stringify({
  version, sourceVersion: state.version, sourceCommit: state.head,
  platform: "darwin", arch: "arm64", signing: "ad-hoc; not notarized",
}, null, 2));
run([path.join(root, "node_modules/electron-builder/out/cli/cli.js"),
  "--config", "electron-builder/mac-personal.cjs", "--mac", "--arm64", "--publish", "never"],
  path.join(root, "app/electron"), {CSC_IDENTITY_AUTO_DISCOVERY: "false"});
