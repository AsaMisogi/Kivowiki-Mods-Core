# KivoWiki API 完整参考

## 1. 服务概览

| 项目 | 值 |
|---|---|
| API 主机 | `https://api.kivo.wiki` |
| API 前缀 | `/api/v1` |
| 请求方法 | `GET` |
| 数据格式 | JSON；文章、时间轴正文等字段内含 Markdown/HTML 片段 |
| 认证 | 本文记录的公开读接口不需要认证 |
| 当前实测版本 | `1.0.0-beta.43` |
| 当前实测 codename | `Koyuki` |

末尾 `/` 通常可选。例如 `/api/v1/data/students` 与 `/api/v1/data/students/` 均曾成功返回。建议客户端统一使用不带末尾 `/` 的 URL，并保留跟随重定向能力。

浏览器跨域提示：2026-08-29 实测，`kivo.wiki` 页面世界直接 `fetch("https://api.kivo.wiki/...")` 可能因响应缺少 `Access-Control-Allow-Origin` 被 CORS 拒绝，而网站自身通过其部署方式仍可读取数据。浏览器插件不要把页面直连当作稳定方案；Kivowiki-Mods 应使用后台只读数据桥或 `core-runtime`。服务端和命令行客户端不受浏览器 CORS 限制。

## 2. 通用响应

### 成功信封

公开接口通常返回：

```json
{
  "code": 2000,
  "codename": "Koyuki",
  "data": {},
  "message": "OK",
  "success": true,
  "time": 1787908086,
  "version": "1.0.0-beta.43"
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | boolean | 业务成功标志。使用 `data` 前应检查它。 |
| `code` | integer | 业务码；实测成功为 `2000`。完整错误码表未公开。 |
| `message` | string | 人类可读消息，如 `OK` 或 `请求成功`。 |
| `data` | object | 具体业务数据；部分无数据接口可能没有该字段。 |
| `time` | integer | 服务端响应时的 Unix 秒时间戳。 |
| `version` | string | API 服务版本。 |
| `codename` | string | 服务代号，实测为 `Koyuki`。 |

### 列表信封

列表的 `data` 一般形如：

```json
{
  "max_page": 505,
  "students": [
    {
      "id": 76,
      "family_name": "小鸟游",
      "given_name": "星野"
    }
  ]
}
```

不同资源的数组键不同：`students`、`school`、`relation`、`item`、`article`、`comics`、`gallery`、`music`、`timeline`、`bulletin`、`news`。不要假设数组键统一叫 `items`。

## 3. 分页、搜索和排序

### 通用分页参数

| 参数 | 类型 | 必填建议 | 说明 |
|---|---|---:|---|
| `page` | integer | 是 | 从 `1` 开始。建议 `page >= 1`。 |
| `page_size` | integer | 是 | 单页数量。线上未公开最大值；按需使用，避免一次请求过大。 |

响应中的 `max_page` 是最大页码。推荐循环：先请求第 1 页，读取 `max_page`，再请求 `2..max_page`；遇到空数组或 HTTP/业务错误应停止并记录。

### 布尔参数

使用 URL 查询字符串 `true` 或 `false`，例如 `is_npc=false`。不要发送中文布尔值、`0/1` 或 JSON 布尔值到 GET URL。

### 多值参数

旧版社区文档称时间轴 `type` 可以多选，但未明确分隔符。实测重复参数形式有效：`?type=Raid&type=Event`。客户端应优先使用重复参数；若服务端部署版本不接受，则以单值请求拆分查询并在客户端合并去重。

## 4. 资源 URL

API 的图片、音频、模型和 Spine 文件通常返回完整的 `//static.kivo.wiki/...` 地址；工作区样本中的部分字段则是相对路径，如 `images/...`、`musics/...`、`models/...`。统一处理：

```js
function absoluteResourceUrl(value) {
  if (!value) return value;
  return value.startsWith('//') ? `https:${value}` : `https://static.kivo.wiki/${value.replace(/^\/+/, '')}`;
}
```

不要把文章正文里的 `files/...` Markdown 链接误当成 API 路由；它们是内容字段中的站内资源引用。

## 5. 接口索引

### 基础数据

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/data/students` | 角色/学生列表 |
| GET | `/data/students/{id}` | 角色/学生详情 |
| GET | `/data/students/birthday/week` | 本周生日角色 ID |
| GET | `/data/schools` | 学校列表 |
| GET | `/data/schools/{id}` | 学校详情 |
| GET | `/data/relations` | 关系/社团/组织列表 |
| GET | `/data/relations/{id}` | 关系/社团/组织详情 |
| GET | `/data/items` | 物品列表 |
| GET | `/data/items/{id}` | 物品详情 |
| GET | `/data/models` | 3D 模型列表 |
| GET | `/data/models/{id}` | 3D 模型详情 |
| GET | `/data/spines` | Spine 资源列表 |
| GET | `/data/spines/{id}` | Spine 资源详情 |

### 内容、媒体和站点信息

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/articles` | 文章列表 |
| GET | `/articles/{id}` | 文章详情 |
| GET | `/news` | 新闻/首页资讯列表 |
| GET | `/news/{id}` | 新闻详情 |
| GET | `/comics` | 漫画合集列表 |
| GET | `/comics/{id}` | 漫画合集及章节 |
| GET | `/comics/{comic_id}/chapters/{chapter_id}` | 漫画章节图片 |
| GET | `/galleries` | 画廊列表 |
| GET | `/galleries/{id}` | 画廊详情及分类图片 |
| GET | `/musics` | 音乐列表 |
| GET | `/musics/{id}` | 音乐详情 |
| GET | `/timeline` | 时间轴列表 |
| GET | `/timeline/{id}` | 时间轴事件详情 |
| GET | `/bulletins` | 公告列表 |
| GET | `/bulletins/{id}` | 公告详情 |
| GET | `/statistics/index` | 站点统计 |

### 实时和快捷数据

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/data/pick_up` | 指定服务器当前卡池时间 |
| GET | `/data/raid/now` | 指定服务器当前总力战/大决战时间和横幅 |
| GET | `/data/event/now` | 指定服务器当前活动时间和横幅 |
| GET | `/data/lucky_item` | 幸运物类型和 ID |
| GET | `/upload/file_server` | 返回静态资源主机 |
| GET | `/` | API 根信息，不含业务数据 |

## 6. 基础数据接口

### 6.1 角色列表

`GET /api/v1/data/students`

用途：分页获取学生、角色和 NPC 的摘要数据。站点详情页使用 `/data/character/{id}`，但 API 资源名为 `students`。

查询参数：

| 参数 | 类型/枚举 | 说明 |
|---|---|---|
| `page` | integer | 页码，从 1 开始。 |
| `page_size` | integer | 每页数量。 |
| `character_data_search` | string | 姓名模糊搜索；实测可搜索 `星野`。 |
| `name_sort` | `asc`/`desc` | 按姓名排序。 |
| `id_sort` | `asc`/`desc` | 按 ID/上传顺序排序。 |
| `height_sort` | `asc`/`desc` | 按身高排序。 |
| `birthday_sort` | `asc`/`desc` | 按生日排序。 |
| `release_date_sort` | `asc`/`desc` | 按日服发布日期排序。 |
| `release_date_global_sort` | `asc`/`desc` | 按国际服发布日期排序。 |
| `release_date_cn_sort` | `asc`/`desc` | 按国服发布日期排序。 |
| `updated_at_sort` | `asc`/`desc` | 按更新时间排序；前端使用过 `desc`。 |
| `battlefield_position` | `STRIKER`/`SPECIAL` | 战斗位置类型。 |
| `attack_attribute` | `Explosive`/`Piercing`/`Mystic`/`Vibration` | 攻击属性。 |
| `type` | `Tank`/`Dealer`/`Healer`/`Support`/`T.S.` | 职能。 |
| `school` | integer | 学校 ID。 |
| `is_npc` | boolean | 是否 NPC。 |
| `is_install` | boolean | 日服是否实装。 |
| `is_install_global` | boolean | 国际服是否实装。 |
| `is_install_cn` | boolean | 国服是否实装。 |
| `is_group_control` | boolean | 是否有群控能力。 |
| `is_skin` | boolean | 是否换装角色。旧资料拼写过 `is_skin`。 |
| `special_apperance` | boolean | 旧资料拼写；含义推测为特殊装扮，需兼容测试。 |
| `rarity` | integer | 稀有度，旧资料记录范围 1..3。 |
| `limited` | boolean | 是否限定。 |
| `defensive_attributes` | `Light`/`Heavy`/`Special`/`Elastic` | 防御属性。 |
| `team_position` | `FRONT`/`MIDDLE`/`BACK` | 站位。 |
| `weapon_type` | `SG`/`SMG`/`AR`/`GL`/`HG`/`RL`/`SR`/`RG`/`MG`/`MT`/`FT` | 武器类型。 |
| `eqipment` | integer/string | 旧资料拼写；装备槽编号 2..10。 |
| `birthday` | `MM-DD` | 生日筛选。 |
| `body_shape` | `Shape`/`Small`/`Medium`/`Large` | 身材。样本实际出现 `Small`，旧资料曾写 `Shape`。 |
| `designer` | string | 设计师精确值筛选。 |
| `illustrator` | string | 原画师精确值筛选。 |
| `outdoor_adaptability` | `D`/`C`/`B`/`A`/`S`/`SS` | 野外适应性。 |
| `indoor_adaptability` | `D`/`C`/`B`/`A`/`S`/`SS` | 室内适应性。 |
| `street_adaptability` | `D`/`C`/`B`/`A`/`S`/`SS` | 街区适应性。 |

返回 `data.students[]` 摘要字段：`id`、`skin`、`skin_jp`、`skin_cn`、`skin_zh_tw`、`family_name`、`given_name`、`family_name_jp`、`given_name_jp`、`family_name_cn`、`given_name_cn`、`avatar`、`school`、`main_relation`。字段可能随版本增加。

简明示例：

```bash
curl "https://api.kivo.wiki/api/v1/data/students?page=1&page_size=20&school=1&is_npc=false&name_sort=asc"
```

实现提示：列表摘要中的 `id` 是详情接口 ID；同一角色的不同皮肤通常是不同记录，不要仅用姓名去重。

### 6.2 角色详情

`GET /api/v1/data/students/{id}`

路径参数 `id` 为正整数角色 ID。详情包含完整身份、实装、战斗、技能、武器、立绘、语音、礼物、关系、模型和 Spine 引用，字段见 [数据模型](DATA_MODELS.md#角色详情)。

```bash
curl "https://api.kivo.wiki/api/v1/data/students/76"
```

成功时 `data` 直接是角色对象，不再包一层 `student`。不存在的 ID 实测返回 HTTP 404。

### 6.3 本周生日

`GET /api/v1/data/students/birthday/week`

返回：

```json
{"students":[554,118]}
```

```bash
curl "https://api.kivo.wiki/api/v1/data/students/birthday/week"
```

`students` 是角色 ID 数组，需再调用角色详情接口获取姓名和生日。响应未返回周起止日期，客户端应以服务端结果为准。

### 6.4 学校列表和详情

`GET /api/v1/data/schools`

参数：`page`、`page_size`、`name`。`name` 为学校名称模糊搜索。列表数组键为 `school`。

```bash
curl "https://api.kivo.wiki/api/v1/data/schools?page=1&page_size=20&name=%E9%98%BF%E6%AF%94%E5%A4%9A%E6%96%AF"
```

`GET /api/v1/data/schools/{id}`

详情 `data` 直接返回学校对象，常见字段为 `id`、`name`、`name_cn`、`description`、`logo`、`preview_image`、`map`、`related`、`students`，还可能包含 `declare_uuid` 等扩展字段。

```bash
curl "https://api.kivo.wiki/api/v1/data/schools/1"
```

### 6.5 关系/社团/组织列表和详情

这里的 `relations` 更接近“学生关系、社团或组织”统一实体，不应在程序中固定翻译成单一业务概念。

`GET /api/v1/data/relations`

参数：`page`、`page_size`、`name`。列表数组键为 `relation`。

```bash
curl "https://api.kivo.wiki/api/v1/data/relations?page=1&page_size=20&name=%E5%9C%A3%E4%B8%89%E4%B8%80"
```

`GET /api/v1/data/relations/{id}`

详情常见字段：`id`、`name`、`name_cn`、`image`、`description`、`filter_whitelist`、`main_students`、`secondary_students`。部分字段可为 `null`。

```bash
curl "https://api.kivo.wiki/api/v1/data/relations/1"
```

### 6.6 物品列表和详情

`GET /api/v1/data/items`

参数：`page`、`page_size`、`type`、`is_bind_article`、`id_sort`。旧资料记录 `type=gift` 或 `type=furniture`，线上也观察到 `default`，因此不要把枚举硬编码为只有两项。

```bash
curl "https://api.kivo.wiki/api/v1/data/items?page=1&page_size=20&type=furniture&id_sort=desc"
```

列表数组键为 `item`，摘要常见字段为 `id`、`name`、`type`、`icon`、`rarity`、`description`。

`GET /api/v1/data/items/{id}`

详情常见字段：`id`、`type`、`icon`、`rarity`、`name`、`description`、`article_id`、`gift`、`furniture`。`gift.students` 和 `furniture.students` 可为 `null`；家具通常包含 `comfort`。

```bash
curl "https://api.kivo.wiki/api/v1/data/items/1742"
```

### 6.7 3D 模型

`GET /api/v1/data/models`

参数：`page`、`page_size`；列表数组键为 `model`。详情路径为 `/data/models/{id}`。

```bash
curl "https://api.kivo.wiki/api/v1/data/models?page=1&page_size=10"
curl "https://api.kivo.wiki/api/v1/data/models/1"
```

详情字段：`id`、`name`、`type`、`model_file`、`mtl_file`、`texture[]`。资源字段通常已是 `https://static.kivo.wiki/...` 形式。

### 6.8 Spine 资源

`GET /api/v1/data/spines`

参数：`page`、`page_size`；列表数组键为 `spine`。详情路径为 `/data/spines/{id}`。

```bash
curl "https://api.kivo.wiki/api/v1/data/spines?page=1&page_size=10"
curl "https://api.kivo.wiki/api/v1/data/spines/1"
```

详情字段：`id`、`name`、`remark`、`type`、`skel_file`、`atlas_file`、`images[]`。

## 7. 内容和媒体接口

### 7.1 文章

`GET /api/v1/articles`

参数：`page`、`page_size`、`summary_size`、`title`。`summary_size` 控制列表摘要长度，`title` 为标题模糊搜索。列表数组键为 `article`。

```bash
curl "https://api.kivo.wiki/api/v1/articles?page=1&page_size=10&summary_size=160&title=%E8%AE%BE%E5%AE%9A"
```

列表项常见字段：`id`、`title`、`cover`、`state`、`summary`、`created_at`、`updated_at`。

`GET /api/v1/articles/{id}` 返回 `data` 文章详情：`id`、`title`、`summary`、`body`、`cover`、`state`、`declare_uuid`、`enable_supplementary`、`supplementary_uuid`、`created_at`、`updated_at` 等。

```bash
curl "https://api.kivo.wiki/api/v1/articles/83"
```

`body` 是 Markdown/扩展 Markdown 字符串，可能包含 HTML、站内链接和 `files/...` 资源引用。不要当作纯文本或 JSON 结构解析。

### 7.2 新闻

`GET /api/v1/news`

参数：`page`、`page_size`。前端实际请求过此接口，列表数组键为 `news`。

```bash
curl "https://api.kivo.wiki/api/v1/news?page=1&page_size=10"
```

列表项常见字段：`id`、`title`、`image`、`url`。详情 `GET /api/v1/news/{id}` 返回 `id`、`title`、`image`、`body`、`url`。

```bash
curl "https://api.kivo.wiki/api/v1/news/148"
```

### 7.3 漫画

`GET /api/v1/comics`

参数：`page`、`page_size`、`title`。列表数组键为 `comics`。

```bash
curl "https://api.kivo.wiki/api/v1/comics?page=1&page_size=10&title=%E5%AE%98%E6%96%B9"
```

列表项常见字段：`id`、`title`、`author`、`cover`、`type`。

`GET /api/v1/comics/{comic_id}` 支持 `chapter_sort=asc|desc`，返回合集详情和 `chapter[]`，章节项包含 `id`、`title`、`source`。

```bash
curl "https://api.kivo.wiki/api/v1/comics/1?chapter_sort=asc"
```

`GET /api/v1/comics/{comic_id}/chapters/{chapter_id}` 返回章节详情：`id`、`title`、`source`、`images[]`。图片项包含 `id`、`pagen_number`、`file`；字段名确实是 `pagen_number`，不要擅自改成 API 查询字段。

```bash
curl "https://api.kivo.wiki/api/v1/comics/1/chapters/837"
```

### 7.4 画廊

`GET /api/v1/galleries`

参数：`page`、`page_size`、`title`。列表数组键为 `gallery`；列表项通常有 `id`、`title`、`cover`。

```bash
curl "https://api.kivo.wiki/api/v1/galleries?page=1&page_size=10&title=wiki"
```

`GET /api/v1/galleries/{id}` 返回 `id`、`title`、`introduction`、`categorys[]`。每个分类含 `name`、`introduction`、`images[]`，图片项含 `image`、`introduction`。字段名 `categorys` 是服务端原始拼写。

```bash
curl "https://api.kivo.wiki/api/v1/galleries/24"
```

### 7.5 音乐

`GET /api/v1/musics`

参数：`page`、`page_size`、`s`、`id_sort`。`s` 为标题模糊搜索，列表数组键为 `music`。

```bash
curl "https://api.kivo.wiki/api/v1/musics?page=1&page_size=20&s=Theme&id_sort=asc"
```

列表项常见字段：`id`、`title`、`cover`、`author`、`album`、`use`、`original_file_name`。详情再增加 `introduction`、`file`、`lrc_file`。

```bash
curl "https://api.kivo.wiki/api/v1/musics/1"
```

`file` 通常是 OGG 音频 URL，`lrc_file` 可能为空字符串。客户端播放前应检查空值和资源 HTTP 状态。

### 7.6 时间轴

`GET /api/v1/timeline`

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `page`、`page_size` | integer | 分页。 |
| `type` | string，多值 | 事件类型筛选；可重复传参。 |
| `start_time_start` | Unix 秒 | 开始时间下界。 |
| `start_time_end` | Unix 秒 | 开始时间上界。 |
| `start_time_sort` | `asc`/`desc` | 按开始时间排序。 |
| `title` | string | 标题模糊搜索。 |

类型枚举实测/资料包含：`MainStory`、`OtherStory`、`Event`、`Gacha`、`Double`、`MiniBattle`、`Raid`、`BigRaid`、`AlliedOperation`、`ContentImprovements`、`Maintenance`、`Live`、`WebEvent`、`OutsideGame`、`Other`、`Trivia`。服务端曾返回 `OutsideGames` 统计键，和筛选值 `OutsideGame` 不一致，按接口实际需要测试，不要自行归一化。

```bash
curl "https://api.kivo.wiki/api/v1/timeline?page=1&page_size=20&type=Raid&type=Event&start_time_sort=desc"
```

列表 `data` 还包含 `type_num`，是类型到数量的映射。列表项常见字段：`id`、`line_type`、`title`、`image`、`body_summary`、`type`、`url`、`start_time`、`end_time`。

`GET /api/v1/timeline/{id}` 返回详情并将 `body_summary` 替换/扩展为完整 `body`，通常还有 `created_at`、`updated_at`。

```bash
curl "https://api.kivo.wiki/api/v1/timeline/5919"
```

### 7.7 公告

`GET /api/v1/bulletins`

参数：`page`、`page_size`。列表数组键为 `bulletin`。

```bash
curl "https://api.kivo.wiki/api/v1/bulletins?page=1&page_size=10"
```

列表项常见字段：`id`、`title`、`created_at`、`updated_at`。详情 `GET /api/v1/bulletins/{id}` 返回 `id`、`title`、`body`、`created_at`、`updated_at`。

```bash
curl "https://api.kivo.wiki/api/v1/bulletins/39"
```

## 8. 实时和快捷数据

### 8.1 当前卡池

`GET /api/v1/data/pick_up?server={server}`

`server` 必填。旧资料只列出 `jp` 和 `cn`；当前接口对 `jp`、`cn` 均成功。返回：`start_date`、`end_date`、`banner`。

```bash
curl "https://api.kivo.wiki/api/v1/data/pick_up?server=jp"
```

日期字段是 Unix 秒。`banner` 可能为空字符串。

### 8.2 当前总力战/大决战

`GET /api/v1/data/raid/now?server={server}`

`server` 必填，常用 `jp`、`cn`。返回 `start_date`、`end_date`、`banner`。

```bash
curl "https://api.kivo.wiki/api/v1/data/raid/now?server=jp"
```

“当前”由服务端定义；返回时间在未来或空状态都应视为有效数据，不要只凭客户端本地时间过滤。

### 8.3 当前活动

`GET /api/v1/data/event/now?server={server}`

`server` 必填，常用 `jp`、`cn`。返回 `start_date`、`end_date`、`banner`。

```bash
curl "https://api.kivo.wiki/api/v1/data/event/now?server=jp"
```

### 8.4 幸运物

`GET /api/v1/data/lucky_item`

无已知查询参数。返回：

```json
{"type":"item","id":559}
```

```bash
curl "https://api.kivo.wiki/api/v1/data/lucky_item"
```

`type` 可能为 `item`、`equipment` 等资源类型；`id` 需结合类型选择后续接口。前端请求使用过末尾 `/`。

### 8.5 站点统计

`GET /api/v1/statistics/index`

返回：

```json
{"users_number":27249,"pictures_number":20098,"students_number":616}
```

```bash
curl "https://api.kivo.wiki/api/v1/statistics/index"
```

这些数字是站方统计快照，不保证与各列表当前最大页码对应，也不应作为分页记录总数的替代品。

### 8.6 资源服务器地址

`GET /api/v1/upload/file_server`

虽然路径含 `upload`，当前公开请求是 GET 且返回静态资源主机，不代表存在公开上传能力。

```bash
curl "https://api.kivo.wiki/api/v1/upload/file_server"
```

返回：

```json
{"server_host":"static.kivo.wiki"}
```

### 8.7 API 根信息

`GET /api/v1/`

返回通用信封及 `message`、`success` 等元信息，通常没有 `data`：

```bash
curl "https://api.kivo.wiki/api/v1/"
```

## 9. HTTP 错误与健壮性

实测不存在的详情 ID 返回 HTTP 404；错误响应正文未在本次资料中形成稳定的错误 JSON 规范。因此客户端应同时处理：

1. 网络错误、超时、DNS/TLS 错误。
2. HTTP 非 2xx，尤其是 404、429、5xx。
3. HTTP 2xx 但 `success=false`。
4. `data` 缺失、数组为 `null`、空字符串资源和新增字段。

不要无限重试 4xx。对 429 和 5xx 使用有限次数的指数退避；批量抓取应设置并发上限、缓存和请求间隔。
