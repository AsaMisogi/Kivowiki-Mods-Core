(async function initPopup() {
  const modules = Array.isArray(globalThis.KivowikiModsModules) ? globalThis.KivowikiModsModules : [];
  const state = (await chrome.storage.local.get("state")).state || { modules: {}, imported: [], preferences: {} };
  const enabledBuiltins = modules.filter((module) => state.modules?.[module.id]?.enabled !== false).length;
  const dependencies = [...(globalThis.KivowikiModsDependencies || []), ...(Array.isArray(state.dependencies) ? state.dependencies : [])];
  const resolution = KivowikiModsPlatform.resolveModules(Array.isArray(state.imported) ? state.imported : [], dependencies, state.lockfile);
  const enabledImported = resolution.ordered.length;
  const enabled = enabledBuiltins + enabledImported;
  const attention = (state.imported || []).filter((module) => module.enabled !== false && !resolution.status[module.id]?.runnable).length;
  document.getElementById("summary-text").textContent = attention ? `${enabled} 个运行中，${attention} 个需处理` : `${enabled} 个模块可运行`;
  document.getElementById("open-options").addEventListener("click", () => chrome.runtime.sendMessage({ type: "open-manager" }));
  const entryVisible = document.getElementById("entry-visible");
  const entryLabel = document.getElementById("entry-setting-label");
  const updateEntryLabel = () => { entryLabel.textContent = entryVisible.checked ? "已显示" : "已隐藏"; };
  entryVisible.checked = state.preferences?.managerTabVisible !== false;
  updateEntryLabel();
  entryVisible.addEventListener("change", async () => {
    const previous = !entryVisible.checked;
    updateEntryLabel();
    // 弹窗可能在管理器或其他标签页打开时保持旧快照，因此只更新最新状态中的这一项。
    const latest = (await chrome.storage.local.get("state")).state || { modules: {}, imported: [], preferences: {} };
    latest.preferences = { ...(latest.preferences || {}), managerTabVisible: entryVisible.checked };
    try {
      await chrome.storage.local.set({ state: latest });
    } catch (error) {
      entryVisible.checked = previous;
      updateEntryLabel();
    }
  });
})();
