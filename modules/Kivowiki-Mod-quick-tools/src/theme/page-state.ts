const HOME_CLASS = "kq-route-home";
const HOME_TOP_CLASS = "kq-home-top";

/**
 * KivoWiki 是 SPA，宿主提供的 pathname 只代表模块挂载瞬间。这里仅监听路由
 * 信号和主滚动容器，不观察整个页面 DOM，也不在滚动时读取布局信息。
 */
export const observePageState = (): (() => void) => {
  const html = document.documentElement;
  let scrollContainer: HTMLElement | null = null;
  let frame = 0;
  let retryTimer = 0;
  let retriesRemaining = 20;

  const updateScrollState = () => {
    frame = 0;
    const isHome = location.pathname === "/";
    html.classList.toggle(HOME_CLASS, isHome);
    html.classList.toggle(HOME_TOP_CLASS, isHome && (scrollContainer?.scrollTop ?? 0) <= 8);
  };
  const scheduleScrollUpdate = () => {
    if (!frame) frame = requestAnimationFrame(updateScrollState);
  };
  const bindScrollContainer = () => {
    const next = document.querySelector<HTMLElement>(".n-layout-scroll-container .n-scrollbar-container");
    if (next !== scrollContainer) {
      scrollContainer?.removeEventListener("scroll", scheduleScrollUpdate);
      scrollContainer = next;
      scrollContainer?.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
    }
    scheduleScrollUpdate();
    // 路由切换时旧容器可能短暂存在，因此在两秒窗口内允许容器被替换。
    // 每次只执行一个 querySelector，不观察业务 DOM，也不会形成常驻轮询。
    if (retriesRemaining > 0) {
      retriesRemaining -= 1;
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(bindScrollContainer, 100);
    } else {
      window.clearTimeout(retryTimer);
    }
  };
  const scheduleRouteUpdate = () => {
    // Vue 在点击后的微任务中提交路由，并可能异步替换滚动容器。
    retriesRemaining = 20;
    window.clearTimeout(retryTimer);
    queueMicrotask(bindScrollContainer);
  };
  const onDocumentClick = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest("a[href]")) scheduleRouteUpdate();
  };

  const title = document.querySelector("title");
  const titleObserver = title ? new MutationObserver(scheduleRouteUpdate) : null;
  titleObserver?.observe(title!, { childList: true, characterData: true, subtree: true });
  document.addEventListener("click", onDocumentClick, { capture: true, passive: true });
  window.addEventListener("popstate", scheduleRouteUpdate);
  window.addEventListener("hashchange", scheduleRouteUpdate);
  bindScrollContainer();

  return () => {
    if (frame) cancelAnimationFrame(frame);
    window.clearTimeout(retryTimer);
    titleObserver?.disconnect();
    scrollContainer?.removeEventListener("scroll", scheduleScrollUpdate);
    document.removeEventListener("click", onDocumentClick, true);
    window.removeEventListener("popstate", scheduleRouteUpdate);
    window.removeEventListener("hashchange", scheduleRouteUpdate);
    html.classList.remove(HOME_CLASS, HOME_TOP_CLASS);
  };
};
