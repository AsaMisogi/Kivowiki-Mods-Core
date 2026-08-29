已解析并处理提供的网站地图（`input_file_0.xml`），共提取到 **3,736** 个 URL。

整个站点的 URL 结构非常规范，呈现标准的 **RESTful 资源命名风格**（主要基于资源前缀 + 纯数字 ID）。全站可聚合归纳为 **8 个核心路由模式**。

---

### 📊 核心路由模式汇总表

| 序号 | 核心路由模式 (Route Pattern) | 对应业务/资源类型 | URL 总数 | 占比 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `/data/item/{id}` | 游戏道具 / 装备 / 素材 / 家具 | 1,997 | 53.45% |
| 2 | `/music/{id}` | 游戏原声 / 音乐单曲 / 专辑广播剧 | 994 | 26.61% |
| 3 | `/data/character/{id}` | 角色 / 学生 / NPC 档案 | 616 | 16.49% |
| 4 | `/article/{id}` | 考据文章 / 资讯 / 官方访谈 | 53 | 1.42% |
| 5 | `/gallery/{id}` | CG 画廊 / 背景图 / 宣传图库 | 37 | 0.99% |
| 6 | `/data/organize/{id}` | 学院 / 社团 / 组织阵营数据 | 30 | 0.80% |
| 7 | `/comic/{id}` | 官方四格 / 连载漫画合集 | 8 | 0.21% |
| 8 | `/` | 网站首页 | 1 | 0.03% |
| **合计** | **8 种核心模式** | - | **3,736** | **100%** |

---

### 📂 各分类代表性 URL 样例

#### 1. 道具/物品数据：`/data/item/{id}`（共 1,997 条）
* `https://kivo.wiki/data/item/2` （基础战术教育BD）
* `https://kivo.wiki/data/item/3` （一般战术教育BD）
* `https://kivo.wiki/data/item/4` （高级战术教育BD）

#### 2. 音乐/原声带：`/music/{id}`（共 994 条）
* `https://kivo.wiki/music/1` （Constant Moderato）
* `https://kivo.wiki/music/2` （Luminous memory）
* `https://kivo.wiki/music/3` （Mischievous Step）

#### 3. 角色/学生档案：`/data/character/{id}`（共 616 条）
* `https://kivo.wiki/data/character/1` （圣园未花）
* `https://kivo.wiki/data/character/2` （才羽桃井）
* `https://kivo.wiki/data/character/3` （白洲梓）

#### 4. 文章与考据：`/article/{id}`（共 53 条）
* `https://kivo.wiki/article/4` （【汉化合集】Schale的冰淇淋大作战）
* `https://kivo.wiki/article/5` （【考据】碧蓝档案开发组剧情写手表记）
* `https://kivo.wiki/article/6` （清溪川的梗从何而来？）

#### 5. 画廊与图库：`/gallery/{id}`（共 37 条）
* `https://kivo.wiki/gallery/1` （背景图 BG 画廊）
* `https://kivo.wiki/gallery/2` （主线剧情第1部 CG 画廊）
* `https://kivo.wiki/gallery/6` （活动相关图像画廊）

#### 6. 学院与组织：`/data/organize/{id}`（共 30 条）
* `https://kivo.wiki/data/organize/1` （阿比多斯高中）
* `https://kivo.wiki/data/organize/2` （圣三一综合学园）
* `https://kivo.wiki/data/organize/3` （格赫娜学园）

#### 7. 官方漫画：`/comic/{id}`（共 8 条）
* `https://kivo.wiki/comic/1` （国际服官方四格漫画）
* `https://kivo.wiki/comic/2` （布噜布噜档案①）
* `https://kivo.wiki/comic/3` （蔚蓝档案！）

#### 8. 站点首页：`/`（共 1 条）
* `https://kivo.wiki`

---

### 💡 针对 API 研究的建议

1. **资源维度映射**：
   * 基础数据类接口通常挂载在 `/api/data/*` 或 `/api/*` 下（如 `character`、`item`、`organize`）。
   * 媒体与内容类接口通常挂载在 `/api/music/*`、`/api/gallery/*`、`/api/article/*`、`/api/comic/*`。
2. **ID 规律**：所有详情路由的参数均为自增正整数（`{id: integer}`），在编写抓取脚本或 API 测试时，可通过数值区间直接遍历或按需请求。