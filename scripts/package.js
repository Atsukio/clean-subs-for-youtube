// Builds clean-subs-for-youtube-<version>.zip containing only the files
// the extension needs. Uses `tar` on Windows and
// `zip` elsewhere, so no extra npm dependencies are required.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const out = path.join(root, `clean-subs-for-youtube-${manifest.version}.zip`);
const files = ["manifest.json", "content.js", "styles.css", "icons"];

for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) throw new Error(`Missing ${f}`);
}
fs.rmSync(out, { force: true });

if (process.platform === "win32") {
  // Windows ships bsdtar, which writes a zip with forward-slash paths
  // (Compress-Archive in PowerShell 5.1 uses backslashes).
  const tar = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe");
  execFileSync(tar, ["-a", "-cf", out, ...files], { cwd: root, stdio: "inherit" });
} else {
  execFileSync("zip", ["-r", out, ...files], { cwd: root, stdio: "inherit" });
}
console.log(`Created ${path.basename(out)}`);
