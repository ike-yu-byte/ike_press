# 快速开始

## 环境要求

- Node.js >= 18（本项目在 v24 下验证通过）
- npm >= 9

## 安装依赖

```bash
npm install
```

## 本地开发

```bash
npm run dev
```

启动后访问 `http://localhost:5173`，修改 `docs/` 下的 Markdown 文件会即时热更新。

## 构建静态站点

```bash
npm run build
```

构建产物输出到**仓库根目录的 `dist/`**，是纯静态文件，可直接部署。

::: info 默认位置 vs 本项目的改动
- **VitePress 默认**：产物输出到 `docs/.vitepress/dist/`（即 `srcDir` 下的 `.vitepress/dist`）。
- **本项目改成了仓库根 `dist/`**：在 `docs/.vitepress/config.mts` 里加了一行 `outDir: '../dist'`（相对 `srcDir`（即 `docs/`）解析：`docs/../dist` → 根目录 `dist/`）。`outDir` 只认这一个配置，`npm run build` 脚本本身不带输出目录参数。
- **为什么改**：部署工作流 `.github/workflows/deploy.yml` 直接取 `dist/*` 上传到服务器，放根目录路径最短、最直观。

如果以后要改回默认，删掉 `outDir` 这行即可，但需同步把 `deploy.yml` 里的 `source: "dist/*"` 改成 `docs/.vitepress/dist/*`。另外 `dist/` 已在 `.gitignore` 中，不会被提交。
:::

## 预览构建产物

```bash
npm run preview
```

## 常用写法

### Frontmatter

每个 Markdown 文件顶部可用 YAML 头配置页面：

```yaml
---
title: 页面标题
description: 页面描述
---
```

### 提示块

常用提示块（需成对书写）：

```md
::: info
补充说明
:::

::: tip
推荐做法
:::

::: warning
注意
:::

::: danger
警告
:::

::: details
点击展开更多
:::
```

### 嵌入 Vue 组件

`.md` 即 `.html`，可直接使用 Vue 组件语法：

```md
<MyComponent />
```

全局组件在 `docs/.vitepress/theme/index.ts` 中注册。
