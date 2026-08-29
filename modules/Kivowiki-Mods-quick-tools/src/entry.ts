import { DEFAULT_SETTINGS } from "./core/settings";
import { mountToolbar } from "./ui/toolbar";
import type { ModuleContext } from "./types";

(() => {
  const module = {
    id: "quick-tools",
    name: "Kivowiki-Mods-quick-tools",
    version: "2.3.2",
    description: "提供可配置的悬浮快捷工具、折叠规则和 KivoWiki 夜间适配。",
    author: "朝禊ASOGI",
    defaultSettings: DEFAULT_SETTINGS,
    config: "modules/Kivowiki-Mods-quick-tools/src/config.js",
    mode: "builtin",
    permissions: [
      { id: "page.read", reason: "读取滚动位置和当前页面结构。" },
      { id: "page.modify", reason: "显示快捷工具并应用用户主动开启的主题样式。" },
      { id: "settings", reason: "保存工具布局和夜间模式设置。" }
    ],
    dependencies: {},
    conflicts: {},
    engines: { kivowikiMods: "^1.4.0", api: "^1.1.0" },
    claims: { globals: [], pageSelectors: ['.n-menu-item .n-a', '.cursor-pointer'], routes: [] },
    publisher: { id: "kivowiki-mods", name: "Kivowiki-Mods 官方" },
    source: { registry: "builtin" },
    review: { status: "approved", reviewer: "Kivowiki-Mods", reviewedAt: "2026-08-29" },
    trust: { status: "builtin", label: "官方内置", publisher: "verified", reviewed: "approved" },
    mount(context: ModuleContext) { mountToolbar(context); }
  };
  globalThis.KivowikiModsModules = globalThis.KivowikiModsModules || [];
  // 开发模式刷新扩展时旧内容脚本可能暂时留在已打开页面，按 ID 替换可
  // 避免同一内置模块出现两张卡片或被重复挂载。
  globalThis.KivowikiModsModules = globalThis.KivowikiModsModules.filter(
    (item: unknown) => !(item && typeof item === "object" && "id" in item && item.id === module.id)
  );
  globalThis.KivowikiModsModules.push(module);
})();
