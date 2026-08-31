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
  assert.match(optionsJs, /marketExploreButton\.addEventListener\("click", \(\) => searchMarket\(\{ force: true, page: 1 \}\)/);
  assert.match(optionsJs, /if \(!marketHasLoaded\).*请先点击“探索发现”/s);
  assert.match(optionsJs, /marketSearchInput\.addEventListener\("input".*searchMarket\(\{ page: 1 \}\)/s);
  assert.doesNotMatch(optionsJs, /marketSortInput\.addEventListener\("change".*force: true/s);
});

test("编辑精选内置 beautify 且展示时不发起网络请求", () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, "recommendations.js"), "utf8"), context);
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.KivowikiModsRecommendations)),
    [{
      id: "beautify",
      title: "Kivowiki-Mods-beautify",
      description: "为 KivoWiki 提供组件动效、页面主题、首页布局、昼夜背景和字体自定义。",
      repository: "https://github.com/AsaMisogi/Kivowiki-Mods-beautify",
      version: "1.5.2",
      type: "module"
    }]
  );
  assert.doesNotMatch(fs.readFileSync(path.join(root, "recommendations.js"), "utf8"), /fetch\s*\(/);
});

test("Core、推荐和已安装包都提供仓库入口", () => {
  assert.match(optionsHtml, /id="core-repository-link"[^>]+Kivowiki-Mods-Core/);
  assert.match(optionsJs, /createRepositoryLink\(item\.repository\)/);
  assert.match(optionsJs, /getRepositoryUrl\(module\.source\)/);
  assert.match(optionsJs, /module-repository-link/);
  assert.match(optionsJs, /noopener noreferrer/);
});

test("市场不再调用 GitHub REST Search API", () => {
  const moduleStoreJs = fs.readFileSync(path.join(root, "module-store.js"), "utf8");
  assert.match(moduleStoreJs, /https:\/\/github\.com\/topics\/kivowiki-mods/);
  assert.doesNotMatch(moduleStoreJs, /api\.github\.com\/search\/repositories/);
  assert.doesNotMatch(moduleStoreJs, /api\.github\.com\/repos\//);
});

test("远程安装展示下载、进度、取消和失败状态", () => {
  for (const id of ["download-modal", "download-title", "download-status", "download-progress", "download-detail", "download-cancel", "download-close"]) {
    assert.match(optionsHtml, new RegExp(`id="${id}"`));
  }
  assert.match(optionsJs, /runRemoteInstallation/);
  assert.match(optionsJs, /onProgress: setDownloadProgress/);
  assert.match(optionsJs, /DOWNLOAD_TIMEOUT/);
  assert.match(optionsJs, /activeRemoteInstall\.controller\.abort\(\)/);
  assert.match(optionsJs, /下载完成，正在执行安装预检/);
});
