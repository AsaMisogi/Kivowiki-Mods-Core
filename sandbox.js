(function startModuleSandbox() {
  "use strict";

  let active = null;
  const requests = new Map();
  const REQUEST_TIMEOUT = 10000;

  const normalizeSettings = (settings) => {
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
    try {
      const serialized = JSON.stringify(settings);
      return serialized.length <= 64000 ? JSON.parse(serialized) : {};
    } catch {
      return {};
    }
  };

  const send = (token, message, config = false) => window.parent.postMessage({ source: config ? "kivo-plus-config" : "kivo-plus-sandbox", token, ...message }, "*");
  const requestHost = (token, message, config = false) => new Promise((resolve, reject) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timeout = setTimeout(() => {
      requests.delete(requestId);
      reject(new Error("宿主请求超时"));
    }, REQUEST_TIMEOUT);
    requests.set(requestId, {
      resolve(value) { clearTimeout(timeout); resolve(value); },
      reject(error) { clearTimeout(timeout); reject(error); }
    });
    send(token, { ...message, requestId }, config);
  });
  const stop = () => {
    if (active) active.cleanups.reverse().forEach((cleanup) => {
      try { cleanup(); } catch (error) { console.error(error); }
    });
    requests.forEach((request) => request.reject(new Error("模块已停止")));
    active = null;
    requests.clear();
  };

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (event.source !== window.parent || !message || !["kivo-plus-host", "kivo-plus-config-host"].includes(message.source)) return;

    if (message.type === "stop") {
      if (active?.token === message.token) stop();
      return;
    }
    if (message.type === "event") {
      if (active?.token !== message.token) return;
      active.eventListeners.forEach((listener) => listener(message.event));
      return;
    }
    if (message.type === "settings-change") {
      if (active?.token !== message.token) return;
      active.settings = { ...active.settings, ...normalizeSettings(message.settings) };
      active.context.settings = { ...active.settings };
      active.settingsListeners.forEach((listener) => listener({ ...active.settings }));
      return;
    }
    if (message.type === "data-result") {
      if (active?.token !== message.token) return;
      const request = requests.get(message.requestId);
      if (!request) return;
      requests.delete(message.requestId);
      message.ok === false ? request.reject(new Error(message.error || "数据请求失败")) : request.resolve(message.data);
      return;
    }
    if (message.type !== "init" && message.type !== "init-config") return;

    stop();
    try {
       if (typeof message.code !== "string" || !message.code.trim() || message.code.length > 4 * 1024 * 1024) throw new Error("模块代码为空或超过 4 MB");
       // 代码只在 Manifest sandbox 的隔离源中求值，不能访问扩展 API 或页面 DOM。
        const dependencyValues = {};
        const validateExport = (value, contract, path) => {
          for (const [key, expected] of Object.entries(contract || {})) {
            const next = value?.[key];
            const actual = Array.isArray(next) ? "array" : next === null ? "null" : typeof next;
            if (typeof expected === "string") {
              if (expected !== "any" && actual !== expected) throw new Error(`${path}.${key} 应为 ${expected}，实际为 ${actual}`);
            } else {
              if (!next || typeof next !== "object" || Array.isArray(next)) throw new Error(`${path}.${key} 应为 object`);
              validateExport(next, expected, `${path}.${key}`);
            }
          }
        };
       for (const dependency of Array.isArray(message.dependencySources) ? message.dependencySources : []) {
         const definition = new Function(`"use strict"; return (${dependency.code}\n);`)();
         if (!definition || typeof definition.create !== "function") throw new Error(`依赖 ${dependency.id} 必须返回带 create() 的对象`);
         // 不传 dependencyServices：严格沙箱依赖即使包含网络客户端，也无法
         // 绕过 connect-src 'none' 和宿主权限边界。
          const value = definition.create(Object.freeze({ ...dependencyValues }));
          validateExport(value, dependency.exports, dependency.packageKey || dependency.id);
          dependencyValues[dependency.id] = value;
       }
       const module = new Function(`"use strict"; return (${message.code}\n);`)();
      if (!module || typeof module.mount !== "function") throw new Error("模块代码必须返回带 mount(context) 的对象");

      const cleanups = [];
      const eventListeners = [];
      const settingsListeners = [];
       const isConfig = message.type === "init-config";
       const permissions = new Set(Array.isArray(message.permissions) ? message.permissions : (isConfig ? ["settings", "assets"] : []));
       const supportsApi = (range) => {
         const expected = String(range || "*");
         if (expected === "*") return true;
         const currentMajor = String(message.platform?.version || "0").split(".")[0];
         const expectedMajor = expected.match(/\d+/)?.[0];
         return Boolean(expectedMajor && currentMajor === expectedMajor);
       };
       active = {
         token: message.token,
         isConfig,
        settings: normalizeSettings(message.settings),
        cleanups,
        eventListeners,
        settingsListeners
      };
        const context = {
         id: message.id,
         site: { ...(message.site || {}) },
         platform: Object.freeze({ ...(message.platform || {}) }),
         permissions: Object.freeze([...permissions]),
          settings: { ...active.settings },
          dependencies: Object.freeze(dependencyValues),
         root: isConfig ? document.body : undefined,
         document: isConfig ? document : undefined,
         window: isConfig ? window : undefined,
        ui: {
           render(viewId, view) { send(message.token, { type: "render", viewId, view }, isConfig); },
           remove(viewId) { send(message.token, { type: "remove", viewId }, isConfig); },
           setText(viewId, target, text) { send(message.token, { type: "set-text", viewId, target, text }, isConfig); }
        },
         saveSettings(settings) {
           if (!permissions.has("settings")) throw new Error("模块未获得设置保存权限");
          active.settings = normalizeSettings(settings);
          context.settings = { ...active.settings };
           send(message.token, { type: "save-settings", settings: active.settings }, isConfig);
        },
         assets: {
           getText(path) { return permissions.has("assets") ? requestHost(message.token, { type: "asset-get-text", path }, isConfig) : Promise.reject(new Error("模块未获得资源读取权限")); },
           getFile(path) { return permissions.has("assets") ? requestHost(message.token, { type: "asset-get-file", path }, isConfig) : Promise.reject(new Error("模块未获得资源读取权限")); }
        },
         data: {
          // 严格沙箱不允许网络访问，避免模块绕过权限边界。
          request() { return Promise.reject(new Error("当前隔离运行模式不提供网络数据能力")); }
         },
         api: {
           version: String(message.platform?.version || "0.0.0"),
           supports: supportsApi,
           request() { return Promise.reject(new Error("当前隔离运行模式不提供官方 API 数据能力")); },
           createAdapter() { throw new Error("严格沙箱不能创建网络 API 适配器"); }
         },
         log(level, text) { send(message.token, { type: "log", level, message: String(text || "") }, isConfig); },
         onEvent(listener) { if (typeof listener === "function") eventListeners.push(listener); },
        onSettingsChange(listener) { if (typeof listener === "function") settingsListeners.push(listener); },
        onCleanup(cleanup) { if (typeof cleanup === "function") cleanups.push(cleanup); }
      };
      active.context = context;
      Promise.resolve(module.mount(context)).then(
        () => { if (active?.token === message.token) send(message.token, { type: "ready" }, isConfig); },
        (error) => { if (active?.token === message.token) send(message.token, { type: "error", message: error instanceof Error ? error.message : "模块启动失败" }, isConfig); }
      );
    } catch (error) {
      send(message.token, { type: "error", message: error instanceof Error ? error.message : "模块启动失败" }, message.type === "init-config");
    }
  });
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (event.source !== window.parent || !message || !["kivo-plus-host", "kivo-plus-config-host"].includes(message.source) || !["asset-result", "data-result"].includes(message.type)) return;
    const request = requests.get(message.requestId);
    if (!request) return;
    requests.delete(message.requestId);
    message.ok === false ? request.reject(new Error(message.error || "资源读取失败")) : request.resolve(message.data);
  });
})();
