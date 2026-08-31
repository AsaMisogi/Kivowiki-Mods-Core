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

test("GitHub 市场通过 Topic 和原始文件验证根目录包", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url) === "https://github.com/topics/kivowiki-mods") return new Response('<a data-hovercard-type="repository" data-hovercard-url="/author/demo/hovercard" href="/author/demo">demo</a>', { status: 200 });
    if (String(url).endsWith("/HEAD/module.json")) return new Response(JSON.stringify({ manifestVersion: 4, type: "module", id: "demo", name: "Kivowiki-Mods-demo", version: "1.0.0", entry: "index.js", permissions: [] }), { status: 200 });
    if (String(url).endsWith("/HEAD/index.js")) return new Response(null, { status: 200 });
    throw new Error(`unexpected URL ${url}`);
  };
  try {
    const result = await store.discoverGitHubPackages({ query: "demo", refresh: true });
    assert.equal(result.items[0].id, "demo");
    assert.equal(result.items[0].repository, "https://github.com/author/demo");
    assert.equal(calls.some((url) => url.includes("api.github.com")), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GitHub 仓库导入不依赖 REST API 额度", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const response = new Response(new Blob(["zip"]), { status: 200, headers: { "content-type": "application/zip" } });
    Object.defineProperty(response, "url", { value: "https://codeload.github.com/author/demo/zip/0123456789abcdef0123456789abcdef01234567" });
    return response;
  };
  try {
    const file = await store.fetchRepositoryPackage("https://github.com/author/demo.git");
    assert.equal(file.name, "demo-HEAD.zip");
    assert.equal(file.kivowikiSource.repository, "https://github.com/author/demo");
    assert.equal(file.kivowikiSource.branch, "HEAD");
    assert.equal(file.kivowikiSource.commit, "0123456789abcdef0123456789abcdef01234567");
    assert.deepEqual(calls, ["https://github.com/author/demo/archive/HEAD.zip"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("远程包下载按实际字节报告确定进度", async () => {
  const originalFetch = globalThis.fetch;
  const progress = [];
  globalThis.fetch = async () => new Response(new Blob(["1234", "5678"]), {
    status: 200,
    headers: { "content-type": "application/zip", "content-length": "8" }
  });
  try {
    const file = await store.fetchPackageUrl("https://downloads.example/demo.zip", {}, {
      onProgress: (value) => progress.push(value)
    });
    assert.equal(file.size, 8);
    assert.equal(progress[0].phase, "connecting");
    assert.equal(progress.at(-1).loaded, 8);
    assert.equal(progress.at(-1).total, 8);
    const loaded = progress.filter((item) => item.phase === "downloading").map((item) => item.loaded);
    assert.deepEqual(loaded, loaded.slice().sort((left, right) => left - right));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("远程包没有总大小时仍报告已下载字节", async () => {
  const originalFetch = globalThis.fetch;
  const progress = [];
  globalThis.fetch = async () => new Response(new Blob(["package"]), {
    status: 200,
    headers: { "content-type": "application/zip" }
  });
  try {
    const file = await store.fetchPackageUrl("https://downloads.example/demo.zip", {}, {
      onProgress: (value) => progress.push(value)
    });
    assert.equal(file.size, 7);
    assert.equal(progress.at(-1).loaded, 7);
    assert.equal(progress.at(-1).total, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("远程包下载可取消并返回独立错误代码", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
  });
  const controller = new AbortController();
  try {
    const request = store.fetchPackageUrl("https://downloads.example/demo.zip", {}, { signal: controller.signal });
    controller.abort();
    await assert.rejects(request, (error) => error.code === "DOWNLOAD_ABORTED");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("远程包下载超时返回独立错误代码", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
  });
  try {
    await assert.rejects(
      () => store.fetchPackageUrl("https://downloads.example/demo.zip", {}, { timeoutMs: 10 }),
      (error) => error.code === "DOWNLOAD_TIMEOUT"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GitHub Topic 限流会显示可操作的中文说明", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("Too many requests", { status: 429 });
  try {
    await assert.rejects(
      () => store.discoverGitHubPackages({ query: "rate-limit-test", refresh: true }),
      /暂时限制.*Git 导入/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GitHub Raw 内容限流不会被当成无效仓库跳过", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url) === "https://github.com/topics/kivowiki-mods") {
      return new Response('<a data-hovercard-type="repository" data-hovercard-url="/author/demo/hovercard">demo</a>', { status: 200 });
    }
    return new Response("rate limited", { status: 429 });
  };
  try {
    await assert.rejects(
      () => store.discoverGitHubPackages({ refresh: true }),
      /限制了仓库内容访问.*Git 导入/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Topic 页面中的非仓库链接不会进入原始文件验证", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response('<a href="/login">login</a><a data-hovercard-url="/users/example/hovercard">user</a>', { status: 200 });
  };
  try {
    const result = await store.discoverGitHubPackages({ refresh: true });
    assert.deepEqual(result.items, []);
    assert.deepEqual(calls, ["https://github.com/topics/kivowiki-mods"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
