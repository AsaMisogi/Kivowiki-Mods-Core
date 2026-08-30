# Kivowiki-Mods 模块开发指南

本文面向希望为 Kivowiki-Mods 编写扩展模块的开发者。模块应当能够单独启用、停用、配置和清理，并且不依赖管理器内部实现。

## 1. 运行模型

模块有两种运行模式。默认的 `page` 模式适合高度魔改，模块直接运行在当前 KivoWiki 页面中；`sandbox` 模式适合不信任或低权限模块。页面模式由 Chromium User Scripts API 注册为 `MAIN` world 脚本。扩展按以下顺序加载：

1. 浏览器加载 `dependencies/*.js` 和 `modules/*.js`，分别注册内置依赖与模块描述。
2. `content.js` 创建页面宿主和管理器入口，并读取 `chrome.storage.local` 中的状态。
3. 宿主校验依赖版本、传递依赖、循环、冲突和平台兼容性。
4. 管理器按模块生成独立依赖计划；同一依赖可多版本共存，每个模块按版本范围和锁文件选择精确版本。
5. 依赖按拓扑顺序初始化；同一页面内同一非 `scoped` 依赖精确版本只创建一个实例。
6. 依赖返回值按清单 `exports` 验证后，对可运行模块调用 `mount(context)`，通过 `context.dependencies` 注入只读依赖表。
7. 配置中心改变开关、设置或依赖版本后，宿主清理并重启受影响模块。

安全模式是全局开关，默认关闭。开启后，无论导入包声明什么模式，所有社区模块都会强制进入 `sandbox`。内置模块仍按扩展内置代码运行。

扩展内置模块脚本必须是自包含的 IIFE，避免创建全局变量污染。页面模式导入模块可以使用标准 JavaScript 能力；sandbox 模式没有页面 DOM、扩展 API 或网络能力。安装器会扫描常见风险特征并展示权限、签名、来源、审核、依赖和冲突，但扫描不是安全证明。无签名、未认证或扫描有提示的模块仍允许用户自主安装。

## 2. 模块描述对象

每个模块向宿主注册一个对象（扩展内置模块使用这种方式）：

```js
(function registerModule() {
  const module = {
    id: "reading-progress",
    name: "Kivowiki-Mods-reading-progress",
    version: "1.0.0",
    description: "显示当前页面的阅读进度。",
    author: "Your Name",
    defaultSettings: {
      color: "#1e6870"
    },
    mount(context) {
      // 创建页面功能，并在这里注册事件监听。
    }
  };

  globalThis.KivowikiModsModules = globalThis.KivowikiModsModules || [];
  globalThis.KivowikiModsModules.push(module);
})();
```

### 字段约束

- `id`：全局唯一，只使用小写字母、数字和连字符，长度 2 至 49。
- `name`：必须以 `Kivowiki-Mods-` 开头，例如 `Kivowiki-Mods-reading-progress`。
- `version`：建议遵循 `主版本.次版本.修订版本`。
- `description`：一句话说明功能，不要塞入操作教程。
- `author`：作者或组织名称。
- `manifestVersion`：当前为 `4`；新包必须显式声明。
- `type`：`module` 表示功能模块，`dependency` 表示只提供能力的依赖。
- `permissions`：模块所需能力及中文用途说明，见“权限声明”。
- `dependencies`、`optionalDependencies`：依赖包 ID 到语义化版本范围的映射；不再用于引用其他功能模块。
- `conflicts`：与其他包的冲突关系。
- `dependencySources`：依赖 ID 到公开 GitHub/GitLab 仓库地址的映射，用于自动下载缺失依赖。
- `exports`：仅依赖包使用，声明 `create()` 返回对象必须具备的运行时接口类型。
- `claims`：声明可能占用的全局对象、页面选择器和路由，帮助管理器提示潜在重叠。
- `engines`：兼容的管理器版本与平台 API 版本。
- `publisher`、`source`、`review`、`signature`：发布与审计元数据，详见 [安全分发规范](module-security.md)。
- `defaultSettings`：JSON 兼容的默认设置对象。不要放函数、DOM 节点或敏感信息。
- `mount(context)`：模块启用时调用。所有监听器、定时器和节点都必须在其中创建并登记清理逻辑。

## 3. Context API

### 页面模式 `page`

导入包默认使用页面模式。页面模式模块的 `code` 是一个返回模块对象的 JavaScript 表达式，例如：

```js
({
  mount(context) {
    const panel = document.createElement("aside");
    panel.id = "my-kivo-panel";
    panel.textContent = "这是一个完全自定义的页面模块";
    document.body.append(panel);
    context.onCleanup(() => panel.remove());
  }
})
```

页面模式的 `context` 提供：

- `context.root`、`context.document`、`context.window`：当前 KivoWiki 页面对象。
- `context.site`：当前页面的 `hostname` 与 `pathname`。
- `context.settings`：该模块的本地设置快照。
- `await context.saveSettings(settings)`：异步保存该模块设置；即使宿主采用消息传递，也必须返回可等待的 Promise。
- `context.onSettingsChange(callback)`：监听设置变化。
- `context.onCleanup(callback)`：停用或重载前清理资源。
- `context.storage.get(key)`、`context.storage.set(values)`：访问以模块 ID 隔离的本地存储。
- `context.permissions`：用户已授予且当前管理器认识的权限 ID 快照。
- `context.platform`：管理器、清单和平台 API 版本及功能标识。
- `context.dependencies`：清单声明的直接和传递依赖实例只读表。
- `context.api`：版本化的官方 API 适配契约，不包含具体站点地址。
- `context.log(level, message)`：写入管理器日志查看器；不得写入 Cookie、Token 或账号隐私。

声明并获得 `network.read` 后，页面模式可使用 `context.data.request(input)` 或等价的 `context.api.request(input)` 只读数据能力。它支持 URL、查询参数、超时、有限重试和内存缓存，并同时处理 HTTP 状态与常见业务信封。该接口不包含任何具体站点地址或业务路径；模块应把站点适配器放在自己的 `services/` 目录中，UI 不直接拼接地址。完整约束见 [平台数据能力契约](platform-data-contract.md)。

页面模式允许模块直接使用标准浏览器能力，例如 `MutationObserver`、`history`、`URL`、`document.createElement`、任意模块 CSS、站点路由监听和页面组件增强。模块不能读取扩展 API、浏览器历史或其他标签页；但因为它运行在页面环境，理论上可以读取页面 DOM、非 HttpOnly 的 `document.cookie`，并使用网页本身允许的网络能力。管理器不会提供后台写入接口或具体站点 API 代理。

管理器内置 `Kivowiki-Mods-core-runtime`，统一提供 KivoWiki 公开只读 API、批量分页、请求合并、缓存和静态资源 URL 规范化。需要这些能力的模块应声明 `"core-runtime": "^1.1.0"` 并通过 `context.dependencies["core-runtime"]` 调用，不要重复打包请求客户端。完整通用请求约束见 [平台数据能力契约](platform-data-contract.md)。

页面模式的代码会被注入当前页面，因此它是“用户主动信任代码”模式。模块作者可以自由改写页面，但必须自己负责页面稳定性、内存占用、事件清理和网络请求频率。页面模式使用 Chrome 120+ 的 User Scripts API，用户需要在 `chrome://extensions` 中开启开发人员模式；Chrome 138+ 还需在扩展详情页开启“允许用户脚本”。

### 严格沙箱模式 `sandbox`

沙箱模块不能访问页面 DOM、扩展 API 或网络，只能通过 `context.ui` 渲染受限面板和接收按钮事件。安全模式开启时，页面模式导入包也会强制按此方式运行。

### `context.root`

模块 UI 的推荐挂载点。它位于管理器的 Shadow DOM 内，适合放置不会影响站点布局的悬浮控件、提示或面板。模块自己的 CSS 可以通过 `context.root.append(style)` 注入。

以下 `root`、`setGlobalStyle` 接口只适用于扩展内置模块，不适用于导入的 sandbox 模块。sandbox 模块使用后文的受限 UI 协议。

### `context.site`

只读页面信息：

```js
{
  hostname: "kivo.wiki",
  pathname: "/data/character/76"
}
```

根据路由决定功能时，应使用 `pathname` 并容忍站点未来新增查询参数或尾部斜杠。

### `context.settings`

模块设置的快照，已经和 `defaultSettings` 合并。不要直接修改它；使用新对象调用 `saveSettings`。

### `await context.saveSettings(settings)`

保存当前模块设置。宿主会写入本地 `chrome.storage.local`，并通知其他页面上下文；Promise 在实际写入完成后 resolve，写入失败时 reject。只能保存本模块的 JSON 兼容数据。

### `context.onSettingsChange(callback)`

注册设置变化回调。回调参数是新的设置对象。模块需要在回调中更新已有 UI 和行为，不要重复创建整个模块。

### `context.setGlobalStyle(id, css)`

设置一段需要作用于 KivoWiki 页面根文档的 CSS。`id` 必须由模块固定生成且全局唯一，例如 `reading-progress-style`。传空字符串可以移除这段 CSS。全局样式应尽量使用明确的模块前缀选择器，避免覆盖站点不相关内容。

### `context.onCleanup(callback)`

登记卸载回调。模块停用或宿主重载模块时调用。所有事件监听器、`setInterval`、MutationObserver、页面节点和全局样式都必须在这里清除。

## 4. 最小完整示例

```js
(function registerReadingProgress() {
  const module = {
    id: "reading-progress",
    name: "Kivowiki-Mods-reading-progress",
    version: "1.0.0",
    description: "在页面顶部显示阅读进度。",
    author: "Your Name",
    defaultSettings: { color: "#1e6870" },
    mount(context) {
      const bar = document.createElement("div");
      bar.className = "reading-progress-bar";
      context.root.append(bar);

      const style = document.createElement("style");
      style.textContent = `
        .reading-progress-bar { position: fixed; top: 0; left: 0; z-index: 2147483646; height: 3px; width: 0; background: ${context.settings.color}; }
      `;
      context.root.append(style);

      const update = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? window.scrollY / max : 0;
        bar.style.width = `${Math.min(1, Math.max(0, ratio)) * 100}%`;
      };
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
      update();

      context.onCleanup(() => {
        window.removeEventListener("scroll", update);
        window.removeEventListener("resize", update);
        bar.remove();
        style.remove();
      });
    }
  };

  globalThis.KivowikiModsModules = globalThis.KivowikiModsModules || [];
  globalThis.KivowikiModsModules.push(module);
})();
```

## 5. 安全边界

模块开发者必须遵守以下规则：

- 只在用户明确授权的 KivoWiki 页面范围内工作，不把脚本注入其他站点。
- 不收集、读取或上传 Cookie、令牌、账号信息、浏览历史或表单隐私。
- 不调用管理器未公开的接口；不要从页面网络请求中猜测站点内部接口。
- 页面模式可以使用标准 JavaScript 能力，但模块作者应自行审阅动态代码和远程资源。安装器只提示常见风险特征，不会因风险关键词拒绝安装；严格沙箱依靠浏览器 CSP 阻止网络和页面访问。
- 不使用 `innerHTML` 插入用户或网络返回的未经清理文本。优先使用 `textContent` 和 DOM API。
- 对 Markdown、HTML、图片和链接等外部内容进行安全过滤，禁止脚本协议和事件属性。
- 不阻塞页面主线程；长任务、批量 DOM 处理和网络操作要分批、限频、可取消。
- 不覆盖站点全局 CSS；页面样式必须使用模块前缀或 Shadow DOM。

模块管理器当前提供本地 `storage`、`userScripts`、KivoWiki 页面匹配和模块资源访问。页面模式模块不能获得扩展 API 或后台写入接口；若未来增加下载、剪贴板、其他站点、网络或写入能力，必须新增明确的权限和用户确认，并同步修改清单、README 和用户授权说明。

## 6. 注册与打包

1. 在 `modules/` 新建模块项目目录。
2. 使用唯一 `id` 注册模块对象。
3. 内置模块的入口脚本加入 `manifest.json` 的 `content_scripts[0].js`，放在 `content.js` 之前；社区模块通过 ZIP 导入。
4. 在 `options.html` 和 `popup.html` 中加入同一个模块脚本，使配置中心和弹窗可以读取模块元数据。
5. 重新加载扩展并在配置中心验证清单和开关。
6. 发布前人工检查权限、网络访问、DOM 范围和清理逻辑。

## 7. 导入模块包

配置中心支持本地单文件 JSON、完整 ZIP 项目包、选定的整个项目文件夹，以及公开 GitHub/GitLab 仓库链接。文件夹选择使用浏览器的目录选择器，文件会先在内存中按相对路径组成包，再进入与 ZIP 完全相同的预检；不会上传文件夹内容。远程仓库会下载默认分支 ZIP，然后进入与本地文件完全相同的预检。包和解压后总大小上限为 100 MB，单文件 32 MB，入口与配置脚本各 4 MB，文件数量最多 2048。资源存储在 IndexedDB，不占用 `chrome.storage.local` 的小配额。ZIP 根目录（或选定文件夹的最外层目录）必须包含 `module.json`、`dependency.json` 或 `manifest.json`。

### 7.1 让 Git 仓库进入市场

Mod 市场会先搜索名称、描述和 README 中包含 `Kivowiki-Mods` 的公开 GitHub 仓库，再读取默认分支的 Git tree。只有仓库中存在有效的 `module.json` 或 `dependency.json`，且清单、入口文件与管理器版本验证通过，项目才会显示。开发者应遵循以下规范：

- 仓库必须公开、未归档、不是 fork，并确保默认分支可以下载。
- 清单使用 `manifestVersion: 4`，`name` 以 `Kivowiki-Mods-` 开头，`id`、`version`、`type` 和 `entry` 均合法。
- `entry` 指向的文件必须真实存在；`engines.kivowikiMods` 不应排除当前管理器版本。
- 仓库名称、简介或 README 建议明确写出 `Kivowiki-Mods`，否则 GitHub 公共搜索可能找不到仓库。
- monorepo 可以在子目录放置多个包，市场会按清单所在目录分别识别、安装和更新。
- 建议为每个稳定版本创建 GitHub Release 并上传 ZIP 附件；附件下载量可用于市场排序。

自定义 JSON 市场源的条目也必须明确填写 `type: "module"` 或 `type: "dependency"`；市场不会根据仓库名称猜测包类型。

市场识别只代表格式和兼容性筛选，不代表官方审核、作者认证或安全保证。用户点击安装后，包仍会经过完整本地预检。

项目中的 `examples/hello-module/` 是可压缩导入的完整页面模式示例。导入后，在目标页面右下角会看到模块面板，点击按钮会保存计数并重新渲染文本。

```json
{
  "manifestVersion": 4,
  "type": "module",
  "id": "reading-progress",
  "name": "Kivowiki-Mods-reading-progress",
  "version": "1.0.0",
  "description": "在页面中显示阅读进度。",
  "author": "Your Name",
  "mode": "page",
  "entry": "index.js",
  "config": "config.js",
  "permissions": [
    { "id": "page.read", "reason": "计算当前页面的阅读比例。" },
    { "id": "page.modify", "reason": "显示页面顶部进度条。" },
    { "id": "settings", "reason": "保存颜色配置。" }
  ],
  "dependencies": {},
  "optionalDependencies": {},
  "conflicts": { "other-progress": "*" },
  "engines": { "kivowikiMods": "^1.4.0", "api": "^1.1.0" },
  "claims": { "globals": [], "pageSelectors": [".reading-progress-bar"], "routes": [] },
  "settings": { "color": "#1e6870" },
  "files": ["index.js", "config.js", "styles.css"]
}
```

导入前会显示一页温和的权限与风险确认。无签名、未认证、签名异常、未知权限和依赖暂缺都允许安装。页面模式由 Chromium `userScripts` 在 KivoWiki 页面中运行；sandbox 模式进入扩展隔离沙箱。依赖、冲突或平台版本条件未满足时，模块保持已安装但暂不运行。

配置中心支持导出模块与依赖备份。备份是 JSON 文件，包含清单、入口、配置文件、设置和全部资源；可以导出单个包，也可以导出社区模块备份。备份改变了原始清单并加入本机设置，因此不会沿用作者原始签名。导入时会重新校验包类型、名称前缀、跨类型 ID 冲突、路径、入口、配置文件、重复文件和资源大小。内部锁文件会自动保存，不需要用户手动导出；迁移请使用社区备份。

单文件 JSON 仍支持原来的 `code` 字段，也可以通过 `configCode` 直接提供配置脚本。配置脚本导出同样的 `{ mount(context) {} }` 对象，运行在扩展 sandbox 的独立 DOM 中，用户点击模块卡片上的“配置”后打开。配置页可以使用 `context.document`、`context.root` 和 `context.saveSettings(settings)`，但不能访问 KivoWiki 页面、`chrome` 或网络。

## 8. 隔离模块 Context API

导入模块的页面运行时 `context` 与内置模块不同，刻意不提供 `chrome` 或扩展管理权限；sandbox 运行时不提供页面 DOM，配置页面运行时则只提供配置 iframe 自己的 `root`、`document` 和 `window`：

- `context.id`：模块 ID。
- `context.site`：当前页面的 `hostname` 与 `pathname` 快照。
- `context.settings`：模块自己的设置快照。
- `context.saveSettings(settings)`：异步保存 JSON 兼容设置，并返回代表宿主实际保存结果的 Promise；调用方可以用 `await` 或 `.catch()` 处理宿主关闭、通信失败等异常。
- `context.onSettingsChange(callback)`：接收设置变化。
- `context.onEvent(callback)`：接收用户点击模块按钮时的 `{ viewId, actionId }`。
- `context.onCleanup(callback)`：模块停用或重载时清理资源。
- `context.ui.render(viewId, view)`：渲染受限 UI。`view` 支持 `title`、`text`、`css` 和最多 8 个 `{ id, label }` 操作按钮。
- `context.ui.remove(viewId)`：删除模块视图。
- `context.ui.setText(viewId, target, text)`：预留的文本更新能力；当前建议重新 `render` 整个视图。
- `context.assets.getText(path)`：读取 ZIP 包内的文本资源，路径必须是包内相对路径。
- `context.assets.getFile(path)`：读取 ZIP 包内的二进制资源并返回 `Blob`；配置页面仅支持文本资源。
- `context.userAssets.put(slot, file)`、`context.userAssets.delete(slot)`：仅配置页面可用。保存或删除用户主动选择的本地图片/视频；资源按模块 ID 与槽位隔离，单文件上限 100 MB，保存在 IndexedDB，不进入普通设置或模块导出包。
- `context.userAssets.get(slot)`：仅页面模式可用。读取本模块配置页保存的用户资源，返回 `{ blob, name, type, size }`；宿主使用分块传输，模块应在不再使用时撤销自己创建的 Object URL。
- `context.dependencies`：模块声明的依赖实例表。严格沙箱中的依赖仍受 `connect-src 'none'` 限制。

## 9. 依赖包

依赖入口必须是一个 JavaScript 表达式，返回带 `create(dependencies, services)` 的对象。普通依赖的 `create` 在同一页面、同一修订下只调用一次；第一个参数包含已经初始化的传递依赖。返回值建议使用 `Object.freeze`，不要在创建时挂载 UI 或启动无条件轮询。

```js
({
  create(dependencies) {
    const formatter = dependencies["shared-formatter"];
    return Object.freeze({
      formatTitle(value) {
        return formatter ? formatter.clean(value) : String(value || "").trim();
      }
    });
  }
})
```

依赖清单示例：

```json
{
  "manifestVersion": 4,
  "type": "dependency",
  "id": "title-tools",
  "name": "Kivowiki-Mods-title-tools",
  "version": "1.0.0",
  "entry": "index.js",
  "scoped": false,
  "permissions": [],
  "dependencies": { "shared-formatter": "^1.0.0" },
  "conflicts": {},
  "exports": { "formatTitle": "function" },
  "claims": { "globals": [], "pageSelectors": [], "routes": [] },
  "engines": { "kivowikiMods": "^1.4.0", "api": "^1.1.0" }
}
```

依赖只提供能力，不保存功能模块的业务配置；具体逻辑、界面和用户设置仍属于模块。依赖以 `ID@版本` 独立保存，同一 ID 的多个版本可同时存在；管理器为每个模块选择满足其范围的版本，并把结果写入锁文件。需要绑定调用模块权限的依赖应声明 `scoped: true`：宿主仍共享包代码与后台缓存，但会为每个调用模块创建轻量能力门面，防止复用其他模块的授权上下文。内置 `core-runtime` 即采用此模式。

`exports` 是可递归的接口形状对象，支持 `any`、`array`、`boolean`、`function`、`number`、`object`、`string`。例如 `{ "client": { "request": "function" } }` 要求依赖实例具有 `client.request()`。它验证 JavaScript 运行时形状，不替代 TypeScript `.d.ts`；作者仍应随包提供完整类型声明供开发时使用。

模块可通过 `dependencySources` 为依赖提供公开 GitHub/GitLab 仓库：

```json
{
  "dependencies": { "shared-renderer": "^2.0.0" },
  "dependencySources": {
    "shared-renderer": "https://github.com/example/shared-renderer"
  }
}
```

管理器会递归下载清单明确提供来源的缺失依赖，校验 ID、类型和版本范围后，将依赖逐个放入正常安装确认队列。内置包 ID 不能通过远程依赖覆盖。

示例：

```js
({
  mount(context) {
    const render = () => context.ui.render("main", {
      title: "我的模块",
      text: `当前页面：${context.site.pathname}`,
      actions: [{ id: "refresh", label: "刷新" }]
    });
    render();
    context.onEvent((event) => {
      if (event.actionId === "refresh") render();
    });
    context.onCleanup(() => context.ui.remove("main"));
  }
})
```

浏览器对动态 User Scripts 的注册本身可能存在额外实现限制，因此大型资源应放入包内作为数据、模板、样式或媒体文件，保持入口脚本精简。宿主将消息限制为每秒 60 条、设置和单次模块存储写入限制为 64 KB。导入代码仍需要人工审阅，尤其关注死循环、过量渲染和隐私数据。

## 10. 运行隔离的限制

Manifest sandbox 是重要的权限边界，但不是代码质量审查的替代品。沙箱代码虽然不能读取扩展 API、页面 DOM 或网络，却仍可能消耗当前页面资源。管理器已提供消息限频、分批启动、启动超时、日志、连续崩溃隔离、签名校验、版本历史和回滚，但这些保护不能让第三方代码天然可信。第三方模块风险由安装者自行判断和承担。

## 11. 权限声明

清单 v4 中模块的 `permissions` 必须说明用途；依赖清单保持空权限数组。完整权限表和责任边界见 [模块安全与分发规范](module-security.md)。示例：

```json
{
  "permissions": [
    { "id": "page.read", "reason": "读取文章标题和当前阅读位置。" },
    { "id": "page.modify", "reason": "在文章顶部显示阅读进度。" },
    { "id": "network.read", "reason": "获取用户配置的数据源。", "optional": true }
  ]
}
```

安装界面会展示每项权限。必需权限随用户确认安装授予，可选权限可以取消；未知权限允许随包保存，但当前宿主不会开放对应能力。无签名、未认证、未知权限或风险扫描提示都不构成安装门禁。

页面模式可使用网页本身已有能力，所以权限声明主要约束宿主提供的 `storage`、`assets`、`settings` 和 `api` 能力，并向用户说明模块意图。它不能替代浏览器沙箱。严格沙箱中声明 `page.*`、`storage` 或 `network.read` 也允许安装，但这些能力不会开放，并会显示模式不匹配提示。

## 12. 依赖、冲突与版本

依赖和冲突使用包 ID 到版本范围的对象：

```json
{
  "dependencies": {
    "shared-renderer": "^2.1.0"
  },
  "optionalDependencies": {
    "theme-bridge": "~1.4.0"
  },
  "conflicts": {
    "legacy-renderer": "<3.0.0"
  },
  "engines": {
    "kivowikiMods": "^1.4.0",
    "api": "^1.1.0"
  }
}
```

支持精确版本、`>`、`>=`、`<`、`<=`、`^`、`~`、`x` / `*`、空格 AND 和 `||` OR。宿主先为每个模块选择精确依赖版本，再按拓扑顺序初始化依赖并分批启动模块；缺失依赖、停用、版本不符、传递依赖失败、循环依赖、任意包的 `conflicts` 或平台不兼容时仍允许安装，但暂不执行相关模块。锁文件优先复用已验证的精确版本；用户主动安装新依赖版本后，管理器重新选择满足范围的最高版本并生成新锁。

`claims` 用于提前提示两个包可能修改同一资源：

```json
{
  "claims": {
    "globals": ["KivoMyFeature"],
    "pageSelectors": [".student-card"],
    "routes": ["/data/character"]
  }
}
```

安装器也会从常见 `window.foo =`、`querySelector()` 和 History API 用法推断一部分声明。选择器相同不代表一定冲突，因此只显示提醒；确定不兼容时必须使用 `conflicts`。

模块升级、降级和重装都通过再次导入相同 ID 的包完成；依赖以精确 `ID@版本` 共存，同版本重装会保存旧修订。管理器最多保留 3 个历史版本。回滚保留当前设置与启用状态，并在回滚前把当前版本加入历史。带 Git 仓库来源的包支持检查更新；远程结果必须保持相同 ID 和类型，仍需用户确认安装。页面模式的 User Script 更新后需要刷新已打开的 KivoWiki 页面；严格沙箱模块可以在状态同步后重启。

## 13. 日志与故障隔离

模块可写入简短诊断日志：

```js
context.log("info", "索引构建完成");
context.log("warn", "数据源暂时不可用，已使用缓存");
```

允许级别为 `debug`、`info`、`warn`、`error`。每条最多 1000 字符，每模块每分钟最多 100 条，全局保存最近 500 条；Cookie、Token、密码和密钥等内容绝不能写入日志。宿主会遮盖一部分常见敏感键，但这只是补充保护。

模块消息每秒最多 60 条；设置和单次模块业务存储写入最多 64 KB。模块应合并高频状态，不要把每次滚动、动画帧或 DOM 变化都发送给宿主。

模块启动有 8 秒健康超时。社区模块在 5 分钟内连续失败 3 次时，默认会被自动隔离；其他模块继续运行。用户可以在配置中心重新启用该模块来清除隔离记录，也可以关闭全局崩溃自动隔离。页面模式中的同步死循环仍可能阻塞网页主线程，只有严格沙箱、代码审核和良好实现能进一步降低这类风险。

## 14. 官方 API 适配

模块通过 `context.api.version` 和 `context.api.supports(range)` 协商平台 API 版本。复杂模块应使用 `context.api.createAdapter()` 将请求封装成 `list`、`get`、`search` 等语义方法，UI 层不应拼接 URL 或解析服务端信封。

管理器只提供与站点无关的只读请求、超时、有限重试、缓存和版本协商，不包含 KivoWiki 具体地址、内部路由、认证信息或数据字段。站点变化时应更新模块自己的 `services/` 适配器。完整接口见 [平台数据能力契约](platform-data-contract.md)。

### 首页数量扩展与站点 DOM

站点首页可能只请求一小批角色、文章或新闻，页面上的首批节点数量不代表 API 的总量。API 能读取更多数据，不代表模块能安全扩展站点现有 Vue 组件。复制已渲染 DOM 不会复制组件状态、事件闭包、拖拽处理或弹窗回调，因此在站点没有公开数据源更新接口时，应保留原生数量和交互，不要复制新闻轮播或角色节点。新闻轮播通常还包含首尾过渡节点，不能简单隐藏幻灯片或导航点；这些操作会破坏 UI 框架的位移计算。

首页 DOM 适配应为每个可隐藏组件返回互不重叠的真实节点。一个网格单元中可能同时包含时间、对话、回复和协助按钮，隐藏父网格会连带隐藏其他功能；排序则只能在共同的直接父节点范围内进行。站点结构变化后，应优先更新选择器和清理逻辑，并在请求失败时保留原始内容。
