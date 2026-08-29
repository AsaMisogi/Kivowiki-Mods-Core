import type { ModuleContext, ToolId } from "../types";
import { normalizeSettings } from "../core/settings";
import { createNightCss, NIGHT_STYLE_ID } from "../theme/night-mode";
import { observePageState } from "../theme/page-state";

const TOOL_META: Record<ToolId, { label: string; path: string; title: string }> = {
  top: { label: "返回顶部", path: "M12 19V5m0 0-6 6m6-6 6 6", title: "返回顶部" },
  atlas: { label: "角色图鉴", path: "M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z", title: "打开角色图鉴" },
  night: { label: "夜间模式", path: "M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z", title: "切换夜间模式" }
};

const EXPAND_PATH = "m18 15-6-6-6 6";
const CLOSE_PATH = "M18 6 6 18M6 6l12 12";

const TOOLBAR_STYLE = `
  .kq-toolbar { --kq-size: 46px; --kq-offset: 22px; position: fixed; z-index: 2147483646; display: flex; flex-direction: column; gap: 9px; align-items: center; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .kq-toolbar[data-position="right-bottom"] { right: var(--kq-offset); bottom: var(--kq-offset); }
  .kq-toolbar[data-position="left-bottom"] { left: var(--kq-offset); bottom: var(--kq-offset); }
  .kq-toolbar[data-position="right-center"] { right: var(--kq-offset); top: 50%; transform: translateY(-50%); }
  .kq-toolbar[data-position="left-center"] { left: var(--kq-offset); top: 50%; transform: translateY(-50%); }
  .kq-toolbar__menu { display: flex; flex-direction: column; gap: 9px; max-height: 0; margin: -5px; padding: 5px; overflow: hidden; opacity: 0; transform: translateY(6px) scale(.97); transform-origin: bottom center; transition: max-height .2s ease, opacity .16s ease, transform .2s ease; pointer-events: none; }
  .kq-toolbar[data-expanded="true"] .kq-toolbar__menu { max-height: 180px; overflow: visible; opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
  .kq-toolbar__fixed { display: flex; flex-direction: column; gap: 9px; }
  .kq-toolbar__button { position: relative; display: grid; place-items: center; width: var(--kq-size); height: var(--kq-size); padding: 0; border: 1px solid rgba(255,255,255,.22); border-radius: 50%; color: #f5fbfc; background: linear-gradient(145deg, #266f78, #174d5d); box-shadow: 0 8px 22px rgba(9,28,38,.28); cursor: pointer; transition: transform .16s ease, box-shadow .16s ease, background .16s ease; -webkit-tap-highlight-color: transparent; }
  .kq-toolbar__button::after { content: ""; position: absolute; inset: 2px; border: 1px solid rgba(255,255,255,.11); border-radius: inherit; pointer-events: none; }
  .kq-toolbar__button:hover { transform: scale(1.055); background: linear-gradient(145deg, #318995, #1e6070); box-shadow: 0 10px 26px rgba(9,28,38,.40), 0 0 0 4px rgba(91,177,190,.12); }
  .kq-toolbar__button:active { transform: scale(.96); }
  .kq-toolbar__button:focus-visible { outline: 3px solid #f5c56b; outline-offset: 3px; }
  .kq-toolbar__icon { width: 47%; height: 47%; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
  .kq-toolbar__button--secondary { color: #d9e8ee; background: linear-gradient(145deg, #354554, #273541); }
  .kq-toolbar__button--active { color: #fff7df; background: linear-gradient(145deg, #8a6b38, #6b4b26); }
  .kq-toolbar__button--expand { background: #233542; }
  .kq-toolbar__button[hidden] { display: none; }
  @media (prefers-reduced-motion: reduce) { .kq-toolbar__menu, .kq-toolbar__button { transition: none; } }
`;

export const mountToolbar = (context: ModuleContext): void => {
  let settings = normalizeSettings(context.settings);
  let themeSignature = "";
  const style = document.createElement("style");
  style.textContent = TOOLBAR_STYLE;
  const toolbar = document.createElement("aside");
  toolbar.className = "kq-toolbar";
  toolbar.setAttribute("aria-label", "快捷工具");
  const menu = document.createElement("div");
  menu.className = "kq-toolbar__menu";
  menu.id = "kq-toolbar-menu";
  const createIcon = (path: string): SVGSVGElement => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.classList.add("kq-toolbar__icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    shape.setAttribute("d", path);
    svg.append(shape);
    return svg;
  };
  const makeButton = (id: ToolId): HTMLButtonElement => {
    const button = document.createElement("button");
    const meta = TOOL_META[id];
    button.type = "button";
    button.className = `kq-toolbar__button${id === "night" ? " kq-toolbar__button--secondary" : ""}`;
    button.dataset.action = id;
    button.append(createIcon(meta.path));
    button.title = meta.title;
    button.setAttribute("aria-label", meta.label);
    return button;
  };
  const expandButton = makeButton("top");
  expandButton.dataset.action = "expand";
  expandButton.replaceChildren(createIcon(EXPAND_PATH));
  expandButton.setAttribute("aria-label", "展开快捷工具");
  expandButton.setAttribute("aria-controls", menu.id);
  expandButton.title = "展开快捷工具";
  const topButton = makeButton("top");
  topButton.dataset.action = "top";
  const nightButton = makeButton("night");
  const atlasButton = makeButton("atlas");
  const fixed = document.createElement("div");
  fixed.className = "kq-toolbar__fixed";
  toolbar.append(menu, expandButton, fixed);
  context.root.append(style, toolbar);
  const stopObservingPage = observePageState();

  // 夜间样式只在开关或透明度变化时整体替换，不监听滚动、不扫描 DOM。
  // 路由切换后的 Vue 新节点会自动命中同一套 CSS，避免 MutationObserver 带来的开销。
  const applyTheme = (enabled: boolean) => {
    const signature = `${enabled}:${settings.overlayOpacity}`;
    if (signature !== themeSignature) {
      themeSignature = signature;
      context.setGlobalStyle(NIGHT_STYLE_ID, enabled ? createNightCss(settings.overlayOpacity) : "");
    }
    document.documentElement.classList.toggle("kplus-night-mode", enabled);
    nightButton.classList.toggle("kq-toolbar__button--active", enabled);
    nightButton.setAttribute("aria-pressed", String(enabled));
    nightButton.title = enabled ? "关闭夜间模式" : "夜间模式";
  };
  const persist = () => {
    void context.saveSettings(settings).catch(() => {
      // 页面关闭或宿主重载时，未完成的设置写入不应产生未处理的 Promise。
    });
  };
  const render = () => {
    toolbar.dataset.position = settings.position;
    toolbar.dataset.expanded = String(settings.expanded);
    toolbar.style.setProperty("--kq-size", `${settings.size}px`);
    toolbar.style.setProperty("--kq-offset", `${settings.offset}px`);
    const collapsed = new Set(settings.collapsedTools);
    // replaceChildren 会移动现有按钮而不是重建节点，事件监听器和焦点状态均可保留。
    const buttons = { night: nightButton, atlas: atlasButton, top: topButton };
    menu.replaceChildren(...(["night", "atlas", "top"] as ToolId[]).filter((id) => collapsed.has(id)).map((id) => buttons[id]));
    fixed.replaceChildren(...(["night", "atlas", "top"] as ToolId[]).filter((id) => !collapsed.has(id)).map((id) => buttons[id]));
    menu.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
      // aria-hidden 本身不会移除 Tab 焦点，折叠时需显式阻止键盘进入不可见区域。
      button.tabIndex = settings.expanded ? 0 : -1;
    });
    expandButton.hidden = collapsed.size === 0;
    menu.setAttribute("aria-hidden", String(!settings.expanded));
    expandButton.setAttribute("aria-expanded", String(settings.expanded));
    expandButton.setAttribute("aria-label", settings.expanded ? "折叠快捷工具" : "展开快捷工具");
    expandButton.title = settings.expanded ? "折叠快捷工具" : "展开快捷工具";
    expandButton.replaceChildren(createIcon(settings.expanded ? CLOSE_PATH : EXPAND_PATH));
    applyTheme(settings.nightMode);
  };
  expandButton.addEventListener("click", () => {
    settings = { ...settings, expanded: !settings.expanded };
    render();
    persist();
  });
  topButton.addEventListener("click", () => {
    const scroller = document.querySelector<HTMLElement>(".n-layout-scroll-container .n-scrollbar-container");
    if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  });
  atlasButton.addEventListener("click", () => {
    const entries = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const nativeAtlas = entries.find((entry) => entry.textContent?.trim() === "角色图鉴")
      || entries.find((entry) => entry.textContent?.includes("角色图鉴"));
    if (!nativeAtlas) {
      context.log?.("warn", "未找到 KivoWiki 原生角色图鉴入口，请刷新页面后重试");
      return;
    }
    nativeAtlas.click();
  });
  nightButton.addEventListener("click", () => {
    settings = { ...settings, nightMode: !settings.nightMode };
    render();
    persist();
  });
  context.onSettingsChange((next) => { settings = normalizeSettings({ ...settings, ...next }); render(); });
  context.onCleanup(() => {
    stopObservingPage();
    document.documentElement.classList.remove("kplus-night-mode");
    context.setGlobalStyle(NIGHT_STYLE_ID, "");
    style.remove();
    toolbar.remove();
  });
  render();
};
