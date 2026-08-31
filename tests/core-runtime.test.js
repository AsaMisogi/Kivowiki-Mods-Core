const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");

const requests = [];
globalThis.KivowikiModsDataClient = {
  create() {
    return {
      request(input) {
        requests.push(input);
        return Promise.resolve({ data: {}, status: 200, url: input.url, fromCache: false });
      },
      clearCache() {}
    };
  }
};
globalThis.KivowikiModsDependencies = [];
require("../dependencies/core-runtime/src/index.js");

const dependency = globalThis.KivowikiModsDependencies.find((item) => item.id === "core-runtime");

test("core-runtime 只接受公开 API 范围内的相对路径", async () => {
  requests.length = 0;
  const runtime = dependency.create();

  assert.throws(() => runtime.request("https://example.com/private"), /路径无效/);
  assert.throws(() => runtime.request("//example.com/private"), /路径无效/);
  assert.throws(() => runtime.request("../private"), /路径无效/);
  assert.throws(() => runtime.request("%2e%2e/private"), /路径无效/);
  assert.throws(() => runtime.request("data/%2e%2e/%2e%2e/private"), /路径无效/);

  await runtime.request("data/students");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://api.kivo.wiki/api/v1/data/students");
});

test("页面注入版 core-runtime 使用相同的路径边界", async () => {
  const serviceRequests = [];
  const definition = vm.runInNewContext(dependency.sourceCode, { URL });
  const runtime = definition.create({}, {
    request(input) {
      serviceRequests.push(input);
      return Promise.resolve({ data: {} });
    }
  });

  assert.throws(() => runtime.request("https://example.com/private"), /路径无效/);
  assert.throws(() => runtime.request("%2e%2e/private"), /路径无效/);
  await runtime.request("data/students");
  assert.equal(serviceRequests[0].url, "https://api.kivo.wiki/api/v1/data/students");
});
