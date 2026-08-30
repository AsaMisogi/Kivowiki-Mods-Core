const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const flushTasks = () => new Promise((resolve) => setImmediate(resolve));

const createBackground = ({ imported = [], fingerprints = {}, scripts = [] } = {}) => {
  const listeners = { messages: [], removed: [], storage: [], installed: [], startup: [] };
  const values = {
    state: {
      preferences: { safeMode: false },
      modules: {},
      imported,
      dependencies: [],
      lockfile: null
    },
    kivoPlusPageFingerprints: fingerprints
  };
  const sessionValues = {};
  const calls = { create: [], update: [], register: [], unregister: [] };
  let resolveCreate;
  const createResult = new Promise((resolve) => { resolveCreate = resolve; });

  const getValues = (source, keys) => {
    if (keys == null) return { ...source };
    const list = Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(list.filter((key) => key in source).map((key) => [key, source[key]]));
  };
  const chrome = {
    runtime: {
      getURL: (value) => `chrome-extension://test/${value}`,
      onInstalled: { addListener: (listener) => listeners.installed.push(listener) },
      onStartup: { addListener: (listener) => listeners.startup.push(listener) },
      onMessage: { addListener: (listener) => listeners.messages.push(listener) }
    },
    storage: {
      local: {
        get: async (keys) => getValues(values, keys),
        set: async (next) => { Object.assign(values, next); },
        remove: async (keys) => { for (const key of Array.isArray(keys) ? keys : [keys]) delete values[key]; }
      },
      session: {
        get: async (keys) => getValues(sessionValues, keys),
        set: async (next) => { Object.assign(sessionValues, next); },
        remove: async (keys) => { for (const key of Array.isArray(keys) ? keys : [keys]) delete sessionValues[key]; }
      },
      onChanged: { addListener: (listener) => listeners.storage.push(listener) }
    },
    windows: {
      create(options) { calls.create.push(options); return createResult; },
      async update(id, options) { calls.update.push({ id, options }); return { id }; },
      async getAll() { return []; },
      onRemoved: { addListener: (listener) => listeners.removed.push(listener) }
    },
    userScripts: {
      async getScripts() { return scripts; },
      async register(next) { calls.register.push(next); },
      async unregister(next) { calls.unregister.push(next); }
    }
  };
  const context = {
    chrome,
    console,
    crypto,
    URL,
    structuredClone,
    setTimeout,
    clearTimeout,
    importScripts() {},
    KivowikiModsDataClient: { create: () => ({ request: async () => ({}), clearCache() {} }) },
    KivowikiModsPlatform: {
      normalizePermissions: (permissions) => (permissions || []).map((item) => typeof item === "string" ? { id: item, known: true } : { ...item, known: true }),
      publicApi: { version: "1.1.0" },
      resolveModules: (modules) => ({ ordered: modules.filter((item) => item.enabled !== false), dependencyPlans: Object.fromEntries(modules.map((item) => [item.id, []])) }),
      packageKey: (item) => `${item.id}@${item.version}`
    },
    KivowikiModsStore: {
      getText: async () => "({ mount() {} })",
      putText: async () => {},
      storageIdFor: (item) => item.storageId || item.id
    }
  };
  context.globalThis = context;
  const source = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");
  vm.runInNewContext(source, context, { filename: "background.js" });
  return { calls, listeners, resolveCreate, sessionValues, values };
};

test("快速重复打开管理器只创建一个窗口，之后聚焦已有窗口", async () => {
  const runtime = createBackground();
  const onMessage = runtime.listeners.messages[0];

  onMessage({ type: "open-manager" }, {}, () => {});
  onMessage({ type: "open-manager" }, {}, () => {});
  await flushTasks();
  assert.equal(runtime.calls.create.length, 1);

  runtime.resolveCreate({ id: 27 });
  await flushTasks();
  await flushTasks();
  assert.equal(runtime.sessionValues.managerWindowId, 27);

  onMessage({ type: "open-manager" }, {}, () => {});
  await flushTasks();
  assert.equal(runtime.calls.update.length, 1);
  assert.equal(runtime.calls.update[0].id, 27);
  assert.equal(runtime.calls.update[0].options.focused, true);
  assert.equal(runtime.calls.create.length, 1);
});

test("旧版页面运行时指纹会强制重建动态 User Script", async () => {
  const module = {
    id: "beautify",
    name: "Kivowiki-Mods-beautify",
    version: "1.0.4",
    enabled: true,
    mode: "page",
    entry: "src/index.js",
    settings: {},
    permissions: [{ id: "page.modify" }],
    grantedPermissions: ["page.modify"],
    dependencies: {},
    optionalDependencies: {},
    conflicts: {},
    engines: {}
  };
  const runtime = createBackground({
    imported: [module],
    fingerprints: { beautify: JSON.stringify({ version: module.version }) },
    scripts: [{ id: "kivo-plus-page-beautify" }]
  });
  const onMessage = runtime.listeners.messages[0];
  const status = await new Promise((resolve) => {
    assert.equal(onMessage({ type: "page-runtime-status" }, {}, resolve), true);
  });

  assert.equal(status.available, true);
  assert.equal(status.requiresReload, true);
  assert.equal(runtime.calls.unregister.length, 1);
  assert.equal(runtime.calls.unregister[0].ids.length, 1);
  assert.equal(runtime.calls.unregister[0].ids[0], "kivo-plus-page-beautify");
  assert.equal(runtime.calls.register.length, 1);
  assert.equal(runtime.calls.register[0][0].world, "MAIN");
  assert.match(runtime.calls.register[0][0].js[0].code, /const runtimeVersion = 2;/);
  assert.doesNotThrow(() => new Function(runtime.calls.register[0][0].js[0].code));
  assert.match(runtime.values.kivoPlusPageFingerprints.beautify, /"runtimeVersion":2/);
});
