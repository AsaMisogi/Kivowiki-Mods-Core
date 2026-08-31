/*
 * Kivowiki-Mods 编辑精选配置。
 *
 * 发布者可以在下面添加对象。repository 填公开 GitHub/GitLab 仓库页，
 * version 用于准确显示已安装/可升级状态；packageUrl 可用于直接下载 ZIP 或 JSON 包，
 * 两者都为空时只展示介绍，不显示安装按钮。
 * 该文件为空数组时设置页不会显示推荐区，不会影响扩展运行。
 */
globalThis.KivowikiModsRecommendations = [
  {
    id: "beautify",
    title: "Kivowiki-Mods-beautify",
    description: "为 KivoWiki 提供组件动效、页面主题、首页布局、昼夜背景和字体自定义。",
    repository: "https://github.com/AsaMisogi/Kivowiki-Mods-beautify",
    version: "1.5.2",
    type: "module"
  },
  // {
  //   title: "示例：阅读进度条",
  //   description: "在文章顶部显示当前阅读进度。",
  //   repository: "https://github.com/example/kivowiki-mods-reading-progress",
  //   type: "module"
  // },
  // {
  //   title: "示例：共享渲染器",
  //   description: "为多个模块提供统一的文本渲染能力。",
  //   repository: "https://github.com/example/kivowiki-mods-shared-renderer",
  //   type: "dependency"
  // }
];
