const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const optionsHtml = fs.readFileSync(path.join(root, "options.html"), "utf8");
const optionsJs = fs.readFileSync(path.join(root, "options.js"), "utf8");

test("市场只在用户主动探索后请求 GitHub", () => {
  assert.match(optionsHtml, /id="market-explore-button"[^>]*>.*探索发现/s);
  assert.doesNotMatch(optionsHtml, /market-auto-load/);
  assert.doesNotMatch(optionsJs, /autoLoadMarket/);
  assert.doesNotMatch(optionsJs, /if \(target === "market"\)/);
  assert.match(optionsJs, /marketExploreButton\.addEventListener\("click", \(\) => searchMarket/);
  assert.match(optionsJs, /if \(!marketHasLoaded\).*请先点击“探索发现”/s);
});

test("编辑精选内置 beautify 且展示时不发起网络请求", () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, "recommendations.js"), "utf8"), context);
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.KivowikiModsRecommendations)),
    [{
      title: "Kivowiki-Mods-beautify",
      description: "为 KivoWiki 提供组件动效、页面主题、首页布局、昼夜背景和字体自定义。",
      repository: "https://github.com/AsaMisogi/Kivowiki-Mods-beautify",
      type: "module"
    }]
  );
  assert.doesNotMatch(fs.readFileSync(path.join(root, "recommendations.js"), "utf8"), /fetch\s*\(/);
});
