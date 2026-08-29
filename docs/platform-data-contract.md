# 平台数据能力契约

本文说明 Kivowiki-Mods 提供给模块作者的两类数据能力：与站点无关的 `context.api` / `context.data`，以及内置 `Kivowiki-Mods-core-runtime` 依赖提供的 KivoWiki 公开只读 API 适配。两者都不包含认证、写入或账号能力。

## 设计边界

- 模块只依赖 `context.api` 或兼容别名 `context.data`，不依赖管理器内部实现、扩展 API 或具体站点 URL。
- 数据能力是只读的，宿主拒绝写入类请求。
- `sandbox` 模式不提供网络数据能力；需要数据的模块应声明 `page` 模式及 `network.read` 权限，并由用户确认。
- `core-runtime` 依赖用于官方内置和明确声明该依赖的页面模块；严格沙箱受 CSP 限制，依赖不能借此发起网络请求。
- 适配器必须允许服务端增加未知字段，不能因为字段扩展而崩溃。

## 请求接口

页面模式中，`context.api.request` 与 `context.data.request` 提供相同的只读请求能力。`context.api` 是推荐入口，并增加版本协商：

```js
if (!context.api.supports("^1.1.0")) {
  throw new Error("当前平台 API 版本不兼容");
}
```

请求示例：

```js
const result = await context.api.request({
  url: "https://example.invalid/resource",
  method: "GET",
  query: { page: 1, tag: ["a", "b"] },
  timeoutMs: 30000,
  retries: 4,
  cacheTtlMs: 30000
});

console.log(result.data, result.status, result.fromCache);
```

生产模块应将上述 `url` 从独立的站点适配配置注入，不能把平台服务地址硬编码到管理器或通用模块模板中。

## 内置 core-runtime

需要 KivoWiki 公共数据的模块可在清单中声明：

```json
{
  "dependencies": { "core-runtime": "^1.1.0" }
}
```

运行时通过 `context.dependencies["core-runtime"]` 获取绑定当前模块权限的轻量能力门面。请求缓存由后台共享，调用身份和权限不会跨模块复用：

```js
const core = context.dependencies["core-runtime"];
const page = await core.kivoApi.listStudents({
  page: 1,
  page_size: 24,
  character_data_search: "星野"
});
const detail = await core.kivoApi.getStudent(76);
const imageUrl = core.resourceUrl(detail.avatar);
```

`listStudents` 对应公开 API `/api/v1/data/students`，返回 `{ students, maxPage }`；`getStudent(id)` 对应角色详情接口；`resourceUrl(value)` 规范化协议相对、绝对与静态资源相对路径。`list(resource, query)`、`get(resource, id)` 和 `listAll(resource, query, options)` 还覆盖学生、学校、关系、物品、模型、Spine、文章、新闻、漫画、画廊、音乐、时间轴和公告。`listAll` 根据 `max_page` 自动完成分页，默认 8 个分页任务并发，支持 `maxPages`、`concurrency` 和 `onPage`。

`core-runtime.request(path, options)` 只接受以 `https://api.kivo.wiki/api/v1/` 为基准的只读路径，并复用页面缓存。模块的业务字段解析、界面逻辑和用户设置仍放在模块自身，不应塞进共享依赖。

### 版本化适配器

复杂模块可使用 `context.api.createAdapter(definition)` 把站点请求封装为稳定的语义方法：

```js
const provider = context.api.createAdapter({
  id: "my-provider",
  version: "1.1.0",
  apiVersion: "^1.1.0",
  methods: {
    async list({ request }, page) {
      const result = await request({ url: getConfiguredEndpoint(), query: { page } });
      return normalizeList(result.data);
    }
  }
});
```

`getConfiguredEndpoint` 和 `normalizeList` 属于模块自己的适配层。通用请求能力只提供只读请求、版本协商、超时、重试和缓存；KivoWiki 的稳定公共适配集中在 `core-runtime`，二者都不携带认证信息。

### 参数约束

- `url`：必须是 `http` 或 `https` URL。相对 URL 以当前页面为基准解析。
- `method`：仅允许 `GET` 与 `HEAD`。
- `query`：对象或 `URLSearchParams`；数组值会编码为重复查询参数。
- `headers`：只用于必要的只读协商头，不应放入认证信息。
- `timeoutMs`：默认 30 秒，宿主限制在 1 秒至 180 秒。
- `retries`：仅对网络错误、408、429 和 5xx 做有限重试，默认 4 次，最多 8 次，并尊重可识别的 `retry_after`。
- `cacheTtlMs`：内存缓存时长，最多 24 小时；缓存只存在当前页面生命周期。
- `staleIfErrorMs`：服务暂时失败时允许返回过期缓存的最长时间；后台 KivoWiki 客户端默认 30 分钟。
- `dedupe`：默认启用，相同 URL、查询、响应模式和安全请求头的并发请求只发出一次；设为 `false` 可关闭合并。
- `envelope: "raw"`：保留完整响应对象。默认情况下，形如 `{ success: true, data: ... }` 的成功信封会返回其中的 `data`。

调用前必须获得 `network.read` 权限。宿主过滤 `Authorization`、`Cookie`、`Set-Cookie`，请求使用 `credentials: "omit"`。这不会限制页面模式代码直接调用网页原生 `fetch`；页面模式的最终风险仍由安装者承担。

## 响应与错误

成功结果的结构为：

```js
{
  data: unknown,
  status: 200,
  url: "https://example.invalid/resource?...",
  fromCache: false
}
```

宿主会同时检查 HTTP 状态和常见业务信封中的 `success`。KivoWiki 官方地址通过扩展后台只读桥请求，避免页面跨域 CORS 导致公开 API 无法读取；其他 HTTPS 数据源仍由页面模式直接请求。以下情况会 reject：网络错误、超时、非 2xx、业务信封明确失败、非法请求参数。错误对象可能包含 `status`、`code` 和服务端原始 `data`，模块不得只依赖某一个错误字段。

应将错误分成可恢复与不可恢复两类：429、5xx、超时适合提示“稍后重试”；401、403、404、参数错误和业务失败应停止重试并给出明确反馈。批量任务必须设置并发上限、分页终止条件、取消机制和本地缓存，不能遍历无限 ID 或高频刷新。

## 分页与数据兼容

适配层建议返回统一的内部模型，但保留 `raw` 原始数据以便调试。分页解析应显式从第一页开始，使用服务端返回的最大页码或游标；将缺失数组、`null`、空字符串视为合法空数据；允许服务端新增枚举、字段和嵌套对象；对详情不存在、分页越界和版本不匹配分别处理。

## 资源 URL

适配器可以提供 `resolveResource(value, base)` 辅助函数，将协议相对 URL、相对路径和绝对 URL 统一成可加载地址。空字符串与 `null` 必须原样视为“没有资源”，正文中的 Markdown/HTML 链接不能自动当作数据接口地址。

## 适配器分层

推荐按以下目录组织社区模块：

```text
module/
├─ module.json
├─ README.md
├─ src/
│  ├─ index.js
│  ├─ config.js
│  ├─ services/
│  │  ├─ provider.js
│  │  └─ normalizers.js
│  └─ ui/
└─ tests/
```

`provider.js` 只应向业务层暴露 `list`, `get`, `search`, `resolveResource` 等语义化方法。不要让 UI 组件拼接 URL、解析信封或处理重试。站点适配资料、测试夹具和生产模块必须分离，便于站点版本变化时替换适配器而不影响管理器。

## 可靠性清单

- 所有请求都有超时和有限重试。
- 所有批量任务都有并发限制和取消路径。
- 所有缓存都有 TTL 和容量上限。
- 大批量读取优先使用 `core-runtime.kivoApi.listAll`；默认请求并发上限为 16，分页并发默认 8，仍应提供取消入口和进度反馈。
- 所有用户可见内容使用安全渲染，外部 HTML/Markdown 先过滤。
- 所有事件、观察器、定时器和请求在 `onCleanup` 中停止。
- 设置只保存 JSON 兼容值，且限制大小。
- 适配器记录抓取时间、来源版本和失败原因，但不记录 Token、Cookie 或账号信息。
- 使用 `context.log` 时只记录诊断摘要；宿主会尝试遮盖常见敏感键，但模块仍必须在源头避免写入隐私。
