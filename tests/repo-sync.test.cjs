// Governance fixtures only: isolated local repositories, no GitHub writes.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { assertReady, assertBuild, BRANCH } = require("../scripts/repo-sync.cjs");
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "farm-sync-"));
  const remote = path.join(dir, "remote.git"), a = path.join(dir, "a"), b = path.join(dir, "b");
  const git = (cwd, ...args) => {
    const r = spawnSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", ...args], { cwd, encoding: "utf8", windowsHide: true });
    assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
  };
  git(dir, "init", "--bare", remote); git(dir, "clone", remote, a);
  git(a, "checkout", "-b", BRANCH);
  fs.mkdirSync(path.join(a, "app/electron"), { recursive: true });
  fs.writeFileSync(path.join(a, "app/electron/package.json"), '{"version":"0.1.0-preview.26"}');
  git(a, "add", "app/electron/package.json"); git(a, "commit", "-m", "fixture baseline");
  git(a, "tag", "v0.1.0-preview.24"); git(a, "push", "origin", BRANCH, "--tags");
  git(dir, "clone", "--branch", BRANCH, remote, b);
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { a, b, remote, git };
}
test("fresh canonical ancestor and unused version pass; dirty source does not", (t) => {
  const { a } = fixture(t);
  assert.equal(assertReady(a, { requireClean: true, requireNewVersion: true }).dirty, false);
  fs.writeFileSync(path.join(a, "uncommitted.txt"), "work");
  assert.throws(() => assertReady(a, { requireClean: true }), /Uncommitted/);
  assert.equal(assertReady(a).dirty, true); // read-only developer check still works
});
test("stale origin cache and higher local version cannot hide another machine's commit", (t) => {
  const { a, b, git } = fixture(t);
  const cached = git(a, "rev-parse", `origin/${BRANCH}`);
  git(b, "commit", "--allow-empty", "-m", "other machine"); git(b, "push", "origin", BRANCH);
  assert.equal(git(a, "rev-parse", `origin/${BRANCH}`), cached);
  assert.throws(() => assertReady(a), /not included/);
  git(a, "fetch", "origin");
  assert.throws(() => assertReady(a), /not included/); // fetching alone is insufficient
  git(a, "merge", "--ff-only", `origin/${BRANCH}`);
  assertReady(a, { requireClean: true, requireNewVersion: true });
});
test("diverged local work is refused; native merge retaining both lines passes", (t) => {
  const { a, b, git } = fixture(t);
  git(a, "commit", "--allow-empty", "-m", "local feature");
  git(b, "commit", "--allow-empty", "-m", "remote feature"); git(b, "push", "origin", BRANCH);
  git(a, "fetch", "origin"); assert.throws(() => assertReady(a), /not included/);
  git(a, "merge", "--no-edit", `origin/${BRANCH}`); assertReady(a, { requireClean: true });
});
test("live tag collisions are refused; a new manifest remains valid", (t) => {
  const { a, b, git } = fixture(t);
  git(b, "tag", "v0.1.0-preview.26"); git(b, "push", "origin", "v0.1.0-preview.26");
  assert.throws(() => assertReady(a, { requireNewVersion: true }), /already reserved/);
  fs.writeFileSync(path.join(a, "app/electron/package.json"), '{"version":"0.1.0-preview.27"}');
  assertReady(a, { requireNewVersion: true });
});
test("unreachable remote cannot silently fall back to a stale cache", (t) => {
  const { a, remote, git } = fixture(t);
  git(a, "remote", "set-url", "origin", `${remote}-missing`);
  assert.throws(() => assertReady(a), /Cannot verify/);
  git(a, "remote", "set-url", "origin", remote); assertReady(a);
});
test("version preparation keeps a fresh number but counts equal-number branches and artifacts", (t) => {
  const { a, git } = fixture(t);
  const { nextVersion } = require("../scripts/next-version.cjs");
  assert.equal(nextVersion(a).next, 26);
  git(a, "branch", "other-delivery");
  assert.equal(nextVersion(a).next, 27);
  git(a, "branch", "-d", "other-delivery");
  fs.mkdirSync(path.join(a, "app/electron/dist"), { recursive: true });
  fs.writeFileSync(path.join(a, "app/electron/dist/preview.26.exe"), "fixture");
  assert.equal(nextVersion(a).next, 27);
});
test("missing, stale, dirty and wrong-version builds fail; matching clean provenance passes", (t) => {
  const { a } = fixture(t), state = assertReady(a);
  assert.throws(() => assertBuild(a, state), /missing/);
  fs.mkdirSync(path.join(a, "artifacts"));
  const write = (v) => fs.writeFileSync(path.join(a, "artifacts/focus-build.json"), JSON.stringify(v));
  for (const change of [{ dirty: true }, { head: "old" }, { version: "0.1.0-preview.25" }]) {
    write({ ...state, ...change }); assert.throws(() => assertBuild(a, state), /does not match/);
  }
  write(state); assertBuild(a, state);
});
