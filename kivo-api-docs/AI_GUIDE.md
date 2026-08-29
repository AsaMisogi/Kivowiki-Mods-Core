# 给 AI 的 KivoWiki API 使用指南

以下内容可以直接提供给 AI 编程助手作为项目上下文。它刻意把确定事实、实现约束和不确定项分开，避免 AI 根据页面 URL 猜错 API 路由。

## 可复制的系统指导文本

```text
你正在使用 KivoWiki 的公开只读 API。

服务根地址是 https://api.kivo.wiki/api/v1。接口主要使用 GET，并返回 JSON。不要猜测后台接口，不要调用写入、删除、管理员、登录或 token 接口。除非用户明确要求且站方授权，否则只使用本文列出的公开 GET 接口。

通用响应是一个 JSON 信封，常见字段为 code、codename、data、message、success、time、version。成功通常是 success=true、code=2000，但使用 data 前必须检查 success。HTTP 2xx 也不等于业务成功。详情 ID 不存在时可能返回 HTTP 404。对 HTTP 429 和 5xx 使用有限重试和退避，不要无限重试。

列表接口通常使用 page 和 page_size，页码从 1 开始。响应 data 中的 max_page 是最大页码，不是总记录数。不同资源数组键不同：students、school、relation、item、article、comics、gallery、music、timeline、bulletin、news。不要统一假设为 items。

API 原始枚举使用英文，例如学生攻击属性 Explosive、Piercing、Mystic、Vibration，战斗位置 STRIKER/SPECIAL，服务器 jp/cn。向 API 发送英文原值，不要发送中文翻译。多值时间轴 type 优先使用重复查询参数，例如 type=Raid&type=Event。

网站页面路由与 API 路由不是一一对应：页面 /data/character/{id} 对应 API /data/students/{id}；页面 /data/item/{id} 对应 API /data/items/{id}；页面 /music/{id} 对应 API /musics/{id}；页面 /comic/{id} 对应 API /comics/{id}。优先按 API_REFERENCE.md 的路径调用。

资源字段可能是 //static.kivo.wiki/...、https://static.kivo.wiki/... 或相对路径。// 开头的值应补 https:；相对路径通常拼接到 https://static.kivo.wiki/。空字符串和 null 都表示资源可能不存在。文章、新闻、公告、时间轴的 body 是 Markdown/HTML 混合文本，不要当作结构化 JSON。

角色皮肤通常是不同的学生记录；不能只按姓名去重。角色列表只返回摘要，完整技能、武器、语音、礼物、模型和 Spine 数据必须调用角色详情。

当用户的问题依赖未在接口中返回的事实时，明确指出字段缺失或资料未确认，不要编造。对 special_apperance、eqipment、is_groupc_control、OutsideGame/OutsideGames 等历史拼写和枚举差异保留原样，并在代码中兼容而不是擅自重命名。

批量同步时应缓存已获取 ID、设置合理并发上限、尊重服务稳定性，并把 API version 和抓取时间写入本地数据元信息。不要通过遍历无限大的 ID 区间制造压力；先使用列表接口获得 ID。
```

## AI 实现工作流

1. 先判断需求属于角色、学校、关系、物品、文章、新闻、漫画、画廊、音乐、时间轴、公告、实时数据或资源元数据。
2. 查 [API_REFERENCE.md](API_REFERENCE.md) 的接口索引，使用 API 路径，不要从 sitemap 页面路径直接拼接。
3. 列表任务显式设置 `page=1&page_size=...`，读取正确的数组键和 `max_page`。
4. 需要完整字段时先从列表得到 ID，再调用详情接口；不要把列表摘要当成详情。
5. 解析信封并检查 `success`、HTTP 状态、`data` 空值。
6. 将资源 URL 规范化，保留原始 URL 以便调试。
7. 对字段类型采用宽松解析：未知字段保留，可能为空的字符串/数组/null 都要处理。
8. 输出用户可见数据时，保留原始英文枚举并在展示层翻译；不要修改 API 数据本身。

## 逐接口 AI 调用矩阵

| API 路径 | AI 应如何使用 | 主要返回位置/注意 |
|---|---|---|
| `/data/students` | 先分页、搜索或过滤，拿到摘要和 ID。 | `data.students[]`；`max_page` 是页数。 |
| `/data/students/{id}` | 由学生列表 ID进入完整资料。 | `data` 直接是角色详情；不要把页面 `character` 路由当 API 路由。 |
| `/data/students/birthday/week` | 获取本周角色 ID后再批量取详情。 | `data.students[]` 是 ID，不是角色对象。 |
| `/data/schools` | 用 `name` 搜索学校或分页同步。 | `data.school[]`；注意数组键是单数。 |
| `/data/schools/{id}` | 获取学校正文、地图、关联角色。 | `data` 直接是学校对象；正文按 Markdown/HTML 字符串处理。 |
| `/data/relations` | 查询关系、社团或组织摘要。 | `data.relation[]`；不要固化为只有“社团”。 |
| `/data/relations/{id}` | 获取组织说明和角色关系。 | `main_students`、`secondary_students` 可能为 `null`。 |
| `/data/items` | 分页、按物品类型或绑定文章过滤。 | `data.item[]`；保留未见过的新 `type`。 |
| `/data/items/{id}` | 获取礼物/家具/普通物品完整数据。 | `gift`、`furniture` 可能为空或包含 `students: null`。 |
| `/data/models` | 获取 3D 模型资源索引。 | `data.model[]`；不要只下载 `model_file`而忽略纹理。 |
| `/data/models/{id}` | 按模型 ID读取 OBJ、MTL和纹理。 | `data.texture[]`；规范化静态资源 URL。 |
| `/data/spines` | 获取 Spine 资源索引。 | `data.spine[]`；需要同时保存 skel、atlas和 images。 |
| `/data/spines/{id}` | 获取一个 Spine 动画资源的文件清单。 | `data` 直接是 Spine 对象；资源可能为空。 |
| `/articles` | 以 `title` 搜索文章，列表展示摘要。 | `data.article[]`；需要 `summary_size`时显式传入。 |
| `/articles/{id}` | 获取完整文章内容。 | `data.body` 是 Markdown/HTML混合文本，渲染要做安全过滤。 |
| `/news` | 获取首页新闻/资讯摘要。 | `data.news[]`；不要与 `articles` 的数组键混用。 |
| `/news/{id}` | 获取新闻正文和图片。 | `data.body` 可能含外部链接或站内资源引用。 |
| `/comics` | 获取漫画合集索引。 | `data.comics[]`；页面 `/comic` 与 API 资源名不同。 |
| `/comics/{id}` | 获取合集及章节目录。 | `data.chapter[]`；可传 `chapter_sort=asc|desc`。 |
| `/comics/{comic_id}/chapters/{chapter_id}` | 获取章节图片并按页码排序。 | `data.images[]` 使用原始字段 `pagen_number`。 |
| `/galleries` | 搜索或分页获取画廊封面。 | `data.gallery[]`；页面路径是 `/gallery`。 |
| `/galleries/{id}` | 获取分类和全部图片资源。 | `data.categorys[]` 是服务端原始拼写，不要改成 `categories`。 |
| `/musics` | 搜索或分页获取音乐摘要。 | `data.music[]`；标题搜索参数是 `s`。 |
| `/musics/{id}` | 获取音频、歌词和详细介绍。 | `data.file`、`data.lrc_file` 可能为空。 |
| `/timeline` | 按类型、时间窗和标题筛选事件。 | `data.timeline[]` 与 `data.type_num`；多值 `type` 重复传参。 |
| `/timeline/{id}` | 获取单个时间轴事件全文。 | 使用 `body`，列表的 `body_summary` 不是全文。 |
| `/bulletins` | 获取站内公告目录。 | `data.bulletin[]`；按 `created_at`/`updated_at`展示时转换 Unix 秒。 |
| `/bulletins/{id}` | 获取公告全文。 | `data.body` 按 Markdown/HTML 文本处理。 |
| `/data/pick_up?server=jp|cn` | 读取指定服当前卡池时间。 | `data.start_date/end_date/banner`；`banner` 可为空。 |
| `/data/raid/now?server=jp|cn` | 读取指定服当前总力战/大决战时间。 | 不要假设返回一定是进行中活动；以服务端时间为准。 |
| `/data/event/now?server=jp|cn` | 读取指定服当前活动时间。 | 只有时间和横幅，不要自行推断活动标题。 |
| `/data/lucky_item` | 获取幸运物类型和 ID。 | `data.type` 决定后续资源接口；不要无条件当作物品。 |
| `/statistics/index` | 展示站点统计快照。 | 字段是 `users_number` 等统计值，不是分页总量。 |
| `/upload/file_server` | 获取静态资源主机配置。 | `data.server_host`；这不是公开上传接口。 |
| `/` | 探测 API 是否可达和读取版本信息。 | 通常无 `data`；仍检查 `success`。 |

## 常见任务模板

### 按名称查角色，再取详情

```js
async function getStudentByName(name) {
  const listUrl = new URL('https://api.kivo.wiki/api/v1/data/students');
  listUrl.search = new URLSearchParams({
    page: '1',
    page_size: '50',
    character_data_search: name,
  });
  const listEnvelope = await fetch(listUrl).then(r => r.json());
  if (!listEnvelope.success) throw new Error(listEnvelope.message || 'list failed');

  const matches = listEnvelope.data?.students ?? [];
  return Promise.all(matches.map(async ({ id }) => {
    const envelope = await fetch(
      `https://api.kivo.wiki/api/v1/data/students/${id}`
    ).then(r => r.json());
    if (!envelope.success) throw new Error(envelope.message || `student ${id} failed`);
    return envelope.data;
  }));
}
```

### 获取实时活动信息

```js
async function getCurrentSchedule(server = 'jp') {
  const base = 'https://api.kivo.wiki/api/v1/data';
  const [event, raid, pickup] = await Promise.all(
    ['event/now', 'raid/now', 'pick_up'].map(path =>
      fetch(`${base}/${path}?server=${encodeURIComponent(server)}`)
        .then(async response => {
          if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
          const envelope = await response.json();
          if (!envelope.success) throw new Error(`${path}: ${envelope.message}`);
          return envelope.data;
        })
    )
  );
  return { event, raid, pickup };
}
```

### 同步所有时间轴页面

```js
async function fetchAllTimeline(pageSize = 100) {
  const base = 'https://api.kivo.wiki/api/v1/timeline';
  const first = await fetch(`${base}?page=1&page_size=${pageSize}`).then(r => r.json());
  if (!first.success) throw new Error(first.message || 'timeline failed');
  const maxPage = Number(first.data?.max_page ?? 1);
  const pages = [first.data?.timeline ?? []];
  for (let page = 2; page <= maxPage; page += 1) {
    const envelope = await fetch(`${base}?page=${page}&page_size=${pageSize}`).then(r => r.json());
    if (!envelope.success) throw new Error(envelope.message || `page ${page} failed`);
    pages.push(envelope.data?.timeline ?? []);
  }
  return pages.flat();
}
```

## AI 不应做的事

- 不要把 `/data/character/76` 改写成 `https://api.kivo.wiki/api/v1/data/character/76`；已确认的 API 资源名是 `students`。
- 不要把 `max_page` 当作总条数乘以 `page_size`，最后一页可能不足页大小，且页大小行为未承诺。
- 不要把 `//static.kivo.wiki` 直接交给要求绝对 URL 的 HTTP 客户端。
- 不要假设每个详情对象都有 `id`；角色详情样本主对象字段中可能只有嵌套 `character_datas[].character_id`，应以接口当前响应为准并保留列表 ID。
- 不要为了“补齐”文章、新闻或时间轴正文而自行执行 Markdown；先按原文保存，渲染应使用有安全策略的 Markdown 渲染器。
- 不要因为 `banner` 为空、`body` 为空或 `students` 为 `null` 就把整个业务响应当作网络错误。
