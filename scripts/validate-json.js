const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const files = [];
const visit = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(target);
    else if (entry.name.endsWith(".json")) files.push(target);
  }
};

visit(root);
for (const file of files) {
  try { JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) {
    console.error(`${path.relative(root, file)}: ${error.message}`);
    process.exitCode = 1;
  }
}
if (!process.exitCode) console.log(`Validated ${files.length} JSON files`);
