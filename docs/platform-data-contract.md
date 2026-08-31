# 平台数据能力契约

本文说明社区模块可使用的只读数据能力。这里描述的是模块与 Core 之间的稳定接口，不包含站点内部路由、认证方式、服务端字段或抓包样本。

## 使用边界

- 数据能力只允许 `GET` 和 `HEAD`，不提供写入、上传、认证或账号操作。
- 调用时不携带 Cookie、Token 等凭据，认证类请求头会被过滤。
- 社区模块必须声明 `network.read`，并在安装时获得用户授权。
- `sandbox` 模式不提供网络能力；全局安全模式开启时同样不可用。
- 页面模式仍能使用网页环境自身的能力，因此安装者必须审阅第三方代码。
- 模块不得依赖 Core 的后台消息、缓存键、存储结构或站点内部接口。

## 通用请求

页面模式中的 `context.api.request()` 与 `context.data.request()` 提供相同的通用只读请求能力。`context.api` 还提供版本协商：

```js
if (!context.api.supports("^1.1.0")) {
  throw new Error("当前平台 API 版本不兼容");
}
```

请求示例使用模块自行配置的公开数据源：

```js
const result = await context.api.request({
  url: getConfiguredPublicUrl(),
  method: "GET",
  query: { page: 1 },
  timeoutMs: 30000,
  retries: 2,
  cacheTtlMs: 30000
});
```

通用请求支持以下控制项：

- `url`：有效的 HTTP 或 HTTPS 地址。
- `method`：仅限 `GET` 或 `HEAD`。
- `query`：普通对象或 `URLSearchParams`；数组会编码为重复参数。
- `timeoutMs`：1 秒至 180 秒，默认 30 秒。
- `retries`：只对网络故障、超时、429 和服务暂时异常做有限重试，最多 8 次。
- `cacheTtlMs`：当前运行环境中的短期缓存时长，最长 24 小时。
- `staleIfErrorMs`：服务暂时失败时允许使用刚过期缓存的时间窗口。
- `dedupe`：默认合并完全相同的并发请求。
- `envelope`：只有明确需要原始公开响应时才使用；业务模块应优先自行规范化数据。

成功结果包含规范化数据、HTTP 状态、最终 URL 和缓存状态。错误可能包含状态码和错误代码，模块不应依赖服务端返回的某个私有字段。

## core-runtime

需要 KivoWiki 公共数据时，在模块清单中声明：

```json
{
  "dependencies": { "core-runtime": "^1.1.0" }
}
```

运行时通过 `context.dependencies["core-runtime"]` 获取按当前模块权限绑定的能力实例。请求缓存由 Core 后台共享，请求权限仍按调用模块逐次检查，不会跨模块复用授权身份。

推荐使用以下语义接口：

| 方法 | 返回内容 |
| --- | --- |
| `kivoApi.list(resource, query)` | 一页公开资源及最大页数 |
| `kivoApi.get(resource, id)` | 单项公开资源 |
| `kivoApi.listAll(resource, query, options)` | 按服务端分页信息汇总公开资源 |
| `resourceUrl(value)` | 规范化公开静态资源 URL |
| `kivoApi.listStudents(query)` | 学生列表和最大页数 |
| `kivoApi.getStudent(id)` | 单个学生公开资料 |

支持的公开资源名：

```text
students, schools, relations, items, models, spines,
articles, news, comics, galleries, musics, timeline, bulletins
```

`listAll()` 支持：

- `maxPages`：模块愿意读取的最大页数，必须设置合理上限。
- `concurrency`：分页并发数，默认 8；模块应根据任务量主动调低。
- `onPage(info)`：每页完成后的进度回调。

业务代码必须容忍空数组、`null`、未知枚举和服务端新增字段。UI 不应直接解析服务端响应，而应通过模块自己的适配层转换为内部模型。

底层 `core-runtime.request()` 仅用于实现公开语义适配，路径被限制在 Core 允许的只读服务范围。社区模块不要把底层路径写入 UI、配置或公共类型，也不要调用认证、账号、上传、统计、基础设施发现等非业务接口。

## 适配器分层

推荐目录：

```text
module/
├─ module.json
├─ src/
│  ├─ index.js
│  ├─ config.js
│  ├─ services/
│  │  ├─ provider.js
│  │  └─ normalizers.js
│  └─ ui/
└─ tests/
```

`provider.js` 负责请求与服务端兼容，向业务层暴露 `list`、`get`、`search`、`resolveResource` 等语义方法。UI 层只消费模块内部模型，不拼接 URL、不处理重试，也不读取原始响应字段。

需要适配其他公开来源时，可通过 `context.api.createAdapter()` 创建版本化适配器：

```js
const provider = context.api.createAdapter({
  id: "public-provider",
  version: "1.0.0",
  apiVersion: "^1.1.0",
  methods: {
    async list({ request }, page) {
      const result = await request({
        url: getConfiguredPublicUrl(),
        query: { page }
      });
      return normalizePublicList(result.data);
    }
  }
});
```

适配器定义和 Core 公共 API 版本是两个独立版本。模块必须检查兼容范围，并为服务端变化保留可控的失败路径。

## 可靠性要求

- 所有请求都有超时、有限重试和明确的失败提示。
- 所有分页任务都有最大页数、并发上限、取消路径和进度反馈。
- 所有缓存都有 TTL 与容量上限，不将缓存当作永久数据。
- 同一数据只保留一个请求入口，避免 UI 组件各自重复请求。
- 外部文本使用 `textContent`；HTML、Markdown、图片和链接先经过安全过滤。
- 在 `onCleanup()` 中停止观察器、定时器和仍可取消的任务。
- 日志只记录诊断摘要，不记录 Cookie、Token、账号数据或完整请求头。
- 测试至少覆盖空数据、超时、429、服务异常、分页终止、重复请求合并和新增未知字段。
