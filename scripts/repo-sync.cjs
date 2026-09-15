// The public branch, not a cached origin ref or a version number, is the baseline.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const REMOTE = "origin";
const BRANCH = "codex/feishu-focus";
function git(root, args, allowFailure = false) {
  const result = spawnSync("git", args, {
    cwd: root, encoding: "utf8", windowsHide: true, timeout: 30000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
  });
  if (result.error || (result.status !== 0 && !allowFailure))
    throw new Error(`Git check failed (${args[0]}). Cannot verify the public baseline; stop and check connectivity. ${result.error?.message || result.stderr}`);
  return result;
}
function remoteState(root) {
  const lines = git(root, ["ls-remote", "--heads", "--tags", REMOTE]).stdout.trim().split(/\r?\n/);
  const ref = `refs/heads/${BRANCH}`;
  const head = lines.find((line) => line.split(/\s+/)[1] === ref)?.split(/\s+/)[0];
  if (!head || !/^[a-f0-9]{40}$/.test(head)) throw new Error(`Missing public branch ${REMOTE}/${BRANCH}`);
  const tags = lines.map((line) => line.split(/\s+/)[1]).filter(Boolean);
  const previews = tags.map((tag) => /^refs\/tags\/v0\.1\.0-preview\.(\d+)$/.exec(tag))
    .filter(Boolean).map((m) => Number(m[1]));
  return { head, previews, maxPreview: Math.max(0, ...previews) };
}
function assertReady(root, { requireClean = false, requireNewVersion = false } = {}) {
  const remote = remoteState(root);
  const head = git(root, ["rev-parse", "HEAD"]).stdout.trim();
  const ancestry = git(root, ["merge-base", "--is-ancestor", remote.head, head], true);
  if (ancestry.status !== 0)
    throw new Error(`Public baseline ${remote.head.slice(0, 12)} is not included. Run git fetch origin --tags, then integrate ${REMOTE}/${BRANCH} and retest; changing the version is insufficient.`);
  const dirty = Boolean(git(root, ["status", "--porcelain"]).stdout.trim());
  if (requireClean && dirty) throw new Error("Uncommitted changes: save and verify the complete source before packaging or pushing.");
  const version = JSON.parse(fs.readFileSync(path.join(root, "app/electron/package.json"), "utf8")).version;
  const match = /^0\.1\.0-preview\.(\d+)$/.exec(version);
  if (requireNewVersion && (!match || Number(match[1]) <= remote.maxPreview))
    throw new Error(`Version ${version} is already reserved or older than public preview.${remote.maxPreview}. Prepare a new version before building.`);
  return { head, remoteHead: remote.head, version, dirty, maxPreview: remote.maxPreview };
}
function assertBuild(root, state) {
  const file = path.join(root, "artifacts/focus-build.json");
  if (!fs.existsSync(file)) throw new Error("Build provenance missing: run npm run build:focus after committing.");
  const built = JSON.parse(fs.readFileSync(file, "utf8"));
  if (built.head !== state.head || built.version !== state.version || built.dirty)
    throw new Error("Build does not match clean HEAD/version. Rebuild before packaging.");
}
if (require.main === module) {
  try {
    const root = path.resolve(__dirname, "..");
    const state = assertReady(root, { requireClean: process.argv.includes("--release"), requireNewVersion: process.argv.includes("--release") });
    console.log(JSON.stringify(state, null, 2));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { git, remoteState, assertReady, assertBuild, BRANCH, REMOTE };
