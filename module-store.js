  (function registerKivowikiModsModuleStore() {
  "use strict";

  // chrome.storage.local 适合小型设置，模块资源与历史版本统一放在 IndexedDB。
  const DB_NAME = "kivo-plus-modules";
  const DB_VERSION = 4;
  const FILE_STORE = "files";
  const REVISION_STORE = "revisions";
  const REVISION_FILE_STORE = "revision-files";
  const MAX_BYTES = 100 * 1024 * 1024;
  const MAX_FILE_BYTES = 32 * 1024 * 1024;
  const MAX_CODE_BYTES = 4 * 1024 * 1024;
  const MAX_FILES = 2048;
  const MAX_REVISIONS = 3;
  const BACKUP_VERSION = 3;
  const PACKAGE_NAME_PREFIX = "Kivowiki-Mods-";
  const textDecoder = new TextDecoder();
  const textEncoder = new TextEncoder();

  const openDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FILE_STORE)) db.createObjectStore(FILE_STORE);
      if (!db.objectStoreNames.contains(REVISION_STORE)) db.createObjectStore(REVISION_STORE, { keyPath: "key" });
      if (!db.objectStoreNames.contains(REVISION_FILE_STORE)) db.createObjectStore(REVISION_FILE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("模块资源数据库打开失败"));
  });

  const normalizePath = (value) => {
    const path = String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
    if (!path || path.startsWith("/") || path.split("/").some((part) => part === ".." || part === "")) throw new Error("模块文件路径无效");
    return path;
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

  const cloneJson = (value, fallback = {}) => {
    try { return JSON.parse(JSON.stringify(value)); } catch { return fallback; }
  };

  const canonicalJson = (value) => {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
    return JSON.stringify(value);
  };

  const bytesToHex = (bytes) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const sha256 = async (value) => new Uint8Array(await crypto.subtle.digest("SHA-256", value));
  const base64ToBuffer = (value) => {
    const binary = atob(String(value || "").replace(/\s/g, ""));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  };

  const keyFor = (id, path) => `${id}:${normalizePath(path)}`;
  const storageIdFor = (item) => item?.storageId || (item?.type === "dependency" ? KivowikiModsPlatform.packageKey(item) : item?.id);
  const request = (store, method, value) => new Promise((resolve, reject) => {
    const operation = store[method](value);
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error || new Error("模块资源操作失败"));
  });

  const putFiles = async (id, files) => {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, "readwrite");
      const store = tx.objectStore(FILE_STORE);
      for (const file of files) store.put(file.blob, keyFor(id, file.path));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("模块资源保存失败"));
      tx.onabort = () => reject(tx.error || new Error("模块资源保存失败"));
    });
    db.close();
  };

  const deletePackage = async (id, paths = []) => {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, "readwrite");
      const store = tx.objectStore(FILE_STORE);
      if (paths.length) paths.forEach((path) => store.delete(keyFor(id, path)));
      else {
        const range = IDBKeyRange.bound(`${id}:`, `${id}:\uffff`);
        store.openCursor(range).onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) { cursor.delete(); cursor.continue(); }
        };
      }
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("模块资源删除失败"));
    });
    db.close();
  };

  const getFile = async (id, path) => {
    const db = await openDb();
    const blob = await request(db.transaction(FILE_STORE, "readonly").objectStore(FILE_STORE), "get", keyFor(id, path));
    db.close();
    return blob || null;
  };

  const getText = async (id, path) => {
    const blob = await getFile(id, path);
    if (!blob) return null;
    return blob.text();
  };

  const getPackageFiles = async (id, paths = null) => {
    const requested = Array.isArray(paths) ? new Set(paths.map(normalizePath)) : null;
    const db = await openDb();
    const files = await new Promise((resolve, reject) => {
      const result = [];
      const tx = db.transaction(FILE_STORE, "readonly");
      const cursorRequest = tx.objectStore(FILE_STORE).openCursor(IDBKeyRange.bound(`${id}:`, `${id}:\uffff`));
      cursorRequest.onsuccess = async (event) => {
        const cursor = event.target.result;
        if (!cursor) { resolve(result); return; }
        const path = String(cursor.key).slice(`${id}:`.length);
        if (!requested || requested.has(path)) result.push({ path, blob: cursor.value });
        cursor.continue();
      };
      cursorRequest.onerror = () => reject(cursorRequest.error || new Error("模块资源读取失败"));
      tx.onerror = () => reject(tx.error || new Error("模块资源读取失败"));
    });
    db.close();
    return files;
  };

  const getRevisions = async (id) => {
    const db = await openDb();
    const revisions = await new Promise((resolve, reject) => {
      const result = [];
      const request = db.transaction(REVISION_STORE, "readonly").objectStore(REVISION_STORE).openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) { resolve(result); return; }
        if (cursor.value.moduleId === id) result.push(cursor.value);
        cursor.continue();
      };
      request.onerror = () => reject(request.error || new Error("版本历史读取失败"));
    });
    db.close();
    return revisions.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  };

  const getRevisionFiles = async (revision) => {
    // 兼容短暂存在过的 v2 数据结构；v3 以后文件独立存储，列表不再加载大 Blob。
    if (Array.isArray(revision.files) && revision.files.length) return revision.files;
    const db = await openDb();
    const files = await new Promise((resolve, reject) => {
      const result = [];
      const request = db.transaction(REVISION_FILE_STORE, "readonly").objectStore(REVISION_FILE_STORE).openCursor(IDBKeyRange.bound(`${revision.key}:`, `${revision.key}:\uffff`));
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) { resolve(result); return; }
        result.push({ path: String(cursor.key).slice(`${revision.key}:`.length), blob: cursor.value });
        cursor.continue();
      };
      request.onerror = () => reject(request.error || new Error("历史版本文件读取失败"));
    });
    db.close();
    return files;
  };

  const deleteRevision = async (key) => {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([REVISION_STORE, REVISION_FILE_STORE], "readwrite");
      tx.objectStore(REVISION_STORE).delete(key);
      const cursorRequest = tx.objectStore(REVISION_FILE_STORE).openCursor(IDBKeyRange.bound(`${key}:`, `${key}:\uffff`));
      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("历史版本清理失败"));
    });
    db.close();
  };

  const deleteRevisions = async (id) => {
    const revisions = await getRevisions(id);
    await Promise.all(revisions.map((revision) => deleteRevision(revision.key)));
  };

  const saveRevision = async (module) => {
    if (!module?.id || !module.version) return null;
    const storageId = storageIdFor(module);
    const files = await getPackageFiles(storageId);
    if (!files.length) return null;
    const key = `${module.id}:${Date.now()}:${crypto.randomUUID()}`;
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([REVISION_STORE, REVISION_FILE_STORE], "readwrite");
      tx.objectStore(REVISION_STORE).put({
        key,
        moduleId: storageId,
        packageId: module.id,
        version: module.version,
        createdAt: new Date().toISOString(),
        packageSize: files.reduce((total, file) => total + file.blob.size, 0),
        fileCount: files.length,
        module: cloneJson(module)
      });
      for (const file of files) tx.objectStore(REVISION_FILE_STORE).put(file.blob, `${key}:${file.path}`);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("历史版本保存失败"));
    });
    db.close();
    const revisions = await getRevisions(storageId);
    await Promise.all(revisions.slice(MAX_REVISIONS).map((revision) => deleteRevision(revision.key)));
    return key;
  };

  const rollback = async (id, revisionKey, currentModule) => {
    const revisions = await getRevisions(id);
    const revision = revisions.find((item) => item.key === revisionKey);
    if (!revision) throw new Error("回滚版本不存在或已被清理");
    const revisionFiles = await getRevisionFiles(revision);
    if (!revisionFiles.length) throw new Error("回滚版本没有模块文件");
    await saveRevision(currentModule);
    await deletePackage(id);
    try { await putFiles(id, revisionFiles); }
    catch (error) {
      const latest = (await getRevisions(id)).find((item) => item.version === currentModule.version);
      if (latest) {
        const latestFiles = await getRevisionFiles(latest);
        if (latestFiles.length) await putFiles(id, latestFiles);
      }
      throw error;
    }
    await deleteRevision(revisionKey).catch(() => {});
    return { ...cloneJson(revision.module), enabled: currentModule.enabled !== false, settings: normalizeSettings(currentModule.settings), crashHistory: [], quarantined: false, quarantineReason: "" };
  };

  const getExtensionText = async (path) => {
    const response = await fetch(chrome.runtime.getURL(normalizePath(path)));
    if (!response.ok) throw new Error("扩展配置资源不存在");
    return response.text();
  };

  const putText = async (id, path, text) => {
    await putFiles(id, [{ path, blob: new Blob([text], { type: "text/javascript" }) }]);
  };

  const bytesToBase64 = (bytes) => {
    let result = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      result += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(result);
  };

  const base64ToBytes = (value) => {
    if (typeof value !== "string") throw new Error("备份文件内容无效");
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  };

  const normalizeBackup = (backup) => {
    if (!backup || typeof backup !== "object") throw new Error("备份内容无效");
    const isPackage = backup.manifest && Array.isArray(backup.files);
    const isDocument = backup.format === "kivowiki-mods-backup" && [1, 2, BACKUP_VERSION].includes(backup.version);
    if (!isPackage && !isDocument) {
      throw new Error("不是受支持的 KivowikiMods 备份文件");
    }
    if (!backup.manifest || typeof backup.manifest !== "object") throw new Error("备份缺少模块清单");
    const rawManifest = backup.manifest;
    const manifest = validateManifest(rawManifest);
    if (!Array.isArray(backup.files) || backup.files.length === 0) throw new Error("备份缺少模块文件");
    if (backup.files.length > MAX_FILES) throw new Error("备份文件数量超过限制");
    const paths = new Set();
    const files = backup.files.map((file) => {
      const path = normalizePath(file?.path);
      if (paths.has(path)) throw new Error(`备份中存在重复文件：${path}`);
      paths.add(path);
      const bytes = base64ToBytes(file?.data);
      if (bytes.byteLength > MAX_FILE_BYTES) throw new Error(`文件“${path}”超过 32 MB`);
      return { path, blob: new Blob([bytes]) };
    });
    const totalSize = files.reduce((total, file) => total + file.blob.size, 0);
    if (totalSize > MAX_BYTES) throw new Error("备份解码后总大小超过 100 MB");
    const fileMap = new Map(files.map((file) => [file.path, file]));
    if (!fileMap.has(manifest.entry)) throw new Error(`找不到入口文件：${manifest.entry}`);
    if (manifest.config && !fileMap.has(manifest.config)) throw new Error(`找不到配置页面文件：${manifest.config}`);
    return { rawManifest, manifest, fileMap };
  };

  const importBackup = async (file, forbiddenIds = []) => {
    const normalized = await inspectBackup(file, forbiddenIds, []);
    const imported = [];
    for (const inspection of normalized) imported.push(await commitPackage(inspection));
    return imported;
  };

  const exportPackage = async (module, files) => {
    const fileEntries = [];
    const paths = new Set();
    let totalSize = 0;
    for (const file of files) {
      const bytes = new Uint8Array(await file.blob.arrayBuffer());
      const path = normalizePath(file.path);
      if (paths.has(path)) throw new Error(`模块中存在重复文件：${path}`);
      paths.add(path);
      totalSize += bytes.byteLength;
      if (totalSize > MAX_BYTES) throw new Error("模块总大小超过 100 MB");
      fileEntries.push({ path, data: bytesToBase64(bytes) });
    }
    return {
      format: "kivowiki-mods-backup",
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      manifest: {
        id: module.id,
        name: module.name,
        type: module.type || "module",
        scoped: module.scoped === true,
        version: module.version,
        description: module.description || "",
        author: module.author || "",
        manifestVersion: module.manifestVersion || 2,
        mode: module.mode || "page",
        entry: module.entry || "index.js",
        config: module.config || "",
        settings: normalizeSettings(module.settings),
        permissions: cloneJson(module.permissions, []),
        dependencies: cloneJson(module.dependencies),
        optionalDependencies: cloneJson(module.optionalDependencies),
         conflicts: cloneJson(module.conflicts),
         exports: cloneJson(module.exports),
         claims: cloneJson(module.claims),
         dependencySources: cloneJson(module.dependencySources),
        engines: cloneJson(module.engines),
        publisher: cloneJson(module.publisher),
        source: cloneJson(module.source),
        review: cloneJson(module.review),
        // 导出的备份清单包含本机设置，已不同于作者签名时的原始清单，因此不能沿用原签名。
        signature: null
      },
      files: fileEntries
    };
  };

  const exportBackup = async (modules) => {
    const packages = [];
    for (const module of modules) {
      // 直接枚举仓库，兼容早期版本没有保存 filePaths 的模块记录。
       const files = await getPackageFiles(storageIdFor(module));
      if (!files.length) throw new Error(`模块“${module.name}”没有可导出的文件`);
      packages.push(await exportPackage(module, files));
    }
    return packages.length === 1
      ? packages[0]
      : { format: "kivowiki-mods-backup", version: BACKUP_VERSION, exportedAt: new Date().toISOString(), modules: packages.map((item) => ({ manifest: item.manifest, files: item.files })) };
  };

  const decodeUtf8 = (bytes) => textDecoder.decode(bytes);
  const readU16 = (view, offset) => view.getUint16(offset, true);
  const readU32 = (view, offset) => view.getUint32(offset, true);
  const crc32 = (bytes) => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };

  // ZIP 中央目录解析器：支持 Store 和 Deflate，使用浏览器原生解压流避免额外依赖。
  const readZip = async (buffer) => {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const start = Math.max(0, bytes.length - 65557);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= start; i -= 1) {
      if (readU32(view, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("不是有效的 ZIP 模块包");
    const count = readU16(view, eocd + 10);
    if (count > MAX_FILES) throw new Error("ZIP 文件项数量超过限制");
    const directorySize = readU32(view, eocd + 12);
    const directoryOffset = readU32(view, eocd + 16);
    if (directoryOffset + directorySize > bytes.length) throw new Error("ZIP 中央目录损坏");
    const files = [];
    let offset = directoryOffset;
    let totalSize = 0;
    for (let index = 0; index < count; index += 1) {
      const centralOffset = offset;
      if (readU32(view, centralOffset) !== 0x02014b50) throw new Error("ZIP 文件项损坏");
      const flags = readU16(view, centralOffset + 8);
      const method = readU16(view, centralOffset + 10);
      const compressedSize = readU32(view, centralOffset + 20);
      const uncompressedSize = readU32(view, centralOffset + 24);
      const nameLength = readU16(view, centralOffset + 28);
      const extraLength = readU16(view, centralOffset + 30);
      const commentLength = readU16(view, centralOffset + 32);
      const localOffset = readU32(view, centralOffset + 42);
      const expectedCrc = readU32(view, centralOffset + 16);
      const rawName = decodeUtf8(bytes.slice(centralOffset + 46, centralOffset + 46 + nameLength));
      offset += 46 + nameLength + extraLength + commentLength;
      // 目录项不需要写入资源仓库，但必须先读取其完整的中央目录记录。
      if (rawName.endsWith("/") || rawName.endsWith("\\")) continue;
      const name = normalizePath(rawName);
      if (flags & 1) throw new Error(`文件“${name}”已加密，无法导入`);
       if (uncompressedSize > MAX_FILE_BYTES || compressedSize > MAX_FILE_BYTES) throw new Error(`文件“${name}”超过 32 MB`);
      totalSize += uncompressedSize;
       if (totalSize > MAX_BYTES) throw new Error("模块解压后总大小超过 100 MB");
      if (readU32(view, localOffset) !== 0x04034b50) throw new Error(`文件“${name}”的 ZIP 头损坏`);
      const localNameLength = readU16(view, localOffset + 26);
      const localExtraLength = readU16(view, localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      if (dataStart + compressedSize > bytes.length) throw new Error(`文件“${name}”的数据区损坏`);
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);
      let content;
      if (method === 0) content = compressed;
      else if (method === 8 && globalThis.DecompressionStream) {
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        content = new Uint8Array(await new Response(stream).arrayBuffer());
      } else throw new Error(`文件“${name}”使用了不支持的 ZIP 压缩方式`);
      if (content.byteLength !== uncompressedSize || crc32(content) !== expectedCrc) throw new Error(`文件“${name}”校验失败`);
      files.push({ path: name, blob: new Blob([content]) });
    }
    return files;
  };

  const validateManifest = (manifest) => {
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error("包清单必须是对象");
    if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(manifest.id || "")) throw new Error("id 只能使用小写字母、数字和连字符");
    if (!manifest.name || !manifest.version) throw new Error("缺少 name 或 version 字段");
    if (!String(manifest.name).startsWith(PACKAGE_NAME_PREFIX)) throw new Error(`name 必须以 ${PACKAGE_NAME_PREFIX} 开头`);
    if (!KivowikiModsPlatform.parseVersion(manifest.version)) throw new Error("version 必须是有效的语义化版本，例如 1.2.0");
    const manifestVersion = Number(manifest.manifestVersion || 1);
    if (!Number.isInteger(manifestVersion) || manifestVersion < 1 || manifestVersion > KivowikiModsPlatform.MANIFEST_VERSION) throw new Error(`不支持模块清单版本 ${manifestVersion}`);
    const type = KivowikiModsPlatform.normalizeItemType(manifest.type);
    if (type === "module" && manifest.mode != null && !["page", "sandbox"].includes(manifest.mode)) throw new Error("mode 只能是 page 或 sandbox");
    const mode = manifest.mode === "sandbox" ? "sandbox" : "page";
    const entry = normalizePath(manifest.entry || "index.js");
    const config = manifest.config ? normalizePath(manifest.config) : "";
    if (entry.toLowerCase().endsWith(".json")) throw new Error("entry 必须是可执行脚本文件");
    const permissions = type === "dependency" ? [] : KivowikiModsPlatform.normalizePermissions(manifest.permissions, mode).map(({ id, reason, optional }) => ({ id, reason, optional }));
    const dependencies = KivowikiModsPlatform.normalizeRelationMap(manifest.dependencies, "dependencies");
    const optionalDependencies = KivowikiModsPlatform.normalizeRelationMap(manifest.optionalDependencies, "optionalDependencies");
    const conflicts = KivowikiModsPlatform.normalizeRelationMap(manifest.conflicts, "conflicts");
    if (dependencies[manifest.id] || optionalDependencies[manifest.id] || conflicts[manifest.id]) throw new Error("模块不能依赖或冲突于自身");
    const engines = manifest.engines && typeof manifest.engines === "object" && !Array.isArray(manifest.engines)
      ? Object.fromEntries(Object.entries(manifest.engines).filter(([key]) => ["kivowikiMods", "api"].includes(key)).map(([key, value]) => [key, String(value).slice(0, 100)]))
      : {};
    const normalizeIdentity = (value, fields) => value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(fields.filter((key) => value[key] != null).map((key) => [key, key === "publicKey" && typeof value[key] === "object" ? canonicalJson(value[key]) : String(value[key]).slice(0, key === "publicKey" ? 16000 : 500)]))
      : {};
    return {
      ...manifest,
      type,
      scoped: type === "dependency" && manifest.scoped === true,
      manifestVersion,
      name: String(manifest.name).slice(0, 100),
      version: String(manifest.version).slice(0, 30),
      description: String(manifest.description || (type === "dependency" ? "社区导入依赖" : "社区导入模块")).slice(0, 300),
      author: String(manifest.author || "未知作者").slice(0, 100),
      mode,
      entry,
      config,
      settings: normalizeSettings(manifest.settings),
      permissions,
      dependencies,
      optionalDependencies,
      conflicts,
      engines,
      publisher: normalizeIdentity(manifest.publisher, ["id", "name", "url", "publicKey"]),
      source: normalizeIdentity(manifest.source, ["registry", "url", "repository", "provider", "owner", "repo", "branch", "commit", "manifestPath"]),
      review: normalizeIdentity(manifest.review, ["status", "reviewer", "reviewedAt", "reportUrl"]),
      exports: type === "dependency" ? KivowikiModsPlatform.normalizeContract(manifest.exports, "exports") : {},
      claims: KivowikiModsPlatform.normalizeClaims(manifest.claims),
      dependencySources: Object.fromEntries(Object.entries(manifest.dependencySources && typeof manifest.dependencySources === "object" && !Array.isArray(manifest.dependencySources) ? manifest.dependencySources : {}).map(([id, url]) => {
        if (!dependencies[id] && !optionalDependencies[id]) throw new Error(`dependencySources.${id} 没有对应的依赖声明`);
        const parsed = new URL(String(url));
        if (parsed.protocol !== "https:" || !["github.com", "gitlab.com"].includes(parsed.hostname)) throw new Error(`dependencySources.${id} 必须是公开 GitHub/GitLab HTTPS 仓库`);
        return [id, parsed.href];
      })),
      signature: manifest.signature && typeof manifest.signature === "object" ? {
        algorithm: String(manifest.signature.algorithm || ""),
        value: String(manifest.signature.value || "")
      } : null
    };
  };

  const scanCode = async (manifest, fileMap) => {
    const findings = [];
    const add = (severity, title, detail) => findings.push({ severity, title, detail });
    const texts = [];
    let scannedBytes = 0;
    for (const [path, file] of fileMap) {
      if (!/\.(?:js|mjs|cjs)$/i.test(path) || file.blob.size > MAX_CODE_BYTES || scannedBytes + file.blob.size > 12 * 1024 * 1024) continue;
      texts.push({ path, text: file.text ?? await file.blob.text() });
      scannedBytes += file.blob.size;
    }
    for (const { path, text } of texts) {
      if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(text)) add("high", "动态代码执行", `${path} 使用 eval 或 new Function，代码行为较难审核。`);
      if (/document\s*\.\s*cookie|\bcookieStore\b/i.test(text)) add("high", "可能读取登录信息", `${path} 出现 Cookie 访问代码。`);
      if (/WebSocket|EventSource|sendBeacon|XMLHttpRequest/i.test(text)) add("medium", "额外网络通道", `${path} 使用未经过平台数据层的网络能力。`);
      if (/<script|createElement\s*\(\s*["']script["']|\.src\s*=\s*["']https?:/i.test(text)) add("high", "可能加载远程脚本", `${path} 存在动态脚本或远程脚本特征。`);
      if (/while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/.test(text)) add("high", "可能阻塞页面", `${path} 出现无终止条件循环。`);
      if (/setInterval\s*\([^,]+,\s*(?:0|[1-9]|[1-4]\d)\s*\)/.test(text)) add("medium", "高频定时任务", `${path} 的定时器间隔低于 50ms。`);
      if (/innerHTML\s*=|insertAdjacentHTML\s*\(/.test(text)) add("medium", "HTML 注入风险", `${path} 直接写入 HTML，必须确保内容已过滤。`);
    }
    const permissions = new Set(manifest.permissions.map((item) => item.id));
    const combined = texts.map((item) => item.text).join("\n");
    const hasNetworkCode = /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/.test(combined);
    if (manifest.type === "module" && hasNetworkCode && !permissions.has("network.read")) add("high", "网络权限未声明", "代码包含网络访问特征，但清单没有声明 network.read。"
    );
    if (manifest.type === "dependency" && hasNetworkCode) add("medium", "依赖包含网络访问", "页面模式下依赖与调用模块处于同一页面环境，请确认网络目标与用途。严格沙箱仍会阻止网络。"
    );
    if (manifest.type === "module" && manifest.mode === "page" && !permissions.has("page.modify")) add("medium", "页面能力声明不足", "页面模式通常需要 page.modify；未声明时相关宿主能力将不可用。" );
    if (manifest.type === "module" && manifest.mode === "sandbox") {
      const unavailable = manifest.permissions.filter((item) => item.id.startsWith("page.") || item.id === "network.read" || item.id === "storage");
      if (unavailable.length) add("medium", "运行模式不提供部分权限", `严格沙箱不会开放：${unavailable.map((item) => item.id).join("、")}。模块仍可安装。`);
    }
    const inferredClaims = { globals: [], pageSelectors: [], routes: [] };
    for (const { text } of texts) {
      for (const match of text.matchAll(/(?:globalThis|window)\s*\.\s*([A-Za-z_$][\w$]*)\s*=/g)) inferredClaims.globals.push(match[1]);
      for (const match of text.matchAll(/(?:querySelector(?:All)?|closest)\s*\(\s*["']([^"']{1,160})["']/g)) inferredClaims.pageSelectors.push(match[1]);
      for (const match of text.matchAll(/(?:pushState|replaceState)\s*\([^,]*,[^,]*,\s*["'](\/[^"']*)["']/g)) inferredClaims.routes.push(match[1]);
    }
    return { findings: findings.slice(0, 50), inferredClaims: KivowikiModsPlatform.normalizeClaims(inferredClaims) };
  };

  const verifySignature = async (rawManifest, fileMap, manifestPath) => {
    const signature = rawManifest.signature;
    const publicKey = rawManifest.publisher?.publicKey;
    if (!signature?.value || !publicKey) return { status: "unsigned", label: "未签名", fingerprint: "" };
    if (signature.algorithm !== "ECDSA-P256-SHA256") return { status: "invalid", label: "不支持的签名算法", fingerprint: "" };
    try {
      const jwk = typeof publicKey === "string" ? JSON.parse(publicKey) : publicKey;
      const importedKey = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
      const hashes = {};
      for (const [path, file] of [...fileMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        if (path === manifestPath) continue;
        hashes[path] = bytesToHex(await sha256(await file.blob.arrayBuffer()));
      }
      const unsignedManifest = cloneJson(rawManifest);
      delete unsignedManifest.signature;
      const payload = textEncoder.encode(canonicalJson({ manifest: unsignedManifest, files: hashes }));
      const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, importedKey, base64ToBuffer(signature.value), payload);
      const fingerprint = bytesToHex(await sha256(textEncoder.encode(canonicalJson(jwk)))).match(/.{1,4}/g).slice(0, 8).join(":" );
      return valid ? { status: "verified", label: "签名有效", fingerprint } : { status: "invalid", label: "签名无效", fingerprint };
    } catch (error) {
      return { status: "invalid", label: "签名无法验证", fingerprint: "", error: error.message };
    }
  };

  const parsePackage = async (file) => {
    if (!file || file.size > MAX_BYTES) throw new Error("模块包不能超过 100 MB");
    let rawManifest;
    let files;
    let manifestPath = "module.json";
    if (/\.zip$/i.test(file.name) || file.type === "application/zip") {
      files = await readZip(await file.arrayBuffer());
      const manifestFile = files.find((item) => /(?:^|\/)(?:module|dependency|manifest)\.json$/i.test(item.path));
      if (!manifestFile) throw new Error("ZIP 根目录缺少 module.json、dependency.json 或 manifest.json");
      rawManifest = JSON.parse(await manifestFile.blob.text());
      const packageRoot = manifestFile.path.slice(0, manifestFile.path.lastIndexOf("/") + 1);
      if (packageRoot) files = files.filter((item) => item.path.startsWith(packageRoot)).map((item) => ({ ...item, path: item.path.slice(packageRoot.length) }));
      manifestPath = manifestFile.path.slice(packageRoot.length);
    } else {
      rawManifest = JSON.parse(await file.text());
      if (rawManifest?.format === "kivowiki-mods-backup") throw new Error("备份文件应通过备份恢复流程导入");
      if (typeof rawManifest.code !== "string" || !rawManifest.code.trim()) throw new Error("JSON 模块缺少可执行的 code 字段");
      files = [{ path: rawManifest.entry || "index.js", blob: new Blob([textEncoder.encode(rawManifest.code)], { type: "text/javascript" }) }];
      if (rawManifest.configCode) {
        rawManifest.config = rawManifest.config || "config.js";
        files.push({ path: rawManifest.config, blob: new Blob([textEncoder.encode(rawManifest.configCode)], { type: "text/javascript" }) });
      }
    }
    const manifest = validateManifest(rawManifest);
    if (file.kivowikiSource) manifest.source = { ...manifest.source, ...cloneJson(file.kivowikiSource) };
    const fileMap = new Map();
    for (const item of files) {
      const path = normalizePath(item.path);
      if (fileMap.has(path)) throw new Error(`模块中存在重复文件：${path}`);
      const stored = { ...item, path };
      if ([manifest.entry, manifest.config].includes(path)) {
        if (item.blob.size > MAX_CODE_BYTES) throw new Error(`脚本“${path}”超过 4 MB，无法保证运行流畅`);
        stored.text = await item.blob.text();
      }
      fileMap.set(path, stored);
    }
    if (!fileMap.has(manifest.entry)) throw new Error(`找不到入口文件：${manifest.entry}`);
    if (manifest.config && !fileMap.has(manifest.config)) throw new Error(`找不到配置页面文件：${manifest.config}`);
    const fileHashes = {};
    for (const [path, item] of [...fileMap.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      fileHashes[path] = bytesToHex(await sha256(await item.blob.arrayBuffer()));
    }
    const integrity = `sha256-${bytesToHex(await sha256(textEncoder.encode(canonicalJson(fileHashes))))}`;
    return { rawManifest, manifest, fileMap, manifestPath, packageSize: file.size, integrity };
  };

  const inspectPackage = async (file, forbiddenIds = [], installed = [], installedDependencies = []) => {
    const parsed = await parsePackage(file);
    if (forbiddenIds.includes(parsed.manifest.id)) throw new Error("不能覆盖内置模块 ID");
    const targetList = parsed.manifest.type === "dependency" ? installedDependencies : installed;
    const otherList = parsed.manifest.type === "dependency" ? installed : installedDependencies;
    if (otherList.some((item) => item.id === parsed.manifest.id)) throw new Error(`ID ${parsed.manifest.id} 已被另一种包类型占用`);
    const existing = targetList.find((item) => item.id === parsed.manifest.id && (parsed.manifest.type !== "dependency" || item.version === parsed.manifest.version));
    const signature = await verifySignature(parsed.rawManifest, parsed.fileMap, parsed.manifestPath);
    const audit = await scanCode(parsed.manifest, parsed.fileMap);
    const compatibility = KivowikiModsPlatform.getCompatibility(parsed.manifest);
    const candidateModules = parsed.manifest.type === "module"
      ? [...installed.filter((item) => item.id !== parsed.manifest.id), { ...parsed.manifest, enabled: true }]
      : installed;
    const candidateDependencies = parsed.manifest.type === "dependency"
      ? [...installedDependencies.filter((item) => !(item.id === parsed.manifest.id && item.version === parsed.manifest.version)), { ...parsed.manifest, enabled: true }]
      : installedDependencies;
    const resolution = KivowikiModsPlatform.resolveModules(candidateModules, candidateDependencies);
    const moduleStatus = parsed.manifest.type === "module" ? resolution.status[parsed.manifest.id] : null;
    const dependencyReasons = moduleStatus?.runnable === false ? moduleStatus.reasons : [];
    const existingKey = existing?.publisher?.publicKey || "";
    const keyChanged = Boolean(existingKey && parsed.manifest.publisher?.publicKey && existingKey !== parsed.manifest.publisher.publicKey);
    if (keyChanged) signature.status = "invalid", signature.label = "作者签名密钥与已安装版本不一致";
    const change = !existing ? "install" : KivowikiModsPlatform.compareVersions(parsed.manifest.version, existing.version) > 0 ? "upgrade" : KivowikiModsPlatform.compareVersions(parsed.manifest.version, existing.version) < 0 ? "downgrade" : "reinstall";
    return {
      ...parsed,
      report: {
        change,
        previousVersion: existing?.version || "",
        signature,
        findings: audit.findings,
        inferredClaims: audit.inferredClaims,
        compatibility,
        dependencyReasons,
        permissions: parsed.manifest.type === "dependency" ? [] : KivowikiModsPlatform.normalizePermissions(parsed.manifest.permissions, parsed.manifest.mode),
        publisherStatus: signature.status === "verified" ? (existingKey ? "continuity-verified" : "self-signed") : "unverified",
        reviewStatus: parsed.manifest.review?.status === "approved" ? "declared-approved" : "unreviewed"
      }
    };
  };

  const inspectBackup = async (file, forbiddenIds = [], installed = [], installedDependencies = []) => {
    if (!file || file.size > MAX_BYTES * 2) throw new Error("备份文件过大");
    const backup = JSON.parse(await file.text());
    const entries = Array.isArray(backup?.modules) ? backup.modules : [backup];
    if (!entries.length || entries.length > 100) throw new Error("备份中的模块数量无效");
    const packageKeys = new Set();
    const normalizedEntries = entries.map(normalizeBackup);
    for (const { manifest } of normalizedEntries) {
      if (forbiddenIds.includes(manifest.id)) throw new Error(`不能覆盖内置模块 ID：${manifest.id}`);
      const key = manifest.type === "dependency" ? KivowikiModsPlatform.packageKey(manifest) : manifest.id;
      if (packageKeys.has(key)) throw new Error(`备份中存在重复包：${key}`);
      packageKeys.add(key);
      const otherList = manifest.type === "dependency" ? installed : installedDependencies;
      if (otherList.some((item) => item.id === manifest.id)) throw new Error(`ID ${manifest.id} 已被另一种包类型占用`);
    }
    const candidateModules = [
      ...installed.filter((item) => !packageKeys.has(item.id)),
      ...normalizedEntries.filter(({ manifest }) => manifest.type === "module").map(({ manifest }) => ({ ...manifest, enabled: true }))
    ];
    const candidateDependencies = [
      ...installedDependencies.filter((item) => !packageKeys.has(KivowikiModsPlatform.packageKey(item))),
      ...normalizedEntries.filter(({ manifest }) => manifest.type === "dependency").map(({ manifest }) => ({ ...manifest, enabled: true }))
    ];
    const resolution = KivowikiModsPlatform.resolveModules(candidateModules, candidateDependencies);
    const inspections = [];
    for (const normalized of normalizedEntries) {
      if (forbiddenIds.includes(normalized.manifest.id)) throw new Error(`不能覆盖内置模块 ID：${normalized.manifest.id}`);
      const targetList = normalized.manifest.type === "dependency" ? installedDependencies : installed;
      const existing = targetList.find((item) => item.id === normalized.manifest.id && (normalized.manifest.type !== "dependency" || item.version === normalized.manifest.version));
      const signature = await verifySignature(normalized.rawManifest, normalized.fileMap, "module.json");
      const existingKey = existing?.publisher?.publicKey || "";
      if (existingKey && normalized.manifest.publisher?.publicKey && existingKey !== normalized.manifest.publisher.publicKey) {
        signature.status = "invalid";
        signature.label = "作者签名密钥与已安装版本不一致";
      }
       const audit = await scanCode(normalized.manifest, normalized.fileMap);
      const compatibility = KivowikiModsPlatform.getCompatibility(normalized.manifest);
      const moduleStatus = normalized.manifest.type === "module" ? resolution.status[normalized.manifest.id] : null;
      const dependencyReasons = moduleStatus?.runnable === false ? moduleStatus.reasons : [];
      const change = !existing ? "install" : KivowikiModsPlatform.compareVersions(normalized.manifest.version, existing.version) > 0 ? "upgrade" : KivowikiModsPlatform.compareVersions(normalized.manifest.version, existing.version) < 0 ? "downgrade" : "reinstall";
      inspections.push({
        ...normalized,
        manifestPath: "module.json",
        packageSize: [...normalized.fileMap.values()].reduce((total, item) => total + item.blob.size, 0),
        report: {
          change,
          previousVersion: existing?.version || "",
          signature,
           findings: audit.findings,
           inferredClaims: audit.inferredClaims,
          compatibility,
          dependencyReasons,
          permissions: normalized.manifest.type === "dependency" ? [] : KivowikiModsPlatform.normalizePermissions(normalized.manifest.permissions, normalized.manifest.mode),
          publisherStatus: signature.status === "verified" ? (existingKey ? "continuity-verified" : "self-signed") : "unverified",
          reviewStatus: normalized.manifest.review?.status === "approved" ? "declared-approved" : "unreviewed"
        }
      });
    }
    return inspections;
  };

  const commitPackage = async (inspection, existing = null) => {
    if (!inspection?.manifest || !(inspection.fileMap instanceof Map)) throw new Error("安装预检结果无效");
    const storageId = existing ? storageIdFor(existing) : storageIdFor(inspection.manifest);
    const oldStorageId = storageId;
    const oldFiles = existing ? await getPackageFiles(oldStorageId) : [];
    if (existing) await saveRevision(existing);
    await deletePackage(storageId);
    try { await putFiles(storageId, [...inspection.fileMap.values()]); }
    catch (error) {
      if (oldFiles.length) await putFiles(oldStorageId, oldFiles);
      throw error;
    }
    const manifest = inspection.manifest;
    return {
      id: manifest.id,
      storageId,
      packageKey: KivowikiModsPlatform.packageKey(manifest),
      name: manifest.name,
      type: manifest.type,
      scoped: manifest.scoped === true,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      manifestVersion: manifest.manifestVersion,
      mode: manifest.mode,
      entry: manifest.entry,
      config: manifest.config,
      settings: normalizeSettings(existing?.settings || manifest.settings),
      enabled: existing?.enabled ?? true,
      packageSize: inspection.packageSize,
      integrity: inspection.integrity,
      fileCount: inspection.fileMap.size,
      filePaths: [...inspection.fileMap.keys()],
      permissions: cloneJson(manifest.permissions, []),
      grantedPermissions: Array.isArray(inspection.grantedPermissions)
        ? inspection.grantedPermissions.filter((id) => KivowikiModsPlatform.PERMISSIONS[id] && manifest.permissions.some((item) => item.id === id))
        : manifest.permissions.filter((item) => !item.optional && KivowikiModsPlatform.PERMISSIONS[item.id]).map((item) => item.id),
      dependencies: cloneJson(manifest.dependencies),
      optionalDependencies: cloneJson(manifest.optionalDependencies),
      conflicts: cloneJson(manifest.conflicts),
      exports: cloneJson(manifest.exports),
      claims: cloneJson(manifest.claims),
      dependencySources: cloneJson(manifest.dependencySources),
      engines: cloneJson(manifest.engines),
      publisher: cloneJson(manifest.publisher),
      source: cloneJson(manifest.source),
      review: cloneJson(manifest.review),
      signature: cloneJson(manifest.signature, null),
      trust: { ...inspection.report.signature, publisher: inspection.report.publisherStatus, reviewed: inspection.report.reviewStatus },
       audit: { scannedAt: new Date().toISOString(), findings: cloneJson(inspection.report.findings, []), inferredClaims: cloneJson(inspection.report.inferredClaims, {}) },
      installedAt: existing?.installedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      crashHistory: [],
      quarantined: false
    };
  };

  const importPackage = async (file, forbiddenIds = []) => {
    const inspection = await inspectPackage(file, forbiddenIds, []);
    return commitPackage(inspection);
  };

  /**
   * 将常见 GitHub/GitLab 仓库页解析为默认分支 ZIP。仓库内容仍会经过与
   * 本地文件完全相同的大小、路径、清单、签名和静态风险预检。
   */
  const fetchRepositoryPackage = async (input) => {
    let url;
    try { url = new URL(String(input || "").trim()); }
    catch { throw new Error("Git 仓库链接无效"); }
    if (url.protocol !== "https:") throw new Error("只允许通过 HTTPS 导入 Git 仓库");
    let archiveUrl = url.href;
    let fileName = "kivowiki-mods-repository.zip";
    let source = { repository: url.href };
    if (url.hostname === "github.com") {
      const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
      const repository = rawRepo?.replace(/\.git$/i, "");
      if (!owner || !repository) throw new Error("GitHub 仓库链接缺少所有者或仓库名");
      const metadata = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`, { headers: { Accept: "application/vnd.github+json" } });
      if (!metadata.ok) throw new Error(`GitHub 仓库读取失败（HTTP ${metadata.status}）`);
      const repositoryMetadata = await metadata.json();
      const branch = String(repositoryMetadata.default_branch || "main");
      const commitResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/commits/${encodeURIComponent(branch)}`, { headers: { Accept: "application/vnd.github+json" } });
      const commit = commitResponse.ok ? String((await commitResponse.json()).sha || "") : "";
      archiveUrl = `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/zip/refs/heads/${encodeURIComponent(branch)}`;
      fileName = `${repository}-${branch}.zip`;
      source = { repository: `https://github.com/${owner}/${repository}`, provider: "github", owner, repo: repository, branch, commit };
    } else if (url.hostname === "gitlab.com") {
      const project = url.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "").split("/-/")[0];
      if (!project) throw new Error("GitLab 仓库链接缺少项目路径");
      const metadata = await fetch(`https://gitlab.com/api/v4/projects/${encodeURIComponent(project)}`);
      if (!metadata.ok) throw new Error(`GitLab 仓库读取失败（HTTP ${metadata.status}）`);
      const repositoryMetadata = await metadata.json();
      const branch = String(repositoryMetadata.default_branch || "main");
      const commitResponse = await fetch(`https://gitlab.com/api/v4/projects/${encodeURIComponent(project)}/repository/commits/${encodeURIComponent(branch)}`);
      const commit = commitResponse.ok ? String((await commitResponse.json()).id || "") : "";
      archiveUrl = `https://gitlab.com/${project}/-/archive/${encodeURIComponent(branch)}/${project.split("/").pop()}-${encodeURIComponent(branch)}.zip`;
      fileName = `${project.split("/").pop()}-${branch}.zip`;
      source = { repository: `https://gitlab.com/${project}`, provider: "gitlab", repo: project, branch, commit };
    } else throw new Error("当前仅支持公开 GitHub 或 GitLab 仓库");
    const response = await fetch(archiveUrl, { credentials: "omit", redirect: "follow" });
    if (!response.ok) throw new Error(`仓库压缩包下载失败（HTTP ${response.status}）`);
    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > MAX_BYTES) throw new Error("仓库压缩包超过 100 MB");
    const blob = await response.blob();
    if (blob.size > MAX_BYTES) throw new Error("仓库压缩包超过 100 MB");
    const file = new File([blob], fileName, { type: "application/zip" });
    Object.defineProperty(file, "kivowikiSource", { value: source, enumerable: false });
    return file;
  };

  const checkForUpdate = async (item, forbiddenIds = [], installed = [], installedDependencies = []) => {
    const repository = item?.source?.repository || item?.source?.url;
    if (!repository) return { status: "unavailable", message: "没有 Git 仓库信息" };
    const file = await fetchRepositoryPackage(repository);
    const inspection = await inspectPackage(file, forbiddenIds.filter((id) => id !== item.id), installed, installedDependencies);
    if (inspection.manifest.id !== item.id || inspection.manifest.type !== item.type) throw new Error("远程仓库中的包身份与已安装包不一致");
    const compared = KivowikiModsPlatform.compareVersions(inspection.manifest.version, item.version);
    const commitChanged = Boolean(inspection.manifest.source?.commit && inspection.manifest.source.commit !== item.source?.commit);
    return { status: compared > 0 || (compared === 0 && commitChanged) ? "available" : "current", inspection, latestVersion: inspection.manifest.version, commitChanged };
  };

  globalThis.KivowikiModsStore = { MAX_BYTES, PACKAGE_NAME_PREFIX, storageIdFor, getFile, getText, getPackageFiles, getExtensionText, putText, inspectPackage, inspectBackup, commitPackage, importPackage, importBackup, exportPackage, exportBackup, fetchRepositoryPackage, checkForUpdate, deletePackage, deleteRevisions, getRevisions, rollback };
})();
