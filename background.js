importScripts("platform.js", "data-client.js", "module-store.js", "dependencies/core-runtime/src/index.js");

const DEFAULT_STATE = {
  preferences: { safeMode: false, crashIsolation: true },
  modules: {
    "quick-tools": {
      enabled: true,
      settings: { nightMode: false, expanded: false, collapsedTools: ["night"], position: "right-bottom", size: 46, offset: 22, overlayOpacity: 0.22 }
    }
  },
  imported: [],
  dependencies: [],
  lockfile: null
};

const PAGE_MATCHES = ["https://kivo.wiki/*", "https://www.kivo.wiki/*"];
const PAGE_SCRIPT_PREFIX = "kivo-plus-page-";
let managerWindowId = null;
let syncPromise = null;
let syncAgain = false;
let logQueue = Promise.resolve();
let crashQueue = Promise.resolve();
let syncTimer = null;
const logRate = new Map();
const MAX_LOGS = 500;
const dependencyDataClient = globalThis.KivowikiModsDataClient.create({ concurrency: 16, maxRetries: 4, maxCacheEntries: 512, staleIfErrorMs: 30 * 60 * 1000 });
const BUILTIN_DATA_MODULES = new Set(["quick-tools"]);

const isKivoPage = (url) => /^https:\/\/(?:www\.)?kivo\.wiki\//.test(url || "");
const pageScriptFingerprint = (state) => JSON.stringify({
  safeMode: state?.preferences?.safeMode === true,
  dependencies: (state?.dependencies || []).map((entry) => ({ id: entry.id, version: entry.version, enabled: entry.enabled !== false, entry: entry.entry, updatedAt: entry.updatedAt })),
  imported: (state?.imported || []).map((entry) => ({
    id: entry.id,
    version: entry.version,
    enabled: entry.enabled !== false,
    mode: entry.mode,
    entry: entry.entry,
    settings: entry.settings,
    updatedAt: entry.updatedAt,
    quarantined: entry.quarantined === true,
    permissions: entry.permissions,
    grantedPermissions: entry.grantedPermissions,
    dependencies: entry.dependencies,
    optionalDependencies: entry.optionalDependencies,
    conflicts: entry.conflicts,
    engines: entry.engines
  }))
});

const schedulePageScriptSync = () => {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncPageScripts().catch(console.error), 120);
};

const appendRuntimeLogInternal = async (input) => {
  const moduleId = String(input.moduleId || "host").slice(0, 50);
  const now = Date.now();
  const rate = (logRate.get(moduleId) || []).filter((time) => now - time < 60000);
  if (rate.length >= 100) return;
  rate.push(now);
  logRate.set(moduleId, rate);
  const stored = await chrome.storage.local.get("runtimeLogs");
  const logs = Array.isArray(stored.runtimeLogs) ? stored.runtimeLogs : [];
  logs.push({
    id: crypto.randomUUID(),
    time: new Date(now).toISOString(),
    moduleId,
    level: ["debug", "info", "warn", "error"].includes(input.level) ? input.level : "info",
    event: String(input.event || "runtime").slice(0, 80),
    message: String(input.message || "")
      .replace(/\b(authorization|cookie|token|password|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[已隐藏]")
      .replace(/[\r\n\t]+/g, " ")
      .slice(0, 1000)
  });
  await chrome.storage.local.set({ runtimeLogs: logs.slice(-MAX_LOGS) });
};
const appendRuntimeLog = (input) => {
  logQueue = logQueue.catch(() => {}).then(() => appendRuntimeLogInternal(input));
  return logQueue;
};
const enqueueCrash = (moduleId, message) => {
  crashQueue = crashQueue.catch(() => {}).then(() => recordCrash(moduleId, message));
  return crashQueue;
};

const recordCrash = async (moduleId, message) => {
  const stored = await chrome.storage.local.get("state");
  const current = stored.state;
  if (!current || !Array.isArray(current.imported)) return;
  const now = Date.now();
  let quarantined = false;
  current.imported = current.imported.map((module) => {
    if (module.id !== moduleId) return module;
    const history = (Array.isArray(module.crashHistory) ? module.crashHistory : []).filter((time) => now - Number(time) < 5 * 60 * 1000);
    history.push(now);
    quarantined = current.preferences?.crashIsolation !== false && history.length >= 3;
    return {
      ...module,
      crashHistory: history.slice(-5),
      lastError: String(message || "模块运行失败").slice(0, 500),
      lastErrorAt: new Date(now).toISOString(),
      quarantined: module.quarantined || quarantined,
      quarantineReason: quarantined ? "5 分钟内连续崩溃 3 次，已自动隔离" : module.quarantineReason
    };
  });
  await chrome.storage.local.set({ state: current });
  await appendRuntimeLog({ moduleId, level: "error", event: quarantined ? "quarantined" : "crash", message });
};

const ensureInitialState = async () => {
  const stored = await chrome.storage.local.get("state");
  if (stored.state) return stored.state;
  const initialState = structuredClone(DEFAULT_STATE);
  await chrome.storage.local.set({ state: initialState });
  return initialState;
};

const buildPageScript = (entry, dependencySources = []) => {
  const code = entry.code;
  const moduleId = JSON.stringify(entry.id);
  const settings = JSON.stringify(entry.settings || {});
  const declaredPermissions = KivowikiModsPlatform.normalizePermissions(entry.permissions, entry.mode).filter((item) => item.known !== false).map((item) => item.id);
  const permissions = JSON.stringify(Array.isArray(entry.grantedPermissions) ? entry.grantedPermissions.filter((id) => declaredPermissions.includes(id)) : declaredPermissions);
  const platform = JSON.stringify(KivowikiModsPlatform.publicApi);
  const token = JSON.stringify(`${entry.id}-${crypto.randomUUID()}`);

  // 采用字符串片段拼接，避免用户模块中的反引号、${} 或换行被管理器模板字符串解释。
  return [
    "(() => {",
    '"use strict";',
    `const module = (${code}\n);`,
    `const moduleId = ${moduleId};`,
    `const token = ${token};`,
    `const permissions = new Set(${permissions});`,
    `const platformData = ${platform};`,
    `const dependencySources = [${dependencySources.map((dependency) => `{id:${JSON.stringify(dependency.id)},packageKey:${JSON.stringify(dependency.packageKey)},version:${JSON.stringify(dependency.version)},revision:${JSON.stringify(dependency.revision)},scoped:${dependency.scoped === true},exports:${JSON.stringify(dependency.exports || {})},definition:(${dependency.code}\n)}`).join(",")}];`,
    "const dependencyRegistry = globalThis[Symbol.for('KivowikiMods.dependencies')] ||= new Map();",
    "const validateExport = (value, contract, path) => { for (const [key, expected] of Object.entries(contract || {})) { const next = value?.[key]; const actual = Array.isArray(next) ? 'array' : next === null ? 'null' : typeof next; if (typeof expected === 'string') { if (expected !== 'any' && actual !== expected) throw new Error(`${path}.${key} 应为 ${expected}，实际为 ${actual}`); } else { if (!next || typeof next !== 'object' || Array.isArray(next)) throw new Error(`${path}.${key} 应为 object`); validateExport(next, expected, `${path}.${key}`); } } };",
    "const apiSatisfies = (version, range) => { const parse = (value) => { const match = String(value || '').match(/^(\\d+)\\.(\\d+)\\.(\\d+)/); return match ? match.slice(1).map(Number) : null; }; const current = parse(version); if (!current) return false; const input = String(range || '*').trim(); if (!input || input === '*') return true; return input.split('||').some((group) => group.trim().split(/\\s+/).every((item) => { const match = item.match(/^(>=|<=|>|<|=|\\^|~)?(\\d+)(?:\\.(\\d+))?(?:\\.(\\d+))?$/); if (!match) return false; const operator = match[1] || '='; const target = [Number(match[2]), Number(match[3] || 0), Number(match[4] || 0)]; const compared = current[0] !== target[0] ? Math.sign(current[0] - target[0]) : current[1] !== target[1] ? Math.sign(current[1] - target[1]) : Math.sign(current[2] - target[2]); if (operator === '>=') return compared >= 0; if (operator === '<=') return compared <= 0; if (operator === '>') return compared > 0; if (operator === '<') return compared < 0; if (operator === '^') return compared >= 0 && current[0] === target[0]; if (operator === '~') return compared >= 0 && current[0] === target[0] && current[1] === target[1]; return compared === 0; })); };",
    "const platform = Object.freeze({ ...platformData, satisfies: apiSatisfies });",
    "const cleanups = [];",
    "const settingsListeners = [];",
    "let startupState = 'starting';",
    "let startupMessage = '';",
    "const requests = new Map();",
    "const dataCache = new Map();",
    "let dataActive = 0;",
    "const dataQueue = [];",
    "const dataSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));",
    "const dataQuery = (query) => { const params = new URLSearchParams(); if (!query) return params; if (query instanceof URLSearchParams) { query.forEach((value, key) => params.append(key, value)); return params; } Object.entries(query).forEach(([key, value]) => { if (value == null) return; (Array.isArray(value) ? value : [value]).forEach((item) => params.append(key, String(item))); }); return params; };",
    "const dataRequestDirect = async (input) => {",
    "  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('数据请求参数必须是对象');",
    "  if (typeof input.url !== 'string' || !input.url.trim()) throw new Error('数据请求缺少 URL');",
    "  const method = String(input.method || 'GET').toUpperCase();",
    "  if (!['GET', 'HEAD'].includes(method)) throw new Error('数据客户端只允许只读请求');",
    "  const url = new URL(String(input.url || ''), location.href);",
    "  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('数据请求 URL 协议无效');",
    "  dataQuery(input.query).forEach((value, key) => url.searchParams.append(key, value));",
    "  const headers = Object.fromEntries(Object.entries(input.headers || {}).filter(([key]) => !/^(authorization|cookie|set-cookie)$/i.test(key)));",
    "  const cacheKey = `${method} ${url.href}`; const cacheTtl = Math.max(0, Math.min(Number(input.cacheTtlMs) || 0, 86400000)); const cached = dataCache.get(cacheKey);",
    "  if (cacheTtl && cached && cached.expiresAt > Date.now()) return { ...cached.value, fromCache: true }; if (cached) dataCache.delete(cacheKey);",
    "  if (dataActive >= 16) await new Promise((resolve) => dataQueue.push(resolve)); dataActive += 1;",
    "  try { let lastError; const retries = Math.max(0, Math.min(input.retries == null ? 4 : Number(input.retries), 8)); const timeoutMs = Math.max(1000, Math.min(Number(input.timeoutMs) || 30000, 180000));",
    "    for (let attempt = 0; attempt <= retries; attempt += 1) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs); try {",
    "      const response = await fetch(url.href, { method, headers: { Accept: 'application/json, text/plain', ...headers }, signal: controller.signal, credentials: 'omit' }); const text = await response.text(); let body = text; try { body = text ? JSON.parse(text) : null; } catch {}",
    "      if (!response.ok) { const error = new Error(`数据服务返回 HTTP ${response.status}`); error.status = response.status; error.data = body; throw error; }",
    "      if (body && typeof body === 'object' && body.success === false) { const error = new Error(body.message || '数据服务业务失败'); error.code = body.code; error.data = body; throw error; }",
    "      const value = { data: input.envelope === 'raw' || !body || typeof body !== 'object' || body.success !== true ? body : body.data, status: response.status, url: url.href, fromCache: false }; if (cacheTtl && method === 'GET') { dataCache.set(cacheKey, { expiresAt: Date.now() + cacheTtl, value }); while (dataCache.size > 128) dataCache.delete(dataCache.keys().next().value); } return value;",
    "    } catch (error) { lastError = error.name === 'AbortError' ? Object.assign(new Error('数据请求超时'), { code: 'TIMEOUT' }) : error; const retryable = !lastError.status || lastError.status === 408 || lastError.status === 429 || lastError.status >= 500; if (!retryable || attempt >= retries) throw lastError; await dataSleep(Math.min(4000, 300 * (2 ** attempt) + Math.round(Math.random() * 120))); } finally { clearTimeout(timer); } }",
    "    throw lastError || new Error('数据请求失败');",
    "  } finally { dataActive -= 1; dataQueue.shift()?.(); }",
    "};",
    "const dataRequest = (input) => { let url; try { url = new URL(String(input?.url || ''), location.href); } catch { return Promise.reject(new Error('数据请求 URL 无效')); } return ['api.kivo.wiki','kivo.wiki','www.kivo.wiki'].includes(url.hostname) ? requestHost('data-request', { input }) : dataRequestDirect(input); };",
    "const createApiAdapter = (definition) => {",
    "  if (!permissions.has('network.read')) throw new Error('模块未获得只读网络权限');",
    "  if (!definition || typeof definition !== 'object') throw new Error('API 适配器定义必须是对象');",
    "  if (!platform.satisfies(platform.version, String(definition.apiVersion || '*'))) throw new Error(`适配器需要平台 API ${definition.apiVersion}`);",
    "  if (!definition.methods || typeof definition.methods !== 'object') throw new Error('API 适配器缺少 methods');",
    "  const methods = {};",
    "  for (const [name, factory] of Object.entries(definition.methods)) { if (!/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(name) || typeof factory !== 'function') throw new Error('API 适配器方法无效'); methods[name] = (...args) => factory({ request: dataRequest, site: { hostname: location.hostname, pathname: location.pathname } }, ...args); }",
    "  return Object.freeze({ id: String(definition.id || moduleId), version: String(definition.version || '1.0.0'), apiVersion: platform.version, ...methods });",
    "};",
    `let settings = ${settings};`,
    'const post = (message) => window.postMessage({ source: "kivowiki-mods-page-module", moduleId, token, ...message }, "*");',
    "const requestHost = (type, payload = {}) => new Promise((resolve, reject) => { const requestId = String(Date.now()) + Math.random(); const timeoutMs = type === 'data-request' ? 185000 : 10000; const timer = setTimeout(() => { requests.delete(requestId); reject(new Error('宿主请求超时')); }, timeoutMs); requests.set(requestId, { resolve(value) { clearTimeout(timer); resolve(value); }, reject(error) { clearTimeout(timer); reject(error); } }); post({ type, ...payload, requestId }); });",
    "const onHostMessage = (event) => {",
    "  const message = event.data;",
    '  if (!message || message.source !== "kivo-plus-page-host" || message.moduleId !== moduleId) return;',
    '  if (message.type === "hello") { post({ type: "hello-ready" }); if (startupState === "ready") post({ type: "ready" }); if (startupState === "error") post({ type: "error", message: startupMessage }); return; }',
    '  if (message.token !== token) return;',
    '  if (message.type === "settings-change") { settings = { ...settings, ...(message.settings || {}) }; context.settings = { ...settings }; settingsListeners.forEach((listener) => { try { listener({ ...settings }); } catch (error) { post({ type: "error", message: error instanceof Error ? error.message : "设置更新失败" }); } }); }',
    '  if (message.type === "storage-result" || message.type === "asset-result" || message.type === "data-result") { const request = requests.get(message.requestId); if (!request) return; requests.delete(message.requestId); message.ok === false ? request.reject(new Error(message.error || "请求失败")) : request.resolve(message.data); }',
    '  if (message.type === "stop") { cleanups.reverse().forEach((cleanup) => { try { cleanup(); } catch (error) { console.error(error); } }); requests.forEach((request) => request.reject(new Error("模块已停止"))); requests.clear(); window.removeEventListener("message", onHostMessage); }',
    "};",
    "window.addEventListener(\"message\", onHostMessage);",
    "const dependencyServices = Object.freeze({ request(input) { return requestHost('data-request', { input }); }, clearCache() { return requestHost('data-clear'); } });",
    "const scopedDependencies = new Map();",
    "for (const dependency of dependencySources) { const definition = dependency.definition; if (!definition || typeof definition.create !== 'function') throw new Error(`依赖 ${dependency.packageKey} 必须返回带 create() 的对象`); const available = Object.freeze(Object.fromEntries(dependencySources.filter((item) => item.id !== dependency.id).map((item) => [item.id, scopedDependencies.get(item.id) || dependencyRegistry.get(item.packageKey)?.value]).filter(([, value]) => value !== undefined))); if (dependency.scoped) { const value = definition.create(available, dependencyServices); validateExport(value, dependency.exports, dependency.packageKey); scopedDependencies.set(dependency.id, value); continue; } const cached = dependencyRegistry.get(dependency.packageKey); if (cached?.revision === dependency.revision) continue; const value = definition.create(available, dependencyServices); validateExport(value, dependency.exports, dependency.packageKey); dependencyRegistry.set(dependency.packageKey, Object.freeze({ version: dependency.version, revision: dependency.revision, value })); }",
    "const dependencies = Object.freeze(Object.fromEntries(dependencySources.map((dependency) => [dependency.id, dependency.scoped ? scopedDependencies.get(dependency.id) : dependencyRegistry.get(dependency.packageKey)?.value])));",
    "const context = {",
    "  id: moduleId, root: document, document, window,",
    "  site: { hostname: location.hostname, pathname: location.pathname }, settings,",
    "  platform, permissions: Object.freeze([...permissions]), dependencies,",
    '  api: { version: platform.version, supports(range) { return platform.satisfies(platform.version, range); }, request(input) { if (!permissions.has("network.read")) return Promise.reject(new Error("模块未获得只读网络权限")); return dataRequest(input); }, createAdapter: createApiAdapter },',
    "  storage: {",
    '    get(key) { if (!permissions.has("storage")) return Promise.reject(new Error("模块未获得本地数据存储权限")); return requestHost("storage-get", { key }); },',
     '    set(values) { if (!permissions.has("storage")) throw new Error("模块未获得本地数据存储权限"); post({ type: "storage-set", values }); }',
     "  },",
    "  assets: {",
    '    getText(path) { return requestHost("asset-get-text", { path }); },',
    '    getFile(path) { return requestHost("asset-get-file", { path }); }',
    "  },",
    '  data: { request(input) { if (!permissions.has("network.read")) return Promise.reject(new Error("模块未获得只读网络权限")); return dataRequest(input); }, clearCache() { dataCache.clear(); } },',
    '  log(level, message) { post({ type: "log", level, message: String(message || "") }); },',
    '  saveSettings(next) { if (!permissions.has("settings")) throw new Error("模块未获得设置保存权限"); settings = { ...(next || {}) }; context.settings = { ...settings }; post({ type: "save-settings", settings }); },',
    '  onSettingsChange(listener) { if (typeof listener === "function") settingsListeners.push(listener); },',
    '  onCleanup(cleanup) { if (typeof cleanup === "function") cleanups.push(cleanup); }',
    "};",
    'try { if (!module || typeof module.mount !== "function") throw new Error("模块必须返回带 mount(context) 的对象"); Promise.resolve(module.mount(context)).then(() => { startupState = "ready"; post({ type: "ready" }); }, (error) => { startupState = "error"; startupMessage = error instanceof Error ? error.message : "模块启动失败"; post({ type: "error", message: startupMessage }); }); }',
    'catch (error) { startupState = "error"; startupMessage = error instanceof Error ? error.message : "模块启动失败"; post({ type: "error", message: startupMessage }); }',
    "})();"
  ].join("\n");
};

const canUseUserScripts = () => Boolean(chrome.userScripts?.register && chrome.userScripts?.unregister);

const syncPageScripts = async () => {
  if (syncPromise) {
    syncAgain = true;
    return syncPromise;
  }
  syncPromise = (async () => {
    do {
      syncAgain = false;
      await syncPageScriptsInternal();
    } while (syncAgain);
  })();
  try { return await syncPromise; } finally { syncPromise = null; }
};

const syncPageScriptsInternal = async () => {
  if (!canUseUserScripts()) {
    await chrome.storage.local.set({ kivoPlusUserScripts: false });
    return;
  }

  try {
    const state = await ensureInitialState();
    const builtinDependencies = Array.isArray(globalThis.KivowikiModsDependencies) ? globalThis.KivowikiModsDependencies : [];
    const dependencies = [...builtinDependencies, ...(state.dependencies || [])].map((item) => ({ ...item, type: "dependency" }));
    const resolution = KivowikiModsPlatform.resolveModules(state.imported || [], dependencies, state.lockfile);
    const desired = state.preferences?.safeMode
      ? []
      : resolution.ordered.filter((entry) => entry.mode !== "sandbox");
    const desiredByScriptId = new Map(desired.map((entry) => [`${PAGE_SCRIPT_PREFIX}${entry.id}`, entry]));
    const dependencyClosure = (entry) => resolution.dependencyPlans[entry.id] || [];
    const fingerprintFor = (entry) => JSON.stringify({
      version: entry.version,
      entry: entry.entry,
      settings: entry.settings,
      updatedAt: entry.updatedAt,
      permissions: entry.permissions,
      grantedPermissions: entry.grantedPermissions,
      dependencies: entry.dependencies,
      optionalDependencies: entry.optionalDependencies,
      conflicts: entry.conflicts,
      engines: entry.engines,
      dependencyVersions: dependencyClosure(entry).map((dependency) => [dependency.id, dependency.version, dependency.updatedAt])
    });
    const nextFingerprints = Object.fromEntries(desired.map((entry) => [entry.id, fingerprintFor(entry)]));
    const stored = await chrome.storage.local.get("kivoPlusPageFingerprints");
    const previousFingerprints = stored.kivoPlusPageFingerprints && typeof stored.kivoPlusPageFingerprints === "object" ? stored.kivoPlusPageFingerprints : {};
    const existing = await chrome.userScripts.getScripts();
    const existingIds = new Set(existing.filter((script) => script.id.startsWith(PAGE_SCRIPT_PREFIX)).map((script) => script.id));
    const changed = desired.filter((entry) => previousFingerprints[entry.id] !== nextFingerprints[entry.id] || !existingIds.has(`${PAGE_SCRIPT_PREFIX}${entry.id}`));
    const changedIds = new Set(changed.map((entry) => `${PAGE_SCRIPT_PREFIX}${entry.id}`));
    const unregisterIds = [...existingIds].filter((id) => !desiredByScriptId.has(id) || changedIds.has(id));
    if (unregisterIds.length) await chrome.userScripts.unregister({ ids: unregisterIds });

    const scripts = [];
    for (const entry of changed) {
      const code = await KivowikiModsStore.getText(entry.id, entry.entry || "index.js") || (typeof entry.code === "string" ? entry.code : null);
      if (typeof code === "string" && !entry.entry && entry.code) KivowikiModsStore.putText(entry.id, "index.js", entry.code).catch(console.error);
      if (typeof code !== "string") { delete nextFingerprints[entry.id]; continue; }
      const dependencySources = [];
      for (const dependency of dependencyClosure(entry)) {
        const dependencyCode = dependency.builtin ? dependency.sourceCode : await KivowikiModsStore.getText(KivowikiModsStore.storageIdFor(dependency), dependency.entry || "index.js");
        if (typeof dependencyCode === "string") dependencySources.push({ id: dependency.id, packageKey: KivowikiModsPlatform.packageKey(dependency), version: dependency.version, revision: dependency.updatedAt || dependency.version, scoped: dependency.scoped === true, exports: dependency.exports || {}, code: dependencyCode });
      }
      scripts.push({
        id: `${PAGE_SCRIPT_PREFIX}${entry.id}`,
        matches: PAGE_MATCHES,
        js: [{ code: buildPageScript({ ...entry, code }, dependencySources) }],
        world: "MAIN",
        runAt: "document_idle"
      });
    }
    if (scripts.length) await chrome.userScripts.register(scripts);
    await chrome.storage.local.set({ kivoPlusUserScripts: true, kivoPlusPageFingerprints: nextFingerprints });
  } catch (error) {
    console.error("KivowikiMods User Scripts 注册失败", error);
    await chrome.storage.local.set({ kivoPlusUserScripts: false });
  }
};

chrome.runtime.onInstalled.addListener(() => ensureInitialState().then(syncPageScripts).catch(console.error));
chrome.runtime.onStartup.addListener(() => syncPageScripts().catch(console.error));
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === managerWindowId) managerWindowId = null;
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.state && pageScriptFingerprint(changes.state.oldValue) !== pageScriptFingerprint(changes.state.newValue)) schedulePageScriptSync();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "open-manager") {
    if (managerWindowId != null) {
      chrome.windows.update(managerWindowId, { focused: true }).catch(() => { managerWindowId = null; });
      if (managerWindowId != null) return undefined;
    }
    chrome.windows.create({ url: chrome.runtime.getURL("options.html"), type: "popup", width: 1080, height: 820, focused: true })
      .then((window) => { managerWindowId = window.id; })
      .catch((error) => console.error("KivowikiMods 配置窗口打开失败", error));
    return undefined;
  }

  if (message?.type === "page-runtime-status") {
    chrome.storage.local.get("kivoPlusUserScripts")
      .then((result) => sendResponse({ available: result.kivoPlusUserScripts === true }));
    return true;
  }

  if (message?.type === "runtime-log") {
    if (sender.tab?.url && !isKivoPage(sender.tab.url)) return undefined;
    appendRuntimeLog(message).catch(console.error);
    return undefined;
  }

  if (message?.type === "module-crash") {
    if (sender.tab?.url && !isKivoPage(sender.tab.url)) return undefined;
    if (typeof message.moduleId === "string") enqueueCrash(message.moduleId, message.message).catch(console.error);
    return undefined;
  }

  if (message?.type === "dependency-data-request") {
    if (!sender.tab?.url || !isKivoPage(sender.tab.url)) {
      sendResponse({ ok: false, error: "请求来源不是 KivoWiki 页面" });
      return undefined;
    }
    const moduleId = String(message.moduleId || "");
    const input = message.input;
    let url;
    try { url = new URL(String(input?.url || "")); }
    catch { sendResponse({ ok: false, error: "依赖数据请求 URL 无效" }); return undefined; }
    if (url.protocol !== "https:" || !["api.kivo.wiki", "kivo.wiki", "www.kivo.wiki"].includes(url.hostname) || !["GET", "HEAD"].includes(String(input?.method || "GET").toUpperCase())) {
      sendResponse({ ok: false, error: "数据桥只允许只读访问 KivoWiki 公开地址" });
      return undefined;
    }
    chrome.storage.local.get("state")
      .then((stored) => {
        if (BUILTIN_DATA_MODULES.has(moduleId)) return dependencyDataClient.request(input);
        const module = stored.state?.imported?.find((item) => item.id === moduleId);
        if (!module) throw new Error("模块不存在");
        const granted = new Set(Array.isArray(module.grantedPermissions) ? module.grantedPermissions : []);
        if (!granted.has("network.read")) throw new Error("模块未获得只读网络权限");
        return dependencyDataClient.request(input);
      })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "依赖数据请求失败" }));
    return true;
  }

  if (message?.type === "dependency-data-clear") {
    if (!sender.tab?.url || !isKivoPage(sender.tab.url)) return undefined;
    dependencyDataClient.clearCache();
    sendResponse({ ok: true });
    return undefined;
  }

  if (message?.type === "module-file-get") {
    if (sender.tab?.url && !isKivoPage(sender.tab.url)) {
      sendResponse({ ok: false, error: "请求来源不是 KivoWiki 页面" });
      return undefined;
    }
    if (typeof message.moduleId !== "string" || typeof message.path !== "string") {
      sendResponse({ ok: false, error: "模块资源参数无效" });
      return undefined;
    }
    chrome.storage.local.get("state")
      .then((stored) => {
        if (![...(stored.state?.imported || []), ...(stored.state?.dependencies || [])].some((entry) => entry.id === message.moduleId || entry.storageId === message.moduleId)) throw new Error("包不存在");
        const item = [...(stored.state?.imported || []), ...(stored.state?.dependencies || [])].find((entry) => entry.id === message.moduleId || entry.storageId === message.moduleId);
        return KivowikiModsStore.getText(KivowikiModsStore.storageIdFor(item), message.path);
      })
      .then(async (data) => {
        if (data != null) return data;
        // 兼容 1.0 版本直接把 code 写入 state 的旧清单，读取一次后迁移到资源仓库。
        const stored = await chrome.storage.local.get("state");
        const legacy = stored.state?.imported?.find((entry) => entry.id === message.moduleId);
        if (legacy && message.path === (legacy.entry || "index.js") && typeof legacy.code === "string") {
          await KivowikiModsStore.putText(message.moduleId, message.path, legacy.code);
          return legacy.code;
        }
        return null;
      })
      .then((data) => sendResponse({ ok: data != null, data, error: data == null ? "模块资源不存在" : undefined }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "模块资源读取失败" }));
    return true;
  }

  if (message?.type === "module-file-get-blob") {
    if (sender.tab?.url && !isKivoPage(sender.tab.url)) {
      sendResponse({ ok: false, error: "请求来源不是 KivoWiki 页面" });
      return undefined;
    }
    if (typeof message.moduleId !== "string" || typeof message.path !== "string") {
      sendResponse({ ok: false, error: "模块资源参数无效" });
      return undefined;
    }
    chrome.storage.local.get("state")
      .then((stored) => {
        if (![...(stored.state?.imported || []), ...(stored.state?.dependencies || [])].some((entry) => entry.id === message.moduleId || entry.storageId === message.moduleId)) throw new Error("包不存在");
        const item = [...(stored.state?.imported || []), ...(stored.state?.dependencies || [])].find((entry) => entry.id === message.moduleId || entry.storageId === message.moduleId);
        return KivowikiModsStore.getFile(KivowikiModsStore.storageIdFor(item), message.path);
      })
      .then((data) => sendResponse({ ok: data != null, data, error: data == null ? "模块资源不存在" : undefined }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "模块资源读取失败" }));
    return true;
  }

  return undefined;
});
