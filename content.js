(function startKivoPlus() {
  "use strict";

  const STORAGE_KEY = "state";
  const PAGE_RUNTIME_VERSION = 2;
  const DEFAULT_STATE = {
    preferences: { safeMode: false, crashIsolation: true, managerTabVisible: true, marketAutoLoad: true },
    modules: { "quick-tools": { enabled: true, settings: { nightMode: false, expanded: false, collapsedTools: ["night"], position: "right-bottom", size: 46, offset: 22, overlayOpacity: 0.22 } } },
    imported: [],
    dependencies: []
  };
  const modules = Array.isArray(globalThis.KivowikiModsModules) ? globalThis.KivowikiModsModules : [];
  const builtinDependencies = Array.isArray(globalThis.KivowikiModsDependencies) ? globalThis.KivowikiModsDependencies : [];
  const dependencyInstances = new Map();
  const cleanups = new Map();
  const settingsListeners = new Map();
  const globalStyles = new Map();
  const importedRuntimes = new Map();
  const pageRuntimes = new Map();
  const moduleGenerations = new Map();
  const builtinGenerations = new Map();
  const messageRates = new Map();
  let saveQueue = Promise.resolve();
  let state = null;
  let syncGeneration = 0;
  let pageReloadScheduled = false;

  // 管理器 UI 使用 Shadow DOM 隔离，避免站点 CSS 反向影响模块控件。
  const host = document.createElement("div");
  host.id = "kivo-wiki-plus-host";
  const shadow = host.attachShadow({ mode: "closed" });
  const surface = document.createElement("div");
  shadow.append(surface);
  const importedViewStack = document.createElement("div");
  importedViewStack.className = "kplus-view-stack";
  surface.append(importedViewStack);

  const managerStyle = document.createElement("style");
  managerStyle.textContent = `
    :host { all: initial; }
    .kplus-manager-tab { position: fixed; left: -2px; top: 50%; width: 24px; height: 116px; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; gap: 5px; border: 0; border-radius: 0 12px 12px 0; padding: 8px 2px; cursor: pointer; color: #eefafa; background: #1e6870; box-shadow: 0 5px 18px rgba(8,30,40,.22); writing-mode: vertical-rl; font: 600 11px/1 system-ui, sans-serif; opacity: .78; transition: width .18s ease, opacity .18s ease; }
    .kplus-manager-tab:hover, .kplus-manager-tab:focus-visible { width: 42px; opacity: 1; }
    .kplus-manager-tab:focus-visible { outline: 3px solid #f4c36c; outline-offset: 2px; }
    .kplus-view-stack { position: fixed; right: 20px; bottom: 76px; z-index: 2147483645; display: flex; flex-direction: column; gap: 10px; width: min(320px, calc(100vw - 40px)); max-height: calc(100vh - 112px); overflow: auto; overscroll-behavior: contain; pointer-events: none; scrollbar-width: thin; }
    .kplus-view-stack > * { flex: 0 0 auto; pointer-events: auto; }
    @media (max-width: 600px) { .kplus-view-stack { right: 12px; bottom: 64px; width: min(320px, calc(100vw - 24px)); max-height: calc(100vh - 88px); } }
  `;
  shadow.append(managerStyle);
  const managerTab = document.createElement("button");
  managerTab.className = "kplus-manager-tab";
  managerTab.type = "button";
  const managerIcon = document.createElement("img");
  managerIcon.src = chrome.runtime.getURL("icon.png");
  managerIcon.alt = "";
  managerIcon.width = 18;
  managerIcon.height = 18;
  managerTab.append(managerIcon, document.createTextNode("Kivowiki-Mods"));
  managerTab.title = "打开 Kivowiki-Mods 设置";
  managerTab.setAttribute("aria-label", "打开 Kivowiki-Mods 设置");
  managerTab.addEventListener("click", () => chrome.runtime.sendMessage({ type: "open-manager" }));
  shadow.append(managerTab);
  document.documentElement.append(host);

  const writeLog = (moduleId, level, event, message) => chrome.runtime.sendMessage({ type: "runtime-log", moduleId, level, event, message }).catch(() => {});
  const notify = (message, moduleId = "host") => {
    console.warn(`[Kivowiki-Mods] ${message}`);
    writeLog(moduleId, "warn", "host", message);
  };
  const reportCrash = (entry, error) => {
    const message = error instanceof Error ? error.message : String(error || "模块运行失败");
    notify(`模块“${entry.name}”运行失败：${message}`, entry.id);
    chrome.runtime.sendMessage({ type: "module-crash", moduleId: entry.id, message }).catch(() => {});
  };
  const acceptMessage = (moduleId) => {
    const now = Date.now();
    const recent = (messageRates.get(moduleId) || []).filter((time) => now - time < 1000);
    if (recent.length >= 60) {
      if (recent.length === 60) writeLog(moduleId, "warn", "rate-limit", "模块消息超过每秒 60 条，额外消息已丢弃");
      recent.push(now);
      messageRates.set(moduleId, recent.slice(-61));
      return false;
    }
    recent.push(now);
    messageRates.set(moduleId, recent);
    return true;
  };
  const normalizeSettings = (settings) => {
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
    try {
      const serialized = JSON.stringify(settings);
      return serialized.length <= 64000 ? JSON.parse(serialized) : {};
    } catch {
      return {};
    }
  };
  const grantedPermissions = (entry) => {
    const declared = KivowikiModsPlatform.normalizePermissions(entry.permissions, entry.mode).filter((item) => item.known !== false).map((item) => item.id);
    return Array.isArray(entry.grantedPermissions) ? entry.grantedPermissions.filter((id) => declared.includes(id)) : declared;
  };
  const requestDependencyData = async (moduleId, input) => {
    const result = await chrome.runtime.sendMessage({ type: "dependency-data-request", moduleId, input });
    if (!result?.ok) throw new Error(result?.error || "依赖数据请求失败");
    return result.data;
  };
  const clearDependencyData = async (moduleId) => {
    const result = await chrome.runtime.sendMessage({ type: "dependency-data-clear", moduleId });
    if (!result?.ok) throw new Error(result?.error || "依赖缓存清理失败");
  };

  const resolveDependencies = (entry) => {
    const available = [...builtinDependencies, ...(state.dependencies || [])];
    const resolution = KivowikiModsPlatform.resolveModules(state.imported || [], available, state.lockfile);
    const plan = resolution.dependencyPlans[entry.id] || [];
    const scopedInstances = new Map();
    for (let index = 0; index < plan.length; index += 1) {
      const dependency = plan[index];
      if (typeof dependency.create !== "function") throw new Error(`依赖 ${dependency.id} 未提供 create()`);
      const initialized = Object.freeze(Object.fromEntries(plan.slice(0, index).map((item) => [item.id, scopedInstances.get(item.id) ?? dependencyInstances.get(KivowikiModsPlatform.packageKey(item))]).filter(([, value]) => value !== undefined)));
      if (dependency.scoped === true) {
        const value = dependency.create(initialized, Object.freeze({ request: (input) => requestDependencyData(entry.id, input), clearCache: () => clearDependencyData(entry.id) }));
        const errors = KivowikiModsPlatform.validateContract(value, dependency.exports, KivowikiModsPlatform.packageKey(dependency));
        if (errors.length) throw new Error(errors.join("；"));
        scopedInstances.set(dependency.id, value);
      } else if (!dependencyInstances.has(KivowikiModsPlatform.packageKey(dependency))) {
        const value = dependency.create(initialized);
        const errors = KivowikiModsPlatform.validateContract(value, dependency.exports, KivowikiModsPlatform.packageKey(dependency));
        if (errors.length) throw new Error(errors.join("；"));
        dependencyInstances.set(KivowikiModsPlatform.packageKey(dependency), value);
      }
    }
    return Object.freeze(Object.fromEntries(plan.map((dependency) => [dependency.id, scopedInstances.get(dependency.id) ?? dependencyInstances.get(KivowikiModsPlatform.packageKey(dependency))])));
  };

  const getDependencySources = async (entry) => {
    const available = [...builtinDependencies, ...(state.dependencies || [])];
    const resolution = KivowikiModsPlatform.resolveModules(state.imported || [], available, state.lockfile);
    const sources = [];
    for (const dependency of resolution.dependencyPlans[entry.id] || []) {
      const code = dependency.builtin ? dependency.sourceCode : await getModuleText(dependency.storageId || dependency.id, dependency.entry || "index.js");
      if (typeof code === "string") sources.push({ id: dependency.id, packageKey: KivowikiModsPlatform.packageKey(dependency), version: dependency.version, exports: dependency.exports || {}, code });
    }
    return sources;
  };

  const saveState = () => {
    const snapshot = structuredClone(state);
    saveQueue = saveQueue.catch(() => {}).then(() => chrome.storage.local.set({ [STORAGE_KEY]: snapshot }));
    return saveQueue;
  };
  const saveModuleSettings = (moduleId, settings, builtin = false) => {
    const normalized = normalizeSettings(settings);
    saveQueue = saveQueue.catch(() => {}).then(async () => {
      // 多个 Wiki 标签页可能同时保存设置，始终基于最新状态只更新目标模块。
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      const latest = stored[STORAGE_KEY] || structuredClone(DEFAULT_STATE);
      latest.modules = latest.modules && typeof latest.modules === "object" ? latest.modules : {};
      latest.imported = Array.isArray(latest.imported) ? latest.imported : [];
      if (builtin) latest.modules[moduleId] = { ...(latest.modules[moduleId] || {}), settings: normalized };
      else latest.imported = latest.imported.map((item) => item.id === moduleId ? { ...item, settings: normalized } : item);
      state = latest;
      await chrome.storage.local.set({ [STORAGE_KEY]: latest });
    });
    return saveQueue;
  };

  const renderGlobalStyles = () => {
    for (const [id, css] of globalStyles) {
      let style = document.getElementById(id);
      if (!css) { style?.remove(); continue; }
      if (!style) { style = document.createElement("style"); style.id = id; document.head.append(style); }
      style.textContent = css;
    }
  };

  const stopModule = (module) => {
    moduleGenerations.set(module.id, (moduleGenerations.get(module.id) || 0) + 1);
    builtinGenerations.set(module.id, (builtinGenerations.get(module.id) || 0) + 1);
    importedRuntimes.get(module.id)?.stop();
    importedRuntimes.delete(module.id);
    pageRuntimes.get(module.id)?.stop();
    pageRuntimes.delete(module.id);
    cleanups.get(module.id)?.();
    cleanups.delete(module.id);
    settingsListeners.delete(module.id);
  };

  const getModuleText = async (moduleId, path) => {
    const response = await chrome.runtime.sendMessage({ type: "module-file-get", moduleId, path });
    if (!response?.ok) throw new Error(response?.error || "模块资源读取失败");
    return response.data;
  };

  const reloadForPageRuntime = (entry, event, message) => {
    const reloadKey = `kivo-plus-runtime-reload:${entry.id}`;
    if (!pageReloadScheduled && sessionStorage.getItem(reloadKey) !== "1") {
      pageReloadScheduled = true;
      sessionStorage.setItem(reloadKey, "1");
      writeLog(entry.id, "info", event, message);
      window.setTimeout(() => location.reload(), 80);
      return true;
    }
    writeLog(entry.id, "warn", "runtime-reload-guard", "页面运行时已经更新，请手动刷新当前 KivoWiki 页面");
    return false;
  };

  const startPageModule = async (entry) => {
    try {
      stopModule(entry);
      const generation = (moduleGenerations.get(entry.id) || 0) + 1;
      moduleGenerations.set(entry.id, generation);
      if (state?.imported?.find((item) => item.id === entry.id)?.enabled === false) return;
      const code = await getModuleText(entry.id, entry.entry || "index.js");
      if (moduleGenerations.get(entry.id) !== generation) return;
      if (typeof code !== "string") { notify(`模块“${entry.name}”缺少入口文件`); return; }
      if (state?.imported?.find((item) => item.id === entry.id)?.enabled === false) return;
      const userScriptStatus = await chrome.runtime.sendMessage({ type: "page-runtime-status" }).catch(() => null);
      if (userScriptStatus?.available !== true) {
        // 内容脚本不能使用 eval/new Function，不能在这里执行导入代码。
        // User Script 不可用属于宿主环境问题，不应计入模块崩溃次数。
        const detail = userScriptStatus?.error ? `（${userScriptStatus.error}）` : "";
        writeLog(entry.id, "warn", "user-script-unavailable", `页面模块未启动：请在扩展详情中开启“允许用户脚本”，然后刷新扩展和 KivoWiki 页面${detail}`);
        return;
      }
      const runtimeUpdatedAfterPageLoad = Number(userScriptStatus.updatedAt || 0) > performance.timeOrigin;
      if (userScriptStatus.requiresReload === true || runtimeUpdatedAfterPageLoad) {
        // 动态脚本在当前文档加载后才完成注册时，浏览器不会补执行。仅自动刷新
        // 一次，并使用 sessionStorage 防止浏览器异常时形成刷新循环。
        reloadForPageRuntime(entry, "runtime-reload", "页面运行时已就绪，正在刷新一次以启动模块");
        return;
      }
      sessionStorage.removeItem(`kivo-plus-runtime-reload:${entry.id}`);
      const runtime = {
      token: null,
      started: false,
      helloTimer: null,
      startTimer: null,
      send(message) {
        window.postMessage({ source: "kivo-plus-page-host", moduleId: entry.id, token: runtime.token, ...message }, "*");
      },
      stop() {
        clearInterval(runtime.helloTimer);
        clearTimeout(runtime.startTimer);
        if (runtime.token) runtime.send({ type: "stop" });
      }
    };
      pageRuntimes.set(entry.id, runtime);
      runtime.send({ type: "hello" });
      // User Script 与内容脚本都在 document_idle 附近启动，重复握手避免丢失首个消息。
      runtime.helloTimer = setInterval(() => {
        if (runtime.token) { clearInterval(runtime.helloTimer); return; }
        runtime.send({ type: "hello" });
      }, 500);
      setTimeout(() => clearInterval(runtime.helloTimer), 5000);
      runtime.startTimer = setTimeout(() => {
        if (pageRuntimes.get(entry.id) !== runtime || runtime.started) return;
        runtime.stop();
        pageRuntimes.delete(entry.id);
        if (runtime.token) {
          reportCrash(entry, new Error("模块启动超时"));
        } else {
          // User Script 未注入或仍在等待浏览器调度属于环境问题，不标记模块崩溃。
          writeLog(entry.id, "warn", "user-script-timeout", "页面模块未收到 User Script 握手，请开启“允许用户脚本”并刷新扩展和 KivoWiki 页面");
        }
      }, 8000);
    } catch (error) { reportCrash(entry, error); }
  };

  const renderImportedView = (moduleId, viewId, view) => {
    if (!view || typeof view !== "object") return;
    const css = typeof view.css === "string" ? view.css.slice(0, 16000) : "";
    if (/url\s*\(|@import|expression\s*\(/i.test(css)) return;
    const wrapper = document.createElement("section");
    wrapper.className = `kplus-imported-view kplus-imported-view--${moduleId}`;
    wrapper.dataset.viewId = viewId;
    // 每个社区沙箱视图再使用独立 Shadow DOM，模块 CSS 不会串改其他模块或管理器入口。
    const viewRoot = wrapper.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `:host { display: block; width: 100%; padding: 16px; border: 1px solid #dfe7e8; border-radius: 8px; color: #1c2933; background: #fff; box-shadow: 0 10px 28px rgba(22,57,63,.16); box-sizing: border-box; font: 14px/1.5 system-ui,sans-serif; } h3 { margin: 0 0 6px; font-size: 15px; } p { margin: 0 0 12px; color: #6b7a84; } button { border: 0; border-radius: 5px; padding: 7px 10px; color: #fff; background: #1e6870; cursor: pointer; } button + button { margin-left: 6px; } ${css}`;
    viewRoot.append(style);
    if (view.title != null) { const title = document.createElement("h3"); title.textContent = String(view.title).slice(0, 200); viewRoot.append(title); }
    if (view.text != null) { const text = document.createElement("p"); text.textContent = String(view.text).slice(0, 2000); viewRoot.append(text); }
    if (Array.isArray(view.actions)) view.actions.slice(0, 8).forEach((action) => {
      if (!action || typeof action.id !== "string" || typeof action.label !== "string") return;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label.slice(0, 80);
      button.addEventListener("click", () => importedRuntimes.get(moduleId)?.send({ type: "event", event: { viewId, actionId: action.id.slice(0, 80) } }));
      viewRoot.append(button);
    });
    surface.querySelector(`.kplus-imported-view--${CSS.escape(moduleId)}[data-view-id="${CSS.escape(viewId)}"]`)?.remove();
    importedViewStack.append(wrapper);
  };

  const startImportedModule = (entry) => {
    stopModule(entry);
    if (state?.imported?.find((item) => item.id === entry.id)?.enabled === false) return;
    const iframe = document.createElement("iframe");
    const token = `${entry.id}-${crypto.randomUUID()}`;
    iframe.title = `Kivowiki-Mods 模块沙箱 ${entry.name}`;
    iframe.hidden = true;
    const runtime = {
      startTimer: null,
      send(message) { iframe.contentWindow?.postMessage({ source: "kivo-plus-host", token, ...message }, "*"); },
      stop() { clearTimeout(runtime.startTimer); runtime.send({ type: "stop" }); iframe.remove(); surface.querySelectorAll(`.kplus-imported-view--${CSS.escape(entry.id)}`).forEach((node) => node.remove()); }
    };
    importedRuntimes.set(entry.id, runtime);
    const allowed = new Set(grantedPermissions(entry));
    const onMessage = (event) => {
      if (event.source !== iframe.contentWindow || event.data?.source !== "kivo-plus-sandbox" || event.data.token !== token) return;
      if (!acceptMessage(entry.id)) return;
      const message = event.data;
      if (message.type === "ready") {
        clearTimeout(runtime.startTimer);
        writeLog(entry.id, "info", "started", "严格沙箱模块启动完成");
      }
      if (message.type === "render" && allowed.has("ui")) renderImportedView(entry.id, String(message.viewId || "main"), message.view);
      if (message.type === "remove" && allowed.has("ui")) surface.querySelector(`.kplus-imported-view--${CSS.escape(entry.id)}[data-view-id="${CSS.escape(String(message.viewId || "main"))}"]`)?.remove();
      if (message.type === "set-text" && allowed.has("ui")) {
        const view = surface.querySelector(`.kplus-imported-view--${CSS.escape(entry.id)}[data-view-id="${CSS.escape(String(message.viewId || "main"))}"]`);
        const target = message.target === "title" ? view?.shadowRoot?.querySelector("h3") : view?.shadowRoot?.querySelector("p");
        if (target) target.textContent = String(message.text || "").slice(0, 2000);
      }
      if (message.type === "save-settings") {
        if (!allowed.has("settings")) {
          writeLog(entry.id, "warn", "permission-denied", "模块尝试保存设置但没有权限");
          runtime.send({ type: "settings-result", requestId: message.requestId, ok: false, error: "模块未获得设置保存权限" });
          return;
        }
        saveModuleSettings(entry.id, message.settings)
          .then(() => runtime.send({ type: "settings-result", requestId: message.requestId, ok: true }))
          .catch((error) => {
            notify(`模块“${entry.name}”设置保存失败：${error.message}`);
            runtime.send({ type: "settings-result", requestId: message.requestId, ok: false, error: error.message });
          });
      }
      if (message.type === "asset-get-text") {
        if (!allowed.has("assets")) { runtime.send({ type: "asset-result", requestId: message.requestId, ok: false, error: "模块未获得资源读取权限" }); return; }
        getModuleText(entry.id, message.path)
          .then((data) => runtime.send({ type: "asset-result", requestId: message.requestId, ok: true, data }))
          .catch((error) => runtime.send({ type: "asset-result", requestId: message.requestId, ok: false, error: error.message }));
      }
      if (message.type === "asset-get-file") {
        if (!allowed.has("assets")) { runtime.send({ type: "asset-result", requestId: message.requestId, ok: false, error: "模块未获得资源读取权限" }); return; }
        chrome.runtime.sendMessage({ type: "module-file-get-blob", moduleId: entry.id, path: message.path })
          .then((result) => {
            if (!result?.ok) throw new Error(result?.error || "模块资源读取失败");
            runtime.send({ type: "asset-result", requestId: message.requestId, ok: true, data: result.data });
          })
          .catch((error) => runtime.send({ type: "asset-result", requestId: message.requestId, ok: false, error: error.message }));
      }
      if (message.type === "log") writeLog(entry.id, message.level, "module", message.message);
      if (message.type === "error") { runtime.stop(); importedRuntimes.delete(entry.id); reportCrash(entry, message.message); }
    };
    window.addEventListener("message", onMessage);
    const oldStop = runtime.stop;
    runtime.stop = () => { window.removeEventListener("message", onMessage); oldStop(); };
    iframe.addEventListener("load", async () => {
      try {
        const code = await getModuleText(entry.id, entry.entry || "index.js");
        if (typeof code !== "string") { notify(`模块“${entry.name}”缺少入口文件`); runtime.stop(); return; }
        runtime.send({
          type: "init",
          id: entry.id,
          code,
          settings: normalizeSettings(entry.settings),
          permissions: grantedPermissions(entry),
          dependencySources: await getDependencySources(entry),
          platform: KivowikiModsPlatform.publicApi,
          site: { hostname: location.hostname, pathname: location.pathname }
        });
        runtime.startTimer = setTimeout(() => {
          if (importedRuntimes.get(entry.id) !== runtime) return;
          runtime.stop();
          importedRuntimes.delete(entry.id);
          reportCrash(entry, new Error("严格沙箱模块启动超时"));
        }, 8000);
      } catch (error) { reportCrash(entry, error); runtime.stop(); }
    }, { once: true });
    // 监听器先注册，再插入 iframe，确保快速完成的 sandbox 加载也能被捕获。
    iframe.src = `${chrome.runtime.getURL("sandbox.html")}#module-${encodeURIComponent(token)}`;
    document.documentElement.append(iframe);
  };

  const startBuiltinModule = (module) => {
    stopModule(module);
    const generation = (builtinGenerations.get(module.id) || 0) + 1;
    builtinGenerations.set(module.id, generation);
    if (!state?.modules?.[module.id]?.enabled) return;
    const entry = state.modules[module.id];
    const cleanupCallbacks = [];
    const listeners = [];
    const context = {
      id: module.id,
      root: surface,
      site: { hostname: location.hostname, pathname: location.pathname },
      settings: { ...module.defaultSettings, ...normalizeSettings(entry.settings) },
      dependencies: resolveDependencies(module),
      log(level, message) { writeLog(module.id, level, "module", message); },
      setGlobalStyle(id, css) { globalStyles.set(id, css); renderGlobalStyles(); },
       async saveSettings(settings) { await saveModuleSettings(module.id, settings, true); },
      onSettingsChange(callback) { listeners.push(callback); },
      onCleanup(callback) { cleanupCallbacks.push(callback); }
    };
    settingsListeners.set(module.id, listeners);
    Promise.resolve().then(() => module.mount(context)).then(() => {
      const cleanup = () => cleanupCallbacks.reverse().forEach((callback) => { try { callback(); } catch (error) { console.error(error); } });
      if (builtinGenerations.get(module.id) === generation && state?.modules?.[module.id]?.enabled) cleanups.set(module.id, cleanup);
      else cleanup();
    }).catch((error) => { if (builtinGenerations.get(module.id) === generation) notify(`模块“${module.name}”启动失败：${error.message}`); console.error(error); });
  };

  // 页面模式 user script 与扩展隔离世界通过带模块 ID 的 postMessage 通信。
  window.addEventListener("message", async (event) => {
    const message = event.data;
    if (event.source !== window || message?.source !== "kivowiki-mods-page-module") return;
    const runtime = pageRuntimes.get(message.moduleId);
    if (!runtime) return;
    if (!acceptMessage(message.moduleId)) return;
    if (message.runtimeVersion !== PAGE_RUNTIME_VERSION) {
      const entry = state?.imported?.find((item) => item.id === message.moduleId);
      if (entry) reloadForPageRuntime(entry, "runtime-version-reload", "检测到旧版页面运行时，正在刷新一次完成升级");
      return;
    }
    if (message.type === "hello-ready") { runtime.token = message.token; clearInterval(runtime.helloTimer); runtime.send({ type: "settings-change", settings: state?.imported?.find((item) => item.id === message.moduleId)?.settings || {} }); return; }
    if (message.type === "ready") { runtime.token = message.token; runtime.started = true; clearInterval(runtime.helloTimer); clearTimeout(runtime.startTimer); runtime.send({ type: "settings-change", settings: state?.imported?.find((item) => item.id === message.moduleId)?.settings || {} }); writeLog(message.moduleId, "info", "started", "页面模块启动完成"); return; }
    if (message.token !== runtime.token) return;
    const entry = state?.imported?.find((item) => item.id === message.moduleId);
    if (!entry) return;
    const allowed = new Set(grantedPermissions(entry));
    if (message.type === "save-settings") {
      if (!allowed.has("settings")) {
        writeLog(entry.id, "warn", "permission-denied", "模块尝试保存设置但没有权限");
        runtime.send({ type: "settings-result", requestId: message.requestId, ok: false, error: "模块未获得设置保存权限" });
        return;
      }
      try {
        await saveModuleSettings(entry.id, message.settings);
        runtime.send({ type: "settings-result", requestId: message.requestId, ok: true });
      } catch (error) {
        runtime.send({ type: "settings-result", requestId: message.requestId, ok: false, error: error.message });
      }
    }
    if (message.type === "storage-get") {
      if (!allowed.has("storage")) { runtime.send({ type: "storage-result", requestId: message.requestId, ok: false, error: "模块未获得本地数据存储权限" }); return; }
      if (typeof message.key !== "string" || !/^[a-zA-Z0-9_.-]{1,80}$/.test(message.key)) { runtime.send({ type: "storage-result", requestId: message.requestId, ok: false, error: "模块存储键名无效" }); return; }
      const result = await chrome.storage.local.get(`module:${entry.id}:${message.key}`);
      runtime.send({ type: "storage-result", requestId: message.requestId, data: result[`module:${entry.id}:${message.key}`] });
    }
    if (message.type === "storage-set" && message.values && typeof message.values === "object" && !Array.isArray(message.values)) {
      if (!allowed.has("storage")) { writeLog(entry.id, "warn", "permission-denied", "模块尝试使用未授权的本地数据存储"); return; }
      const entries = Object.entries(message.values);
      if (entries.length > 64 || entries.some(([key]) => !/^[a-zA-Z0-9_.-]{1,80}$/.test(key)) || JSON.stringify(message.values).length > 64000) {
        writeLog(entry.id, "warn", "storage-rejected", "模块存储写入超过单次 64 KB、64 项或键名约束");
      } else {
        const values = Object.fromEntries(entries.map(([key, value]) => [`module:${entry.id}:${key}`, value]));
        await chrome.storage.local.set(values);
      }
    }
    if (message.type === "asset-get-text") {
      if (!allowed.has("assets")) { runtime.send({ type: "asset-result", requestId: message.requestId, ok: false, error: "模块未获得资源读取权限" }); return; }
      try { runtime.send({ type: "asset-result", requestId: message.requestId, ok: true, data: await getModuleText(entry.id, message.path) }); }
      catch (error) { runtime.send({ type: "asset-result", requestId: message.requestId, ok: false, error: error.message }); }
    }
    if (message.type === "asset-get-file") {
      if (!allowed.has("assets")) { runtime.send({ type: "asset-result", requestId: message.requestId, ok: false, error: "模块未获得资源读取权限" }); return; }
      try {
        const result = await chrome.runtime.sendMessage({ type: "module-file-get-blob", moduleId: entry.id, path: message.path });
        if (!result?.ok) throw new Error(result?.error || "模块资源读取失败");
        runtime.send({ type: "asset-result", requestId: message.requestId, ok: true, data: result.data });
      }
      catch (error) { runtime.send({ type: "asset-result", requestId: message.requestId, ok: false, error: error.message }); }
    }
    if (message.type === "data-request") {
      if (!allowed.has("network.read")) { runtime.send({ type: "data-result", requestId: message.requestId, ok: false, error: "模块未获得只读网络权限" }); return; }
      const input = message.input;
      let url;
      try { url = new URL(String(input?.url || "")); }
      catch { runtime.send({ type: "data-result", requestId: message.requestId, ok: false, error: "依赖数据请求 URL 无效" }); return; }
      if (url.protocol !== "https:" || url.hostname !== "api.kivo.wiki") {
        runtime.send({ type: "data-result", requestId: message.requestId, ok: false, error: "内置依赖只允许访问 KivoWiki 公开 API" });
        return;
      }
      requestDependencyData(entry.id, input)
        .then((data) => runtime.send({ type: "data-result", requestId: message.requestId, ok: true, data }))
        .catch((error) => runtime.send({ type: "data-result", requestId: message.requestId, ok: false, error: error.message }));
    }
    if (message.type === "data-clear") {
      chrome.runtime.sendMessage({ type: "dependency-data-clear", moduleId: entry.id })
        .then((result) => runtime.send({ type: "data-result", requestId: message.requestId, ok: result?.ok === true, data: null, error: result?.error }))
        .catch((error) => runtime.send({ type: "data-result", requestId: message.requestId, ok: false, error: error.message }));
    }
    if (message.type === "log") writeLog(entry.id, message.level, "module", message.message);
    if (message.type === "error") { runtime.stop(); pageRuntimes.delete(entry.id); reportCrash(entry, message.message); }
  });

  const syncAll = () => {
    const generation = ++syncGeneration;
    modules.forEach(startBuiltinModule);
    const resolution = KivowikiModsPlatform.resolveModules(state.imported || [], [...builtinDependencies, ...(state.dependencies || [])], state.lockfile);
    (state.imported || []).filter((entry) => !resolution.status[entry.id]?.runnable).forEach((entry) => {
      stopModule(entry);
      const reason = resolution.status[entry.id]?.reasons?.join("；");
      if (entry.enabled !== false && reason) writeLog(entry.id, "warn", "blocked", reason);
    });
    const queue = [...resolution.ordered];
    // 每批最多启动 4 个模块，将大量模块的初始化压力分散到多个任务中。
    const startBatch = () => {
      if (generation !== syncGeneration) return;
      queue.splice(0, 4).forEach((entry) => {
        const safe = state.preferences?.safeMode === true || entry.mode === "sandbox";
        (safe ? startImportedModule : startPageModule)(entry);
      });
      if (queue.length) setTimeout(startBatch, 0);
    };
    startBatch();
  };

  const load = async () => {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    state = stored[STORAGE_KEY] || structuredClone(DEFAULT_STATE);
    state.modules = state.modules && typeof state.modules === "object" ? state.modules : {};
    state.imported = Array.isArray(state.imported) ? state.imported : [];
    state.dependencies = Array.isArray(state.dependencies) ? state.dependencies : [];
    state.preferences = state.preferences && typeof state.preferences === "object" ? state.preferences : { safeMode: false, crashIsolation: true, managerTabVisible: true, marketAutoLoad: true };
    state.preferences.managerTabVisible = state.preferences.managerTabVisible !== false;
    state.preferences.marketAutoLoad = state.preferences.marketAutoLoad !== false;
    managerTab.hidden = !state.preferences.managerTabVisible;
    modules.forEach((module) => {
      state.modules[module.id] = { enabled: state.modules[module.id]?.enabled ?? true, settings: { ...module.defaultSettings, ...normalizeSettings(state.modules[module.id]?.settings) } };
    });
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    syncAll();
  };

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const runtimeUpdatedAt = Number(changes.kivoPlusPageScriptsUpdatedAt?.newValue || 0);
    if (runtimeUpdatedAt > performance.timeOrigin && state) {
      const entry = (state.imported || []).find((item) => item.enabled !== false && item.mode !== "sandbox" && !item.quarantined);
      if (entry) reloadForPageRuntime(entry, "runtime-restored", "页面运行环境已经恢复，正在刷新一次以启动导入模块");
    }
    if (!changes[STORAGE_KEY]?.newValue) return;
    const previousState = state;
    state = changes[STORAGE_KEY].newValue;
    if (changes[STORAGE_KEY].newValue?.preferences) managerTab.hidden = changes[STORAGE_KEY].newValue.preferences.managerTabVisible === false;
    if (JSON.stringify(previousState?.dependencies || []) !== JSON.stringify(state.dependencies || [])) {
      dependencyInstances.clear();
      (previousState?.imported || []).forEach(stopModule);
      syncAll();
      return;
    }
    const resolution = KivowikiModsPlatform.resolveModules(state.imported || [], [...builtinDependencies, ...(state.dependencies || [])], state.lockfile);
    modules.forEach((module) => {
      if (!state.modules?.[module.id]?.enabled) stopModule(module);
      else {
        const listeners = settingsListeners.get(module.id);
        if (listeners) listeners.forEach((callback) => callback(state.modules[module.id].settings || {}));
        else startBuiltinModule(module);
      }
    });
    const oldImported = previousState?.imported || [];
    if (previousState?.preferences?.safeMode !== state.preferences?.safeMode) oldImported.forEach(stopModule);
    (state.imported || []).forEach((entry) => {
      const previous = oldImported.find((item) => item.id === entry.id);
      if (!resolution.status[entry.id]?.runnable) { stopModule(entry); return; }
      const safe = state.preferences?.safeMode === true || entry.mode === "sandbox";
      const runtime = safe ? importedRuntimes.get(entry.id) : pageRuntimes.get(entry.id);
      if (!safe && previous && previous.version !== entry.version) {
        stopModule(entry);
        writeLog(entry.id, "info", "reload-required", `模块已更新到 v${entry.version}，刷新当前 KivoWiki 页面后生效`);
        return;
      }
       if (!runtime || !previous || previous.entry !== entry.entry || previous.version !== entry.version || previous.enabled !== entry.enabled || previous.mode !== entry.mode || previous.quarantined !== entry.quarantined || JSON.stringify(previous.grantedPermissions) !== JSON.stringify(entry.grantedPermissions) || previousState?.preferences?.safeMode !== state.preferences?.safeMode) {
        (safe ? startImportedModule : startPageModule)(entry);
       } else if (JSON.stringify(previous.settings) !== JSON.stringify(entry.settings)) {
         // 页面后备通道没有 User Script runtime，但仍登记了设置监听器。
         // 直接通知监听器可以热更新设置，避免每次改颜色都重建整棵页面增强树。
         const fallbackListeners = settingsListeners.get(entry.id);
         if (fallbackListeners) fallbackListeners.forEach((callback) => {
           try { callback(entry.settings || {}); } catch (error) { reportCrash(entry, error); }
         });
         else runtime?.send({ type: "settings-change", settings: entry.settings || {} });
       }
    });
    oldImported.filter((entry) => !(state.imported || []).some((item) => item.id === entry.id)).forEach(stopModule);
  });

  load().catch((error) => notify(`设置读取失败: ${error.message}`));
})();
