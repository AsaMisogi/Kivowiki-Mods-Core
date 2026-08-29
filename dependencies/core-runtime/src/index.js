(() => {
  "use strict";

  const BASE_URL = "https://api.kivo.wiki/api/v1/";
  const LIST_RESOURCES = Object.freeze({
    students: ["data/students", "students"],
    schools: ["data/schools", "school"],
    relations: ["data/relations", "relation"],
    items: ["data/items", "item"],
    models: ["data/models", "model"],
    spines: ["data/spines", "spine"],
    articles: ["articles", "article"],
    news: ["news", "news"],
    comics: ["comics", "comics"],
    galleries: ["galleries", "gallery"],
    musics: ["musics", "music"],
    timeline: ["timeline", "timeline"],
    bulletins: ["bulletins", "bulletin"]
  });

  const createRuntime = (_dependencies = {}, services = {}) => {
    const client = globalThis.KivowikiModsDataClient?.create({
      baseUrl: BASE_URL,
      concurrency: 16,
      maxRetries: 4,
      maxCacheEntries: 512,
      staleIfErrorMs: 30 * 60 * 1000
    });
    if (!client) throw new Error("核心数据客户端尚未加载");

    const request = (path, options = {}) => {
      const input = { ...options, url: new URL(String(path || "").replace(/^\/+/, ""), BASE_URL).href };
      return typeof services.request === "function" ? services.request(input) : client.request(input);
    };
    const list = async (resource, query = {}) => {
      const definition = LIST_RESOURCES[resource];
      if (!definition) throw new Error(`不支持的 KivoWiki 列表资源：${resource}`);
      const [path, dataKey] = definition;
      const result = await request(path, { query: { page: 1, page_size: 50, ...query }, cacheTtlMs: 5 * 60 * 1000 });
      return { items: Array.isArray(result.data?.[dataKey]) ? result.data[dataKey] : [], maxPage: Math.max(1, Number(result.data?.max_page) || 1), raw: result.data };
    };
    const listAll = async (resource, query = {}, options = {}) => {
      const first = await list(resource, query);
      const maxPage = Math.min(first.maxPage, Math.max(1, Number(options.maxPages) || 10000));
      const items = [...first.items];
      options.onPage?.({ page: 1, maxPage, items: first.items.slice() });
      let nextPage = 2;
      const workers = Array.from({ length: Math.min(Math.max(0, maxPage - 1), Math.max(1, Number(options.concurrency) || 8)) }, async () => {
        while (nextPage <= maxPage) {
          const page = nextPage++;
          const result = await list(resource, { ...query, page });
          items.push(...result.items);
          options.onPage?.({ page, maxPage, items: result.items.slice() });
        }
      });
      await Promise.all(workers);
      return { items, maxPage };
    };
    const get = async (resource, id, options = {}) => {
      const definition = LIST_RESOURCES[resource];
      const numericId = Number(id);
      if (!definition || !Number.isInteger(numericId) || numericId <= 0) throw new Error("资源类型或 ID 无效");
      return (await request(`${definition[0]}/${numericId}`, { cacheTtlMs: 10 * 60 * 1000, ...options })).data;
    };
    const schedule = (path, server) => request(path, { query: { server }, cacheTtlMs: 60 * 1000 }).then((result) => result.data);

    return Object.freeze({
      request,
      list,
      listAll,
      get,
      clearCache() {
        client.clearCache();
        return typeof services.clearCache === "function" ? services.clearCache() : undefined;
      },
      resourceUrl(value) {
        const source = String(value || "");
        if (!source) return "";
        if (source.startsWith("//")) return `https:${source}`;
        if (/^https?:\/\//i.test(source)) return source;
        return `https://static.kivo.wiki/${source.replace(/^\/+/, "")}`;
      },
      kivoApi: Object.freeze({
        list,
        listAll,
        get,
        async listStudents(query = {}) {
          const result = await list("students", { page: 1, page_size: 50, ...query });
          return { students: result.items, maxPage: result.maxPage };
        },
        getStudent: (id) => get("students", id),
        getSchool: (id) => get("schools", id),
        getRelation: (id) => get("relations", id),
        getItem: (id) => get("items", id),
        getArticle: (id) => get("articles", id),
        getNews: (id) => get("news", id),
        getComic: (id) => get("comics", id),
        getGallery: (id) => get("galleries", id),
        getMusic: (id) => get("musics", id),
        getTimeline: (id) => get("timeline", id),
        getBulletin: (id) => get("bulletins", id),
        getWeeklyBirthdays: () => request("data/students/birthday/week", { cacheTtlMs: 10 * 60 * 1000 }).then((result) => result.data),
        getPickUp: (server = "jp") => schedule("data/pick_up", server),
        getRaidNow: (server = "jp") => schedule("data/raid/now", server),
        getEventNow: (server = "jp") => schedule("data/event/now", server),
        getLuckyItem: () => request("data/lucky_item", { cacheTtlMs: 60 * 1000 }).then((result) => result.data),
        getStatistics: () => request("statistics/index", { cacheTtlMs: 5 * 60 * 1000 }).then((result) => result.data),
        getFileServer: () => request("upload/file_server", { cacheTtlMs: 60 * 60 * 1000 }).then((result) => result.data)
      })
    });
  };

  const dependency = Object.freeze({
    id: "core-runtime",
    name: "Kivowiki-Mods-core-runtime",
    version: "1.1.0",
    type: "dependency",
    builtin: true,
    scoped: true,
    description: "提供共享只读请求、完整 KivoWiki API 查询、批量分页、缓存与资源地址规范化能力。",
    author: "朝禊ASOGI",
    source: { registry: "builtin" },
    review: { status: "approved", reviewer: "Kivowiki-Mods", reviewedAt: "2026-08-29" },
    engines: { kivowikiMods: "^1.4.0", api: "^1.1.0" },
    exports: { request: "function", list: "function", listAll: "function", get: "function", clearCache: "function", resourceUrl: "function", kivoApi: "object" },
    claims: { globals: [], pageSelectors: [], routes: [] },
    create: createRuntime,
    sourceCode: `({create(_dependencies,services){
      const base="https://api.kivo.wiki/api/v1/";const resources={students:["data/students","students"],schools:["data/schools","school"],relations:["data/relations","relation"],items:["data/items","item"],models:["data/models","model"],spines:["data/spines","spine"],articles:["articles","article"],news:["news","news"],comics:["comics","comics"],galleries:["galleries","gallery"],musics:["musics","music"],timeline:["timeline","timeline"],bulletins:["bulletins","bulletin"]};
      const request=(path,options={})=>{if(!services||typeof services.request!=="function")throw new Error("当前运行模式不提供 KivoWiki 网络能力");return services.request({...options,url:new URL(String(path||"").replace(/^\\/+/,""),base).href});};
      const list=async(resource,query={})=>{const definition=resources[resource];if(!definition)throw new Error("不支持的 KivoWiki 列表资源："+resource);const result=await request(definition[0],{query:{page:1,page_size:50,...query},cacheTtlMs:300000});return{items:Array.isArray(result.data?.[definition[1]])?result.data[definition[1]]:[],maxPage:Math.max(1,Number(result.data?.max_page)||1),raw:result.data};};
      const listAll=async(resource,query={},options={})=>{const first=await list(resource,query),maxPage=Math.min(first.maxPage,Math.max(1,Number(options.maxPages)||10000)),items=[...first.items];options.onPage?.({page:1,maxPage,items:first.items.slice()});let nextPage=2;await Promise.all(Array.from({length:Math.min(Math.max(0,maxPage-1),Math.max(1,Number(options.concurrency)||8))},async()=>{while(nextPage<=maxPage){const page=nextPage++,result=await list(resource,{...query,page});items.push(...result.items);options.onPage?.({page,maxPage,items:result.items.slice()});}}));return{items,maxPage};};
      const get=async(resource,id,options={})=>{const definition=resources[resource],numericId=Number(id);if(!definition||!Number.isInteger(numericId)||numericId<=0)throw new Error("资源类型或 ID 无效");return(await request(definition[0]+"/"+numericId,{cacheTtlMs:600000,...options})).data;};
      const resourceUrl=value=>{const source=String(value||"");return !source?"":source.startsWith("//")?"https:"+source:/^https?:\\/\\//i.test(source)?source:"https://static.kivo.wiki/"+source.replace(/^\\/+/,"");};
      const schedule=(path,server)=>request(path,{query:{server},cacheTtlMs:60000}).then(result=>result.data);const kivoApi=Object.freeze({list,listAll,get,async listStudents(query={}){const result=await list("students",{page:1,page_size:50,...query});return{students:result.items,maxPage:result.maxPage};},getStudent:id=>get("students",id),getSchool:id=>get("schools",id),getRelation:id=>get("relations",id),getItem:id=>get("items",id),getArticle:id=>get("articles",id),getNews:id=>get("news",id),getComic:id=>get("comics",id),getGallery:id=>get("galleries",id),getMusic:id=>get("musics",id),getTimeline:id=>get("timeline",id),getBulletin:id=>get("bulletins",id),getWeeklyBirthdays:()=>request("data/students/birthday/week",{cacheTtlMs:600000}).then(result=>result.data),getPickUp:(server="jp")=>schedule("data/pick_up",server),getRaidNow:(server="jp")=>schedule("data/raid/now",server),getEventNow:(server="jp")=>schedule("data/event/now",server),getLuckyItem:()=>request("data/lucky_item",{cacheTtlMs:60000}).then(result=>result.data),getStatistics:()=>request("statistics/index",{cacheTtlMs:300000}).then(result=>result.data),getFileServer:()=>request("upload/file_server",{cacheTtlMs:3600000}).then(result=>result.data)});return Object.freeze({request,list,listAll,get,clearCache(){return typeof services.clearCache==="function"?services.clearCache():undefined;},resourceUrl,kivoApi});
    }})`
  });

  globalThis.KivowikiModsDependencies = globalThis.KivowikiModsDependencies || [];
  globalThis.KivowikiModsDependencies = globalThis.KivowikiModsDependencies.filter((item) => item?.id !== dependency.id);
  globalThis.KivowikiModsDependencies.push(dependency);
})();
