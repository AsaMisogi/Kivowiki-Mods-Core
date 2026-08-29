(() => {
"use strict";
var KivoQuickToolsConfigBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/config-entry.ts
  var config_entry_exports = {};
  __export(config_entry_exports, {
    default: () => config_entry_default,
    mountConfig: () => mountConfig
  });

  // src/core/settings.ts
  var DEFAULT_SETTINGS = {
    nightMode: false,
    expanded: false,
    collapsedTools: ["night"],
    position: "right-bottom",
    size: 46,
    offset: 22,
    overlayOpacity: 0.22
  };
  var POSITIONS = ["right-bottom", "left-bottom", "right-center", "left-center"];
  var normalizeSettings = (input = {}) => {
    const size = Number(input.size);
    const offset = Number(input.offset);
    const opacity = Number(input.overlayOpacity);
    const collapsedTools = Array.isArray(input.collapsedTools) ? input.collapsedTools.filter((id) => id === "top" || id === "atlas" || id === "night") : DEFAULT_SETTINGS.collapsedTools;
    return {
      nightMode: input.nightMode === true,
      expanded: input.expanded === true,
      collapsedTools: [...new Set(collapsedTools)],
      position: POSITIONS.includes(input.position) ? input.position : DEFAULT_SETTINGS.position,
      size: Number.isFinite(size) ? Math.min(72, Math.max(36, Math.round(size))) : DEFAULT_SETTINGS.size,
      offset: Number.isFinite(offset) ? Math.min(64, Math.max(8, Math.round(offset))) : DEFAULT_SETTINGS.offset,
      overlayOpacity: Number.isFinite(opacity) ? Math.min(0.55, Math.max(0.08, Math.round(opacity * 100) / 100)) : DEFAULT_SETTINGS.overlayOpacity
    };
  };

  // src/config-entry.ts
  var TOOL_LABELS = {
    top: "\u8FD4\u56DE\u9876\u90E8",
    atlas: "\u89D2\u8272\u56FE\u9274",
    night: "\u591C\u95F4\u6A21\u5F0F"
  };
  var POSITION_LABELS = {
    "right-bottom": "\u53F3\u4E0B\u89D2",
    "left-bottom": "\u5DE6\u4E0B\u89D2",
    "right-center": "\u53F3\u4FA7\u5C45\u4E2D",
    "left-center": "\u5DE6\u4FA7\u5C45\u4E2D"
  };
  var CONFIG_CSS = `
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
  .preview::before { content: "\u9875\u9762\u9884\u89C8"; position: absolute; top: 12px; left: 13px; color: #537078; font-size: 12px; font-weight: 700; }
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
  var createNode = (tag, className = "", text = "") => {
    const element = document.createElement(tag);
    element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  var createSaver = (context, getSettings) => {
    let timer;
    return {
      schedule() {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          void context.saveSettings(getSettings()).catch(() => {
          });
        }, 120);
      },
      cancel() {
        window.clearTimeout(timer);
      }
    };
  };
  var mountConfig = (context) => {
    let settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...context.settings });
    const style = createNode("style");
    style.textContent = CONFIG_CSS;
    const root = createNode("main");
    const intro = createNode("div", "intro");
    intro.append(
      createNode("h1", "", "\u5FEB\u6377\u5DE5\u5177"),
      createNode("p", "", "\u914D\u7F6E\u9875\u9762\u589E\u5F3A\u5DE5\u5177\u7684\u5E03\u5C40\u4E0E\u591C\u95F4\u663E\u793A\u5C42\u3002\u8BBE\u7F6E\u4F1A\u81EA\u52A8\u4FDD\u5B58\u3002")
    );
    root.append(intro);
    const saver = createSaver(context, () => settings);
    const switchInputs = /* @__PURE__ */ new Map();
    const toolInputs = /* @__PURE__ */ new Map();
    const rangeInputs = /* @__PURE__ */ new Map();
    const createSwitchRow = (key, title, description, value, onChange) => {
      const row = createNode("label", "row");
      const copy = createNode("span", "copy");
      copy.append(createNode("strong", "", title), createNode("small", "", description));
      const wrapper = createNode("span", "switch");
      const input = createNode("input");
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
    layout.append(createNode("h2", "", "\u663E\u793A\u4E0E\u884C\u4E3A"));
    layout.append(createSwitchRow(
      "nightMode",
      "\u591C\u95F4\u6A21\u5F0F",
      "\u5728\u5F53\u524D KivoWiki \u9875\u9762\u542F\u7528\u5206\u5C42\u6DF1\u8272\u4E3B\u9898\u3002",
      settings.nightMode,
      (next) => {
        settings = { ...settings, nightMode: next };
      }
    ));
    layout.append(createSwitchRow(
      "expanded",
      "\u9ED8\u8BA4\u5C55\u5F00\u5DE5\u5177",
      "\u5237\u65B0\u9875\u9762\u540E\u81EA\u52A8\u663E\u793A\u53EF\u6298\u53E0\u5DE5\u5177\u3002",
      settings.expanded,
      (next) => {
        settings = { ...settings, expanded: next };
      }
    ));
    const toolRow = createNode("div", "row");
    const toolCopy = createNode("span", "copy");
    toolCopy.append(
      createNode("strong", "", "\u6298\u53E0\u5DE5\u5177"),
      createNode("small", "", "\u9009\u62E9\u5728\u5C55\u5F00\u9762\u677F\u4E2D\u663E\u793A\u7684\u6309\u94AE\u3002\u53D6\u6D88\u52FE\u9009\u5373\u53EF\u56FA\u5B9A\u663E\u793A\u3002")
    );
    const toolGrid = createNode("div", "tool-grid");
    Object.keys(TOOL_LABELS).forEach((id) => {
      const label = createNode("label", "tool-card");
      const input = createNode("input");
      input.type = "checkbox";
      input.checked = settings.collapsedTools.includes(id);
      toolInputs.set(id, input);
      const copy = createNode("span");
      const hint = createNode("small", "", input.checked ? "\u70B9\u51FB\u5C55\u5F00\u540E\u663E\u793A" : "\u59CB\u7EC8\u663E\u793A");
      copy.append(createNode("strong", "", TOOL_LABELS[id]), hint);
      label.append(input, copy);
      input.addEventListener("change", () => {
        const next = input.checked ? [...settings.collapsedTools, id] : settings.collapsedTools.filter((item) => item !== id);
        settings = { ...settings, collapsedTools: [...new Set(next)] };
        hint.textContent = input.checked ? "\u70B9\u51FB\u5C55\u5F00\u540E\u663E\u793A" : "\u59CB\u7EC8\u663E\u793A";
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
      createNode("strong", "", "\u60AC\u6D6E\u6309\u94AE\u4F4D\u7F6E"),
      createNode("small", "", "\u907F\u514D\u906E\u6321\u7AD9\u70B9\u5E95\u90E8\u64CD\u4F5C\u533A\u57DF\u3002")
    );
    const position = createNode("select");
    Object.keys(POSITION_LABELS).forEach((value) => {
      const option = createNode("option", "", POSITION_LABELS[value]);
      option.value = value;
      position.append(option);
    });
    position.value = settings.position;
    position.addEventListener("change", () => {
      settings = { ...settings, position: position.value };
      saver.schedule();
      render();
    });
    positionRow.append(positionCopy, position);
    layout.append(positionRow);
    const createRangeRow = (key, title, description, min, max, value, suffix, onChange) => {
      const row = createNode("div", "row");
      const copy = createNode("span", "copy");
      copy.append(createNode("strong", "", title), createNode("small", "", description));
      const control = createNode("span", "range-control");
      const input = createNode("input");
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
      "\u6309\u94AE\u5927\u5C0F",
      "\u7EDF\u4E00\u8C03\u6574\u60AC\u6D6E\u6309\u94AE\u7684\u89E6\u63A7\u9762\u79EF\u3002",
      36,
      72,
      settings.size,
      " px",
      (next) => {
        settings = { ...settings, size: next };
      }
    ));
    layout.append(createRangeRow(
      "offset",
      "\u8FB9\u7F18\u95F4\u8DDD",
      "\u6309\u94AE\u8DDD\u79BB\u7A97\u53E3\u8FB9\u7F18\u7684\u8DDD\u79BB\u3002",
      8,
      64,
      settings.offset,
      " px",
      (next) => {
        settings = { ...settings, offset: next };
      }
    ));
    const theme = createNode("section", "section");
    theme.append(createNode("h2", "", "\u591C\u95F4\u663E\u793A"));
    theme.append(createRangeRow(
      "overlayOpacity",
      "\u80CC\u666F\u906E\u7F69\u900F\u660E\u5EA6",
      "\u53EA\u538B\u4F4E\u80CC\u666F\u4EAE\u5EA6\uFF0C\u4E0D\u66FF\u6362\u80CC\u666F\u56FE\u7247\uFF1B\u5361\u7247\u4F1A\u4FDD\u6301\u72EC\u7ACB\u5C42\u7EA7\u3002",
      8,
      55,
      Math.round(settings.overlayOpacity * 100),
      "%",
      (next) => {
        settings = { ...settings, overlayOpacity: next / 100 };
      }
    ));
    const preview = createNode("section", "section");
    preview.append(createNode("h2", "", "\u5B9E\u65F6\u9884\u89C8"));
    const previewBox = createNode("div", "preview");
    const previewSurface = createNode("div", "preview-surface");
    const previewToolbar = createNode("div", "preview-toolbar");
    const previewNight = createNode("div", "preview-button secondary", "\u25D0");
    const previewAtlas = createNode("div", "preview-button", "\u518C");
    const previewExpand = createNode("div", "preview-button", "\u25A6");
    const previewTop = createNode("div", "preview-button", "\u2191");
    previewBox.append(previewSurface, previewToolbar);
    preview.append(previewBox);
    const status = createNode("p", "status", "\u8BBE\u7F6E\u4F1A\u5728 120ms \u5185\u4FDD\u5B58");
    root.append(layout, theme, preview, status);
    document.body.append(style, root);
    const renderPreview = () => {
      const collapsed = new Set(settings.collapsedTools);
      previewToolbar.dataset.position = settings.position;
      previewToolbar.style.setProperty("--preview-size", `${Math.max(24, Math.round(settings.size * 0.72))}px`);
      previewNight.classList.toggle("active", settings.nightMode);
      previewExpand.textContent = settings.expanded ? "\xD7" : "\u25A6";
      const collapsedTools = ["night", "atlas", "top"].filter(
        (id) => collapsed.has(id) && settings.expanded
      );
      const fixedTools = ["night", "atlas", "top"].filter((id) => !collapsed.has(id));
      const previewButtons = { night: previewNight, atlas: previewAtlas, top: previewTop };
      previewToolbar.replaceChildren(
        ...collapsedTools.map((id) => previewButtons[id]),
        ...collapsed.size ? [previewExpand] : [],
        ...fixedTools.map((id) => previewButtons[id])
      );
    };
    const render = () => {
      position.value = settings.position;
      switchInputs.get("nightMode").checked = settings.nightMode;
      switchInputs.get("expanded").checked = settings.expanded;
      toolInputs.forEach((input, id) => {
        input.checked = settings.collapsedTools.includes(id);
      });
      rangeInputs.forEach(({ input, output, suffix }, key) => {
        const value = key === "size" ? settings.size : key === "offset" ? settings.offset : Math.round(settings.overlayOpacity * 100);
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
  var config_entry_default = { mount(context) {
    mountConfig(context);
  } };
  return __toCommonJS(config_entry_exports);
})();

return KivoQuickToolsConfigBundle.default;
})()
