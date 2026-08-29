const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const moduleRoot = path.join(root, "modules", "Kivowiki-Mods-quick-tools");
const npmCli = process.env.npm_execpath;

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} 失败，退出码 ${result.status}`);
};
const runNpm = (args, cwd) => {
  if (process.platform === "win32") {
    const result = spawnSync("npm.cmd", args, { cwd, stdio: "inherit", shell: true });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`npm ${args.join(" ")} 失败，退出码 ${result.status}`);
    return;
  }
  if (!npmCli) throw new Error("无法定位当前 npm CLI");
  run(process.execPath, [npmCli, ...args], cwd);
};

let failed = null;
try {
  // 构建依赖不属于扩展发布内容，只在验证期间临时恢复。
  runNpm(["ci"], moduleRoot);
  runNpm(["run", "build"], moduleRoot);
  const testFiles = fs.readdirSync(path.join(root, "tests"))
    .filter((file) => file.endsWith(".test.js"))
    .map((file) => path.join("tests", file));
  run(process.execPath, ["--test", ...testFiles], root);
  run(process.execPath, ["scripts/validate-release.js"], root);
} catch (error) {
  failed = error;
} finally {
  try {
    // 无论验证成功与否都清理开发工具，防止它们进入 Git 或浏览器商店包。
    runNpm(["prune", "--omit=dev"], moduleRoot);
  } catch (cleanupError) {
    failed ||= cleanupError;
  }
}

if (failed) {
  console.error(failed.message);
  process.exit(1);
}
