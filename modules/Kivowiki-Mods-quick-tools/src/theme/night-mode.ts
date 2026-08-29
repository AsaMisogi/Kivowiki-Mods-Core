export const NIGHT_STYLE_ID = "kivo-plus-night-mode-v3";

/**
 * KivoWiki 同时使用 Naive UI 的元素级 CSS 变量、Tailwind 固定色类和少量
 * 手写业务组件。夜间主题按这三层分别适配，避免用通配选择器改坏图片、
 * 透明图标按钮和组件自身的交互状态。
 */
export const createNightCss = (opacity: number): string => `
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

  /* 首页顶部保留站点原有的黑色渐变和白色导航；离开顶部后才显示深色表面。 */
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

  /* Naive UI 主题桥：覆盖元素上的浅色变量，同时完整保留悬浮、选中和禁用语义。 */
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

  /* Teleport 到 body 的下拉菜单、抽屉和弹窗不在页面卡片树中，需要单独覆盖。 */
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

  /* 固定色工具类只做语义映射；不覆盖 text-white，避免图片上的白色标题变暗。 */
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

  /* 首页 Momotalk 消息保持蓝/粉阵营差异，回复项具备可见的悬浮反馈。 */
  :root.kplus-night-mode .chat-bubble { color: #f4f9fc !important; background-color: #3c5365 !important; }
  :root.kplus-night-mode [class~="bg-[#E1EDF0]"],
  :root.kplus-night-mode [class~="bg-[#e1edf0]"] { color: var(--kq-text) !important; background-color: rgba(34, 61, 73, .94) !important; }
  :root.kplus-night-mode [class~="bg-[#fceef0]"] { color: var(--kq-text) !important; background-color: rgba(69, 44, 55, .94) !important; }
  :root.kplus-night-mode [class~="bg-[#dae1e5]"] { background-color: var(--kq-border-strong) !important; }
  :root.kplus-night-mode [class~="hover:bg-[#eeeeee]"]:hover { background-color: rgba(125, 196, 220, .14) !important; }
  :root.kplus-night-mode [class~="hover:bg-[#df6d80]"]:hover { background-color: rgba(255, 156, 166, .22) !important; }

  /* 角色资料、组织笔记等手写组件。选项必须同时区分默认、悬浮和选中状态。 */
  :root.kplus-night-mode .student_info,
  :root.kplus-night-mode .info_key,
  :root.kplus-night-mode .info_value { color: var(--kq-text) !important; }
  :root.kplus-night-mode .info_key { color: var(--kq-text-muted) !important; }
  :root.kplus-night-mode .tabs-tabs-header,
  :root.kplus-night-mode .tabs-tabs-container { color: var(--kq-text); border-color: var(--kq-border) !important; }
  :root.kplus-night-mode .tabs-tab-button { color: var(--kq-text-muted) !important; background-color: transparent !important; }
  :root.kplus-night-mode .tabs-tab-button:hover { color: var(--kq-text) !important; background-color: rgba(255, 255, 255, .06) !important; }
  :root.kplus-night-mode .tabs-tab-button.active { color: var(--kq-primary-strong) !important; background-color: var(--kq-primary-soft) !important; }

  /* 地形类型是透明底黑色 PNG，评级字母则是彩色 WebP。只处理前者，避免
     把 S/A/B 等评级颜色一并反转。 */
  :root.kplus-night-mode img[alt="adaptability icon"].h-full {
    filter: invert(91%) sepia(8%) saturate(346%) hue-rotate(153deg) brightness(104%) contrast(94%);
  }

  /* 联系页使用独立的 Naive UI 标题、列表与引用组件，它们没有继承卡片
     的 --n-text-color，需显式桥接深色令牌。 */
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

  /* 留声机使用 APlayer，不共享 Naive UI 变量。 */
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

  /* Markdown 仅覆盖预览内容，不触碰编辑器工具按钮和外部图片。 */
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
