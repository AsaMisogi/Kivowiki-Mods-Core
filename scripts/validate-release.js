const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const packageManifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const platformSource = fs.readFileSync(path.join(root, "platform.js"), "utf8");
const QUICK_TOOLS_ROOT = "modules/Kivowiki-Mods-quick-tools";
const moduleManifest = JSON.parse(fs.readFileSync(path.join(root, QUICK_TOOLS_ROOT, "module.json"), "utf8"));
const quickToolsSource = fs.readFileSync(path.join(root, QUICK_TOOLS_ROOT, "src/index.js"), "utf8");
const dependencyManifest = JSON.parse(fs.readFileSync(path.join(root, "dependencies/core-runtime/dependency.json"), "utf8"));
const failures = [];
const expectedQuickToolsEntry = `${QUICK_TOOLS_ROOT}/src/index.js`;

if (manifest.version !== "1.6.1") failures.push("扩展版本不是 1.6.1");
if (packageManifest.version !== manifest.version) failures.push("package.json 与扩展版本不一致");
if (!platformSource.includes(`const MANAGER_VERSION = "${manifest.version}"`)) failures.push("platform.js 与扩展版本不一致");
if (moduleManifest.version !== "2.3.2") failures.push("quick-tools 版本不是 2.3.2");
if (!quickToolsSource.includes(".kq-toolbar") || !quickToolsSource.includes("pointer-events: auto")) failures.push("quick-tools 工具栏没有恢复 pointer-events 交互");
if (dependencyManifest.version !== "1.1.0") failures.push("core-runtime 版本不是 1.1.0");
if (!manifest.content_scripts?.some((script) => script.js?.includes(expectedQuickToolsEntry))) failures.push("manifest.json 未加载 quick-tools 内置入口");
for (const file of ["options.html", "popup.html"]) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  if (!html.includes(expectedQuickToolsEntry)) failures.push(`${file} 未加载 quick-tools 内置入口`);
  if (html.includes("modules/quick-tools/src/index.js")) failures.push(`${file} 仍引用旧 quick-tools 路径`);
}
const optionsHtml = fs.readFileSync(path.join(root, "options.html"), "utf8");
const optionsJs = fs.readFileSync(path.join(root, "options.js"), "utf8");
const recommendationsSource = fs.readFileSync(path.join(root, "recommendations.js"), "utf8");
for (const id of ["market-search", "market-sort", "market-explore-button", "market-refresh-button", "market-prev", "market-next", "market-source-url", "market-results", "recommendation-list", "manager-tab-visible", "import-folder", "import-folder-button", "import-dependency-folder-button"]) {
  if (!optionsHtml.includes(`id="${id}"`)) failures.push(`options.html 缺少 ${id} 控件`);
}
if (optionsHtml.includes("id=\"export-lockfile\"")) failures.push("options.html 仍保留无必要的导出锁文件按钮");
if (!optionsHtml.includes(`>v${manifest.version} <span aria-hidden="true">↗</span></a>`)) failures.push("options.html 的静态版本兜底与扩展版本不一致");
if (optionsHtml.includes("market-auto-load") || optionsJs.includes("autoLoadMarket")) failures.push("市场仍包含自动 GitHub 发现入口");
if (optionsJs.includes('if (target === "market")') || !optionsJs.includes('marketExploreButton.addEventListener("click"')) failures.push("GitHub 探索没有严格绑定到用户主动操作");
if (!recommendationsSource.includes("https://github.com/AsaMisogi/Kivowiki-Mods-beautify")) failures.push("编辑精选缺少 beautify 推荐模块");
if (!Array.isArray(manifest.optional_host_permissions) || !manifest.optional_host_permissions.includes("https://*/*")) failures.push("manifest.json 缺少自定义市场源所需的可选 HTTPS 权限");
if (!manifest.host_permissions?.includes("https://github.com/*")) failures.push("manifest.json 缺少 GitHub 默认分支归档入口权限");
if (!manifest.host_permissions?.includes("https://raw.githubusercontent.com/*")) failures.push("manifest.json 缺少 GitHub 根目录包静态验证所需权限");
if (manifest.host_permissions?.includes("https://api.github.com/*")) failures.push("manifest.json 仍保留已停用的 GitHub REST API 权限");
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
