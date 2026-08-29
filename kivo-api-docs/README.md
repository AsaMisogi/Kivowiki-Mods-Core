# KivoWiki API 文档

这是一份面向开发者和 AI 编程助手的 KivoWiki 公开 API 参考手册。API 服务地址为 `https://api.kivo.wiki`，当前已观察到的接口前缀为 `/api/v1`。

## 文档边界

- 本文档只记录无需登录即可访问的只读接口，以及网站前端实际调用的公开接口。
- 文档基于工作区提供的社区旧文档、站点地图、JSON 字段样本，以及 2026-08-28 对线上接口的实测结果整理。
- 这是非官方逆向整理，不等同于站方承诺的稳定 API。线上接口可能增加字段、调整枚举、变更分页或下线。
- 没有记录写入、编辑、删除、管理员或用户认证接口。不要根据后台域名或前端登录请求猜测权限接口。

## 快速开始

```bash
curl "https://api.kivo.wiki/api/v1/data/students?page=1&page_size=3&character_data_search=%E6%98%9F%E9%87%8E"
```

```js
const response = await fetch(
  'https://api.kivo.wiki/api/v1/data/students?page=1&page_size=3'
);
const envelope = await response.json();
if (!envelope.success) throw new Error(envelope.message || 'KivoWiki API error');
console.log(envelope.data.students, envelope.data.max_page);
```

上面的 `fetch` 适用于服务端、命令行或 API 明确允许跨域的页面。线上实测从 `https://kivo.wiki` 页面脚本直接请求 `https://api.kivo.wiki` 时可能被浏览器 CORS 拒绝。Kivowiki-Mods 模块应使用 `context.dependencies["core-runtime"]` 或 `context.api.request()`；管理器会通过扩展后台的只读请求桥访问官方 API。

## 目录

- [完整参考](API_REFERENCE.md)：认证、响应信封、分页、资源 URL、全部接口和示例。
- [数据模型](DATA_MODELS.md)：常见列表项、详情对象和嵌套字段说明。
- [AI 指南](AI_GUIDE.md)：给 AI 使用的复制即用指导文本、事实等级和实现规则。
- [证据与限制](EVIDENCE.md)：资料来源、实测时间、已确认与待确认内容。

## 最重要的约定

1. 列表接口通常需要 `page` 和 `page_size`；但线上接口在缺省时也可能使用默认值，因此生产代码应显式传参。
2. `max_page` 表示最大页码，不是记录总数。记录总数通常不能直接从响应得到。
3. 字段值使用接口原始英文枚举；中文只作为解释，不要把中文翻译值发送给 API。
4. JSON 中的 `//static.kivo.wiki/...` 是协议相对 URL。浏览器中可直接补成 `https:`；非浏览器客户端应显式规范化。
5. 详情不存在时，线上观察到 HTTP 404；HTTP 200 不代表业务一定成功，仍须检查 `success` 和 `code`。
6. 所有时间戳均按 Unix 秒处理。日期字符串如生日 `MM-DD` 和发布日期 `YYYY-MM-DD` 不是时间戳。
