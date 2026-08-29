import type { QuickToolsSettings, ToolId, ToolPosition } from "../types";

export const DEFAULT_SETTINGS: QuickToolsSettings = {
  nightMode: false,
  expanded: false,
  collapsedTools: ["night"],
  position: "right-bottom",
  size: 46,
  offset: 22,
  overlayOpacity: 0.22
};

const POSITIONS: ToolPosition[] = ["right-bottom", "left-bottom", "right-center", "left-center"];

/**
 * 所有设置都在模块边界统一清洗，页面入口和配置页只消费可靠值。
 * 这同时兼容 1.x 仅保存 nightMode 的旧设置，并防止手工修改存储后
 * 出现超大按钮、非法位置或异常透明度。
 */
export const normalizeSettings = (input: Partial<QuickToolsSettings> = {}): QuickToolsSettings => {
  const size = Number(input.size);
  const offset = Number(input.offset);
  const opacity = Number(input.overlayOpacity);
  const collapsedTools = Array.isArray(input.collapsedTools)
      ? input.collapsedTools.filter((id): id is ToolId => id === "top" || id === "atlas" || id === "night")
    : DEFAULT_SETTINGS.collapsedTools;
  return {
    nightMode: input.nightMode === true,
    expanded: input.expanded === true,
    collapsedTools: [...new Set(collapsedTools)],
    position: POSITIONS.includes(input.position as ToolPosition) ? input.position as ToolPosition : DEFAULT_SETTINGS.position,
    size: Number.isFinite(size) ? Math.min(72, Math.max(36, Math.round(size))) : DEFAULT_SETTINGS.size,
    offset: Number.isFinite(offset) ? Math.min(64, Math.max(8, Math.round(offset))) : DEFAULT_SETTINGS.offset,
    overlayOpacity: Number.isFinite(opacity) ? Math.min(0.55, Math.max(0.08, Math.round(opacity * 100) / 100)) : DEFAULT_SETTINGS.overlayOpacity
  };
};
