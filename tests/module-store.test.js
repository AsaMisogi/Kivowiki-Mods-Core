const assert = require("node:assert/strict");
const test = require("node:test");

require("../platform.js");
require("../module-store.js");

const store = globalThis.KivowikiModsStore;

const makeFolderFile = (path, content, type = "text/javascript") => {
  const file = new File([content], path.split("/").pop(), { type });
  Object.defineProperty(file, "webkitRelativePath", { value: `package/${path}` });
  return file;
};

test("文件夹导入会保留相对路径并识别最外层清单", async () => {
  const manifest = JSON.stringify({
    manifestVersion: 4,
    type: "module",
    id: "folder-example",
    name: "Kivowiki-Mods-folder-example",
    version: "1.0.0",
    entry: "src/index.js",
    permissions: []
  });
  const inspection = await store.inspectPackage([
    makeFolderFile("module.json", manifest, "application/json"),
    makeFolderFile("src/index.js", "({ mount() {} })"),
    makeFolderFile("src/styles.css", ".folder-example {}", "text/css")
  ]);
  assert.equal(inspection.manifest.id, "folder-example");
  assert.deepEqual([...inspection.fileMap.keys()].sort(), ["module.json", "src/index.js", "src/styles.css"]);
  assert.equal(inspection.manifest.entry, "src/index.js");
});

test("远程市场源必须声明受支持的索引格式", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ format: "wrong", version: 1 }), { status: 200 });
  try {
    await assert.rejects(() => store.fetchRemoteJson("https://example.com/mods.json"), /索引格式或版本不受支持/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GitHub 市场发现会验证清单和入口文件", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes("search/repositories")) return new Response(JSON.stringify({ total_count: 1, items: [{ name: "demo", full_name: "author/demo", owner: { login: "author" }, default_branch: "main", stargazers_count: 9, created_at: "2026-01-01", updated_at: "2026-02-01", archived: false, disabled: false, fork: false }] }), { status: 200 });
    if (String(url).includes("git/trees")) return new Response(JSON.stringify({ truncated: false, tree: [{ type: "blob", path: "module.json" }, { type: "blob", path: "index.js" }] }), { status: 200 });
    if (String(url).includes("contents/module.json")) return new Response(JSON.stringify({ type: "file", encoding: "base64", content: Buffer.from(JSON.stringify({ manifestVersion: 4, type: "module", id: "demo", name: "Kivowiki-Mods-demo", version: "1.0.0", entry: "index.js", permissions: [] })).toString("base64") }), { status: 200 });
    throw new Error(`unexpected URL ${url}`);
  };
  try {
    const result = await store.discoverGitHubPackages({ query: "demo", refresh: true });
    assert.equal(result.items[0].id, "demo");
    assert.equal(result.items[0].stars, 9);
    assert.ok(calls.some((url) => url.includes("git/trees")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
