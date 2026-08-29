(function registerKivowikiModsDataClient() {
  "use strict";

  const DEFAULT_TIMEOUT = 30000;
  const DEFAULT_MAX_RETRIES = 4;
  const DEFAULT_CONCURRENCY = 16;
  const DEFAULT_MAX_CACHE_ENTRIES = 512;
  const sleep = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

  class DataClientError extends Error {
    constructor(message, details = {}) {
      super(message);
      this.name = "KivowikiModsDataClientError";
      Object.assign(this, details);
    }
  }

  const normalizeQuery = (query) => {
    if (!query) return new URLSearchParams();
    if (query instanceof URLSearchParams) return new URLSearchParams(query);
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value == null) return;
      if (Array.isArray(value)) value.forEach((item) => params.append(key, String(item)));
      else params.set(key, String(value));
    });
    return params;
  };

  const parsePayload = async (response) => {
    const text = await response.text();
    if (!text) return null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("json") || /^[\[{]/.test(text.trim())) {
      try { return JSON.parse(text); } catch { /* 保留非标准 JSON 文本，交由模块决定如何处理。 */ }
    }
    return text;
  };

  const create = ({
    fetchImpl = globalThis.fetch.bind(globalThis),
    baseUrl = "",
    concurrency = DEFAULT_CONCURRENCY,
    maxRetries = DEFAULT_MAX_RETRIES,
    maxCacheEntries = DEFAULT_MAX_CACHE_ENTRIES,
    staleIfErrorMs = 0
  } = {}) => {
    const cache = new Map();
    const inflight = new Map();
    let active = 0;
    const pending = [];

    const trimCache = () => {
      while (cache.size > Math.max(16, Number(maxCacheEntries) || DEFAULT_MAX_CACHE_ENTRIES)) cache.delete(cache.keys().next().value);
    };
    const run = async (job) => {
      if (active >= Math.max(1, Math.min(Number(concurrency) || DEFAULT_CONCURRENCY, 64))) await new Promise((resolve) => pending.push(resolve));
      active += 1;
      try { return await job(); }
      finally {
        active -= 1;
        pending.shift()?.();
      }
    };

    const request = async (input) => {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new DataClientError("数据请求参数必须是对象");
      if (typeof input.url !== "string" || !input.url.trim()) throw new DataClientError("数据请求缺少 URL");
      const method = String(input.method || "GET").toUpperCase();
      if (!["GET", "HEAD"].includes(method)) throw new DataClientError("数据客户端只允许只读请求");
      const url = new URL(String(input.url || ""), baseUrl || globalThis.location?.href);
      if (!["http:", "https:"].includes(url.protocol)) throw new DataClientError("数据请求 URL 协议无效");
      normalizeQuery(input.query).forEach((value, key) => url.searchParams.append(key, value));
      const headers = Object.fromEntries(Object.entries(input.headers || {}).filter(([key]) => !/^(authorization|cookie|set-cookie)$/i.test(key)));
      const headerKey = Object.entries(headers).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key.toLowerCase()}:${value}`).join("\n");
      const cacheKey = `${method} ${url.href}\n${input.envelope === "raw" ? "raw" : "data"}\n${headerKey}`;
      const cacheTtl = Math.max(0, Math.min(Number(input.cacheTtlMs) || 0, 24 * 60 * 60 * 1000));
      const cached = cache.get(cacheKey);
      if (cacheTtl && cached && cached.expiresAt > Date.now()) return { ...cached.value, fromCache: true };
      const timeoutMs = Math.max(1000, Math.min(Number(input.timeoutMs) || DEFAULT_TIMEOUT, 180000));
      const retries = Math.max(0, Math.min(input.retries == null ? maxRetries : Number(input.retries), 8));
      const externalSignal = input.signal;
      const inflightKey = input.dedupe === false ? "" : cacheKey;
      if (inflightKey && inflight.has(inflightKey)) return inflight.get(inflightKey);
      const operation = run(async () => {
        let lastError;
        for (let attempt = 0; attempt <= retries; attempt += 1) {
          if (externalSignal?.aborted) throw new DataClientError("数据请求已取消", { code: "ABORTED" });
          const controller = new AbortController();
          const abort = () => controller.abort();
          externalSignal?.addEventListener("abort", abort, { once: true });
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const response = await fetchImpl(url.href, { method, headers: { Accept: "application/json, text/plain", ...headers }, signal: controller.signal, credentials: "omit" });
            const data = await parsePayload(response);
            if (!response.ok) throw new DataClientError(`数据服务返回 HTTP ${response.status}`, { status: response.status, data });
            if (data && typeof data === "object" && data.success === false) throw new DataClientError(data.message || "数据服务业务失败", { status: response.status, code: data.code, data });
            const value = {
              data: input.envelope === "raw" || !data || typeof data !== "object" || data.success !== true ? data : data.data,
              status: response.status,
              headers: Object.fromEntries(response.headers.entries()),
              url: url.href,
              fromCache: false
            };
            if (cacheTtl && method === "GET") { cache.set(cacheKey, { expiresAt: Date.now() + cacheTtl, value }); trimCache(); }
            return value;
          } catch (error) {
            lastError = error.name === "AbortError" ? new DataClientError("数据请求超时", { code: "TIMEOUT" }) : error;
            const status = lastError.status;
            const retryable = !status || status === 408 || status === 429 || status >= 500;
            if ((!retryable || attempt >= retries) && cached && Date.now() - cached.expiresAt <= Math.max(0, Number(input.staleIfErrorMs) || Number(staleIfErrorMs) || 0)) {
              return { ...cached.value, fromCache: true, stale: true };
            }
            if (!retryable || attempt >= retries) throw lastError;
            const retryAfter = Number(lastError?.data?.retry_after || 0) * 1000;
            await sleep(Math.max(retryAfter, Math.min(12000, 350 * (2 ** attempt) + Math.round(Math.random() * 200))));
          } finally {
            clearTimeout(timer);
            externalSignal?.removeEventListener("abort", abort);
          }
        }
        throw lastError || new DataClientError("数据请求失败");
      });
      if (inflightKey) inflight.set(inflightKey, operation);
      try { return await operation; }
      finally { if (inflightKey && inflight.get(inflightKey) === operation) inflight.delete(inflightKey); }
    };

    const requestAllPages = async (input, { dataKey, maxPages = 10000, concurrency: pageConcurrency = 8, onPage } = {}) => {
      if (!dataKey || typeof dataKey !== "string") throw new DataClientError("批量分页请求缺少 dataKey");
      const pageSize = Math.max(1, Number(input?.query?.page_size) || 100);
      const first = await request({ ...input, query: { ...(input.query || {}), page: 1, page_size: pageSize }, envelope: "raw" });
      const firstData = first.data?.success === true ? first.data.data : first.data;
      const total = Math.min(Math.max(1, Number(firstData?.max_page) || 1), Math.max(1, Number(maxPages) || 10000));
      const items = Array.isArray(firstData?.[dataKey]) ? [...firstData[dataKey]] : [];
      onPage?.({ page: 1, maxPage: total, items: items.slice() });
      let nextPage = 2;
      const workers = Array.from({ length: Math.min(total - 1, Math.max(1, Number(pageConcurrency) || 8)) }, async () => {
        while (nextPage <= total) {
          const page = nextPage++;
          const result = await request({ ...input, query: { ...(input.query || {}), page, page_size: pageSize }, envelope: "raw" });
          const data = result.data?.success === true ? result.data.data : result.data;
          const pageItems = Array.isArray(data?.[dataKey]) ? data[dataKey] : [];
          items.push(...pageItems);
          onPage?.({ page, maxPage: total, items: pageItems.slice() });
        }
      });
      await Promise.all(workers);
      return { items, maxPage: total };
    };

    return { request, requestAllPages, clearCache: () => cache.clear() };
  };

  globalThis.KivowikiModsDataClient = { create, DataClientError };
})();
