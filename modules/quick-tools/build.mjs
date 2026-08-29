import { build } from "esbuild";
import { writeFile } from "node:fs/promises";

const common = {
  bundle: true,
  format: "iife",
  target: "es2020",
  charset: "ascii",
  legalComments: "none",
  sourcemap: false,
  logLevel: "info"
};

await build({ ...common, entryPoints: ["src/entry.ts"], outfile: "src/index.js" });

// 配置沙箱要求整个文件是一个返回 { mount } 的 JavaScript 表达式。
// esbuild 的 IIFE 是普通脚本，因此先以内存产物输出，再包成表达式。
const config = await build({
  ...common,
  entryPoints: ["src/config-entry.ts"],
  globalName: "KivoQuickToolsConfigBundle",
  write: false
});
const configBundle = config.outputFiles[0].text;
await writeFile(
  "src/config.js",
  `(() => {\n${configBundle}\nreturn KivoQuickToolsConfigBundle.default;\n})()\n`,
  "utf8"
);
