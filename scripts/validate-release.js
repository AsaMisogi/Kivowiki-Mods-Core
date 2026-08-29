const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const moduleManifest = JSON.parse(fs.readFileSync(path.join(root, "modules/quick-tools/module.json"), "utf8"));
const dependencyManifest = JSON.parse(fs.readFileSync(path.join(root, "dependencies/core-runtime/dependency.json"), "utf8"));
const failures = [];

if (manifest.version !== "1.4.0") failures.push("扩展版本不是 1.4.0");
if (moduleManifest.version !== "2.3.0") failures.push("quick-tools 版本不是 2.3.0");
if (dependencyManifest.version !== "1.1.0") failures.push("core-runtime 版本不是 1.1.0");
if (moduleManifest.manifestVersion !== 4 || dependencyManifest.manifestVersion !== 4) failures.push("内置包没有使用清单 v4");
if (moduleManifest.files.some((file) => file.includes("node_modules") || file.includes("character-atlas"))) failures.push("quick-tools 发布文件包含开发依赖或旧图鉴");
for (const file of moduleManifest.files) if (!fs.existsSync(path.join(root, "modules/quick-tools", file))) failures.push(`quick-tools 清单文件不存在：${file}`);
const quickToolsBytes = moduleManifest.files.reduce((total, file) => total + fs.statSync(path.join(root, "modules/quick-tools", file)).size, 0);
if (quickToolsBytes > 1024 * 1024) failures.push(`quick-tools 发布文件超过 1 MiB：${quickToolsBytes}`);
if (!dependencyManifest.exports?.request || !dependencyManifest.exports?.listAll) failures.push("core-runtime 缺少强类型导出契约");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`发布结构有效，quick-tools 声明文件 ${(quickToolsBytes / 1024).toFixed(1)} KiB`);
