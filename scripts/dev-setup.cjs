const path = require("node:path");
const { git } = require("./repo-sync.cjs");
const root = path.resolve(__dirname, "..");
const current = git(root, ["config", "--get", "core.hooksPath"], true).stdout.trim();
if (current && current !== ".githooks") throw new Error("Existing hooks found. Integrate them explicitly; do not overwrite.");
git(root, ["config", "--local", "core.hooksPath", ".githooks"]);
console.log("Repository pre-push check installed. Run check:sync before each handoff.");
