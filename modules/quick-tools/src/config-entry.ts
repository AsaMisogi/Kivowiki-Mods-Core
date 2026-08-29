import { DEFAULT_SETTINGS, normalizeSettings } from "./core/settings";
import type { ModuleContext, QuickToolsSettings, ToolId, ToolPosition } from "./types";

const TOOL_LABELS: Record<ToolId, string> = {
  top: "返回顶部",
  atlas: "角色图鉴",
  night: "夜间模式"
};

const POSITION_LABELS: Record<ToolPosition, string> = {
  "right-bottom": "右下角",
  "left-bottom": "左下角",
  "right-center": "右侧居中",
  "left-center": "左侧居中"
};

const CONFIG_CSS = `
  :root {
    color-scheme: light;
    --ink: #20313b;
    --muted: #6f8088;
    --line: #d8e4e5;
    --paper: #fff;
    --soft: #f3f8f7;
    --accent: #237c7c;
    --focus: #d7903c;
    color: var(--ink);
    background: var(--paper);
    font: 14px/1.55 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 22px; }
  h1, h2, p { margin-top: 0; }
  h1 { margin-bottom: 5px; font-size: 20px; }
  p { color: var(--muted); }
  .intro { margin-bottom: 20px; }
  .intro p { margin-bottom: 0; }
  .section { margin-top: 18px; padding-top: 17px; border-top: 1px solid var(--line); }
  .section h2 { margin-bottom: 11px; font-size: 14px; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 44px; padding: 9px 0; }
  .row + .row { border-top: 1px solid #edf2f2; }
  .copy { min-width: 0; }
  .copy strong { display: block; }
  .copy small { display: block; margin-top: 2px; color: var(--muted); }
  .switch { position: relative; display: inline-flex; flex: 0 0 auto; align-items: center; cursor: pointer; }
  .switch input { position: absolute; opacity: 0; }
  .track { width: 42px; height: 23px; border-radius: 20px; background: #c6d2d3; transition: background .16s ease; }
  .track::after { content: ""; position: absolute; top: 3px; left: 3px; width: 17px; height: 17px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px #0003; transition: transform .16s ease; }
  .switch input:checked + .track { background: var(--accent); }
  .switch input:checked + .track::after { transform: translateX(19px); }
  select { min-width: 112px; padding: 7px 9px; border: 1px solid var(--line); border-radius: 5px; color: var(--ink); background: var(--paper); }
  input[type="range"] { width: 170px; accent-color: var(--accent); }
  .range-control { display: flex; align-items: center; gap: 8px; }
  .range-value { min-width: 47px; color: var(--accent); font-weight: 700; text-align: right; }
  .tool-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
  .tool-card { display: grid; grid-template-columns: 20px 1fr; gap: 8px; align-items: center; padding: 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--soft); cursor: pointer; }
  .tool-card input { margin: 0; accent-color: var(--accent); }
  .tool-card small { display: block; color: var(--muted); }
  .preview { position: relative; height: 190px; margin-top: 9px; overflow: hidden; border: 1px solid var(--line); border-radius: 7px; background: linear-gradient(135deg, #edf5f5, #d5e5e6); }
  .preview::before { content: "页面预览"; position: absolute; top: 12px; left: 13px; color: #537078; font-size: 12px; font-weight: 700; }
  .preview-surface { position: absolute; left: 19%; right: 19%; top: 42px; bottom: 20px; border-radius: 7px; background: #ffffffd9; box-shadow: 0 5px 18px #48636a24; }
  .preview-toolbar { position: absolute; display: grid; gap: 7px; }
  .preview-toolbar[data-position="right-bottom"] { right: 12px; bottom: 12px; }
  .preview-toolbar[data-position="left-bottom"] { left: 12px; bottom: 12px; }
  .preview-toolbar[data-position="right-center"] { right: 12px; top: 50%; transform: translateY(-50%); }
  .preview-toolbar[data-position="left-center"] { left: 12px; top: 50%; transform: translateY(-50%); }
  .preview-button { width: var(--preview-size); height: var(--preview-size); display: grid; place-items: center; border-radius: 50%; color: #fff; background: #286f78; box-shadow: 0 5px 12px #183a4650; font-weight: 700; }
  .preview-button.secondary { background: #344754; }
  .preview-button.active { background: #866b3a; }
  .status { min-height: 20px; margin: 13px 0 0; color: var(--accent); font-size: 12px; }
  :focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
  @media (prefers-color-scheme: dark) {
    :root { --ink: #e7f0f1; --muted: #a8babe; --line: #40585a; --paper: #1c292c; --soft: #253a3b; }
    .preview { background: #22363a; }
    .preview-surface { background: #304245d9; }
    .preview::before { color: #aec7c9; }
  }
  @media (max-width: 520px) {
    body { padding: 17px; }
    .row { align-items: flex-start; flex-direction: column; gap: 7px; }
    .tool-grid { grid-template-columns: 1fr; }
  }
`;

const createNode = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = ""
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  element.className = className;
  if (text) element.textContent = text;
  return element;
};

interface RangeControl {
  input: HTMLInputElement;
  output: HTMLOutputElement;
  suffix: string;
}

/** 合并滑块的连续输入，避免拖动时频繁写入宿主设置。 */
const createSaver = (context: ModuleContext, getSettings: () => QuickToolsSettings) => {
  let timer: number | undefined;
  return {
    schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void context.saveSettings(getSettings()).catch(() => {
          // 宿主关闭或配置窗口销毁时，未完成的写入属于正常竞态，不阻断控件操作。
        });
      }, 120);
    },
    cancel() {
      window.clearTimeout(timer);
    }
  };
};

export const mountConfig = (context: ModuleContext): void => {
  let settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...context.settings });
  const style = createNode("style");
  style.textContent = CONFIG_CSS;
  const root = createNode("main");
  const intro = createNode("div", "intro");
  intro.append(
    createNode("h1", "", "快捷工具"),
    createNode("p", "", "配置页面增强工具的布局与夜间显示层。设置会自动保存。")
  );
  root.append(intro);

  const saver = createSaver(context, () => settings);
  const switchInputs = new Map<string, HTMLInputElement>();
  const toolInputs = new Map<ToolId, HTMLInputElement>();
  const rangeInputs = new Map<string, RangeControl>();

  const createSwitchRow = (
    key: string,
    title: string,
    description: string,
    value: boolean,
    onChange: (next: boolean) => void
  ) => {
    const row = createNode("label", "row");
    const copy = createNode("span", "copy");
    copy.append(createNode("strong", "", title), createNode("small", "", description));
    const wrapper = createNode("span", "switch");
    const input = createNode("input") as HTMLInputElement;
    input.type = "checkbox";
    input.checked = value;
    switchInputs.set(key, input);
    wrapper.append(input, createNode("span", "track"));
    row.append(copy, wrapper);
    input.addEventListener("change", () => {
      onChange(input.checked);
      saver.schedule();
      render();
    });
    return row;
  };

  const layout = createNode("section", "section");
  layout.append(createNode("h2", "", "显示与行为"));
  layout.append(createSwitchRow(
    "nightMode",
    "夜间模式",
    "在当前 KivoWiki 页面启用分层深色主题。",
    settings.nightMode,
    (next) => { settings = { ...settings, nightMode: next }; }
  ));
  layout.append(createSwitchRow(
    "expanded",
    "默认展开工具",
    "刷新页面后自动显示可折叠工具。",
    settings.expanded,
    (next) => { settings = { ...settings, expanded: next }; }
  ));

  const toolRow = createNode("div", "row");
  const toolCopy = createNode("span", "copy");
  toolCopy.append(
    createNode("strong", "", "折叠工具"),
    createNode("small", "", "选择在展开面板中显示的按钮。取消勾选即可固定显示。")
  );
  const toolGrid = createNode("div", "tool-grid");
  (Object.keys(TOOL_LABELS) as ToolId[]).forEach((id) => {
    const label = createNode("label", "tool-card");
    const input = createNode("input") as HTMLInputElement;
    input.type = "checkbox";
    input.checked = settings.collapsedTools.includes(id);
    toolInputs.set(id, input);
    const copy = createNode("span");
    const hint = createNode("small", "", input.checked ? "点击展开后显示" : "始终显示");
    copy.append(createNode("strong", "", TOOL_LABELS[id]), hint);
    label.append(input, copy);
    input.addEventListener("change", () => {
      const next = input.checked
        ? [...settings.collapsedTools, id]
        : settings.collapsedTools.filter((item) => item !== id);
      settings = { ...settings, collapsedTools: [...new Set(next)] };
      hint.textContent = input.checked ? "点击展开后显示" : "始终显示";
      saver.schedule();
      render();
    });
    toolGrid.append(label);
  });
  toolRow.append(toolCopy, toolGrid);
  layout.append(toolRow);

  const positionRow = createNode("div", "row");
  const positionCopy = createNode("span", "copy");
  positionCopy.append(
    createNode("strong", "", "悬浮按钮位置"),
    createNode("small", "", "避免遮挡站点底部操作区域。")
  );
  const position = createNode("select") as HTMLSelectElement;
  (Object.keys(POSITION_LABELS) as ToolPosition[]).forEach((value) => {
    const option = createNode("option", "", POSITION_LABELS[value]);
    option.value = value;
    position.append(option);
  });
  position.value = settings.position;
  position.addEventListener("change", () => {
    settings = { ...settings, position: position.value as ToolPosition };
    saver.schedule();
    render();
  });
  positionRow.append(positionCopy, position);
  layout.append(positionRow);

  const createRangeRow = (
    key: string,
    title: string,
    description: string,
    min: number,
    max: number,
    value: number,
    suffix: string,
    onChange: (next: number) => void
  ) => {
    const row = createNode("div", "row");
    const copy = createNode("span", "copy");
    copy.append(createNode("strong", "", title), createNode("small", "", description));
    const control = createNode("span", "range-control");
    const input = createNode("input") as HTMLInputElement;
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = "1";
    input.value = String(value);
    const output = createNode("output", "range-value", `${value}${suffix}`);
    rangeInputs.set(key, { input, output, suffix });
    input.addEventListener("input", () => {
      const next = Number(input.value);
      onChange(next);
      output.textContent = `${next}${suffix}`;
      renderPreview();
      saver.schedule();
    });
    control.append(input, output);
    row.append(copy, control);
    return row;
  };

  layout.append(createRangeRow(
    "size",
    "按钮大小",
    "统一调整悬浮按钮的触控面积。",
    36,
    72,
    settings.size,
    " px",
    (next) => { settings = { ...settings, size: next }; }
  ));
  layout.append(createRangeRow(
    "offset",
    "边缘间距",
    "按钮距离窗口边缘的距离。",
    8,
    64,
    settings.offset,
    " px",
    (next) => { settings = { ...settings, offset: next }; }
  ));

  const theme = createNode("section", "section");
  theme.append(createNode("h2", "", "夜间显示"));
  theme.append(createRangeRow(
    "overlayOpacity",
    "背景遮罩透明度",
    "只压低背景亮度，不替换背景图片；卡片会保持独立层级。",
    8,
    55,
    Math.round(settings.overlayOpacity * 100),
    "%",
    (next) => { settings = { ...settings, overlayOpacity: next / 100 }; }
  ));

  const preview = createNode("section", "section");
  preview.append(createNode("h2", "", "实时预览"));
  const previewBox = createNode("div", "preview");
  const previewSurface = createNode("div", "preview-surface");
  const previewToolbar = createNode("div", "preview-toolbar");
  const previewNight = createNode("div", "preview-button secondary", "◐");
  const previewAtlas = createNode("div", "preview-button", "册");
  const previewExpand = createNode("div", "preview-button", "⌃");
  const previewTop = createNode("div", "preview-button", "↑");
  previewBox.append(previewSurface, previewToolbar);
  preview.append(previewBox);

  const status = createNode("p", "status", "设置会在 120ms 内保存");
  root.append(layout, theme, preview, status);
  document.body.append(style, root);

  const renderPreview = () => {
    const collapsed = new Set(settings.collapsedTools);
    previewToolbar.dataset.position = settings.position;
    previewToolbar.style.setProperty("--preview-size", `${Math.max(24, Math.round(settings.size * 0.72))}px`);
    previewNight.classList.toggle("active", settings.nightMode);
    previewExpand.textContent = settings.expanded ? "×" : "⌃";
    // 预览严格复刻真实工具栏顺序：折叠区、展开键、固定区。
    const collapsedTools = (["night", "atlas", "top"] as ToolId[]).filter(
      (id) => collapsed.has(id) && settings.expanded
    );
    const fixedTools = (["night", "atlas", "top"] as ToolId[]).filter((id) => !collapsed.has(id));
    const previewButtons = { night: previewNight, atlas: previewAtlas, top: previewTop };
    previewToolbar.replaceChildren(
      ...collapsedTools.map((id) => previewButtons[id]),
      ...(collapsed.size ? [previewExpand] : []),
      ...fixedTools.map((id) => previewButtons[id])
    );
  };

  const render = () => {
    position.value = settings.position;
    switchInputs.get("nightMode")!.checked = settings.nightMode;
    switchInputs.get("expanded")!.checked = settings.expanded;
    toolInputs.forEach((input, id) => { input.checked = settings.collapsedTools.includes(id); });
    rangeInputs.forEach(({ input, output, suffix }, key) => {
      const value = key === "size"
        ? settings.size
        : key === "offset"
          ? settings.offset
          : Math.round(settings.overlayOpacity * 100);
      input.value = String(value);
      output.textContent = `${value}${suffix}`;
    });
    renderPreview();
  };

  context.onSettingsChange((next) => {
    settings = normalizeSettings({ ...settings, ...next });
    render();
  });
  context.onCleanup(() => {
    saver.cancel();
    style.remove();
    root.remove();
  });
  render();
};

export default { mount(context: ModuleContext) { mountConfig(context); } };
