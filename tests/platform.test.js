const assert = require("node:assert/strict");
const test = require("node:test");

require("../platform.js");

const platform = globalThis.KivowikiModsPlatform;
const dependency = (id, version, extra = {}) => ({ id, name: `Kivowiki-Mods-${id}`, type: "dependency", version, enabled: true, ...extra });
const moduleEntry = (id, dependencies = {}, extra = {}) => ({ id, name: `Kivowiki-Mods-${id}`, type: "module", version: "1.0.0", enabled: true, dependencies, ...extra });

test("语义化版本范围覆盖精确、通配、^、~ 和 OR", () => {
  assert.equal(platform.satisfies("2.4.1", "^2.1.0"), true);
  assert.equal(platform.satisfies("3.0.0", "^2.1.0"), false);
  assert.equal(platform.satisfies("1.4.9", "~1.4.0"), true);
  assert.equal(platform.satisfies("1.5.0", "~1.4.0"), false);
  assert.equal(platform.satisfies("4.8.2", "4.x || >=6.0.0"), true);
});

test("不同模块可以选择同一依赖的不同主版本", () => {
  const modules = [moduleEntry("reader", { renderer: "^1.0.0" }), moduleEntry("studio", { renderer: "^2.0.0" })];
  const dependencies = [dependency("renderer", "1.8.0"), dependency("renderer", "2.3.0")];
  const result = platform.resolveModules(modules, dependencies);
  assert.equal(result.status.reader.runnable, true);
  assert.equal(result.status.studio.runnable, true);
  assert.equal(result.dependencyPlans.reader[0].version, "1.8.0");
  assert.equal(result.dependencyPlans.studio[0].version, "2.3.0");
});

test("锁文件优先复用已验证版本而不是自动漂移", () => {
  const modules = [moduleEntry("reader", { renderer: "^1.0.0" })];
  const firstDependencies = [dependency("renderer", "1.8.0")];
  const lockfile = platform.createLockfile(modules, firstDependencies);
  const dependencies = [...firstDependencies, dependency("renderer", "1.9.0")];
  const result = platform.resolveModules(modules, dependencies, lockfile);
  assert.equal(result.dependencyPlans.reader[0].version, "1.8.0");
  assert.equal(lockfile.modules.reader.dependencies.renderer, "renderer@1.8.0");
});

test("缺失依赖和传递循环只阻止受影响模块", () => {
  const modules = [moduleEntry("broken", { missing: "^1.0.0" }), moduleEntry("healthy")];
  const result = platform.resolveModules(modules, []);
  assert.equal(result.status.broken.runnable, false);
  assert.match(result.status.broken.reasons[0], /缺少依赖/);
  assert.equal(result.status.healthy.runnable, true);

  const cycle = platform.resolveModules(
    [moduleEntry("cyclic", { alpha: "*" })],
    [dependency("alpha", "1.0.0", { dependencies: { beta: "*" } }), dependency("beta", "1.0.0", { dependencies: { alpha: "*" } })]
  );
  assert.equal(cycle.status.cyclic.runnable, false);
  assert.match(cycle.status.cyclic.reasons[0], /循环/);
});

test("依赖 conflicts 会传播到所有使用方", () => {
  const result = platform.resolveModules(
    [moduleEntry("left-module", { left: "*" }), moduleEntry("right-module", { right: "*" })],
    [dependency("left", "1.0.0", { conflicts: { right: "*" } }), dependency("right", "1.0.0")]
  );
  assert.equal(result.status["left-module"].state, "conflict");
  assert.equal(result.status["right-module"].state, "conflict");
  assert.equal(result.packageConflicts.length, 1);
});

test("资源声明重叠会提示但不擅自阻止运行", () => {
  const modules = [
    moduleEntry("left", {}, { claims: { globals: ["KivoShared"], pageSelectors: [".student-card"] } }),
    moduleEntry("right", {}, { audit: { inferredClaims: { globals: ["KivoShared"] } } })
  ];
  const result = platform.resolveModules(modules, []);
  assert.equal(result.status.left.runnable, true);
  assert.equal(result.status.right.runnable, true);
  assert.equal(result.resourceConflicts.length, 1);
  assert.match(result.status.left.warnings[0], /KivoShared/);
});

test("依赖导出接口契约给出精确路径错误", () => {
  const contract = platform.normalizeContract({ request: "function", api: { list: "function" } });
  assert.deepEqual(platform.validateContract({ request() {}, api: { list: 1 } }, contract, "runtime@1.0.0"), ["runtime@1.0.0.api.list 应为 function，实际为 number"]);
});
