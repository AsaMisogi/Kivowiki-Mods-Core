export type ToolId = "top" | "atlas" | "night";
export type ToolPosition = "right-bottom" | "left-bottom" | "right-center" | "left-center";

export interface QuickToolsSettings {
  nightMode: boolean;
  expanded: boolean;
  collapsedTools: ToolId[];
  position: ToolPosition;
  size: number;
  offset: number;
  overlayOpacity: number;
}

export interface ModuleContext {
  root: HTMLElement;
  settings: Partial<QuickToolsSettings>;
  dependencies: Readonly<Record<string, unknown>>;
  setGlobalStyle(id: string, css: string): void;
  saveSettings(settings: QuickToolsSettings): Promise<void>;
  onSettingsChange(callback: (settings: Partial<QuickToolsSettings>) => void): void;
  onCleanup(callback: () => void): void;
  log?(level: "debug" | "info" | "warn" | "error", message: string): void;
}

declare global {
  var KivowikiModsModules: unknown[] | undefined;
}
