(async function initPopup() {
  const modules = Array.isArray(globalThis.KivowikiModsModules) ? globalThis.KivowikiModsModules : [];
  const state = (await chrome.storage.local.get("state")).state || { modules: {}, imported: [] };
  const enabledBuiltins = modules.filter((module) => state.modules?.[module.id]?.enabled !== false).length;
  const dependencies = [...(globalThis.KivowikiModsDependencies || []), ...(Array.isArray(state.dependencies) ? state.dependencies : [])];
  const resolution = KivowikiModsPlatform.resolveModules(Array.isArray(state.imported) ? state.imported : [], dependencies, state.lockfile);
  const enabledImported = resolution.ordered.length;
  const enabled = enabledBuiltins + enabledImported;
  const attention = (state.imported || []).filter((module) => module.enabled !== false && !resolution.status[module.id]?.runnable).length;
  document.getElementById("summary-text").textContent = attention ? `${enabled} 个运行中，${attention} 个需处理` : `${enabled} 个模块可运行`;
  document.getElementById("open-options").addEventListener("click", () => chrome.runtime.sendMessage({ type: "open-manager" }));
})();
