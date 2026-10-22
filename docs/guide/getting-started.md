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
npm run docs:dev
```

启动后访问 `http://localhost:5173`，修改 `docs/` 下的 Markdown 文件会即时热更新。

## 构建静态站点

```bash
npm run docs:build
```

产物输出到 `docs/.vitepress/dist/`，是纯静态文件，可直接部署。

## 预览构建产物

```bash
npm run docs:preview
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
