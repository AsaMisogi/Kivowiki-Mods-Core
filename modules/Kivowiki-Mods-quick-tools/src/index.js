"use strict";
(() => {
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

  // src/theme/night-mode.ts
  var NIGHT_STYLE_ID = "kivo-plus-night-mode-v3";
  var createNightCss = (opacity) => `
  :root.kplus-night-mode {
    color-scheme: dark;
    --kq-page: #111820;
    --kq-surface: rgba(27, 37, 47, .94);
    --kq-surface-solid: #1b252f;
    --kq-surface-soft: rgba(38, 50, 62, .88);
    --kq-surface-raised: #2d3b48;
    --kq-control: #222f3b;
    --kq-control-hover: #2b3b48;
    --kq-text: #edf3f6;
    --kq-text-soft: #cad5dc;
    --kq-text-muted: #9eafb9;
    --kq-primary: #7dc4dc;
    --kq-primary-hover: #a1d8e9;
    --kq-primary-pressed: #64abc4;
    --kq-primary-soft: rgba(125, 196, 220, .16);
    --kq-primary-strong: #b6e4f2;
    --kq-danger: #ff9ca6;
    --kq-warning: #f0c77a;
    --kq-success: #8ed2b5;
    --kq-border: rgba(195, 215, 225, .20);
    --kq-border-strong: rgba(195, 215, 225, .34);
    --kq-shadow: 0 12px 30px rgba(0, 0, 0, .30);
    --kq-overlay-opacity: ${opacity};
    background-color: var(--kq-page) !important;
  }

  :root.kplus-night-mode body,
  :root.kplus-night-mode #app,
  :root.kplus-night-mode .n-config-provider,
  :root.kplus-night-mode .n-layout,
  :root.kplus-night-mode .n-layout-scroll-container,
  :root.kplus-night-mode .n-scrollbar-content {
    color: var(--kq-text) !important;
  }
  :root.kplus-night-mode body { background-color: var(--kq-page) !important; }
  :root.kplus-night-mode .n-layout,
  :root.kplus-night-mode .n-layout-sider { background-color: transparent !important; }
  :root.kplus-night-mode .n-layout-footer {
    --n-color: var(--kq-surface-solid) !important;
    --n-text-color: var(--kq-text-soft) !important;
    --n-border-color: var(--kq-border) !important;
    color: var(--kq-text-soft) !important;
    background-color: var(--kq-surface-solid) !important;
    border-color: var(--kq-border) !important;
  }
  :root.kplus-night-mode .n-layout-scroll-container {
    background-color: rgb(5 10 15 / var(--kq-overlay-opacity)) !important;
    background-blend-mode: multiply !important;
  }

  /* \u9996\u9875\u9876\u90E8\u4FDD\u7559\u7AD9\u70B9\u539F\u6709\u7684\u9ED1\u8272\u6E10\u53D8\u548C\u767D\u8272\u5BFC\u822A\uFF1B\u79BB\u5F00\u9876\u90E8\u540E\u624D\u663E\u793A\u6DF1\u8272\u8868\u9762\u3002 */
  :root.kplus-night-mode .n-layout-header {
    --n-color: var(--kq-surface-solid) !important;
    --n-text-color: var(--kq-text) !important;
    --n-border-color: var(--kq-border) !important;
    color: var(--kq-text) !important;
    background: rgba(17, 24, 32, .96) !important;
    border-color: var(--kq-border) !important;
    box-shadow: 0 1px 0 var(--kq-border), 0 8px 24px rgba(0, 0, 0, .16) !important;
    transition: none !important;
  }
  :root.kplus-night-mode.kq-route-home.kq-home-top .n-layout-header {
    background: linear-gradient(rgba(0, 0, 0, .76) 0%, rgba(0, 0, 0, 0) 100%) !important;
    border-color: transparent !important;
    box-shadow: none !important;
  }
  :root.kplus-night-mode.kq-route-home.kq-home-top .n-layout-header .n-menu {
    --n-item-text-color: #fff !important;
    --n-item-text-color-hover: #d4f1fb !important;
    --n-item-text-color-active: #b6e4f2 !important;
    --n-item-text-color-active-hover: #d4f1fb !important;
    --n-item-text-color-child-active: #b6e4f2 !important;
    --n-item-text-color-child-active-hover: #d4f1fb !important;
    --n-item-icon-color: #fff !important;
    --n-item-icon-color-hover: #d4f1fb !important;
    --n-item-icon-color-active: #b6e4f2 !important;
    --n-item-icon-color-active-hover: #d4f1fb !important;
    --n-item-text-color-horizontal: #fff !important;
    --n-item-text-color-hover-horizontal: #d4f1fb !important;
    --n-item-text-color-active-horizontal: #b6e4f2 !important;
    --n-item-text-color-active-hover-horizontal: #d4f1fb !important;
    --n-item-text-color-child-active-horizontal: #b6e4f2 !important;
    --n-item-text-color-child-active-hover-horizontal: #d4f1fb !important;
    --n-item-icon-color-horizontal: #fff !important;
    --n-item-icon-color-hover-horizontal: #d4f1fb !important;
    --n-item-icon-color-active-horizontal: #b6e4f2 !important;
    --n-item-icon-color-active-hover-horizontal: #d4f1fb !important;
  }

  /* Naive UI \u4E3B\u9898\u6865\uFF1A\u8986\u76D6\u5143\u7D20\u4E0A\u7684\u6D45\u8272\u53D8\u91CF\uFF0C\u540C\u65F6\u5B8C\u6574\u4FDD\u7559\u60AC\u6D6E\u3001\u9009\u4E2D\u548C\u7981\u7528\u8BED\u4E49\u3002 */
  :root.kplus-night-mode .n-menu {
    --n-color: transparent !important;
    --n-divider-color: var(--kq-border) !important;
    --n-group-text-color: var(--kq-text-muted) !important;
    --n-item-text-color: var(--kq-text-soft) !important;
    --n-item-text-color-hover: var(--kq-text) !important;
    --n-item-text-color-active: var(--kq-primary-strong) !important;
    --n-item-text-color-active-hover: var(--kq-primary-strong) !important;
    --n-item-text-color-child-active: var(--kq-primary-strong) !important;
    --n-item-text-color-child-active-hover: var(--kq-primary-strong) !important;
    --n-item-icon-color: var(--kq-text-muted) !important;
    --n-item-icon-color-hover: var(--kq-text) !important;
    --n-item-icon-color-active: var(--kq-primary) !important;
    --n-item-icon-color-active-hover: var(--kq-primary-hover) !important;
    --n-item-icon-color-child-active: var(--kq-primary) !important;
    --n-item-icon-color-child-active-hover: var(--kq-primary-hover) !important;
    --n-item-text-color-horizontal: var(--kq-text-soft) !important;
    --n-item-text-color-hover-horizontal: var(--kq-text) !important;
    --n-item-text-color-active-horizontal: var(--kq-primary-strong) !important;
    --n-item-text-color-active-hover-horizontal: var(--kq-primary-strong) !important;
    --n-item-text-color-child-active-horizontal: var(--kq-primary-strong) !important;
    --n-item-text-color-child-active-hover-horizontal: var(--kq-primary-strong) !important;
    --n-item-icon-color-horizontal: var(--kq-text-muted) !important;
    --n-item-icon-color-hover-horizontal: var(--kq-text) !important;
    --n-item-icon-color-active-horizontal: var(--kq-primary) !important;
    --n-item-icon-color-active-hover-horizontal: var(--kq-primary-hover) !important;
    --n-item-color-hover: rgba(255, 255, 255, .07) !important;
    --n-item-color-active: var(--kq-primary-soft) !important;
    --n-item-color-active-hover: rgba(125, 196, 220, .22) !important;
    --n-item-color-active-collapsed: var(--kq-primary-soft) !important;
    --n-arrow-color: var(--kq-text-muted) !important;
    --n-arrow-color-hover: var(--kq-text) !important;
    --n-arrow-color-active: var(--kq-primary) !important;
  }
  :root.kplus-night-mode .n-menu-item-content:hover { color: var(--kq-text) !important; }
  :root.kplus-night-mode .n-menu-item-content--selected,
  :root.kplus-night-mode .n-menu-item-content--child-active {
    color: var(--kq-primary-strong) !important;
    background-color: var(--kq-primary-soft) !important;
  }
  :root.kplus-night-mode .n-layout-header .n-menu-item-content--selected,
  :root.kplus-night-mode .n-layout-header .n-menu-item-content--child-active { background-color: transparent !important; }
  :root.kplus-night-mode .n-card {
    --n-color: var(--kq-surface) !important;
    --n-color-modal: var(--kq-surface-solid) !important;
    --n-color-embedded: var(--kq-surface-soft) !important;
    --n-color-target: var(--kq-surface-raised) !important;
    --n-text-color: var(--kq-text) !important;
    --n-title-text-color: var(--kq-text) !important;
    --n-border-color: var(--kq-border) !important;
    --n-action-color: rgba(255, 255, 255, .035) !important;
    --n-close-icon-color: var(--kq-text-muted) !important;
    --n-close-icon-color-hover: var(--kq-text) !important;
    --n-close-color-hover: rgba(255, 255, 255, .08) !important;
    --n-box-shadow: var(--kq-shadow) !important;
  }
  :root.kplus-night-mode .n-list {
    --n-color: var(--kq-surface) !important;
    --n-text-color: var(--kq-text) !important;
    --n-title-text-color: var(--kq-text) !important;
    --n-description-text-color: var(--kq-text-muted) !important;
    --n-border-color: var(--kq-border) !important;
  }
  :root.kplus-night-mode .n-thing {
    --n-text-color: var(--kq-text-soft) !important;
    --n-title-text-color: var(--kq-text) !important;
    --n-description-text-color: var(--kq-text-muted) !important;
  }
  :root.kplus-night-mode .n-thing-header__title { color: var(--kq-text) !important; }
  :root.kplus-night-mode .n-thing-main__description { color: var(--kq-text-muted) !important; }
  :root.kplus-night-mode .n-thing-main__content { color: var(--kq-text-soft) !important; }
  :root.kplus-night-mode .n-text {
    --n-text-color: var(--kq-text) !important;
    --n-code-text-color: #bfe4f0 !important;
    --n-code-color: rgba(125, 196, 220, .12) !important;
    --n-code-border: 1px solid var(--kq-border) !important;
    color: var(--kq-text) !important;
  }
  :root.kplus-night-mode .n-text[style*="rgb(118, 124, 130)"] { --n-text-color: var(--kq-text-muted) !important; color: var(--kq-text-muted) !important; }
  :root.kplus-night-mode .n-text[style*="rgb(32, 128, 240)"] { --n-text-color: var(--kq-primary-hover) !important; color: var(--kq-primary-hover) !important; }
  :root.kplus-night-mode .n-text[style*="rgb(208, 48, 80)"],
  :root.kplus-night-mode .text-red-500 { --n-text-color: var(--kq-danger) !important; color: var(--kq-danger) !important; }
  :root.kplus-night-mode .n-a {
    --n-text-color: var(--kq-primary-hover) !important;
    color: var(--kq-primary-hover) !important;
  }
  :root.kplus-night-mode .n-a:hover { color: #c9edf7 !important; }
  :root.kplus-night-mode .n-input,
  :root.kplus-night-mode .n-input-number,
  :root.kplus-night-mode .n-base-selection {
    --n-color: var(--kq-control) !important;
    --n-color-focus: var(--kq-control-hover) !important;
    --n-color-disabled: rgba(45, 59, 72, .55) !important;
    --n-text-color: var(--kq-text) !important;
    --n-text-color-disabled: var(--kq-text-muted) !important;
    --n-placeholder-color: var(--kq-text-muted) !important;
    --n-placeholder-color-disabled: rgba(158, 175, 185, .6) !important;
    --n-border: 1px solid var(--kq-border) !important;
    --n-border-hover: 1px solid var(--kq-primary) !important;
    --n-border-focus: 1px solid var(--kq-primary) !important;
    --n-box-shadow-focus: 0 0 0 2px var(--kq-primary-soft) !important;
    --n-caret-color: var(--kq-primary) !important;
    --n-icon-color: var(--kq-text-muted) !important;
    --n-icon-color-hover: var(--kq-text) !important;
  }
  :root.kplus-night-mode .n-button {
    --n-text-color: var(--kq-text-soft) !important;
    --n-text-color-hover: var(--kq-text) !important;
    --n-text-color-focus: var(--kq-text) !important;
    --n-text-color-pressed: var(--kq-primary-strong) !important;
    --n-text-color-disabled: var(--kq-text-muted) !important;
    --n-ripple-color: var(--kq-primary) !important;
  }
  :root.kplus-night-mode .n-button--default-type:not([style*="--n-border: none"]) {
    --n-color: var(--kq-control) !important;
    --n-color-hover: var(--kq-control-hover) !important;
    --n-color-focus: var(--kq-control-hover) !important;
    --n-color-pressed: var(--kq-surface-raised) !important;
    --n-color-disabled: rgba(45, 59, 72, .55) !important;
    --n-border: 1px solid var(--kq-border) !important;
    --n-border-hover: 1px solid var(--kq-primary) !important;
    --n-border-focus: 1px solid var(--kq-primary) !important;
    --n-border-pressed: 1px solid var(--kq-primary-pressed) !important;
  }
  :root.kplus-night-mode .n-button--primary-type {
    --n-color: #4f96ae !important;
    --n-color-hover: #64abc4 !important;
    --n-color-focus: #64abc4 !important;
    --n-color-pressed: #3f8097 !important;
    --n-text-color: #f8fcfe !important;
    --n-text-color-hover: #fff !important;
    --n-text-color-focus: #fff !important;
    --n-text-color-pressed: #fff !important;
    --n-border: 1px solid #64abc4 !important;
    --n-border-hover: 1px solid #7dc4dc !important;
    --n-border-focus: 1px solid #7dc4dc !important;
  }
  :root.kplus-night-mode .n-tabs {
    --n-color-segment: var(--kq-control) !important;
    --n-bar-color: var(--kq-primary) !important;
    --n-tab-text-color: var(--kq-text-muted) !important;
    --n-tab-text-color-hover: var(--kq-text) !important;
    --n-tab-text-color-active: var(--kq-primary-strong) !important;
    --n-tab-text-color-disabled: rgba(158, 175, 185, .55) !important;
    --n-pane-text-color: var(--kq-text) !important;
    --n-tab-border-color: var(--kq-border) !important;
    --n-tab-color: var(--kq-surface-soft) !important;
    --n-tab-color-segment: var(--kq-surface-raised) !important;
  }
  :root.kplus-night-mode .n-tag {
    --n-color: rgba(125, 196, 220, .10) !important;
    --n-color-checked: rgba(125, 196, 220, .20) !important;
    --n-text-color: var(--kq-text-soft) !important;
    --n-text-color-checked: var(--kq-primary-strong) !important;
    --n-border: 1px solid var(--kq-border-strong) !important;
    --n-border-checked: 1px solid var(--kq-primary) !important;
    --n-close-icon-color: var(--kq-text-muted) !important;
  }
  :root.kplus-night-mode .n-pagination {
    --n-item-color: var(--kq-control) !important;
    --n-item-color-hover: var(--kq-control-hover) !important;
    --n-item-color-active: var(--kq-primary-soft) !important;
    --n-item-text-color: var(--kq-text-soft) !important;
    --n-item-text-color-hover: var(--kq-text) !important;
    --n-item-text-color-active: var(--kq-primary-strong) !important;
    --n-item-border: 1px solid var(--kq-border) !important;
    --n-item-border-active: 1px solid var(--kq-primary) !important;
  }
  :root.kplus-night-mode .n-form-item,
  :root.kplus-night-mode .n-descriptions,
  :root.kplus-night-mode .n-collapse,
  :root.kplus-night-mode .n-empty,
  :root.kplus-night-mode .n-tree,
  :root.kplus-night-mode .n-timeline {
    --n-label-text-color: var(--kq-text-soft) !important;
    --n-text-color: var(--kq-text) !important;
    --n-title-text-color: var(--kq-text) !important;
    --n-arrow-color: var(--kq-text-muted) !important;
    --n-divider-color: var(--kq-border) !important;
    --n-line-color: var(--kq-border-strong) !important;
    --n-icon-color: var(--kq-primary) !important;
  }
  :root.kplus-night-mode .n-timeline-item-content__title { color: var(--kq-text) !important; }
  :root.kplus-night-mode .n-timeline-item-content__content { color: var(--kq-text-soft) !important; }
  :root.kplus-night-mode .n-timeline-item-content__meta { color: var(--kq-text-muted) !important; }
  :root.kplus-night-mode .n-alert {
    --n-color: rgba(125, 196, 220, .10) !important;
    --n-border: 1px solid rgba(125, 196, 220, .34) !important;
    --n-title-text-color: var(--kq-primary-strong) !important;
    --n-content-text-color: var(--kq-text-soft) !important;
    --n-icon-color: var(--kq-primary) !important;
  }

  /* Teleport \u5230 body \u7684\u4E0B\u62C9\u83DC\u5355\u3001\u62BD\u5C49\u548C\u5F39\u7A97\u4E0D\u5728\u9875\u9762\u5361\u7247\u6811\u4E2D\uFF0C\u9700\u8981\u5355\u72EC\u8986\u76D6\u3002 */
  :root.kplus-night-mode .n-dropdown-menu,
  :root.kplus-night-mode .n-popover,
  :root.kplus-night-mode .n-base-select-menu,
  :root.kplus-night-mode .n-date-panel,
  :root.kplus-night-mode .n-time-picker-panel {
    --n-color: var(--kq-surface-solid) !important;
    --n-text-color: var(--kq-text) !important;
    --n-option-text-color: var(--kq-text-soft) !important;
    --n-option-text-color-hover: var(--kq-text) !important;
    --n-option-text-color-active: var(--kq-primary-strong) !important;
    --n-option-text-color-child-active: var(--kq-primary-strong) !important;
    --n-option-color-hover: rgba(255, 255, 255, .07) !important;
    --n-option-color-active: var(--kq-primary-soft) !important;
    --n-prefix-color: var(--kq-text-muted) !important;
    --n-suffix-color: var(--kq-text-muted) !important;
    --n-divider-color: var(--kq-border) !important;
    --n-border-color: var(--kq-border) !important;
    --n-box-shadow: var(--kq-shadow) !important;
    color: var(--kq-text) !important;
    background-color: var(--kq-surface-solid) !important;
    border-color: var(--kq-border) !important;
  }
  :root.kplus-night-mode .n-drawer-container {
    --n-color: var(--kq-surface-solid) !important;
    --n-text-color: var(--kq-text) !important;
    --n-title-text-color: var(--kq-text) !important;
    --n-header-border-bottom: 1px solid var(--kq-border) !important;
    --n-footer-border-top: 1px solid var(--kq-border) !important;
    --n-close-icon-color: var(--kq-text-muted) !important;
    --n-close-icon-color-hover: var(--kq-text) !important;
    --n-close-color-hover: rgba(255, 255, 255, .08) !important;
    --n-box-shadow: var(--kq-shadow) !important;
  }
  :root.kplus-night-mode .n-drawer,
  :root.kplus-night-mode .n-drawer-content,
  :root.kplus-night-mode .n-modal,
  :root.kplus-night-mode .n-dialog {
    color: var(--kq-text) !important;
    background-color: var(--kq-surface-solid) !important;
    border-color: var(--kq-border) !important;
  }

  /* \u56FA\u5B9A\u8272\u5DE5\u5177\u7C7B\u53EA\u505A\u8BED\u4E49\u6620\u5C04\uFF1B\u4E0D\u8986\u76D6 text-white\uFF0C\u907F\u514D\u56FE\u7247\u4E0A\u7684\u767D\u8272\u6807\u9898\u53D8\u6697\u3002 */
  :root.kplus-night-mode .text-black,
  :root.kplus-night-mode [class~="text-[#263473]"] { color: var(--kq-text) !important; }
  :root.kplus-night-mode .text-gray-500,
  :root.kplus-night-mode .text-gray-600,
  :root.kplus-night-mode [class~="text-[#4c5b6f]"] { color: var(--kq-text-muted) !important; }
  :root.kplus-night-mode [class~="text-[#4b6989]"] { color: var(--kq-primary-strong) !important; }
  :root.kplus-night-mode .bg-white { background-color: var(--kq-surface-soft) !important; }
  :root.kplus-night-mode [class~="bg-gray-50/[.80]"],
  :root.kplus-night-mode [class~="bg-gray-50/[.90]"],
  :root.kplus-night-mode [class~="bg-gray-100/[.90]"] { background-color: var(--kq-surface) !important; }
  :root.kplus-night-mode [class~="bg-gray-400/[.50]"] { background-color: rgba(158, 175, 185, .22) !important; }
  :root.kplus-night-mode .bg-black { background-color: var(--kq-text) !important; }
  :root.kplus-night-mode .border-black,
  :root.kplus-night-mode [class~="border-[#263473]"] { border-color: var(--kq-primary) !important; }
  :root.kplus-night-mode .border-gray-200,
  :root.kplus-night-mode .border-gray-300,
  :root.kplus-night-mode [class~="border-[#dae1e5]"] { border-color: var(--kq-border) !important; }

  /* \u9996\u9875 Momotalk \u6D88\u606F\u4FDD\u6301\u84DD/\u7C89\u9635\u8425\u5DEE\u5F02\uFF0C\u56DE\u590D\u9879\u5177\u5907\u53EF\u89C1\u7684\u60AC\u6D6E\u53CD\u9988\u3002 */
  :root.kplus-night-mode .chat-bubble { color: #f4f9fc !important; background-color: #3c5365 !important; }
  :root.kplus-night-mode [class~="bg-[#E1EDF0]"],
  :root.kplus-night-mode [class~="bg-[#e1edf0]"] { color: var(--kq-text) !important; background-color: rgba(34, 61, 73, .94) !important; }
  :root.kplus-night-mode [class~="bg-[#fceef0]"] { color: var(--kq-text) !important; background-color: rgba(69, 44, 55, .94) !important; }
  :root.kplus-night-mode [class~="bg-[#dae1e5]"] { background-color: var(--kq-border-strong) !important; }
  :root.kplus-night-mode [class~="hover:bg-[#eeeeee]"]:hover { background-color: rgba(125, 196, 220, .14) !important; }
  :root.kplus-night-mode [class~="hover:bg-[#df6d80]"]:hover { background-color: rgba(255, 156, 166, .22) !important; }

  /* \u89D2\u8272\u8D44\u6599\u3001\u7EC4\u7EC7\u7B14\u8BB0\u7B49\u624B\u5199\u7EC4\u4EF6\u3002\u9009\u9879\u5FC5\u987B\u540C\u65F6\u533A\u5206\u9ED8\u8BA4\u3001\u60AC\u6D6E\u548C\u9009\u4E2D\u72B6\u6001\u3002 */
  :root.kplus-night-mode .student_info,
  :root.kplus-night-mode .info_key,
  :root.kplus-night-mode .info_value { color: var(--kq-text) !important; }
  :root.kplus-night-mode .info_key { color: var(--kq-text-muted) !important; }
  :root.kplus-night-mode .tabs-tabs-header,
  :root.kplus-night-mode .tabs-tabs-container { color: var(--kq-text); border-color: var(--kq-border) !important; }
  :root.kplus-night-mode .tabs-tab-button { color: var(--kq-text-muted) !important; background-color: transparent !important; }
  :root.kplus-night-mode .tabs-tab-button:hover { color: var(--kq-text) !important; background-color: rgba(255, 255, 255, .06) !important; }
  :root.kplus-night-mode .tabs-tab-button.active { color: var(--kq-primary-strong) !important; background-color: var(--kq-primary-soft) !important; }

  /* \u5730\u5F62\u7C7B\u578B\u662F\u900F\u660E\u5E95\u9ED1\u8272 PNG\uFF0C\u8BC4\u7EA7\u5B57\u6BCD\u5219\u662F\u5F69\u8272 WebP\u3002\u53EA\u5904\u7406\u524D\u8005\uFF0C\u907F\u514D
     \u628A S/A/B \u7B49\u8BC4\u7EA7\u989C\u8272\u4E00\u5E76\u53CD\u8F6C\u3002 */
  :root.kplus-night-mode img[alt="adaptability icon"].h-full {
    filter: invert(91%) sepia(8%) saturate(346%) hue-rotate(153deg) brightness(104%) contrast(94%);
  }

  /* \u8054\u7CFB\u9875\u4F7F\u7528\u72EC\u7ACB\u7684 Naive UI \u6807\u9898\u3001\u5217\u8868\u4E0E\u5F15\u7528\u7EC4\u4EF6\uFF0C\u5B83\u4EEC\u6CA1\u6709\u7EE7\u627F\u5361\u7247
     \u7684 --n-text-color\uFF0C\u9700\u663E\u5F0F\u6865\u63A5\u6DF1\u8272\u4EE4\u724C\u3002 */
  :root.kplus-night-mode .n-h {
    --n-text-color: var(--kq-text) !important;
    --n-bar-color: var(--kq-primary) !important;
    color: var(--kq-text) !important;
  }
  :root.kplus-night-mode .n-ul,
  :root.kplus-night-mode .n-ol {
    --n-text-color: var(--kq-text-soft) !important;
    color: var(--kq-text-soft) !important;
  }
  :root.kplus-night-mode .n-blockquote {
    --n-text-color: var(--kq-text-muted) !important;
    color: var(--kq-text-muted) !important;
    border-color: var(--kq-border-strong) !important;
  }

  /* \u7559\u58F0\u673A\u4F7F\u7528 APlayer\uFF0C\u4E0D\u5171\u4EAB Naive UI \u53D8\u91CF\u3002 */
  :root.kplus-night-mode .aplayer,
  :root.kplus-night-mode .aplayer-info,
  :root.kplus-night-mode .aplayer-list { color: var(--kq-text) !important; background: var(--kq-surface-solid) !important; border-color: var(--kq-border) !important; }
  :root.kplus-night-mode .aplayer .aplayer-music .aplayer-title,
  :root.kplus-night-mode .aplayer-list-title { color: var(--kq-text) !important; }
  :root.kplus-night-mode .aplayer .aplayer-music .aplayer-author,
  :root.kplus-night-mode .aplayer-list-author,
  :root.kplus-night-mode .aplayer-list-index { color: var(--kq-text-muted) !important; }
  :root.kplus-night-mode .aplayer-list li { border-color: var(--kq-border) !important; }
  :root.kplus-night-mode .aplayer-list li:hover { background: rgba(255, 255, 255, .06) !important; }
  :root.kplus-night-mode .aplayer-list li.aplayer-list-light { background: var(--kq-primary-soft) !important; }

  /* Markdown \u4EC5\u8986\u76D6\u9884\u89C8\u5185\u5BB9\uFF0C\u4E0D\u89E6\u78B0\u7F16\u8F91\u5668\u5DE5\u5177\u6309\u94AE\u548C\u5916\u90E8\u56FE\u7247\u3002 */
  :root.kplus-night-mode .markdown-body,
  :root.kplus-night-mode .md-editor-preview,
  :root.kplus-night-mode .md-editor-preview-wrapper,
  :root.kplus-night-mode .md-editor-previewOnly {
    color: var(--kq-text) !important;
    background-color: transparent !important;
    --md-theme-color: var(--kq-primary) !important;
    --md-color: var(--kq-text) !important;
    --md-hover-color: rgba(255, 255, 255, .06) !important;
    --md-bk-color: transparent !important;
    --md-border-color: var(--kq-border) !important;
  }
  :root.kplus-night-mode .markdown-body :is(h1, h2, h3, h4, h5, h6),
  :root.kplus-night-mode .md-editor-preview :is(h1, h2, h3, h4, h5, h6) {
    color: var(--kq-text) !important;
    border-color: var(--kq-border) !important;
  }
  :root.kplus-night-mode .markdown-body a,
  :root.kplus-night-mode .md-editor-preview a { color: var(--kq-primary-hover) !important; text-decoration-color: rgba(161, 216, 233, .45) !important; }
  :root.kplus-night-mode .markdown-body a:hover,
  :root.kplus-night-mode .md-editor-preview a:hover { color: #c9edf7 !important; text-decoration-color: currentColor !important; }
  :root.kplus-night-mode .markdown-body :not(pre) > code,
  :root.kplus-night-mode .md-editor-preview :not(pre) > code,
  :root.kplus-night-mode .n-text--code { color: #bfe4f0 !important; background-color: rgba(125, 196, 220, .12) !important; border-color: var(--kq-border) !important; }
  :root.kplus-night-mode .markdown-body pre,
  :root.kplus-night-mode .md-editor-preview pre { color: #dbe8ee !important; background-color: #111a22 !important; border: 1px solid var(--kq-border) !important; }
  :root.kplus-night-mode .markdown-body blockquote,
  :root.kplus-night-mode .md-editor-preview blockquote { color: var(--kq-text-soft) !important; background: rgba(125, 196, 220, .08) !important; border-color: var(--kq-primary) !important; }
  :root.kplus-night-mode .markdown-body table,
  :root.kplus-night-mode .md-editor-preview table,
  :root.kplus-night-mode .markdown-body th,
  :root.kplus-night-mode .md-editor-preview th,
  :root.kplus-night-mode .markdown-body td,
  :root.kplus-night-mode .md-editor-preview td { color: var(--kq-text) !important; border-color: var(--kq-border) !important; }
  :root.kplus-night-mode .markdown-body tr,
  :root.kplus-night-mode .md-editor-preview tr { background-color: transparent !important; border-color: var(--kq-border) !important; }
  :root.kplus-night-mode .markdown-body tr:nth-child(2n),
  :root.kplus-night-mode .md-editor-preview tr:nth-child(2n) { background-color: rgba(255, 255, 255, .035) !important; }
  :root.kplus-night-mode .md-editor-admonition { color: var(--kq-text) !important; background-color: rgba(125, 196, 220, .10) !important; border-color: var(--kq-primary) !important; }
  :root.kplus-night-mode .md-editor-admonition-title { color: var(--kq-primary-strong) !important; }

  :root.kplus-night-mode .n-data-table {
    --n-merged-th-color: var(--kq-surface-raised) !important;
    --n-merged-td-color: var(--kq-surface) !important;
    --n-merged-border-color: var(--kq-border) !important;
    --n-th-text-color: var(--kq-text) !important;
    --n-td-text-color: var(--kq-text-soft) !important;
    --n-merged-td-color-hover: rgba(255, 255, 255, .05) !important;
  }
  :root.kplus-night-mode .n-divider,
  :root.kplus-night-mode .n-list-item__divider,
  :root.kplus-night-mode hr { border-color: var(--kq-border) !important; background-color: var(--kq-border) !important; }
  :root.kplus-night-mode .n-scrollbar-rail { --n-scrollbar-color: rgba(202, 213, 220, .28) !important; --n-scrollbar-color-hover: rgba(202, 213, 220, .48) !important; }
  :root.kplus-night-mode .n-loading-bar-container { z-index: 2147483640 !important; }
  :root.kplus-night-mode .n-loading-bar { background: var(--kq-primary) !important; }

`;

  // src/theme/page-state.ts
  var HOME_CLASS = "kq-route-home";
  var HOME_TOP_CLASS = "kq-home-top";
  var observePageState = () => {
    const html = document.documentElement;
    let scrollContainer = null;
    let frame = 0;
    let retryTimer = 0;
    let retriesRemaining = 20;
    const updateScrollState = () => {
      frame = 0;
      const isHome = location.pathname === "/";
      html.classList.toggle(HOME_CLASS, isHome);
      html.classList.toggle(HOME_TOP_CLASS, isHome && (scrollContainer?.scrollTop ?? 0) <= 8);
    };
    const scheduleScrollUpdate = () => {
      if (!frame) frame = requestAnimationFrame(updateScrollState);
    };
    const bindScrollContainer = () => {
      const next = document.querySelector(".n-layout-scroll-container .n-scrollbar-container");
      if (next !== scrollContainer) {
        scrollContainer?.removeEventListener("scroll", scheduleScrollUpdate);
        scrollContainer = next;
        scrollContainer?.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
      }
      scheduleScrollUpdate();
      if (retriesRemaining > 0) {
        retriesRemaining -= 1;
        window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(bindScrollContainer, 100);
      } else {
        window.clearTimeout(retryTimer);
      }
    };
    const scheduleRouteUpdate = () => {
      retriesRemaining = 20;
      window.clearTimeout(retryTimer);
      queueMicrotask(bindScrollContainer);
    };
    const onDocumentClick = (event) => {
      if (event.target instanceof Element && event.target.closest("a[href]")) scheduleRouteUpdate();
    };
    const title = document.querySelector("title");
    const titleObserver = title ? new MutationObserver(scheduleRouteUpdate) : null;
    titleObserver?.observe(title, { childList: true, characterData: true, subtree: true });
    document.addEventListener("click", onDocumentClick, { capture: true, passive: true });
    window.addEventListener("popstate", scheduleRouteUpdate);
    window.addEventListener("hashchange", scheduleRouteUpdate);
    bindScrollContainer();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(retryTimer);
      titleObserver?.disconnect();
      scrollContainer?.removeEventListener("scroll", scheduleScrollUpdate);
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("popstate", scheduleRouteUpdate);
      window.removeEventListener("hashchange", scheduleRouteUpdate);
      html.classList.remove(HOME_CLASS, HOME_TOP_CLASS);
    };
  };

  // src/ui/toolbar.ts
  var TOOL_META = {
    top: { label: "\u8FD4\u56DE\u9876\u90E8", path: "M12 19V5m0 0-6 6m6-6 6 6", title: "\u8FD4\u56DE\u9876\u90E8" },
    atlas: { label: "\u89D2\u8272\u56FE\u9274", path: "M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z", title: "\u6253\u5F00\u89D2\u8272\u56FE\u9274" },
    night: { label: "\u591C\u95F4\u6A21\u5F0F", path: "M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z", title: "\u5207\u6362\u591C\u95F4\u6A21\u5F0F" }
  };
  var EXPAND_PATH = "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z";
  var CLOSE_PATH = "M18 6 6 18M6 6l12 12";
  var THEME_SWITCHING_CLASS = "kq-theme-switching";
  var THEME_SWITCH_STYLE = `
  :root.${THEME_SWITCHING_CLASS} *,
  :root.${THEME_SWITCHING_CLASS} *::before,
  :root.${THEME_SWITCHING_CLASS} *::after {
    transition: none !important;
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
`;
  var TOOLBAR_STYLE = `
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
   .kq-toolbar__button--expand .kq-toolbar__icon { fill: currentColor; stroke-width: 1.5; }
  .kq-toolbar__button--secondary { color: #d9e8ee; background: linear-gradient(145deg, #354554, #273541); }
  .kq-toolbar__button--active { color: #fff7df; background: linear-gradient(145deg, #8a6b38, #6b4b26); }
  .kq-toolbar__button--expand { background: #233542; }
  .kq-toolbar__button[hidden] { display: none; }
  @media (prefers-reduced-motion: reduce) { .kq-toolbar__menu, .kq-toolbar__button { transition: none; } }
`;
  var mountToolbar = (context) => {
    let settings = normalizeSettings(context.settings);
    let themeSignature = "";
    let themeSwitchFrame = 0;
    let atlasRetryTimer = 0;
    const style = document.createElement("style");
    style.textContent = TOOLBAR_STYLE;
    const themeSwitchStyle = document.createElement("style");
    themeSwitchStyle.textContent = THEME_SWITCH_STYLE;
    const toolbar = document.createElement("aside");
    toolbar.className = "kq-toolbar";
    toolbar.setAttribute("aria-label", "\u5FEB\u6377\u5DE5\u5177");
    const menu = document.createElement("div");
    menu.className = "kq-toolbar__menu";
    menu.id = "kq-toolbar-menu";
    const createIcon = (path) => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
      svg.classList.add("kq-toolbar__icon");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      shape.setAttribute("d", path);
      svg.append(shape);
      return svg;
    };
    const makeButton = (id) => {
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
    expandButton.classList.add("kq-toolbar__button--expand");
    expandButton.replaceChildren(createIcon(EXPAND_PATH));
    expandButton.setAttribute("aria-label", "\u5C55\u5F00\u5FEB\u6377\u5DE5\u5177");
    expandButton.setAttribute("aria-controls", menu.id);
    expandButton.title = "\u5C55\u5F00\u5FEB\u6377\u5DE5\u5177";
    const topButton = makeButton("top");
    topButton.dataset.action = "top";
    const nightButton = makeButton("night");
    const atlasButton = makeButton("atlas");
    const fixed = document.createElement("div");
    fixed.className = "kq-toolbar__fixed";
    toolbar.append(menu, expandButton, fixed);
    context.root.append(style, toolbar);
    document.head.append(themeSwitchStyle);
    const stopObservingPage = observePageState();
    const applyTheme = (enabled) => {
      const signature = `${enabled}:${settings.overlayOpacity}`;
      if (signature !== themeSignature) {
        themeSignature = signature;
        if (themeSwitchFrame) cancelAnimationFrame(themeSwitchFrame);
        document.documentElement.classList.add(THEME_SWITCHING_CLASS);
        context.setGlobalStyle(NIGHT_STYLE_ID, enabled ? createNightCss(settings.overlayOpacity) : "");
        document.documentElement.classList.toggle("kplus-night-mode", enabled);
        void document.documentElement.offsetWidth;
        themeSwitchFrame = requestAnimationFrame(() => {
          themeSwitchFrame = 0;
          document.documentElement.classList.remove(THEME_SWITCHING_CLASS);
        });
      } else {
        document.documentElement.classList.toggle("kplus-night-mode", enabled);
      }
      nightButton.classList.toggle("kq-toolbar__button--active", enabled);
      nightButton.setAttribute("aria-pressed", String(enabled));
      nightButton.title = enabled ? "\u5173\u95ED\u591C\u95F4\u6A21\u5F0F" : "\u591C\u95F4\u6A21\u5F0F";
    };
    const persist = () => {
      void context.saveSettings(settings).catch(() => {
      });
    };
    const render = () => {
      toolbar.dataset.position = settings.position;
      toolbar.dataset.expanded = String(settings.expanded);
      toolbar.style.setProperty("--kq-size", `${settings.size}px`);
      toolbar.style.setProperty("--kq-offset", `${settings.offset}px`);
      const collapsed = new Set(settings.collapsedTools);
      const buttons = { night: nightButton, atlas: atlasButton, top: topButton };
      menu.replaceChildren(...["night", "atlas", "top"].filter((id) => collapsed.has(id)).map((id) => buttons[id]));
      fixed.replaceChildren(...["night", "atlas", "top"].filter((id) => !collapsed.has(id)).map((id) => buttons[id]));
      menu.querySelectorAll("button").forEach((button) => {
        button.tabIndex = settings.expanded ? 0 : -1;
      });
      expandButton.hidden = collapsed.size === 0;
      menu.setAttribute("aria-hidden", String(!settings.expanded));
      expandButton.setAttribute("aria-expanded", String(settings.expanded));
      expandButton.setAttribute("aria-label", settings.expanded ? "\u6298\u53E0\u5FEB\u6377\u5DE5\u5177" : "\u5C55\u5F00\u5FEB\u6377\u5DE5\u5177");
      expandButton.title = settings.expanded ? "\u6298\u53E0\u5FEB\u6377\u5DE5\u5177" : "\u5C55\u5F00\u5FEB\u6377\u5DE5\u5177";
      expandButton.replaceChildren(createIcon(settings.expanded ? CLOSE_PATH : EXPAND_PATH));
      applyTheme(settings.nightMode);
    };
    expandButton.addEventListener("click", () => {
      settings = { ...settings, expanded: !settings.expanded };
      render();
      persist();
    });
    topButton.addEventListener("click", () => {
      const scroller = document.querySelector(".n-layout-scroll-container .n-scrollbar-container");
      if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
    const findNativeAtlasEntries = () => {
      const selectors = [
        ".n-menu-item .n-a",
        ".n-menu-item-content",
        '[role="menuitem"]',
        "div.cursor-pointer",
        "button",
        "a",
        '[role="button"]'
      ];
      const candidates = selectors.flatMap((selector) => [
        ...document.querySelectorAll(selector)
      ]);
      const exact = (text) => candidates.filter((entry) => entry.textContent?.trim() === text);
      return [...exact("\u89D2\u8272\u56FE\u9274"), ...exact("\u62FF\u8D77\u89D2\u8272\u56FE\u9274")].filter((entry, index, all) => all.indexOf(entry) === index);
    };
    const triggerNativeAtlas = () => {
      window.clearTimeout(atlasRetryTimer);
      const nativeAtlas = findNativeAtlasEntries()[0];
      if (!nativeAtlas) {
        context.log?.("warn", "\u672A\u627E\u5230 KivoWiki \u539F\u751F\u89D2\u8272\u56FE\u9274\u5165\u53E3\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u540E\u91CD\u8BD5");
        return;
      }
      const actionable = nativeAtlas.matches("a, button") ? nativeAtlas : nativeAtlas.querySelector("a, button, [role=button]") || nativeAtlas;
      actionable.click();
      atlasRetryTimer = window.setTimeout(() => {
        if (document.querySelector('input[placeholder="\u641C\u7D22\u89D2\u8272"], [aria-label="\u641C\u7D22\u89D2\u8272"]')) return;
        const fallback = findNativeAtlasEntries().find((entry) => entry.textContent?.trim() === "\u62FF\u8D77\u89D2\u8272\u56FE\u9274");
        const fallbackAction = fallback?.matches("a, button") ? fallback : fallback?.querySelector("a, button, [role=button]") || fallback;
        fallbackAction?.click();
      }, 350);
    };
    atlasButton.addEventListener("click", triggerNativeAtlas);
    nightButton.addEventListener("click", () => {
      settings = { ...settings, nightMode: !settings.nightMode };
      render();
      persist();
    });
    context.onSettingsChange((next) => {
      settings = normalizeSettings({ ...settings, ...next });
      render();
    });
    context.onCleanup(() => {
      stopObservingPage();
      window.clearTimeout(atlasRetryTimer);
      if (themeSwitchFrame) cancelAnimationFrame(themeSwitchFrame);
      document.documentElement.classList.remove(THEME_SWITCHING_CLASS);
      document.documentElement.classList.remove("kplus-night-mode");
      context.setGlobalStyle(NIGHT_STYLE_ID, "");
      style.remove();
      themeSwitchStyle.remove();
      toolbar.remove();
    });
    render();
  };

  // src/entry.ts
  (() => {
    const module = {
      id: "quick-tools",
      name: "Kivowiki-Mods-quick-tools",
      version: "2.3.2",
      description: "\u63D0\u4F9B\u53EF\u914D\u7F6E\u7684\u60AC\u6D6E\u5FEB\u6377\u5DE5\u5177\u3001\u6298\u53E0\u89C4\u5219\u548C KivoWiki \u591C\u95F4\u9002\u914D\u3002",
      author: "\u671D\u798AASOGI",
      defaultSettings: DEFAULT_SETTINGS,
      config: "modules/Kivowiki-Mods-quick-tools/src/config.js",
      mode: "builtin",
      permissions: [
        { id: "page.read", reason: "\u8BFB\u53D6\u6EDA\u52A8\u4F4D\u7F6E\u548C\u5F53\u524D\u9875\u9762\u7ED3\u6784\u3002" },
        { id: "page.modify", reason: "\u663E\u793A\u5FEB\u6377\u5DE5\u5177\u5E76\u5E94\u7528\u7528\u6237\u4E3B\u52A8\u5F00\u542F\u7684\u4E3B\u9898\u6837\u5F0F\u3002" },
        { id: "settings", reason: "\u4FDD\u5B58\u5DE5\u5177\u5E03\u5C40\u548C\u591C\u95F4\u6A21\u5F0F\u8BBE\u7F6E\u3002" }
      ],
      dependencies: {},
      conflicts: {},
      engines: { kivowikiMods: "^1.4.0", api: "^1.1.0" },
      claims: { globals: [], pageSelectors: [".n-menu-item .n-a", ".cursor-pointer"], routes: [] },
      publisher: { id: "kivowiki-mods", name: "Kivowiki-Mods \u5B98\u65B9" },
      source: { registry: "builtin" },
      review: { status: "approved", reviewer: "Kivowiki-Mods", reviewedAt: "2026-08-29" },
      trust: { status: "builtin", label: "\u5B98\u65B9\u5185\u7F6E", publisher: "verified", reviewed: "approved" },
      mount(context) {
        mountToolbar(context);
      }
    };
    globalThis.KivowikiModsModules = globalThis.KivowikiModsModules || [];
    globalThis.KivowikiModsModules = globalThis.KivowikiModsModules.filter(
      (item) => !(item && typeof item === "object" && "id" in item && item.id === module.id)
    );
    globalThis.KivowikiModsModules.push(module);
  })();
})();
