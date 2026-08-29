({
  mount(context) {
    const style = document.createElement("style");
    style.textContent = `body { margin: 0; padding: 24px; color: #1c2933; background: #fff; font: 14px/1.5 system-ui, sans-serif; } label { display: grid; gap: 6px; } input { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #cbd8da; border-radius: 5px; } small { color: #6b7a84; }`;
    const label = document.createElement("label");
    const title = document.createElement("strong");
    const input = document.createElement("input");
    const hint = document.createElement("small");
    title.textContent = "初始计数";
    hint.textContent = "保存后将在下次点击时使用。";
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.value = String(Math.max(0, Number(context.settings.count) || 0));
    input.addEventListener("change", () => context.saveSettings({ ...context.settings, count: Math.max(0, Number(input.value) || 0) }));
    label.append(title, input, hint);
    document.body.append(style, label);
    context.onSettingsChange((settings) => { input.value = String(Math.max(0, Number(settings.count) || 0)); });
    context.onCleanup(() => { style.remove(); label.remove(); });
  }
})
