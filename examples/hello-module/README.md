# 模块结构示例

这是一个可以直接压缩为 ZIP 导入的完整社区模块项目。它不依赖构建工具，便于从最小例子逐步扩展为复杂功能。

## 目录结构

```text
hello-module/
├─ module.json
├─ README.md
└─ src/
   ├─ index.js
   ├─ config.js
   └─ styles.css
```

## 打包

压缩时保留 `hello-module` 目录或将其中内容作为 ZIP 根目录。导入器会查找 `module.json`，并根据 `entry` 与 `config` 加载文件。

## 扩展方式

- 在 `src/index.js` 中实现页面功能和生命周期。
- 在 `src/config.js` 中实现设置表单。
- 将共享的纯函数拆到 `src/lib/`，将静态资源放入 `assets/`。
- 大型模块建议再划分 `src/ui/`、`src/services/` 和 `tests/`，入口只负责组装。

## 清单说明

示例使用 `manifestVersion: 4` 和 `type: module`，清单显示名称遵循 `Kivowiki-Mods-` 固定前缀，并完整声明页面修改、本地存储、设置和包内资源权限。安装时管理器会逐项展示这些用途。`dependencies` 只引用依赖包，不再引用其他功能模块；`optionalDependencies`、`conflicts`、`claims` 和 `engines` 分别描述可选前置、资源占用、冲突与平台兼容版本。

示例没有数字签名，因此配置中心会正确显示“来源未认证”。签名不能伪造：发布者应在发布流程中使用离线私钥签名，不能把私钥放进模块包或源码仓库。
