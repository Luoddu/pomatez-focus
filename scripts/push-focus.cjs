const path = require("node:path");
const { assertReady, git, remoteState, BRANCH, REMOTE } = require("./repo-sync.cjs");
const root = path.resolve(__dirname, "..");
try {
  const state = assertReady(root, { requireClean: true });
  // Native non-force push rejects another machine advancing the branch meanwhile.
  const result = git(root, ["push", REMOTE, `${state.head}:refs/heads/${BRANCH}`]);
  process.stdout.write(result.stdout + result.stderr);
  if (remoteState(root).head !== state.head) throw new Error("Remote changed after push; inspect before publishing a release.");
  console.log(`Verified public source: ${state.head}`);
} catch (e) { console.error(e.message); process.exitCode = 1; }
