const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const backupRoot = path.join(projectRoot, "backups");
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const destination = path.join(backupRoot, `${timestamp}-v${packageJson.version}`);
const excludedEntries = new Set([".git", "backups", "node_modules"]);

fs.mkdirSync(destination, { recursive: true });

for (const entry of fs.readdirSync(projectRoot, { withFileTypes: true })) {
  if (excludedEntries.has(entry.name)) {
    continue;
  }

  fs.cpSync(
    path.join(projectRoot, entry.name),
    path.join(destination, entry.name),
    { recursive: true, dereference: false }
  );
}

console.log(`Backup created: ${path.relative(projectRoot, destination)}`);