const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const QUICK_TOOLS_ROOT = "modules/Kivowiki-Mods-quick-tools";
const moduleManifest = JSON.parse(fs.readFileSync(path.join(root, QUICK_TOOLS_ROOT, "module.json"), "utf8"));
const dependencyManifest = JSON.parse(fs.readFileSync(path.join(root, "dependencies/core-runtime/dependency.json"), "utf8"));
const failures = [];
const expectedQuickToolsEntry = `${QUICK_TOOLS_ROOT}/src/index.js`;

if (manifest.version !== "1.6.0") failures.push("扩展版本不是 1.6.0");
if (moduleManifest.version !== "2.3.2") failures.push("quick-tools 版本不是 2.3.2");
if (dependencyManifest.version !== "1.1.0") failures.push("core-runtime 版本不是 1.1.0");
if (!manifest.content_scripts?.some((script) => script.js?.includes(expectedQuickToolsEntry))) failures.push("manifest.json 未加载 quick-tools 内置入口");
for (const file of ["options.html", "popup.html"]) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  if (!html.includes(expectedQuickToolsEntry)) failures.push(`${file} 未加载 quick-tools 内置入口`);
  if (html.includes("modules/quick-tools/src/index.js")) failures.push(`${file} 仍引用旧 quick-tools 路径`);
}
const optionsHtml = fs.readFileSync(path.join(root, "options.html"), "utf8");
for (const id of ["market-search", "market-sort", "market-refresh-button", "market-prev", "market-next", "market-source-url", "market-results", "recommendation-list", "manager-tab-visible", "market-auto-load", "import-folder", "import-folder-button", "import-dependency-folder-button"]) {
  if (!optionsHtml.includes(`id="${id}"`)) failures.push(`options.html 缺少 ${id} 控件`);
}
if (optionsHtml.includes("id=\"export-lockfile\"")) failures.push("options.html 仍保留无必要的导出锁文件按钮");
if (!Array.isArray(manifest.optional_host_permissions) || !manifest.optional_host_permissions.includes("https://*/*")) failures.push("manifest.json 缺少自定义市场源所需的可选 HTTPS 权限");
for (const tab of ["modules", "dependencies", "market", "settings"]) {
  if (!optionsHtml.includes(`data-tab-target="${tab}"`) || !optionsHtml.includes(`data-tab-panel="${tab}"`)) failures.push(`options.html 缺少 ${tab} 标签页`);
}
if (moduleManifest.manifestVersion !== 4 || dependencyManifest.manifestVersion !== 4) failures.push("内置包没有使用清单 v4");
if (moduleManifest.files.some((file) => file.includes("node_modules") || file.includes("character-atlas"))) failures.push("quick-tools 发布文件包含开发依赖或旧图鉴");
for (const file of moduleManifest.files) if (!fs.existsSync(path.join(root, QUICK_TOOLS_ROOT, file))) failures.push(`quick-tools 清单文件不存在：${file}`);
if (!fs.existsSync(path.join(root, "recommendations.js"))) failures.push("缺少 recommendations.js 推荐配置文件");
const quickToolsBytes = moduleManifest.files.reduce((total, file) => total + fs.statSync(path.join(root, QUICK_TOOLS_ROOT, file)).size, 0);
if (quickToolsBytes > 1024 * 1024) failures.push(`quick-tools 发布文件超过 1 MiB：${quickToolsBytes}`);
if (!dependencyManifest.exports?.request || !dependencyManifest.exports?.listAll) failures.push("core-runtime 缺少强类型导出契约");
if (/new Function\s*\(/.test(fs.readFileSync(path.join(root, "content.js"), "utf8"))) failures.push("content.js 不能使用 new Function 执行导入代码，违反 MV3 CSP");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`发布结构有效，quick-tools 声明文件 ${(quickToolsBytes / 1024).toFixed(1)} KiB`);
