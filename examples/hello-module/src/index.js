({
  async mount(context) {
    const style = document.createElement("style");
    const panel = document.createElement("aside");
    const title = document.createElement("h3");
    const text = document.createElement("p");
    const button = document.createElement("button");
    let settings = { count: 0, ...context.settings };

    style.textContent = await context.assets.getText("src/styles.css");
    panel.className = "kivo-example-panel";
    title.textContent = "模块结构示例";
    button.type = "button";
    button.textContent = "点击计数";

    const render = () => { text.textContent = `已点击 ${Number(settings.count) || 0} 次`; };
    button.addEventListener("click", async () => {
      settings = { ...settings, count: (Number(settings.count) || 0) + 1 };
      await context.saveSettings(settings);
      render();
    });
    context.onSettingsChange((next) => { settings = { ...settings, ...next }; render(); });
    panel.append(title, text, button);
    document.head.append(style);
    document.body.append(panel);
    render();
    context.onCleanup(() => { style.remove(); panel.remove(); });
  }
})
