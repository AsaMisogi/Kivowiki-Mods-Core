(function registerKivowikiModsPlatform() {
  "use strict";

  const MANAGER_VERSION = "1.6.2";
  const API_VERSION = "1.1.0";
  const MANIFEST_VERSION = 4;
  const ITEM_TYPES = Object.freeze({ MODULE: "module", DEPENDENCY: "dependency" });

  // 权限名称是稳定的公共契约。风险说明只由管理器维护，模块不能自行覆盖。
  const PERMISSIONS = Object.freeze({
    "page.read": { title: "读取页面内容", risk: "medium", description: "读取当前 KivoWiki 页面的文字、结构和路由信息。" },
    "page.modify": { title: "修改页面内容", risk: "high", description: "添加、删除或修改当前页面的界面、样式和交互。" },
    storage: { title: "本地数据存储", risk: "low", description: "保存该模块自己的设置和业务数据，不能读取其他模块。" },
    "network.read": { title: "只读网络访问", risk: "high", description: "发起 GET 或 HEAD 请求；不会由管理器附带 Cookie、Token 等认证信息。" },
    assets: { title: "读取模块资源", risk: "low", description: "读取安装包内属于该模块的文本、图片或其他资源。" },
    ui: { title: "显示模块界面", risk: "low", description: "在严格沙箱提供的受限区域中显示按钮、文字和面板。" },
    settings: { title: "保存模块设置", risk: "low", description: "读取和保存该模块的 JSON 配置。" }
  });

  const parseVersion = (value) => {
    const match = String(value || "").trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
    if (!match) return null;
    return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease: match[4] || "" };
  };

  const compareVersions = (left, right) => {
    const a = parseVersion(left);
    const b = parseVersion(right);
    if (!a || !b) return String(left || "").localeCompare(String(right || ""));
    for (const key of ["major", "minor", "patch"]) if (a[key] !== b[key]) return a[key] > b[key] ? 1 : -1;
    if (a.prerelease === b.prerelease) return 0;
    if (!a.prerelease) return 1;
    if (!b.prerelease) return -1;
    return a.prerelease.localeCompare(b.prerelease);
  };

  const testComparator = (version, comparator) => {
    const match = comparator.match(/^(>=|<=|>|<|=|\^|~)?\s*(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?$/i);
    if (!match) return false;
    const operator = match[1] || "=";
    const major = Number(match[2]);
    const minorWildcard = match[3] == null || /^(?:x|\*)$/i.test(match[3]);
    const patchWildcard = match[4] == null || /^(?:x|\*)$/i.test(match[4]);
    const minor = minorWildcard ? 0 : Number(match[3]);
    const patch = patchWildcard ? 0 : Number(match[4]);
    const target = `${major}.${minor}.${patch}`;
    const compared = compareVersions(version, target);
    if (operator === ">=") return compared >= 0;
    if (operator === "<=") return compared <= 0;
    if (operator === ">") return compared > 0;
    if (operator === "<") return compared < 0;
    if (operator === "^") {
      const upper = major > 0 ? `${major + 1}.0.0` : minor > 0 ? `0.${minor + 1}.0` : `0.0.${patch + 1}`;
      return compared >= 0 && compareVersions(version, upper) < 0;
    }
    if (operator === "~") return compared >= 0 && compareVersions(version, `${major}.${minor + 1}.0`) < 0;
    if (minorWildcard) return parseVersion(version)?.major === major;
    if (patchWildcard) {
      const parsed = parseVersion(version);
      return parsed?.major === major && parsed?.minor === minor;
    }
    return compared === 0;
  };

  // 支持常见的 exact、比较符、^、~、通配符、空格 AND 和 || OR，足够覆盖模块清单。
  const satisfies = (version, range) => {
    if (!parseVersion(version)) return false;
    const normalized = String(range || "*").trim();
    if (!normalized || normalized === "*" || /^latest$/i.test(normalized)) return true;
    return normalized.split("||").some((group) => group.trim().split(/\s+/).every((item) => testComparator(version, item)));
  };

  const normalizeRelationMap = (value, fieldName) => {
    if (value == null) return {};
    if (Array.isArray(value)) return Object.fromEntries(value.map((id) => [String(id), "*"]));
    if (typeof value !== "object") throw new Error(`${fieldName} 必须是对象或包 ID 数组`);
    const result = {};
    for (const [id, range] of Object.entries(value)) {
      if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(id)) throw new Error(`${fieldName} 包含无效模块 ID：${id}`);
      result[id] = String(range || "*").slice(0, 100);
    }
    return result;
  };

  // 依赖和模块使用相同的语义化版本规则，但在清单层单独命名，避免
  // 把一个“提供能力的包”误当成可以直接挂载页面的功能模块。
  const normalizeDependencyMap = (value, fieldName = "dependencies") => normalizeRelationMap(value, fieldName);

  const normalizeItemType = (value) => {
    const type = String(value || ITEM_TYPES.MODULE).toLowerCase();
    if (![ITEM_TYPES.MODULE, ITEM_TYPES.DEPENDENCY].includes(type)) throw new Error("type 只能是 module 或 dependency");
    return type;
  };

  const packageKey = (item) => item?.packageKey || `${item?.id || "unknown"}@${item?.version || "0.0.0"}`;

  const normalizeContract = (value, fieldName = "exports", depth = 0) => {
    if (value == null) return {};
    if (!value || typeof value !== "object" || Array.isArray(value) || depth > 6) throw new Error(`${fieldName} 必须是最多 6 层的对象`);
    const result = {};
    for (const [key, expected] of Object.entries(value)) {
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$-]{0,79}$/.test(key)) throw new Error(`${fieldName} 包含无效接口名：${key}`);
      if (typeof expected === "string") {
        if (!["any", "array", "boolean", "function", "number", "object", "string"].includes(expected)) throw new Error(`${fieldName}.${key} 的类型无效`);
        result[key] = expected;
      } else result[key] = normalizeContract(expected, `${fieldName}.${key}`, depth + 1);
    }
    return result;
  };

  const validateContract = (value, contract, label = "依赖接口") => {
    const errors = [];
    const visit = (current, schema, path) => {
      if (!schema || typeof schema !== "object") return;
      for (const [key, expected] of Object.entries(schema)) {
        const next = current?.[key];
        const nextPath = `${path}.${key}`;
        if (typeof expected === "string") {
          const actual = Array.isArray(next) ? "array" : next === null ? "null" : typeof next;
          if (expected !== "any" && actual !== expected) errors.push(`${nextPath} 应为 ${expected}，实际为 ${actual}`);
        } else if (!next || typeof next !== "object" || Array.isArray(next)) errors.push(`${nextPath} 应为 object`);
        else visit(next, expected, nextPath);
      }
    };
    visit(value, contract, label);
    return errors;
  };

  const normalizeClaims = (value) => {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const normalizeList = (key, pattern) => {
      if (source[key] == null) return [];
      if (!Array.isArray(source[key])) throw new Error(`claims.${key} 必须是数组`);
      return [...new Set(source[key].map((item) => String(item).trim()).filter((item) => item && item.length <= 200 && pattern.test(item)))].slice(0, 100);
    };
    return {
      globals: normalizeList("globals", /^[a-zA-Z_$][a-zA-Z0-9_$.-]*$/),
      pageSelectors: normalizeList("pageSelectors", /^[^{}<>]+$/),
      routes: normalizeList("routes", /^\//)
    };
  };

  const mergeClaims = (...values) => {
    const merged = { globals: [], pageSelectors: [], routes: [] };
    for (const value of values) {
      const claims = normalizeClaims(value);
      for (const key of Object.keys(merged)) merged[key].push(...claims[key]);
    }
    for (const key of Object.keys(merged)) merged[key] = [...new Set(merged[key])];
    return merged;
  };

  const normalizePermissions = (value, mode = "page") => {
    const fallback = mode === "sandbox"
      ? ["ui", "settings", "assets"]
      : ["page.read", "page.modify", "storage", "settings", "assets"];
    const source = value == null ? fallback : value;
    if (!Array.isArray(source)) throw new Error("permissions 必须是数组");
    const seen = new Set();
    return source.map((item) => {
      const permission = typeof item === "string" ? { id: item } : item;
      if (!permission || typeof permission.id !== "string" || !/^[a-z][a-z0-9.-]{1,60}$/.test(permission.id)) throw new Error(`模块权限名称无效：${permission?.id || "空值"}`);
      if (seen.has(permission.id)) return null;
      seen.add(permission.id);
      const definition = PERMISSIONS[permission.id] || {
        title: `未知权限：${permission.id}`,
        risk: "high",
        description: "当前管理器不认识此权限，因此不会自动提供对应能力；模块仍可安装。"
      };
      return {
        id: permission.id,
        reason: String(permission.reason || "模块未补充用途说明").slice(0, 200),
        optional: permission.optional === true,
        known: Boolean(PERMISSIONS[permission.id]),
        ...definition
      };
    }).filter(Boolean);
  };

  const hasPermission = (module, id) => {
    try { return normalizePermissions(module?.permissions, module?.mode).some((item) => item.id === id && item.known !== false); }
    catch { return false; }
  };

  const getCompatibility = (module) => {
    const engine = module?.engines && typeof module.engines === "object" ? module.engines : {};
    if (engine.kivowikiMods && !satisfies(MANAGER_VERSION, engine.kivowikiMods)) return `需要 Kivowiki-Mods ${engine.kivowikiMods}`;
    if (engine.api && !satisfies(API_VERSION, engine.api)) return `需要平台 API ${engine.api}`;
    return "";
  };

  const resolveModules = (input, dependencyInput = [], lockfile = null) => {
    const modules = Array.isArray(input) ? input : [];
    const dependencies = Array.isArray(dependencyInput) ? dependencyInput.map((item) => ({ ...item, packageKey: packageKey(item) })) : [];
    const candidates = new Map();
    for (const dependency of dependencies) {
      const list = candidates.get(dependency.id) || [];
      list.push(dependency);
      candidates.set(dependency.id, list);
    }
    for (const list of candidates.values()) list.sort((a, b) => compareVersions(b.version, a.version));
    const dependencyStatus = Object.fromEntries(dependencies.map((item) => [item.packageKey, { runnable: item.enabled !== false, state: item.enabled === false ? "disabled" : "ready", reasons: [] }]));
    const status = Object.fromEntries(modules.map((item) => [item.id, { runnable: item.enabled !== false, state: item.enabled === false ? "disabled" : "ready", reasons: [], warnings: [] }]));
    const block = (id, reason, state = "blocked") => {
      const current = status[id];
      if (!current || current.reasons.includes(reason)) return;
      current.runnable = false;
      current.state = state;
      current.reasons.push(reason);
    };
    const blockDependency = (id, reason, state = "dependency-error") => {
      const current = dependencyStatus[id];
      if (!current || current.reasons.includes(reason)) return;
      current.runnable = false;
      current.state = state;
      current.reasons.push(reason);
    };

    for (const dependency of dependencies) {
      if (dependency.enabled === false) continue;
      const incompatible = getCompatibility(dependency);
      if (incompatible) blockDependency(dependency.packageKey, incompatible, "incompatible");
    }

    // 每个模块独立选择满足范围的最高版本。锁文件中已有选择时优先复用，
    // 因而升级一个依赖不会无意改变其他模块已经验证过的依赖图。
    const dependencyPlans = {};
    const lockSelections = lockfile?.modules && typeof lockfile.modules === "object" ? lockfile.modules : {};
    const selectCandidate = (moduleId, id, range) => {
      const lockedKey = lockSelections[moduleId]?.dependencies?.[id];
      const list = candidates.get(id) || [];
      const locked = lockedKey ? list.find((item) => item.packageKey === lockedKey && item.enabled !== false && satisfies(item.version, range)) : null;
      return locked || list.find((item) => item.enabled !== false && satisfies(item.version, range));
    };
    const resolvePlan = (module) => {
      const ordered = [];
      const selected = new Map();
      const visiting = new Set();
      const visit = (id, range, owner) => {
        const previous = selected.get(id);
        if (previous) {
          if (visiting.has(previous.packageKey)) throw new Error(`依赖关系中存在循环：${previous.packageKey}`);
          if (!satisfies(previous.version, range)) throw new Error(`${owner} 要求 ${id} ${range}，但依赖图已选择 ${previous.packageKey}`);
          return previous;
        }
        const target = selectCandidate(module.id, id, range);
        if (!target) {
          const versions = (candidates.get(id) || []).map((item) => item.version).join("、");
          throw new Error(versions ? `依赖 ${id} 没有符合 ${range} 的版本（已安装：${versions}）` : `缺少依赖 ${id} (${range})`);
        }
        if (dependencyStatus[target.packageKey]?.runnable === false) {
          const reason = dependencyStatus[target.packageKey].reasons.join("；");
          throw new Error(`依赖 ${target.packageKey} 当前不可运行${reason ? `：${reason}` : ""}`);
        }
        if (visiting.has(target.packageKey)) throw new Error(`依赖关系中存在循环：${target.packageKey}`);
        visiting.add(target.packageKey);
        selected.set(id, target);
        const required = normalizeDependencyMap(target.dependencies, "dependencies");
        for (const [childId, childRange] of Object.entries(required)) {
          const child = visit(childId, childRange, target.packageKey);
          if (child.scoped === true && target.scoped !== true) throw new Error(`依赖 ${child.packageKey} 绑定调用方权限，${target.packageKey} 也必须声明 scoped: true`);
        }
        for (const [childId, childRange] of Object.entries(normalizeRelationMap(target.optionalDependencies, "optionalDependencies"))) {
          if ((candidates.get(childId) || []).some((item) => item.enabled !== false && satisfies(item.version, childRange))) visit(childId, childRange, target.packageKey);
        }
        visiting.delete(target.packageKey);
        ordered.push(target);
        return target;
      };
      for (const [id, range] of Object.entries(normalizeDependencyMap(module.dependencies, "dependencies"))) visit(id, range, module.id);
      for (const [id, range] of Object.entries(normalizeRelationMap(module.optionalDependencies, "optionalDependencies"))) {
        if ((candidates.get(id) || []).some((item) => item.enabled !== false && satisfies(item.version, range))) visit(id, range, module.id);
      }
      const participants = [module, ...ordered];
      for (const source of participants) {
        for (const [id, range] of Object.entries(normalizeRelationMap(source.conflicts, "conflicts"))) {
          const conflicts = participants.filter((target) => target !== source && target.id === id && satisfies(target.version, range));
          if (conflicts.length) throw new Error(`${source.id} 与 ${conflicts.map(packageKey).join("、")} 冲突`);
        }
      }
      return ordered;
    };

    // 即使尚无模块使用某个依赖，也要展示它自己的传递缺失、循环与冲突状态。
    for (const dependency of dependencies) {
      if (dependency.enabled === false || !dependencyStatus[dependency.packageKey]?.runnable) continue;
      try {
        const probe = {
          id: `dependency-probe-${dependency.packageKey}`,
          dependencies: dependency.dependencies || {},
          optionalDependencies: dependency.optionalDependencies || {}
        };
        const plan = [dependency, ...resolvePlan(probe)];
        for (const source of plan) {
          for (const [id, range] of Object.entries(normalizeRelationMap(source.conflicts, "conflicts"))) {
            if (plan.some((target) => target !== source && target.id === id && satisfies(target.version, range))) throw new Error(`${source.packageKey} 与 ${id} ${range} 冲突`);
          }
        }
      } catch (error) { blockDependency(dependency.packageKey, error.message); }
    }

    for (const module of modules) {
      if (module.enabled === false) continue;
      if (module.quarantined) block(module.id, module.quarantineReason || "模块因连续崩溃已被隔离", "quarantined");
      const incompatible = getCompatibility(module);
      if (incompatible) block(module.id, incompatible, "incompatible");
      try {
        dependencyPlans[module.id] = resolvePlan(module);
      } catch (error) { block(module.id, error.message, "dependency-error"); }
    }

    // 模块之间的冲突是对称的：任意一方声明冲突，两边都暂停，避免加载顺序决定结果。
    for (const module of modules.filter((item) => item.enabled !== false)) {
      let conflicts = {};
      try { conflicts = normalizeRelationMap(module.conflicts, "conflicts"); } catch (error) { block(module.id, error.message); }
      for (const [id, range] of Object.entries(conflicts)) {
        for (const target of modules.filter((item) => item.id === id && item.enabled !== false && satisfies(item.version, range))) {
          block(module.id, `与 ${target.id} ${range} 冲突`, "conflict");
          block(target.id, `与 ${module.id} ${module.version} 冲突`, "conflict");
        }
      }
    }

    const activePackages = [...modules.filter((item) => status[item.id]?.runnable), ...new Map(Object.values(dependencyPlans).flat().map((item) => [item.packageKey, item])).values()];
    const packageConflicts = [];
    for (const source of activePackages) {
      for (const [id, range] of Object.entries(normalizeRelationMap(source.conflicts, "conflicts"))) {
        for (const target of activePackages.filter((item) => item !== source && item.id === id && satisfies(item.version, range))) {
          if (!packageConflicts.some((item) => item.packages.includes(packageKey(source)) && item.packages.includes(packageKey(target)))) {
            packageConflicts.push({ packages: [packageKey(source), packageKey(target)], reason: `${packageKey(source)} 与 ${packageKey(target)} 冲突` });
          }
        }
      }
    }
    for (const conflict of packageConflicts) for (const module of modules) {
      const keys = new Set([packageKey(module), ...(dependencyPlans[module.id] || []).map(packageKey)]);
      if (conflict.packages.some((key) => keys.has(key))) block(module.id, conflict.reason, "conflict");
    }
    for (const conflict of packageConflicts) for (const key of conflict.packages) {
      if (dependencyStatus[key]) blockDependency(key, conflict.reason, "conflict");
    }
    const resourceConflicts = [];
    for (let leftIndex = 0; leftIndex < activePackages.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < activePackages.length; rightIndex += 1) {
        const left = activePackages[leftIndex];
        const right = activePackages[rightIndex];
        const leftClaims = mergeClaims(left.claims, left.audit?.inferredClaims);
        const rightClaims = mergeClaims(right.claims, right.audit?.inferredClaims);
        for (const type of ["globals", "pageSelectors", "routes"]) {
          for (const value of leftClaims[type].filter((claim) => rightClaims[type].includes(claim))) resourceConflicts.push({ type, value, packages: [packageKey(left), packageKey(right)] });
        }
      }
    }
    for (const conflict of resourceConflicts) for (const module of modules) {
      const keys = new Set([packageKey(module), ...(dependencyPlans[module.id] || []).map(packageKey)]);
      if (conflict.packages.every((key) => keys.has(key)) || conflict.packages.includes(packageKey(module))) status[module.id]?.warnings.push(`资源占用重叠：${conflict.value}`);
    }

    const orderedDependencies = [...new Map(Object.values(dependencyPlans).flat().map((item) => [item.packageKey, item])).values()];
    return {
      ordered: modules.filter((item) => status[item.id]?.runnable).sort((a, b) => a.id.localeCompare(b.id)),
      status,
      orderedDependencies,
      dependencyPlans,
      dependencyStatus,
      resourceConflicts,
      packageConflicts
    };
  };

  const createLockfile = (modules, dependencies, previous = null) => {
    const resolution = resolveModules(modules, dependencies, previous);
    const lockedModules = {};
    for (const module of modules) {
      lockedModules[module.id] = {
        version: module.version,
        integrity: module.integrity || "",
        source: module.source || {},
        dependencies: resolution.dependencyPlans[module.id]?.length
          ? Object.fromEntries(resolution.dependencyPlans[module.id].map((dependency) => [dependency.id, packageKey(dependency)]))
          : previous?.modules?.[module.id]?.dependencies || {}
      };
    }
    return {
      lockfileVersion: 1,
      managerVersion: MANAGER_VERSION,
      generatedAt: new Date().toISOString(),
      modules: lockedModules,
      packages: Object.fromEntries(dependencies.map((dependency) => [packageKey(dependency), {
        id: dependency.id,
        version: dependency.version,
        integrity: dependency.integrity || "",
        source: dependency.source || {},
        dependencies: dependency.dependencies || {}
      }]))
    };
  };

  const publicApi = Object.freeze({
    version: API_VERSION,
    managerVersion: MANAGER_VERSION,
    manifestVersion: MANIFEST_VERSION,
    features: Object.freeze(["permissions-v1", "package-signature-v1", "dependencies-v3", "multi-version-v1", "lockfile-v1", "contracts-v1", "resource-claims-v1", "updates-v1", "rollback-v1", "runtime-logs-v1", "data-read-v2", "market-v1", "folder-import-v1"]),
    itemTypes: ITEM_TYPES
  });

  globalThis.KivowikiModsPlatform = Object.freeze({
    MANAGER_VERSION,
    API_VERSION,
    MANIFEST_VERSION,
    ITEM_TYPES,
    PERMISSIONS,
    parseVersion,
    compareVersions,
    satisfies,
    normalizePermissions,
    normalizeRelationMap,
    normalizeDependencyMap,
    normalizeItemType,
    normalizeContract,
    validateContract,
    normalizeClaims,
    mergeClaims,
    packageKey,
    hasPermission,
    getCompatibility,
    resolveModules,
    createLockfile,
    publicApi
  });
})();
