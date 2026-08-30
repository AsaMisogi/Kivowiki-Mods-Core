(function initOptions() {
  "use strict";

  const STORAGE_KEY = "state";
  const modules = Array.isArray(globalThis.KivowikiModsModules) ? globalThis.KivowikiModsModules : [];
  const builtinDependencies = Array.isArray(globalThis.KivowikiModsDependencies) ? globalThis.KivowikiModsDependencies : [];
  const list = document.getElementById("module-list");
  const dependencyList = document.getElementById("dependency-list");
  const toast = document.getElementById("toast");
  const safeModeInput = document.getElementById("safe-mode");
  const safeModeLabel = document.getElementById("safe-mode-label");
  const crashIsolationInput = document.getElementById("crash-isolation");
  const crashIsolationLabel = document.getElementById("crash-isolation-label");
  const searchInput = document.getElementById("module-search");
  const moduleCount = document.getElementById("module-count");
  const dependencyCount = document.getElementById("dependency-count");
  const dependencySearchInput = document.getElementById("dependency-search");
  const modal = document.getElementById("config-modal");
  const frame = document.getElementById("config-frame");
  const loading = document.getElementById("config-loading");
  const configTitle = document.getElementById("config-title");
  const installModal = document.getElementById("install-modal");
  const installReview = document.getElementById("install-review");
  const installTitle = document.getElementById("install-title");
  const confirmInstallButton = document.getElementById("confirm-install");
  const panelModal = document.getElementById("panel-modal");
  const panelContent = document.getElementById("panel-content");
  const panelTitle = document.getElementById("panel-title");
  const logFilter = document.getElementById("log-filter");
  const repositoryModal = document.getElementById("repository-modal");
  const repositoryUrl = document.getElementById("repository-url");
  const repositorySubmit = document.getElementById("repository-submit");
  const marketSearchInput = document.getElementById("market-search");
  const marketTypeInput = document.getElementById("market-type");
  const marketSortInput = document.getElementById("market-sort");
  const marketSearchButton = document.getElementById("market-search-button");
  const marketRefreshButton = document.getElementById("market-refresh-button");
  const marketPrevButton = document.getElementById("market-prev");
  const marketNextButton = document.getElementById("market-next");
  const marketPageLabel = document.getElementById("market-page-label");
  const marketSourceUrl = document.getElementById("market-source-url");
  const marketSourceAdd = document.getElementById("market-source-add");
  const marketSourceList = document.getElementById("market-source-list");
  const marketResults = document.getElementById("market-results");
  const recommendationSection = document.getElementById("recommendation-section");
  const recommendationList = document.getElementById("recommendation-list");
  const folderInput = document.getElementById("import-folder");
  const dependencyFolderButton = document.getElementById("import-dependency-folder-button");
  const managerTabVisibleInput = document.getElementById("manager-tab-visible");
  const managerTabVisibleLabel = document.getElementById("manager-tab-visible-label");
  const marketAutoLoadInput = document.getElementById("market-auto-load");
  const marketAutoLoadLabel = document.getElementById("market-auto-load-label");
  let state = { modules: {}, imported: [], dependencies: [], preferences: {}, lockfile: null };
  let runtimeLogs = [];
  let pendingInspection = null;
  let pendingInstallQueue = [];
  let toastTimer;
  let configRuntime = null;
  let saveQueue = Promise.resolve();
  let importTarget = "module";
  let marketRequestId = 0;
  let marketPage = 1;
  let marketTotalPages = 1;
  let marketHasLoaded = false;
  let pageRuntimeStatus = { available: null, error: "" };

  const showToast = (message) => {
    toast.textContent = message;
    toast.dataset.visible = "true";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.dataset.visible = "false"; }, 3000);
  };

  const saveState = () => {
    const snapshot = structuredClone(state);
    saveQueue = saveQueue.catch(() => {}).then(() => chrome.storage.local.set({ [STORAGE_KEY]: snapshot }));
    return saveQueue;
  };
  const formatSize = (bytes) => bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const textNode = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text;
    return node;
  };
  const changeLabels = { install: "安装", upgrade: "升级", downgrade: "降级", reinstall: "重新安装" };
  const statusLabels = { ready: "可运行", disabled: "已停用", quarantined: "已隔离", incompatible: "版本不兼容", "dependency-error": "依赖异常", conflict: "存在冲突", blocked: "已阻止" };
  const downloadJson = (name, value) => {
    const blob = new Blob([JSON.stringify(value)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const closeConfig = () => {
    if (configRuntime) {
      clearTimeout(configRuntime.timeout);
      frame.onload = null;
      configRuntime.send({ type: "stop" });
      window.removeEventListener("message", configRuntime.onMessage);
    }
    configRuntime = null;
    frame.hidden = true;
    modal.hidden = true;
    modal.removeAttribute("aria-busy");
  };

  const closeInstall = () => {
    pendingInspection = null;
    pendingInstallQueue = [];
    installReview.replaceChildren();
    installModal.hidden = true;
    confirmInstallButton.disabled = false;
  };
  const closeRepository = () => { repositoryModal.hidden = true; repositoryUrl.value = ""; repositorySubmit.disabled = false; };

  const requestOptionalHostPermission = async (url) => {
    const parsed = new URL(url);
    const origin = `${parsed.protocol}//${parsed.hostname}/*`;
    if (chrome.permissions?.contains && await chrome.permissions.contains({ origins: [origin] })) return true;
    if (!chrome.permissions?.request) return false;
    return chrome.permissions.request({ origins: [origin] });
  };
  const hasOptionalHostPermission = async (url) => {
    try {
      const parsed = new URL(url);
      const origin = `${parsed.protocol}//${parsed.hostname}/*`;
      return chrome.permissions?.contains ? chrome.permissions.contains({ origins: [origin] }) : false;
    } catch { return false; }
  };

  const normalizeMarketItems = (value, sourceUrl) => {
    const raw = Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
    return raw.slice(0, 200).map((item) => {
      if (!item || typeof item !== "object") return null;
      const repository = typeof item.repository === "string" && /^https:\/\/(?:www\.)?(?:github\.com|gitlab\.com)\//i.test(item.repository) ? item.repository : "";
      const packageUrl = typeof item.packageUrl === "string" && /^https:\/\//i.test(item.packageUrl) ? item.packageUrl : "";
      if (!item.id || !item.name || !item.version || !item.type || (!repository && !packageUrl)) return null;
      return {
        id: String(item.id).slice(0, 49), name: String(item.name).slice(0, 100), version: String(item.version).slice(0, 30),
        type: item.type === "dependency" ? "dependency" : item.type === "module" ? "module" : null, description: String(item.description || "暂无描述").slice(0, 300),
        author: String(item.author || "未知作者").slice(0, 100), repository, packageUrl, packagePath: String(item.packagePath || "").slice(0, 300), sourceUrl,
        stars: Number(item.stars) || 0, downloadCount: Number(item.downloadCount) || 0, createdAt: String(item.createdAt || ""), updatedAt: String(item.updatedAt || "")
      };
    }).filter(Boolean);
  };

  const renderMarketItems = (items, title = "搜索结果") => {
    if (!items.length) { marketResults.replaceChildren(textNode("div", "empty-state", "没有找到匹配的公开包。请换个关键词或检查自定义源格式。")); return; }
    marketResults.replaceChildren(textNode("p", "market-result-label", `${title} · ${items.length} 个结果`), ...items.map((item) => {
      const card = document.createElement("article"); card.className = "market-card";
      const info = document.createElement("div"); info.className = "market-card-info";
      const titleRow = document.createElement("div"); titleRow.className = "module-title-row";
      titleRow.append(textNode("h3", "", item.name), textNode("span", "module-version", `v${item.version}`), textNode("span", "status-badge badge-info", item.type === "dependency" ? "依赖" : item.type === "module" ? "模块" : "类型待确认"));
      const stats = [item.updatedAt && `更新 ${new Date(item.updatedAt).toLocaleDateString("zh-CN")}`, item.createdAt && `发布 ${new Date(item.createdAt).toLocaleDateString("zh-CN")}`, `Star ${Number(item.stars || 0).toLocaleString("zh-CN")}`, item.downloadCount != null && item.downloadCount > 0 ? `下载 ${Number(item.downloadCount).toLocaleString("zh-CN")}` : "下载暂无数据"].filter(Boolean).join(" · ");
      info.append(titleRow, textNode("p", "module-description", item.description), textNode("p", "module-meta", `作者：${item.author}${stats ? ` · ${stats}` : ""}`));
      const actions = document.createElement("div"); actions.className = "market-card-actions";
      const action = document.createElement("button"); action.type = "button"; action.className = "primary-button"; action.textContent = "安装";
      action.addEventListener("click", async () => {
        action.disabled = true;
        try {
          if (item.packageUrl && !await requestOptionalHostPermission(item.packageUrl)) throw new Error("未获得访问该来源的浏览器权限");
          const file = item.packageUrl ? await KivowikiModsStore.fetchPackageUrl(item.packageUrl, { registry: item.sourceUrl || "market" }) : await KivowikiModsStore.fetchRepositoryPackage(item.repository, item.packagePath || "");
          await inspectImportFile(file, item.type || marketTypeInput.value || null);
        } catch (error) { showToast(`市场安装失败：${error.message}`); action.disabled = false; }
      });
      actions.append(action);
      if (item.repository) {
        const link = document.createElement("a"); link.className = "outline-button market-repository-link"; link.href = item.repository; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = "查看仓库";
        actions.append(link);
      }
      card.append(info, actions); return card;
    }));
  };

  const sortMarketItems = (items, sort) => items.slice().sort((left, right) => {
    if (sort === "stars") return Number(right.stars || 0) - Number(left.stars || 0);
    if (sort === "downloads") return Number(right.downloadCount || 0) - Number(left.downloadCount || 0);
    if (sort === "published") return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
    return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
  });

  const searchMarket = async ({ force = false, page = 1 } = {}) => {
    const query = marketSearchInput.value.trim();
    if (!query && !force) { showToast("请输入搜索关键词，或点击刷新查看社区项目"); marketSearchInput.focus(); return; }
    const requestId = ++marketRequestId;
    marketSearchButton.disabled = true;
    marketRefreshButton.disabled = true;
    marketResults.replaceChildren(textNode("div", "empty-state", "正在读取公开市场信息……"));
    try {
      const github = await KivowikiModsStore.discoverGitHubPackages({ query, type: marketTypeInput.value, sort: marketSortInput.value, page, limit: 12, refresh: force });
      const custom = [];
      for (const source of page === 1 ? (state.preferences?.marketSources || []) : []) {
        try {
          if (!await hasOptionalHostPermission(source)) continue;
          const result = await KivowikiModsStore.fetchRemoteJson(source);
          custom.push(...normalizeMarketItems(result.data, result.url));
        } catch (error) { console.warn("自定义市场源读取失败", source, error); }
      }
      if (requestId !== marketRequestId) return;
      const normalizedQuery = query.toLocaleLowerCase();
      const filtered = sortMarketItems([...custom, ...github.items].filter((item) => {
        const matchesQuery = `${item.name} ${item.id} ${item.description} ${item.author}`.toLocaleLowerCase().includes(normalizedQuery);
        return (!normalizedQuery || matchesQuery) && (!marketTypeInput.value || item.type === marketTypeInput.value || item.type == null);
      }), marketSortInput.value);
      marketPage = page;
      marketTotalPages = github.totalPages || 1;
      marketHasLoaded = true;
      marketPageLabel.textContent = `第 ${marketPage} / ${marketTotalPages} 页`;
      marketPrevButton.disabled = marketPage <= 1;
      marketNextButton.disabled = marketPage >= marketTotalPages;
      renderMarketItems(filtered, query ? "市场搜索" : "社区项目");
    } catch (error) { marketResults.replaceChildren(textNode("div", "empty-state", `市场搜索失败：${error.message}`)); }
    finally { marketSearchButton.disabled = false; marketRefreshButton.disabled = false; }
  };

  const autoLoadMarket = async () => {
    if (marketHasLoaded || state.preferences?.marketAutoLoad === false) return;
    marketSearchInput.value = "";
    const requestId = ++marketRequestId;
    marketSearchButton.disabled = true;
    marketRefreshButton.disabled = true;
    marketResults.replaceChildren(textNode("div", "empty-state", "正在验证 GitHub 社区项目……"));
    try {
      const result = await KivowikiModsStore.discoverGitHubPackages({ type: marketTypeInput.value, sort: marketSortInput.value, page: 1, limit: 12 });
      const custom = [];
      for (const source of state.preferences?.marketSources || []) {
        try {
          if (!await hasOptionalHostPermission(source)) continue;
          const sourceResult = await KivowikiModsStore.fetchRemoteJson(source);
          custom.push(...normalizeMarketItems(sourceResult.data, sourceResult.url));
        } catch (error) { console.warn("自定义市场源读取失败", source, error); }
      }
      if (requestId !== marketRequestId) return;
      marketPage = 1; marketTotalPages = result.totalPages || 1; marketHasLoaded = true;
      marketPageLabel.textContent = `第 1 / ${marketTotalPages} 页`; marketPrevButton.disabled = true; marketNextButton.disabled = marketTotalPages <= 1;
      renderMarketItems(sortMarketItems([...custom, ...result.items], marketSortInput.value), "社区项目");
    } catch (error) { marketResults.replaceChildren(textNode("div", "empty-state", `市场加载失败：${error.message}`)); }
    finally { marketSearchButton.disabled = false; marketRefreshButton.disabled = false; }
  };

  const renderSources = () => {
    const sources = state.preferences?.marketSources || [];
    marketSourceList.hidden = !sources.length;
    if (!sources.length) marketSourceList.replaceChildren(textNode("p", "empty-source", "尚未添加自定义源。"));
    if (sources.length) marketSourceList.replaceChildren(...sources.map((source) => {
      const row = document.createElement("div");
      row.className = "source-row";
      row.append(textNode("span", "", source));
      const remove = document.createElement("button");
      remove.className = "text-button remove-button";
      remove.type = "button";
      remove.textContent = "移除";
      remove.addEventListener("click", async () => {
        state.preferences.marketSources = sources.filter((item) => item !== source);
        await saveState();
        renderSources();
        showToast("自定义源已移除");
      });
      row.append(remove);
      return row;
    }));
  };

  const renderRecommendations = () => {
    const recommendations = Array.isArray(globalThis.KivowikiModsRecommendations)
      ? globalThis.KivowikiModsRecommendations.filter((item) => item && item.title && item.description)
      : [];
    recommendationSection.hidden = !recommendations.length;
    recommendationList.replaceChildren(...recommendations.map((item) => {
      const card = document.createElement("article");
      card.className = "recommendation-card";
      const info = document.createElement("div");
      info.append(textNode("h4", "", item.title), textNode("p", "", item.description));
      const source = item.repository || item.packageUrl;
      if (source) {
        const button = document.createElement("button");
        button.className = "outline-button";
        button.type = "button";
        button.textContent = "安装";
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            if (item.packageUrl && !await requestOptionalHostPermission(source)) throw new Error("未获得访问该来源的浏览器权限");
            const file = item.packageUrl
              ? await KivowikiModsStore.fetchPackageUrl(item.packageUrl, { registry: "recommendations" })
              : await KivowikiModsStore.fetchRepositoryPackage(item.repository);
            await inspectImportFile(file, item.type || null);
          } catch (error) { showToast(`推荐安装失败：${error.message}`); button.disabled = false; }
        });
        card.append(info, button);
      } else card.append(info);
      return card;
    }));
  };

  const renderInstallReview = (inspection) => {
    const { manifest, report } = inspection;
    const change = changeLabels[report.change] || "安装";
    installTitle.textContent = `${change}${manifest.type === "dependency" ? "依赖" : "模块"}“${manifest.name}”`;
    const summary = document.createElement("div");
    summary.className = "review-summary";
    summary.append(
      textNode("div", "review-module-name", manifest.name),
      textNode("div", "review-version", report.previousVersion ? `v${report.previousVersion} → v${manifest.version}` : `v${manifest.version}`),
      textNode("p", "review-description", manifest.description)
    );
    const identity = document.createElement("div");
    identity.className = "review-grid";
    const signatureTone = report.signature.status === "verified" ? "good" : report.signature.status === "invalid" ? "bad" : "warn";
    const items = [
      ["作者", manifest.author],
      ["发布者", manifest.publisher?.name || "未提供发布者身份"],
      ["数字签名", report.publisherStatus === "continuity-verified" ? "签名有效，且作者密钥与旧版一致" : report.signature.status === "verified" ? "签名有效，作者现实身份尚未认证" : report.signature.label, signatureTone],
      ["来源", manifest.source?.registry || manifest.source?.url || "本地文件，来源未认证"],
      ["审核", report.reviewStatus === "declared-approved" ? "包内声明已审核（非官方背书）" : "尚无审核声明", report.reviewStatus === "declared-approved" ? "warn" : "muted"],
      ["包类型", manifest.type === "dependency" ? "共享能力依赖" : "功能模块", manifest.type === "dependency" ? "good" : "warn"],
      ...(manifest.type === "module" ? [["运行模式", manifest.mode === "sandbox" ? "严格沙箱" : "页面增强模式", manifest.mode === "sandbox" ? "good" : "warn"]] : [])
    ];
    items.forEach(([label, value, tone]) => {
      const row = document.createElement("div");
      row.append(textNode("span", "review-label", label), textNode("strong", tone ? `tone-${tone}` : "", value));
      identity.append(row);
    });
    if (report.signature.fingerprint) identity.append(textNode("code", "fingerprint", `公钥指纹 ${report.signature.fingerprint}`));

    const permissionSection = document.createElement("section");
    permissionSection.className = "review-section";
    permissionSection.append(textNode("h3", "", "权限确认"), textNode("p", "review-help", "勾选表示允许模块使用该能力。必需权限无法取消，可选权限可以拒绝。"));
    const permissionList = document.createElement("div");
    permissionList.className = "permission-list";
    report.permissions.forEach((permission) => {
      const label = document.createElement("label");
      label.className = `permission-item risk-${permission.risk}`;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = permission.known !== false;
      input.disabled = !permission.optional || permission.known === false;
      input.dataset.permission = permission.id;
      const copy = document.createElement("span");
      copy.append(textNode("strong", "", `${permission.title}${permission.optional ? "（可选）" : "（必需）"}`), textNode("small", "", permission.description), textNode("small", "permission-reason", `用途：${permission.reason}`));
      label.append(input, copy);
      permissionList.append(label);
    });
    permissionSection.append(permissionList);
    if (!report.permissions.length) permissionList.append(textNode("p", "review-help", "依赖没有独立权限开关。页面模式下它与调用模块处于同一页面环境，仍需确认代码来源；严格沙箱下继续受浏览器隔离限制。"));

    const prerequisites = document.createElement("section");
    prerequisites.className = "review-section";
    const requiredDependencies = Object.entries(manifest.dependencies || {});
    const optionalDependencies = Object.entries(manifest.optionalDependencies || {});
    prerequisites.append(textNode("h3", "", "前置依赖"));
    if (!requiredDependencies.length && !optionalDependencies.length) {
      prerequisites.append(textNode("p", "review-help", "该包没有声明前置依赖。"));
    } else {
      prerequisites.append(textNode("p", "review-help", "安装后只有满足版本范围的依赖才会参与运行；缺失依赖不会静默安装。"));
      [...requiredDependencies.map(([id, range]) => [id, range, false]), ...optionalDependencies.map(([id, range]) => [id, range, true])].forEach(([id, range, optional]) => {
        prerequisites.append(textNode("div", `prerequisite-item${optional ? " prerequisite-optional" : ""}`, `${id} ${range}${optional ? "（可选）" : "（必需）"}`));
      });
    }

    const warnings = [
      ...(report.compatibility ? [{ severity: "high", title: "版本不兼容", detail: report.compatibility }] : []),
      ...report.dependencyReasons.map((detail) => ({ severity: "high", title: "依赖或冲突问题", detail })),
      ...report.findings
    ];
    const audit = document.createElement("section");
    audit.className = "review-section";
    audit.append(textNode("h3", "", `自动预检 ${warnings.length ? `发现 ${warnings.length} 项` : "未发现明显风险"}`));
    if (warnings.length) {
      warnings.forEach((finding) => {
        const item = document.createElement("div");
        item.className = `finding finding-${finding.severity}`;
        item.append(textNode("strong", "", finding.title), textNode("span", "", finding.detail));
        audit.append(item);
      });
    } else audit.append(textNode("p", "review-help", "自动扫描只用于辅助判断，不能代替人工代码审核。"));
    if (report.signature.status === "invalid") audit.append(textNode("p", "advisory-notice", "签名异常仅作为风险提示；仍可由你自行决定安装。"));
    if (report.compatibility || report.dependencyReasons.length) audit.append(textNode("p", "advisory-notice", "可以继续安装，但相关条件满足前，管理器会暂缓运行此模块或受影响模块。"));
    audit.append(textNode("p", "risk-notice", "第三方模块由其作者提供。管理器仅展示检查结果并实施能力边界，不保证模块安全性、真实性或可用性；继续安装表示你愿意自行承担使用风险。"));
    installReview.replaceChildren(summary, identity, prerequisites, permissionSection, audit);
    installModal.hidden = false;
  };

  const reviewNextInstallation = () => {
    pendingInspection = pendingInstallQueue.shift() || null;
    if (!pendingInspection) {
      installModal.hidden = true;
      render();
      return;
    }
    confirmInstallButton.disabled = false;
    renderInstallReview(pendingInspection);
  };

  const renderLogs = () => {
    const level = logFilter.value;
    const logs = runtimeLogs.filter((item) => !level || item.level === level).slice().reverse();
    if (!logs.length) { panelContent.replaceChildren(textNode("div", "empty-state", "当前没有匹配的运行日志。")); return; }
    panelContent.replaceChildren(...logs.map((log) => {
      const row = document.createElement("article");
      row.className = `log-row log-${log.level}`;
      const time = new Date(log.time);
      row.append(textNode("time", "", Number.isNaN(time.getTime()) ? log.time : time.toLocaleString("zh-CN")), textNode("strong", "", log.moduleId), textNode("span", "log-event", log.event), textNode("p", "", log.message));
      return row;
    }));
  };

  const openLogs = () => {
    panelTitle.textContent = "运行日志";
    document.querySelector(".panel-toolbar").hidden = false;
    renderLogs();
    panelModal.hidden = false;
  };

  const openHistory = async (module) => {
    panelTitle.textContent = `${module.name} 版本历史`;
    document.querySelector(".panel-toolbar").hidden = true;
    panelContent.replaceChildren(textNode("p", "config-loading-inline", "正在读取版本历史"));
    panelModal.hidden = false;
    try {
      const storageId = KivowikiModsStore.storageIdFor(module);
      const revisions = await KivowikiModsStore.getRevisions(storageId);
      if (!revisions.length) { panelContent.replaceChildren(textNode("div", "empty-state", "还没有可回滚的旧版本。每次升级或重装前会自动保留一个版本。")); return; }
      panelContent.replaceChildren(...revisions.map((revision) => {
        const row = document.createElement("article");
        row.className = "history-row";
        const date = new Date(revision.createdAt);
        const copy = document.createElement("div");
        copy.append(textNode("strong", "", `v${revision.version}`), textNode("small", "", Number.isNaN(date.getTime()) ? revision.createdAt : date.toLocaleString("zh-CN")));
        const button = textNode("button", "outline-button", "回滚到此版本");
        button.type = "button";
        button.addEventListener("click", async () => {
          if (!window.confirm(`确定将“${module.name}”回滚到 v${revision.version} 吗？当前版本也会保留在历史中。`)) return;
          button.disabled = true;
          try {
            const restored = await KivowikiModsStore.rollback(storageId, revision.key, getExactPackage(module));
            const key = module.type === "dependency" ? "dependencies" : "imported";
            state[key] = state[key].map((item) => KivowikiModsPlatform.packageKey(item) === KivowikiModsPlatform.packageKey(module) ? restored : item);
            rebuildLockfile();
            await saveState();
            panelModal.hidden = true;
            render();
            showToast(`已回滚到 v${revision.version}`);
          } catch (error) { showToast(`回滚失败：${error.message}`); button.disabled = false; }
        });
        row.append(copy, button);
        return row;
      }));
    } catch (error) { panelContent.replaceChildren(textNode("div", "empty-state", `历史读取失败：${error.message}`)); }
  };

  const openConfig = async (module) => {
    if (!module.config) return;
    closeConfig();
    const settings = module.builtin ? state.modules[module.id]?.settings : module.settings;
    configTitle.textContent = `${module.name} 配置`;
    loading.textContent = "正在加载";
    loading.hidden = false;
    modal.hidden = false;
    modal.setAttribute("aria-busy", "true");
    const token = `${module.id}-${crypto.randomUUID()}`;
    const runtime = {
      token,
      module,
      ready: false,
      timeout: null,
      send(message) { frame.contentWindow?.postMessage({ source: "kivo-plus-config-host", token, ...message }, "*"); }
    };
    const queryLocalFonts = async () => {
      if (typeof window.queryLocalFonts !== "function") return [];
      const fonts = await window.queryLocalFonts();
      const unique = new Map();
      fonts.forEach((font) => {
        const family = String(font.family || font.fullName || "").slice(0, 160);
        if (!family || unique.has(family)) return;
        unique.set(family, {
          family,
          fullName: String(font.fullName || family).slice(0, 160),
          postscriptName: String(font.postscriptName || "").slice(0, 160)
        });
      });
      return [...unique.values()].slice(0, 500);
    };
    runtime.onMessage = async (event) => {
      if (event.source !== frame.contentWindow || event.data?.source !== "kivo-plus-config" || event.data.token !== token) return;
      const message = event.data;
      if (message.type === "ready") {
        runtime.ready = true;
        clearTimeout(runtime.timeout);
        loading.hidden = true;
        modal.setAttribute("aria-busy", "false");
        return;
      }
      if (message.type === "save-settings") {
        const settings = message.settings && typeof message.settings === "object" ? message.settings : {};
        if (module.builtin) state.modules[module.id] = { ...(state.modules[module.id] || {}), settings };
        else state.imported = state.imported.map((item) => item.id === module.id ? { ...item, settings } : item);
        try {
          await saveState();
          showToast("配置已保存");
          runtime.send({ type: "settings-result", requestId: message.requestId, ok: true });
        } catch (error) {
          showToast(`配置保存失败：${error.message}`);
          runtime.send({ type: "settings-result", requestId: message.requestId, ok: false, error: error.message });
        }
      }
      if (message.type === "local-fonts") {
        try {
          runtime.send({ type: "local-fonts-result", requestId: message.requestId, ok: true, data: await queryLocalFonts() });
        } catch (error) {
          runtime.send({ type: "local-fonts-result", requestId: message.requestId, ok: false, error: error.message || "本机字体读取失败" });
        }
      }
      if (message.type === "asset-get-text") {
        try {
          const data = module.builtin ? await globalThis.KivowikiModsStore.getExtensionText(message.path) : await globalThis.KivowikiModsStore.getText(module.id, message.path);
          runtime.send({ type: "asset-result", requestId: message.requestId, ok: true, data });
        } catch (error) { runtime.send({ type: "asset-result", requestId: message.requestId, ok: false, error: error.message }); }
      }
      if (message.type === "asset-get-file") runtime.send({ type: "asset-result", requestId: message.requestId, ok: false, error: "配置页不支持读取二进制资源" });
      if (message.type === "user-asset-put") {
        try {
          const data = await KivowikiModsStore.putUserAsset(module.id, message.slot, message.file);
          runtime.send({ type: "user-asset-result", requestId: message.requestId, ok: true, data });
        } catch (error) { runtime.send({ type: "user-asset-result", requestId: message.requestId, ok: false, error: error.message }); }
      }
      if (message.type === "user-asset-delete") {
        try {
          await KivowikiModsStore.deleteUserAsset(module.id, message.slot);
          runtime.send({ type: "user-asset-result", requestId: message.requestId, ok: true, data: null });
        } catch (error) { runtime.send({ type: "user-asset-result", requestId: message.requestId, ok: false, error: error.message }); }
      }
      if (message.type === "error") {
        clearTimeout(runtime.timeout);
        loading.hidden = false;
        modal.setAttribute("aria-busy", "false");
        loading.textContent = `配置页面加载失败：${message.message || "未知错误"}`;
        showToast(`配置页面加载失败：${message.message || "未知错误"}`);
      }
      if (message.type === "log") chrome.runtime.sendMessage({ type: "runtime-log", moduleId: module.id, level: message.level, event: "config", message: message.message }).catch(() => {});
    };
    configRuntime = runtime;
    window.addEventListener("message", runtime.onMessage);
    frame.onload = async () => {
      try {
        if (configRuntime !== runtime) return;
        const code = module.builtin ? await globalThis.KivowikiModsStore.getExtensionText(module.config) : await globalThis.KivowikiModsStore.getText(module.id, module.config);
        if (typeof code !== "string") throw new Error("配置文件不存在");
        let localFonts = [];
        try {
          // Local Font Access 只能在配置宿主页可靠调用，sandbox iframe 通常没有
          // 顶层权限；将字体名称作为初始化快照传给配置模块，不传字体文件内容。
          localFonts = await queryLocalFonts();
        } catch {
          // 用户拒绝字体权限或浏览器不支持时，配置模块会使用 FontFaceSet 候选检测。
        }
        runtime.send({
          type: "init-config",
          id: module.id,
          code,
          settings: settings || {},
          localFonts,
          permissions: ["settings", "assets"],
          platform: KivowikiModsPlatform.publicApi,
          site: { hostname: "kivo.wiki", pathname: "/" }
        });
      } catch (error) {
        loading.textContent = `配置加载失败：${error.message}`;
        modal.setAttribute("aria-busy", "false");
        runtime.timeout = null;
      }
    };
    frame.onerror = () => {
      loading.textContent = "配置页面无法打开";
      modal.setAttribute("aria-busy", "false");
    };
    frame.hidden = false;
    frame.src = `${chrome.runtime.getURL("sandbox.html")}#config-${encodeURIComponent(token)}`;
    runtime.timeout = setTimeout(() => {
      if (configRuntime !== runtime || runtime.ready) return;
      loading.textContent = "配置页面响应超时，请关闭后重试";
    }, 8000);
  };

  const getImportedModule = (id) => state.imported.find((item) => item.id === id);
  const getImportedDependency = (id) => state.dependencies.find((item) => item.id === id);
  const getImportedPackage = (id) => getImportedModule(id) || getImportedDependency(id);
  const getExactPackage = (module) => module.type === "dependency"
    ? state.dependencies.find((item) => KivowikiModsPlatform.packageKey(item) === KivowikiModsPlatform.packageKey(module))
    : state.imported.find((item) => item.id === module.id);
  const rebuildLockfile = (selectLatest = false) => {
    state.lockfile = KivowikiModsPlatform.createLockfile(state.imported, [...builtinDependencies, ...state.dependencies], selectLatest ? null : state.lockfile);
  };

  const enqueueMissingDependencies = async (inspections) => {
    const queue = [...inspections];
    const available = [...builtinDependencies, ...state.dependencies];
    const scheduled = new Set(queue.filter((item) => item.manifest.type === "dependency").map((item) => KivowikiModsPlatform.packageKey(item.manifest)));
    for (let index = 0; index < queue.length; index += 1) {
      const inspection = queue[index];
      const relations = { ...(inspection.manifest.dependencies || {}), ...(inspection.manifest.optionalDependencies || {}) };
      for (const [id, range] of Object.entries(relations)) {
        if (available.some((item) => item.id === id && item.enabled !== false && KivowikiModsPlatform.satisfies(item.version, range))) continue;
        const repository = inspection.manifest.dependencySources?.[id];
        if (!repository) continue;
        const file = await KivowikiModsStore.fetchRepositoryPackage(repository);
        const dependency = await KivowikiModsStore.inspectPackage(file, [...modules, ...builtinDependencies].map((item) => item.id), state.imported, [...available, ...queue.filter((item) => item.manifest.type === "dependency").map((item) => item.manifest)]);
        if (dependency.manifest.type !== "dependency" || dependency.manifest.id !== id) throw new Error(`仓库没有提供声明的依赖 ${id}`);
        if (!KivowikiModsPlatform.satisfies(dependency.manifest.version, range)) throw new Error(`自动下载的 ${id} v${dependency.manifest.version} 不符合 ${range}`);
        const key = KivowikiModsPlatform.packageKey(dependency.manifest);
        if (!scheduled.has(key)) {
          scheduled.add(key);
          queue.unshift(dependency);
          available.push(dependency.manifest);
          index = -1;
          break;
        }
      }
    }
    const queuedDependencies = queue.filter((item) => item.manifest.type === "dependency").map((item) => ({ ...item.manifest, enabled: true }));
    const queuedModules = queue.filter((item) => item.manifest.type === "module").map((item) => ({ ...item.manifest, enabled: true }));
    const resolution = KivowikiModsPlatform.resolveModules(
      [...state.imported.filter((item) => !queuedModules.some((candidate) => candidate.id === item.id)), ...queuedModules],
      [...builtinDependencies, ...state.dependencies.filter((item) => !queuedDependencies.some((candidate) => KivowikiModsPlatform.packageKey(candidate) === KivowikiModsPlatform.packageKey(item))), ...queuedDependencies],
      state.lockfile
    );
    for (const inspection of queue) if (inspection.manifest.type === "module") {
      inspection.report.dependencyReasons = resolution.status[inspection.manifest.id]?.reasons || [];
    }
    return queue;
  };

  const exportModules = async (items) => {
    if (!items.length) { showToast("没有可导出的社区包"); return; }
    const backup = await globalThis.KivowikiModsStore.exportBackup(items);
    const name = items.length === 1 ? `kivowiki-mods-${items[0].id}.json` : "kivowiki-mods-backup.json";
    downloadJson(name, backup);
    showToast(items.length === 1 ? `“${items[0].name}”备份已导出` : `已导出 ${items.length} 个包`);
  };

  const render = () => {
    safeModeInput.checked = state.preferences?.safeMode === true;
    safeModeLabel.textContent = safeModeInput.checked ? "已开启" : "关闭";
    crashIsolationInput.checked = state.preferences?.crashIsolation !== false;
    crashIsolationLabel.textContent = crashIsolationInput.checked ? "已开启" : "关闭";
    managerTabVisibleInput.checked = state.preferences?.managerTabVisible !== false;
    managerTabVisibleLabel.textContent = managerTabVisibleInput.checked ? "已显示" : "已隐藏";
    marketAutoLoadInput.checked = state.preferences?.marketAutoLoad !== false;
    marketAutoLoadLabel.textContent = marketAutoLoadInput.checked ? "已开启" : "已关闭";
    const query = searchInput.value.trim().toLocaleLowerCase();
    const dependencyQuery = dependencySearchInput.value.trim().toLocaleLowerCase();
    const allDependencies = [
      ...builtinDependencies.map((dependency) => ({ ...dependency, builtin: true, type: "dependency" })),
      ...(state.dependencies || []).map((dependency) => ({ ...dependency, builtin: false, type: "dependency" }))
    ];
    const resolution = KivowikiModsPlatform.resolveModules(state.imported || [], allDependencies, state.lockfile);
    const installedModules = [
      ...modules.map((module) => ({ ...module, builtin: true })),
      ...(Array.isArray(state.imported) ? state.imported : []).map((module) => ({ ...module, builtin: false }))
    ].filter((module) => !query || `${module.name} ${module.id}`.toLocaleLowerCase().includes(query));
    const installedDependencies = allDependencies.filter((dependency) => !dependencyQuery || `${dependency.name} ${dependency.id}`.toLocaleLowerCase().includes(dependencyQuery));
    moduleCount.textContent = `${installedModules.length}`;
    dependencyCount.textContent = `${installedDependencies.length}`;
    document.getElementById("nav-module-count").textContent = `${installedModules.length}`;
    document.getElementById("nav-dependency-count").textContent = `${installedDependencies.length}`;
    const imported = state.imported || [];
    document.getElementById("health-running").textContent = String(modules.filter((module) => state.modules[module.id]?.enabled !== false).length + imported.filter((module) => resolution.status[module.id]?.runnable).length);
    document.getElementById("health-attention").textContent = String(imported.filter((module) => module.enabled !== false && !resolution.status[module.id]?.runnable).length);
    document.getElementById("health-trusted").textContent = String(modules.length + builtinDependencies.length + [...imported, ...(state.dependencies || [])].filter((item) => item.trust?.publisher === "continuity-verified").length);
    document.getElementById("log-count").textContent = String(runtimeLogs.filter((log) => log.level === "error" || log.level === "warn").length);
    const renderPackageList = (items, target, type) => {
      if (!items.length) {
        const empty = textNode("div", "empty-state", type === "dependency" ? (dependencyQuery ? "没有匹配的依赖。" : "暂时没有可用依赖。") : (query ? "没有匹配的模块。" : "暂时没有可用模块。"));
        target.replaceChildren(empty);
        return;
      }
      target.replaceChildren(...items.map((module) => {
      const isDependency = type === "dependency";
      const config = module.builtin ? (isDependency ? { enabled: true, settings: {} } : state.modules[module.id] || { enabled: true, settings: {} }) : module;
      const card = document.createElement("article");
      card.className = "module-card";
      const info = document.createElement("div");
      info.className = "module-info";
      const titleRow = document.createElement("div");
      titleRow.className = "module-title-row";
      const title = document.createElement("h3");
      title.textContent = module.name;
      const version = document.createElement("span");
      version.className = "module-version";
      version.textContent = `v${module.version}`;
      titleRow.append(title, version);
      info.append(titleRow);
      const description = document.createElement("p");
      description.className = "module-description";
      description.textContent = module.description || "暂无描述";
      info.append(description);
      const meta = document.createElement("div");
      meta.className = "module-meta";
      meta.textContent = `作者：${module.author || (isDependency ? "社区依赖" : "社区模块")}`;
      if (!module.builtin) meta.append(` · ${module.fileCount || 1} 个文件${module.packageSize ? ` · ${formatSize(module.packageSize)}` : ""}${isDependency ? "" : ` · ${state.preferences?.safeMode || module.mode === "sandbox" ? "严格沙箱" : "页面模式"}`}`);
      info.append(meta);
      const badges = document.createElement("div");
      badges.className = "module-badges";
      const moduleStatus = isDependency
        ? resolution.dependencyStatus[KivowikiModsPlatform.packageKey(module)] || { state: "blocked", reasons: ["状态无法解析"] }
        : module.builtin ? { state: config.enabled === false ? "disabled" : "ready", reasons: [] } : resolution.status[module.id] || { state: "blocked", reasons: ["状态无法解析"] };
      const addBadge = (text, tone) => badges.append(textNode("span", `status-badge badge-${tone}`, text));
      addBadge(statusLabels[moduleStatus.state] || "状态未知", moduleStatus.state === "ready" ? "good" : moduleStatus.state === "disabled" ? "muted" : "bad");
      if (module.builtin) addBadge("官方内置", "good");
      else if (module.trust?.publisher === "continuity-verified") addBadge("作者密钥已延续", "good");
      else if (module.trust?.status === "verified") addBadge("自签名有效", "info");
      else if (module.trust?.status === "invalid") addBadge("签名异常", "warn");
      else addBadge("未签名", "muted");
      if (!module.builtin && module.review?.status === "approved") addBadge("声明已审核", "info");
      const pageRuntimeUnavailable = !module.builtin
        && module.mode !== "sandbox"
        && state.preferences?.safeMode !== true
        && pageRuntimeStatus.available === false;
      if (pageRuntimeUnavailable) addBadge("页面运行未启用", "bad");
      info.append(badges);
      if (moduleStatus.reasons?.length) info.append(textNode("p", "module-warning", moduleStatus.reasons.join("；")));
      if (pageRuntimeUnavailable) info.append(textNode("p", "module-warning", pageRuntimeStatus.error || "请在扩展详情中开启“允许用户脚本”，然后刷新扩展和 KivoWiki 页面。"));
      if (moduleStatus.warnings?.length) info.append(textNode("p", "module-advisory", moduleStatus.warnings.join("；")));
      const permissionDetails = document.createElement("details");
      permissionDetails.className = "module-details";
      const permissions = isDependency ? [] : KivowikiModsPlatform.normalizePermissions(module.permissions, module.mode);
      permissionDetails.append(textNode("summary", "", isDependency ? "依赖详情" : `权限与依赖 · ${permissions.length} 项权限`));
      const detailsText = permissions.map((permission) => permission.title).join("、") || "无额外权限";
      const dependencies = Object.entries(module.dependencies || {}).map(([id, range]) => `${id} ${range}`).join("、");
      const source = module.builtin ? "扩展内置" : module.source?.registry || module.source?.url || "本地文件，未认证";
      const review = module.builtin ? "官方内置审核" : module.review?.status === "approved" ? `包内声明已审核${module.review.reviewer ? `（${module.review.reviewer}）` : ""}` : "无审核声明";
      const dependents = state.imported.filter((item) => item.dependencies?.[module.id] && KivowikiModsPlatform.satisfies(module.version, item.dependencies[module.id])).map((item) => item.name).join("、");
      if (!isDependency) permissionDetails.append(textNode("p", "", `权限：${detailsText}`), textNode("p", "", `依赖：${dependencies || "无"}`));
      else permissionDetails.append(textNode("p", "", `被以下模块使用：${dependents || "暂无"}`));
      permissionDetails.append(textNode("p", "", `来源：${source}`), textNode("p", "", `审核：${review}`));
      info.append(permissionDetails);
      card.append(info);
      const actions = document.createElement("div");
      actions.className = "module-card-actions";
      if (!isDependency && module.config) {
        const configButton = document.createElement("button");
        configButton.className = "text-button";
        configButton.type = "button";
        configButton.textContent = "配置";
        configButton.title = `配置${module.name}`;
        configButton.addEventListener("click", () => openConfig(module));
        actions.append(configButton);
      }
      if (!module.builtin) {
        if (module.source?.repository || module.source?.url) {
          const updateButton = document.createElement("button");
          updateButton.className = "text-button";
          updateButton.type = "button";
          updateButton.textContent = module.update?.status === "available" ? `安装 v${module.update.latestVersion}` : "检查更新";
          updateButton.addEventListener("click", async () => {
            updateButton.disabled = true;
            try {
              const current = getExactPackage(module);
              const result = current.update?.status === "available" && current.update.inspection
                ? current.update
                : await KivowikiModsStore.checkForUpdate(current, [...modules, ...builtinDependencies].map((item) => item.id), state.imported, [...builtinDependencies, ...state.dependencies]);
              if (result.status === "available") {
                pendingInstallQueue = await enqueueMissingDependencies([result.inspection]);
                reviewNextInstallation();
              } else showToast(`${module.name} 已是最新版本`);
            } catch (error) { showToast(`更新检查失败：${error.message}`); }
            finally { updateButton.disabled = false; }
          });
          actions.append(updateButton);
        }
        const historyButton = document.createElement("button");
        historyButton.className = "text-button";
        historyButton.type = "button";
        historyButton.textContent = "版本历史";
        historyButton.addEventListener("click", () => openHistory(module));
        actions.append(historyButton);
        const exportButton = document.createElement("button");
        exportButton.className = "text-button";
        exportButton.type = "button";
        exportButton.textContent = "导出";
        exportButton.title = `导出${module.name}及其配置`;
        exportButton.addEventListener("click", () => exportModules([getExactPackage(module)]).catch((error) => showToast(`导出失败：${error.message}`)));
        actions.append(exportButton);
      }
      const label = document.createElement("label");
      label.className = "switch";
      label.title = `${config.enabled === false ? "启用" : "停用"}${module.name}`;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = config.enabled !== false && !module.quarantined;
      input.setAttribute("aria-label", module.name);
      const track = document.createElement("span");
      track.className = "switch-track";
      const switchLabel = document.createElement("span");
      switchLabel.className = "switch-label";
      switchLabel.textContent = module.quarantined ? "已隔离" : input.checked ? "已启用" : "已停用";
      label.append(input, track, switchLabel);
      input.addEventListener("change", async () => {
        const previousEnabled = config.enabled !== false;
         const previousModule = module.builtin ? null : structuredClone(getExactPackage(module));
        const collection = isDependency ? "dependencies" : "imported";
        if (module.builtin && !isDependency) state.modules[module.id] = { ...config, enabled: input.checked };
         else state[collection] = state[collection].map((item) => KivowikiModsPlatform.packageKey(item) === KivowikiModsPlatform.packageKey(module) ? {
          ...item,
          enabled: input.checked,
          quarantined: input.checked ? false : item.quarantined,
          quarantineReason: input.checked ? "" : item.quarantineReason,
          crashHistory: input.checked ? [] : item.crashHistory
        } : item);
        if (!module.builtin && !isDependency && input.checked) {
          const nextStatus = KivowikiModsPlatform.resolveModules(state.imported, [...builtinDependencies, ...state.dependencies], state.lockfile).status[module.id];
          if (!nextStatus?.runnable) {
            state[collection] = state[collection].map((item) => KivowikiModsPlatform.packageKey(item) === KivowikiModsPlatform.packageKey(module) ? previousModule : item);
            input.checked = previousEnabled && !previousModule.quarantined;
            switchLabel.textContent = previousModule.quarantined ? "已隔离" : input.checked ? "已启用" : "已停用";
            showToast(`无法启用：${nextStatus?.reasons?.join("；") || "模块状态异常"}`);
            return;
          }
        }
        switchLabel.textContent = input.checked ? "已启用" : "已停用";
        try {
          await saveState();
          showToast(`${module.name}已${input.checked ? "启用" : "停用"}`);
        } catch (error) {
          if (module.builtin && !isDependency) state.modules[module.id] = { ...config, enabled: previousEnabled };
           else state[collection] = state[collection].map((item) => KivowikiModsPlatform.packageKey(item) === KivowikiModsPlatform.packageKey(module) ? previousModule : item);
          input.checked = module.builtin ? previousEnabled : previousEnabled && !previousModule.quarantined;
          switchLabel.textContent = !module.builtin && previousModule.quarantined ? "已隔离" : input.checked ? "已启用" : "已停用";
          showToast(`状态保存失败：${error.message}`);
        }
      });
      if (!module.builtin || !isDependency) actions.append(label);
      else actions.append(textNode("span", "switch-label", "核心依赖"));
      if (!module.builtin) {
        const remove = document.createElement("button");
        remove.className = "text-button remove-button";
        remove.type = "button";
        remove.textContent = "移除";
        remove.title = `移除${module.name}`;
        remove.addEventListener("click", async () => {
          const dependents = state.imported.filter((item) => item.id !== module.id && item.dependencies?.[module.id]);
          const suffix = dependents.length ? `\n\n以下模块依赖它，也将无法运行：${dependents.map((item) => item.name).join("、")}` : "";
          if (!window.confirm(`确定移除“${module.name}”吗？${suffix}`)) return;
          try {
            const storageId = KivowikiModsStore.storageIdFor(module);
            await globalThis.KivowikiModsStore.deletePackage(storageId);
            await globalThis.KivowikiModsStore.deleteRevisions(storageId);
            if (!isDependency) await globalThis.KivowikiModsStore.deleteUserAssets(module.id);
            const stored = await chrome.storage.local.get(null);
            const moduleKeys = Object.keys(stored).filter((key) => key.startsWith(`module:${module.id}:`));
            if (moduleKeys.length) await chrome.storage.local.remove(moduleKeys);
            const collection = isDependency ? "dependencies" : "imported";
             state[collection] = state[collection].filter((item) => KivowikiModsPlatform.packageKey(item) !== KivowikiModsPlatform.packageKey(module));
             rebuildLockfile();
            await saveState();
            render();
            showToast(`${module.name}已移除`);
          } catch (error) { showToast(`移除失败：${error.message}`); }
        });
        actions.append(remove);
      }
      card.append(actions);
      return card;
      }));
    };
    renderPackageList(installedModules, list, "module");
    renderPackageList(installedDependencies, dependencyList, "dependency");
  };

  const load = async () => {
    const stored = await chrome.storage.local.get([STORAGE_KEY, "runtimeLogs", "kivoPlusUserScripts", "kivoPlusUserScriptsError"]);
    state = stored[STORAGE_KEY] || state;
    runtimeLogs = Array.isArray(stored.runtimeLogs) ? stored.runtimeLogs : [];
    pageRuntimeStatus = {
      available: typeof stored.kivoPlusUserScripts === "boolean" ? stored.kivoPlusUserScripts : null,
      error: String(stored.kivoPlusUserScriptsError || "")
    };
    // 打开管理器时主动让后台重新核验动态脚本。这样用户刚开启浏览器的
    // “允许用户脚本”后，不必等待下一次浏览器启动才恢复页面模块。
    const latestRuntimeStatus = await chrome.runtime.sendMessage({ type: "page-runtime-status" }).catch(() => null);
    if (latestRuntimeStatus) {
      pageRuntimeStatus = {
        available: latestRuntimeStatus.available === true,
        error: String(latestRuntimeStatus.error || "")
      };
    }
    state.modules = state.modules && typeof state.modules === "object" ? state.modules : {};
    state.imported = Array.isArray(state.imported) ? state.imported : [];
    state.dependencies = Array.isArray(state.dependencies) ? state.dependencies : [];
    state.preferences = state.preferences && typeof state.preferences === "object" ? state.preferences : {};
    state.preferences.marketSources = Array.isArray(state.preferences.marketSources)
      ? state.preferences.marketSources.filter((item) => typeof item === "string").slice(0, 20)
      : [];
    state.lockfile = state.lockfile && typeof state.lockfile === "object" ? state.lockfile : null;
    state.preferences.crashIsolation = state.preferences.crashIsolation !== false;
    state.imported = state.imported.map((item) => {
      const permissions = KivowikiModsPlatform.normalizePermissions(item.permissions, item.mode).map(({ id, reason, optional }) => ({ id, reason, optional }));
      const declared = permissions.filter((permission) => permission.known !== false).map((permission) => permission.id);
      return {
        ...item,
        type: "module",
        manifestVersion: item.manifestVersion || 1,
        permissions,
        grantedPermissions: Array.isArray(item.grantedPermissions) ? item.grantedPermissions.filter((id) => declared.includes(id)) : declared,
        dependencies: item.dependencies || {},
        optionalDependencies: item.optionalDependencies || {},
        conflicts: item.conflicts || {},
        crashHistory: Array.isArray(item.crashHistory) ? item.crashHistory : []
      };
    });
    state.dependencies = state.dependencies.map((item) => ({
      ...item,
      type: "dependency",
      storageId: item.storageId || item.id,
      packageKey: KivowikiModsPlatform.packageKey(item),
      permissions: [],
      dependencies: item.dependencies || {},
      optionalDependencies: item.optionalDependencies || {},
      conflicts: item.conflicts || {}
    }));
    for (const item of [...state.imported, ...state.dependencies]) {
      if (typeof item.code !== "string" || !item.code.trim()) continue;
      await globalThis.KivowikiModsStore.putText(item.id, item.entry || "index.js", item.code);
      item.entry = item.entry || "index.js";
      item.filePaths = [...new Set([...(item.filePaths || []), item.entry])];
      delete item.code;
    }
    modules.forEach((module) => {
      state.modules[module.id] = { enabled: state.modules[module.id]?.enabled ?? true, settings: { ...module.defaultSettings, ...(state.modules[module.id]?.settings || {}) } };
    });
    rebuildLockfile();
    await saveState();
    render();
    renderSources();
    renderRecommendations();
  };

  const inspectImportFile = async (file, expectedType = null) => {
    const forbiddenIds = [...modules, ...builtinDependencies].map((item) => item.id);
    const installedDependencies = [...builtinDependencies, ...state.dependencies];
    let inspections;
    if (Array.isArray(file) || (file && typeof file !== "string" && typeof file[Symbol.iterator] === "function" && !(file instanceof Blob))) {
      inspections = [await KivowikiModsStore.inspectPackage(file, forbiddenIds, state.imported, installedDependencies)];
    } else if (/\.zip$/i.test(file.name) || file.type === "application/zip") {
      inspections = [await KivowikiModsStore.inspectPackage(file, forbiddenIds, state.imported, installedDependencies)];
    } else {
      const raw = JSON.parse(await file.text());
      inspections = raw?.format === "kivowiki-mods-backup"
        ? await KivowikiModsStore.inspectBackup(file, forbiddenIds, state.imported, installedDependencies)
        : [await KivowikiModsStore.inspectPackage(file, forbiddenIds, state.imported, installedDependencies)];
    }
    if (expectedType && inspections.some((inspection) => inspection.manifest.type !== expectedType)) {
      throw new Error(`所选入口只接受${expectedType === "dependency" ? "依赖" : "模块"}包`);
    }
    pendingInstallQueue = await enqueueMissingDependencies(inspections);
    reviewNextInstallation();
  };

  const inspectImportFolder = async (files, expectedType = null) => {
    if (!files?.length) return;
    try { await inspectImportFile(files, expectedType); }
    catch (error) { showToast(`文件夹导入失败：${error.message}`); }
  };

  document.getElementById("import-button").addEventListener("click", () => { importTarget = "module"; document.getElementById("import-file").click(); });
  document.getElementById("import-dependency-button").addEventListener("click", () => { importTarget = "dependency"; document.getElementById("import-file").click(); });
  document.getElementById("import-folder-button").addEventListener("click", () => { importTarget = "module"; folderInput.click(); });
  dependencyFolderButton.addEventListener("click", () => { importTarget = "dependency"; folderInput.click(); });
  document.getElementById("import-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try { await inspectImportFile(file, importTarget); }
    catch (error) { showToast(`导入失败：${error.message}`); }
  });
  folderInput.addEventListener("change", async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    await inspectImportFolder(files, importTarget);
  });
  document.getElementById("export-all-button").addEventListener("click", () => exportModules(state.imported).catch((error) => showToast(`导出失败：${error.message}`)));
  document.getElementById("check-all-updates").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    const packages = [...state.imported, ...state.dependencies].filter((item) => item.source?.repository || item.source?.url);
    let available = 0;
    let failed = 0;
    for (const item of packages) {
      try {
        const result = await KivowikiModsStore.checkForUpdate(item, [...modules, ...builtinDependencies].map((entry) => entry.id), state.imported, [...builtinDependencies, ...state.dependencies]);
        const update = result.status === "available" ? { status: "available", latestVersion: result.latestVersion, checkedAt: new Date().toISOString() } : { status: "current", checkedAt: new Date().toISOString() };
        const collection = item.type === "dependency" ? "dependencies" : "imported";
        state[collection] = state[collection].map((entry) => KivowikiModsPlatform.packageKey(entry) === KivowikiModsPlatform.packageKey(item) ? { ...entry, update } : entry);
        if (result.status === "available") available += 1;
      } catch { failed += 1; }
    }
    await saveState();
    render();
    showToast(`检查完成：${available} 个可更新${failed ? `，${failed} 个检查失败` : ""}`);
    button.disabled = false;
  });
  searchInput.addEventListener("input", render);
  dependencySearchInput.addEventListener("input", render);
  document.querySelectorAll("[data-tab-target]").forEach((button) => button.addEventListener("click", () => {
    const target = button.dataset.tabTarget;
    document.querySelectorAll("[data-tab-target]").forEach((item) => { const active = item === button; item.classList.toggle("is-active", active); item.setAttribute("aria-selected", String(active)); });
    document.querySelectorAll("[data-tab-panel]").forEach((panel) => { panel.hidden = panel.dataset.tabPanel !== target; });
    if (target === "market") autoLoadMarket();
  }));
  managerTabVisibleInput.addEventListener("change", async () => {
    state.preferences = { ...(state.preferences || {}), managerTabVisible: managerTabVisibleInput.checked };
    managerTabVisibleLabel.textContent = managerTabVisibleInput.checked ? "已显示" : "已隐藏";
    await saveState();
    showToast(managerTabVisibleInput.checked ? "页面侧边入口已显示" : "页面侧边入口已隐藏");
  });
  marketAutoLoadInput.addEventListener("change", async () => {
    state.preferences = { ...(state.preferences || {}), marketAutoLoad: marketAutoLoadInput.checked };
    marketAutoLoadLabel.textContent = marketAutoLoadInput.checked ? "已开启" : "已关闭";
    await saveState();
    showToast(marketAutoLoadInput.checked ? "市场自动加载已开启" : "市场自动加载已关闭");
  });
  safeModeInput.addEventListener("change", async () => { state.preferences = { ...(state.preferences || {}), safeMode: safeModeInput.checked }; await saveState(); render(); showToast(safeModeInput.checked ? "安全模式已开启" : "安全模式已关闭"); });
  crashIsolationInput.addEventListener("change", async () => { state.preferences = { ...(state.preferences || {}), crashIsolation: crashIsolationInput.checked }; await saveState(); render(); showToast(crashIsolationInput.checked ? "崩溃自动隔离已开启" : "崩溃自动隔离已关闭"); });
  confirmInstallButton.addEventListener("click", async () => {
    if (!pendingInspection) return;
    confirmInstallButton.disabled = true;
    const inspection = pendingInspection;
    inspection.grantedPermissions = [...installReview.querySelectorAll("[data-permission]:checked")].map((input) => input.dataset.permission);
    try {
      const existing = inspection.manifest.type === "dependency"
        ? state.dependencies.find((item) => item.id === inspection.manifest.id && item.version === inspection.manifest.version)
        : getImportedModule(inspection.manifest.id);
      const installed = await KivowikiModsStore.commitPackage(inspection, existing);
      const collection = installed.type === "dependency" ? "dependencies" : "imported";
      state[collection] = [...state[collection].filter((item) => installed.type === "dependency" ? KivowikiModsPlatform.packageKey(item) !== installed.packageKey : item.id !== installed.id), installed];
      rebuildLockfile(true);
      await saveState();
      showToast(`${installed.name} v${installed.version} 已安装`);
      pendingInspection = null;
      reviewNextInstallation();
    } catch (error) { showToast(`安装失败：${error.message}`); confirmInstallButton.disabled = false; }
  });
  document.querySelectorAll("[data-install-close]").forEach((node) => node.addEventListener("click", closeInstall));
  document.querySelectorAll("[data-panel-close]").forEach((node) => node.addEventListener("click", () => { panelModal.hidden = true; }));
  const openRepository = (type) => { importTarget = type; repositoryModal.hidden = false; repositoryUrl.focus(); };
  document.getElementById("git-import-module").addEventListener("click", () => openRepository("module"));
  document.getElementById("git-import-dependency").addEventListener("click", () => openRepository("dependency"));
  document.querySelectorAll("[data-repository-close]").forEach((node) => node.addEventListener("click", closeRepository));
  document.getElementById("repository-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    repositorySubmit.disabled = true;
    try {
      const file = await KivowikiModsStore.fetchRepositoryPackage(repositoryUrl.value);
      closeRepository();
      await inspectImportFile(file, importTarget);
    } catch (error) {
      showToast(`仓库导入失败：${error.message}`);
      repositorySubmit.disabled = false;
    }
  });
  document.getElementById("open-logs").addEventListener("click", openLogs);
  logFilter.addEventListener("change", renderLogs);
  document.getElementById("clear-logs").addEventListener("click", async () => { runtimeLogs = []; await chrome.storage.local.set({ runtimeLogs: [] }); renderLogs(); render(); showToast("运行日志已清空"); });
  marketSearchButton.addEventListener("click", searchMarket);
  marketRefreshButton.addEventListener("click", () => searchMarket({ force: true, page: 1 }));
  marketPrevButton.addEventListener("click", () => searchMarket({ force: true, page: Math.max(1, marketPage - 1) }));
  marketNextButton.addEventListener("click", () => searchMarket({ force: true, page: Math.min(marketTotalPages, marketPage + 1) }));
  marketSearchInput.addEventListener("keydown", (event) => { if (event.key === "Enter") searchMarket(); });
  marketSortInput.addEventListener("change", () => { if (marketHasLoaded) searchMarket({ force: true, page: 1 }); });
  marketTypeInput.addEventListener("change", () => { if (marketHasLoaded) searchMarket({ force: true, page: 1 }); });
  marketSourceAdd.addEventListener("click", async () => {
    const value = marketSourceUrl.value.trim();
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "https:") throw new Error("自定义源只允许 HTTPS");
      if (!await requestOptionalHostPermission(value)) throw new Error("未获得访问该来源的浏览器权限");
      await KivowikiModsStore.fetchRemoteJson(value);
      const sources = new Set(state.preferences?.marketSources || []);
      sources.add(parsed.href);
      state.preferences = { ...(state.preferences || {}), marketSources: [...sources].slice(0, 20) };
      await saveState();
      marketSourceUrl.value = "";
      renderSources();
      await searchMarket({ force: true, page: 1 });
    } catch (error) { showToast(`添加自定义源失败：${error.message}`); }
  });
  document.getElementById("config-close").addEventListener("click", closeConfig);
  modal.querySelector("[data-config-close]").addEventListener("click", closeConfig);
  document.addEventListener("keydown", (event) => { if (event.key !== "Escape") return; if (!modal.hidden) closeConfig(); else if (!installModal.hidden) closeInstall(); else if (!repositoryModal.hidden) closeRepository(); else panelModal.hidden = true; });
  window.addEventListener("beforeunload", closeConfig);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.runtimeLogs?.newValue) {
      runtimeLogs = Array.isArray(changes.runtimeLogs.newValue) ? changes.runtimeLogs.newValue : [];
      if (!panelModal.hidden && panelTitle.textContent === "运行日志") renderLogs();
    }
    if (changes.kivoPlusUserScripts || changes.kivoPlusUserScriptsError) {
      pageRuntimeStatus = {
        available: changes.kivoPlusUserScripts?.newValue ?? pageRuntimeStatus.available,
        error: String(changes.kivoPlusUserScriptsError?.newValue ?? pageRuntimeStatus.error)
      };
      render();
    }
    if (changes[STORAGE_KEY]?.newValue) {
      state = changes[STORAGE_KEY].newValue;
      // 配置 iframe 可能与 Wiki 页面同时打开。将外部设置变化同步回当前
      // 配置页，使复选框、滑块和预览始终反映最终持久化状态。
      if (configRuntime?.ready) {
        const activeModule = configRuntime.module;
        const settings = activeModule.builtin
          ? state.modules?.[activeModule.id]?.settings
          : getImportedPackage(activeModule.id)?.settings;
        configRuntime.send({ type: "settings-change", settings: settings || {} });
      }
      if (installModal.hidden) render();
    }
  });
  load().catch((error) => showToast(`设置读取失败：${error.message}`));
})();
