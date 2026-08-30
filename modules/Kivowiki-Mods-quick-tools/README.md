# Kivowiki-Mods-quick-tools

这是 Kivowiki-Mods 的官方内置页面增强模块，为 KivoWiki 提供低干扰的悬浮快捷工具和分层夜间主题。当前版本为 `2.3.2`。工具栏显式恢复 `pointer-events` 交互，因此不会被 Core 的全屏穿透宿主层意外变成无法悬停或点击的悬浮球。模块入口使用 TypeScript 编写，发布时编译为管理器可以直接加载的单文件 JavaScript，不需要把 Vue 或其他运行时注入 Wiki 页面。

## 目录

- `src/index.js`：构建产物，负责注册模块。
- `src/config.js`：构建产物，负责配置页。
- `src/entry.ts`：页面模块注册入口。
- `src/config-entry.ts`：配置页入口。
- `src/ui/toolbar.ts`：悬浮工具生命周期、站内原生图鉴触发和工具交互。
- `src/theme/night-mode.ts`：主题令牌、Naive UI 变量桥接与业务页面夜间规则。
- `src/theme/page-state.ts`：SPA 路由与首页滚动状态控制器。
- `src/core/settings.ts`：设置默认值、范围约束和旧设置兼容。
- `src/types.ts`：模块上下文与设置类型。
- `build.mjs`：使用 esbuild 将 TypeScript 产物编译为两个单 JS 文件。
- `module.json`：模块元数据和打包文件清单。
- `README.md`：模块用途、边界和维护说明。

## 设计约定

- 只通过宿主提供的 `context` 工作，不读取扩展内部状态。
- 所有 DOM、事件和全局样式都在 `onCleanup` 中撤销。
- 设置只保存 JSON 兼容值，并通过 `onSettingsChange` 更新当前界面。
- 主题层保留站点 `background-image` 和图片原始显示，不使用全局滤镜或图片降透明度。
- 夜间样式按 Naive UI 变量、Tailwind 固定色类、业务组件和 Markdown 内容分层处理，保留默认、悬浮、选中、按下与禁用状态。
- 首页顶部保留黑色渐变和白色导航，滚动后切换为深色表面；SPA 路由变化无需重新挂载模块。
- 滚动与主题切换不使用高频 DOM 扫描；工具栏只创建一次，设置变化只更新已有节点。
- `module.json` 使用清单 v4，名称为 `Kivowiki-Mods-quick-tools`；图鉴改为调用站内原生功能，因此不再申请网络权限或依赖 `core-runtime`。版本 `2.3.2` 同步修复配置中心、弹窗和扩展清单中的内置模块路径。
- 内置模块的配置入口必须使用扩展根目录相对路径；当前入口为 `modules/Kivowiki-Mods-quick-tools/src/config.js`。

## 设置

- `nightMode`：是否启用夜间模式。
- `expanded`：页面加载后是否展开工具。
- `collapsedTools`：需要放进折叠菜单的工具 ID，支持 `top`、`atlas`、`night`。角色图鉴默认固定显示。
- `position`：`right-bottom`、`left-bottom`、`right-center` 或 `left-center`。
- `size`：按钮直径，范围 36 至 72 像素。
- `offset`：按钮距离窗口边缘的距离，范围 8 至 64 像素。
- `overlayOpacity`：背景遮罩透明度，范围 0.08 至 0.55。

角色图鉴按钮会在点击时查找站内入口，优先触发顶部菜单 `.n-menu-item` 内部的 `.n-a` 文字链接，再兼容侧边栏和主页“拿起角色图鉴”的可点击容器。站点菜单是异步渲染的，因此按钮触发时才查找入口，不在模块启动时缓存节点。窗口、数据、搜索、筛选、分页和资料跳转均由 KivoWiki 自身实现；找不到入口时只写入一条警告日志，不绘制兼容窗口，也不自行请求 API。

主题切换时会临时使用 `kq-theme-switching` 根节点标记关闭站点颜色和图标过渡，并在浏览器提交最终颜色后恢复普通交互动画，因此切换视觉结果立即生效，不会长期禁用悬浮反馈。

配置页保存设置时会返回代表宿主实际保存结果的 Promise。这样配置界面可以安全处理保存失败，不会再出现对 `undefined` 调用 `.catch()` 的 Edge 报错；页面模式模块和严格沙箱模块也使用同一套应答机制，避免“看起来保存成功但实际写入失败”。

夜间模式对角色页的黑色地形 PNG 使用精确的 `alt` 与尺寸类选择器，不改变彩色评级 WebP；联系页则通过 `.n-h`、`.n-ul`、`.n-ol`、`.n-blockquote` 的 Naive UI 变量桥接改善文本对比度。

## 构建

在本目录首次执行：

```text
npm install
npm run build
```

`npm run build` 会更新 `src/index.js` 和 `src/config.js`。开发依赖只用于构建，不属于发布内容；构建完成后可执行 `npm prune --omit=dev` 移除约 32 MiB 的 `node_modules`。当前 `module.json` 声明的全部发布文件约 138 KiB。

当前没有引入 Vue 运行时。Vue 3 + TypeScript 适合复杂、多视图的配置应用，但本模块的页面入口只有两个按钮和一组全局主题状态，Vue 不会减少状态复杂度，反而会把运行时重复注入每个 Wiki 标签页。当前方案使用严格 TypeScript、组件化目录和单 JS 构建，保留完整类型检查且启动成本更低。若未来配置页出现大量可复用表单、拖拽布局或异步数据，可只将独立配置页迁移到 Vue 3，不把 Vue 注入内容页。

推荐的后续扩展目录：

```text
Kivowiki-Mods-quick-tools/
├─ module.json
├─ README.md
└─ src/
   ├─ index.js
   ├─ config.js
   ├─ ui/
   ├─ services/
   └─ styles/
```
