# 证据、版本与限制

## 资料来源

本目录依据以下工作区材料整理：

- `玩家解析的API.md`：社区旧版接口路径、分页参数、过滤枚举和使用备注。
- `sitemap解析.md`：网站页面路由和资源数量统计。它用于确认页面资源范围，不直接证明 API 路由。
- `角色数据解析-1-(data.Students).md`：角色详情的 TypeScript 字段草案和脱水样本。
- `物品数据-(data.Item).json`、`学校数据-1-(data.School).json`、`关系数据-1-(data.Relation).json`、`音乐数据-1-(music).json`、`画廊数据-1-(gallery).json`、`文章数据-(article).json`、`新闻数据-1-(news).json`、`漫画章节-1-( comics.Chapter).json`、`漫画图片-1-（comics.Chapter.Image）.json`、`时间轴数据-(timeline).json`、`模型数据-1-(data.Model).json`、`spine数据-1-(data.Spine).json`、`重定向数据-1-(redirect).json`：字段样本。
- 线上公开接口实测：2026-08-28。实测 API 返回版本 `1.0.0-beta.43`，codename `Koyuki`。
- KivoWiki 前端公开网络请求：确认了 `/api/v1/news/`、`/api/v1/data/lucky_item/`、`/api/v1/upload/file_server`、首页使用的快捷接口，以及带末尾 `/` 的有效形式。

## 可信度等级

### A：直接线上实测

以下路径曾以公开请求返回成功结果：

- `/api/v1/`
- `/api/v1/data/students`、`/data/students/{id}`、`/data/students/birthday/week`
- `/api/v1/data/schools`、`/data/schools/{id}`
- `/api/v1/data/relations`、`/data/relations/{id}`
- `/api/v1/data/items`、`/data/items/{id}`
- `/api/v1/data/models`、`/data/models/{id}`
- `/api/v1/data/spines`、`/data/spines/{id}`
- `/api/v1/articles`、`/articles/{id}`
- `/api/v1/news`、`/news/{id}`
- `/api/v1/comics`、`/comics/{id}`、`/comics/{comic_id}/chapters/{chapter_id}`
- `/api/v1/galleries`、`/galleries/{id}`
- `/api/v1/musics`、`/musics/{id}`
- `/api/v1/timeline`、`/timeline/{id}`
- `/api/v1/bulletins`、`/bulletins/{id}`
- `/api/v1/statistics/index`
- `/api/v1/data/pick_up?server=jp|cn`
- `/api/v1/data/raid/now?server=jp|cn`
- `/api/v1/data/event/now?server=jp|cn`
- `/api/v1/data/lucky_item`
- `/api/v1/upload/file_server`

### B：旧文档或样本支持，线上行为未完全验证

- 学生列表的全部过滤器和排序器，尤其 `special_apperance`、`eqipment`、设计师/原画师完整值域。
- 时间轴全部筛选枚举和多值分隔约定。
- `summary_size` 的单位和上限。
- 物品 `type` 全部枚举，以及 `is_bind_article` 的实际筛选语义。
- 关系详情中 `main_students`、`secondary_students` 的完整对象结构。
- 认证相关接口、配队/攻略接口、站方内部编辑接口。

### C：推断或需要站方确认

- API 是否有正式 SLA、速率限制、缓存策略和版本兼容承诺。
- 完整错误码、错误 JSON 格式和 429 响应头。
- 所有 ID 是否永久稳定，以及删除记录如何表现。
- `time` 的时钟来源和是否保证秒精度。
- `server` 是否会加入国际服以外的新区域参数。
- `upload/file_server` 名称虽然含 upload，但当前只确认了读取静态主机，不应推断公开上传权限。


| 主题 | 观察结果 | 使用建议 |
|---|---|---|
| 页面与 API 名称 | 页面 `/data/character/{id}`，API `/data/students/{id}` | 按 API_REFERENCE 调用，维护映射表。 |
| 页面物品路由 | 页面 `/data/item/{id}`，API `/data/items/{id}` | 注意单复数。 |
| 页面漫画路由 | 页面 `/comic/{id}`，API `/comics/{id}` | API 使用复数。 |
| 页面音乐路由 | 页面 `/music/{id}`，API `/musics/{id}` | API 使用 `musics`。 |
| 末尾斜杠 | 带斜杠和不带斜杠均有成功实测 | 客户端统一一种形式。 |
| 学生字段拼写 | `is_groupc_control` 出现在详情样本，过滤器记录为 `is_group_control` | 保留原字段，兼容两种命名。 |
| 装备字段拼写 | 旧资料记录 `eqipment` | 查询时按服务端原拼写，需实测确认。 |
| 画廊分类字段 | `categorys` | 按原字段解析，不要假设为 `categories`。 |
| 漫画页码字段 | `pagen_number` | 按原字段解析；显示层可映射为 pageNumber。 |
| 时间轴类型 | 过滤值有 `OutsideGame`，统计键曾出现 `OutsideGames` | 不要跨字段强行共用枚举。 |
| 空数据 | `banner` 可为 `""`，关系学生可为 `null`，列表异常参数可出现 `null` 数组 | 空值是合法业务状态，做显式处理。 |


若站长希望把本手册升级为官方稳定版，最值得补充的是：

1. 提供正式 OpenAPI 文件或 Go 路由注册表。
2. 公布认证、速率限制、缓存和版本淘汰策略。
3. 为每个接口提供稳定错误码和错误响应样例。
4. 明确所有分页上限、空页行为和记录总数获取方式。
5. 确认 `special_apperance`、`eqipment` 等历史拼写是否长期保留。
6. 提供配队/攻略、重定向、贡献者等尚未纳入公开参考的接口说明。
