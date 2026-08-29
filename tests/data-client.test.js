const assert = require("node:assert/strict");
const test = require("node:test");

require("../data-client.js");

test("相同并发请求会合并为一次 fetch", async () => {
  let calls = 0;
  const client = globalThis.KivowikiModsDataClient.create({
    fetchImpl: async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return new Response(JSON.stringify({ success: true, data: { value: 1 } }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  const input = { url: "https://api.kivo.wiki/api/v1/test", cacheTtlMs: 1000 };
  const [left, right] = await Promise.all([client.request(input), client.request(input)]);
  assert.equal(calls, 1);
  assert.deepEqual(left.data, { value: 1 });
  assert.deepEqual(right.data, { value: 1 });
});

test("认证请求头会被过滤", async () => {
  let headers;
  const client = globalThis.KivowikiModsDataClient.create({
    fetchImpl: async (_url, init) => {
      headers = init.headers;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  await client.request({ url: "https://api.kivo.wiki/api/v1/test", headers: { Authorization: "secret", Cookie: "secret", "X-Mode": "public" } });
  assert.equal(headers.Authorization, undefined);
  assert.equal(headers.Cookie, undefined);
  assert.equal(headers["X-Mode"], "public");
});

test("requestAllPages 支持高并发完整分页", async () => {
  const client = globalThis.KivowikiModsDataClient.create({
    fetchImpl: async (url) => {
      const page = Number(new URL(url).searchParams.get("page"));
      return new Response(JSON.stringify({ success: true, data: { max_page: 4, students: [{ id: page }] } }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  const result = await client.requestAllPages({ url: "https://api.kivo.wiki/api/v1/data/students", query: { page_size: 100 } }, { dataKey: "students", concurrency: 3 });
  assert.deepEqual(result.items.map((item) => item.id).sort(), [1, 2, 3, 4]);
  assert.equal(result.maxPage, 4);
});
