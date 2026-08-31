# Kivowiki-Mods Core

Kivowiki-Mods 是用于 [基沃托斯古书馆](https://kivo.wiki/) 的 Chromium 扩展和本地模块管理器。它负责安装、启停和更新模块，处理依赖与配置，并在模块运行异常时隔离故障。

当前 Core 版本为 `1.6.1`，支持 Chrome、Edge 及其他兼容 Manifest V3 和 User Scripts API 的 Chromium 浏览器。

## 主要功能

- 从 JSON、ZIP、项目文件夹或公开 GitHub/GitLab 仓库安装模块与依赖。
- 安装前检查清单、权限、来源、签名、依赖、冲突和常见风险代码。
- 独立启停、配置、导出、更新和回滚社区模块。
- 支持依赖多版本共存、传递依赖、版本范围、锁定选择和冲突阻止。
- 提供页面模式和严格沙箱模式；连续启动失败的模块可自动隔离。
- 提供按需市场、自定义 HTTPS 索引源、内置推荐和 Git 仓库入口。
- 模块文件、设置、历史修订和用户选择的媒体均保存在本机。

扩展内置 `Kivowiki-Mods-quick-tools`，提供返回顶部、打开站内原生角色图鉴和夜间模式等常用操作。

## 安装

### Chrome Web Store

商店版本可直接从 Chrome Web Store 安装，后续更新由浏览器处理。
传送门：
[https://chromewebstore.google.com/detail/kivowiki-mods/](https://chromewebstore.google.com/detail/kivowiki-mods/)


页面模式模块需要 User Scripts API；Chrome 138 及以上版本还要在扩展详情页打开“允许用户脚本”。

### 从源码加载

1. 下载或克隆本仓库。
2. 打开 `chrome://extensions` 或 `edge://extensions`。
3. 开启“开发者模式”。
4. 选择“加载已解压的扩展”，然后选择包含 `manifest.json` 的仓库根目录。
5. Chrome 138 及以上版本进入扩展详情页，打开“允许用户脚本”。
6. 打开或刷新 [KivoWiki](https://kivo.wiki/)，页面左侧会出现 Kivowiki-Mods 入口。

修改源码后，需要先在扩展管理页重新加载扩展，再刷新已经打开的 KivoWiki 页面。

## 使用

点击浏览器工具栏中的 Kivowiki-Mods 图标可以查看运行概况并打开配置中心。配置中心分为四部分：

- **模块**：管理已安装功能模块，支持搜索、配置、启停、导入、更新、历史回滚、导出和移除。
- **依赖**：查看模块使用的共享能力包及其版本和依赖关系。
- **市场**：查看内置推荐、读取 GitHub 社区目录，或合并自己添加的 HTTPS 索引源。
- **设置**：控制页面入口、安全模式、崩溃隔离和自定义市场源。

配置中心顶部版本号可以打开 Core 仓库。由 GitHub/GitLab 安装且带有有效来源信息的模块，会在模块卡片中显示“查看仓库”；推荐和市场结果也提供同样的入口。

### 市场和 Git 导入

打开配置中心、切换到市场或查看推荐不会联网。每次主动点击“探索发现”后，扩展都会重新读取 GitHub 的 `kivowiki-mods` Topic 页面，并通过 Raw 文件服务验证候选仓库根目录中的模块清单和入口文件。内置推荐仓库会作为候选补充，因此仓库暂时没有 Topic 或 Topic 页面异常时，已登记的模块仍可能被发现。该流程不调用 GitHub REST Search API，也不需要 Token。

市场中的搜索、类型筛选、排序和分页均在本地执行。再次点击“探索发现”会主动刷新社区目录；“刷新目录”也会执行同样的刷新。单个仓库校验失败只会跳过该仓库，不影响其他结果。

点击推荐、市场结果或 Git 仓库导入的“安装”后，管理器会打开下载状态窗口。服务器提供总大小时显示百分比和已下载容量；没有总大小时显示实时接收容量。下载可主动取消，超过 90 秒、网络失败、HTTP 错误或包体超过 100 MB 时会保留明确的错误提示。只有下载完成并通过本地预检后，才会打开安装确认界面。

推荐和市场结果会根据当前本地安装记录显示“已安装”或“升级到 vX.Y.Z”。同一包已安装且没有更高版本时，按钮会禁用，避免重复点击和重复安装；版本更新后则可以直接升级。

要让仓库出现在社区探索结果中：

1. 使用公开 GitHub 仓库，并在仓库根目录提供有效的 `module.json`、`dependency.json` 或兼容清单。
2. 在仓库 Topics 中添加 `kivowiki-mods`。
3. 确认清单声明的入口和可选配置文件已提交到默认分支。
4. 新发布的社区包使用清单 v4，并声明与 Core 和平台 API 兼容的版本范围。

Topic 目录不是审核名单。市场结果仍需在安装时下载完整包，并经过与本地导入相同的预检和用户确认。未使用 Topic、采用 monorepo 子目录或尚未收录的项目，可以直接在模块页使用“Git 仓库”导入；需要让它出现在探索列表时，也可以将仓库加入 Core 的 `recommendations.js` 登记配置。

GitHub 网页、Raw 文件和仓库归档仍可能受网络或 GitHub 内容服务频控影响。直接 Git 导入不消耗 REST Search API 额度，但不能绕过 GitHub 自身的内容下载限制。

### 本地数据与备份

- 管理器状态和小型设置保存在 `chrome.storage.local`。
- 模块文件、用户媒体和最近三份历史修订保存在 IndexedDB。
- 配置和模块数据不会由 Core 主动上传。
- “导出社区备份”当前导出社区功能模块及其文件和设置；社区依赖、管理器偏好和内部锁定状态不属于完整设备备份。

## 安全边界

社区模块有两种运行方式：

- `page`：运行在 KivoWiki 页面环境，可实现完整页面增强，也能够接触页面 DOM 和页面自身可用的浏览器能力。只应安装可信代码。
- `sandbox`：运行在扩展沙箱中，不能访问 KivoWiki DOM、扩展 API 或网络，只能使用受限 UI、设置和包内资源能力。

全局安全模式会强制社区模块使用严格沙箱。模块的权限声明用于安装提示和宿主能力控制，不能把页面模式变成浏览器进程级沙箱。

数字签名可以证明签名后的包未被修改；首次自签名不能证明作者现实身份。仓库来源、作者和审核信息也可能由包作者自行声明。安装第三方模块前应检查仓库、权限和代码。

Core 不向模块提供认证、账号、写入或后台管理接口，也不会在扩展中保存 GitHub Token。

## 模块开发

新模块建议从 [`examples/hello-module`](examples/hello-module/) 开始。社区模块应做到可独立安装、停用和清理，不依赖 Core 的私有存储结构、消息格式或 DOM 实现。

最小清单示例：

```json
{
  "manifestVersion": 4,
  "type": "module",
  "id": "reading-progress",
  "name": "Kivowiki-Mods-reading-progress",
  "version": "1.0.0",
  "description": "显示当前页面的阅读进度。",
  "author": "Your Name",
  "mode": "page",
  "entry": "src/index.js",
  "permissions": [
    { "id": "page.read", "reason": "读取页面滚动位置。" },
    { "id": "page.modify", "reason": "显示阅读进度条。" }
  ],
  "dependencies": {},
  "engines": {
    "kivowikiMods": "^1.6.1",
    "api": "^1.1.0"
  }
}
```

页面模式入口是一个返回模块对象的 JavaScript 表达式：

```js
({
  mount(context) {
    const bar = context.document.createElement("div");
    bar.className = "reading-progress";
    context.document.body.append(bar);

    const update = () => {
      const page = context.document.documentElement;
      const max = page.scrollHeight - context.window.innerHeight;
      bar.style.width = `${max > 0 ? context.window.scrollY / max * 100 : 0}%`;
    };

    context.window.addEventListener("scroll", update, { passive: true });
    update();
    context.onCleanup(() => {
      context.window.removeEventListener("scroll", update);
      bar.remove();
    });
  }
})
```

`mount()` 中创建的 DOM、事件、定时器、观察器、样式和 Object URL 必须在 `context.onCleanup()` 中释放。设置变化优先使用 `context.onSettingsChange()` 更新现有界面，避免重复挂载。

### Context API 摘要

| 能力 | 用途 |
| --- | --- |
| `document` / `window` / `site` | 当前 KivoWiki 页面和路由信息，仅页面模式可用 |
| `settings` / `saveSettings()` | 读取和保存当前模块设置 |
| `storage` | 当前模块隔离的本地业务存储 |
| `onSettingsChange()` | 接收设置变化 |
| `onCleanup()` | 登记停用和重载时的清理函数 |
| `dependencies` | 读取清单声明的依赖实例 |
| `assets` / `userAssets` | 读取包内资源或用户主动选择的本地媒体 |
| `api` / `data` | 获得授权后的通用只读请求能力 |
| `log()` | 写入管理器诊断日志，不得记录隐私和凭据 |

严格沙箱使用受限的 `context.ui` 渲染视图，不提供页面 DOM 和网络。配置脚本运行在独立配置 iframe 中，只能操作自己的文档、设置和允许的资源。

### KivoWiki 公开只读数据

需要公共 Wiki 数据时，模块可声明 `core-runtime` 依赖并申请 `network.read` 权限：

```json
{
  "dependencies": { "core-runtime": "^1.1.0" }
}
```

通过 `context.dependencies["core-runtime"]` 使用以下稳定语义方法：

- `kivoApi.list(resource, query)`：读取一页公开资源。
- `kivoApi.get(resource, id)`：读取单项公开资源。
- `kivoApi.listAll(resource, query, options)`：按服务端分页信息批量读取，并支持并发上限和进度回调。
- `resourceUrl(value)`：规范化公开静态资源地址。
- `kivoApi.listStudents()`、`getStudent()` 等常用语义方法。

公开资源包括学生、学校、关系、物品、模型、Spine、文章、新闻、漫画、画廊、音乐、时间轴和公告。接口只支持只读请求，不携带凭据，带有超时、有限重试、请求合并和缓存。不要依赖服务端未公开字段，不要调用认证、账号、上传、统计或基础设施接口。完整约束见 [平台数据能力契约](docs/platform-data-contract.md)。

## 本地开发

需要 Node.js 18 或更高版本。

```bash
npm run build
npm test
npm run check
```

- `npm run build` 构建内置 quick-tools，并覆盖其 `src/index.js` 与 `src/config.js` 产物。
- `npm test` 运行 Node 测试。
- `npm run check` 安装 quick-tools 的锁定依赖、重新构建、运行测试和发布结构校验，并整理子项目依赖目录。

主要目录：

```text
dependencies/                 内置共享依赖
modules/                      内置模块源码与构建产物
examples/hello-module/        社区模块示例
docs/                         开发、安全、数据和发布验证文档
platform.js                   版本、权限、依赖和兼容性解析
module-store.js               模块导入、存储、市场和历史修订
content.js / background.js    页面宿主与扩展后台
options.*                     配置中心
```

## 文档

- [模块开发指南](docs/module-development.md)
- [模块安全与分发规范](docs/module-security.md)
- [平台数据能力契约](docs/platform-data-contract.md)
- [技术验证清单](docs/technical-validation.md)

## 许可证

当前仓库尚未添加 `LICENSE` 文件。在许可证确定前，公开源码仅供查看，不表示已授予复制、修改或再分发许可。正式接受社区使用和贡献前，请由仓库所有者选择并添加适合项目的开源许可证。

作者：朝禊ASOGI · [Bilibili](https://space.bilibili.com/315312)
