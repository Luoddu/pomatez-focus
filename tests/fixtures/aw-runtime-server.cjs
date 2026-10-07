// Synthetic collector endpoint; no user input/window/history collection.
const http = require("node:http"),
  fs = require("node:fs");
const [portFile, stopFile] = process.argv.slice(2);
const server = http.createServer((req, res) => {
  if (req.url !== "/api/0/info") {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({ hostname: "SYNTHETIC", version: "fixture" })
  );
});
server.listen(0, "127.0.0.1", () =>
  fs.writeFileSync(portFile, String(server.address().port))
);
const timer = setInterval(() => {
  if (fs.existsSync(stopFile)) {
    clearInterval(timer);
    server.close(() => process.exit(0));
  }
}, 30);
setTimeout(() => process.exit(2), 15000).unref();
