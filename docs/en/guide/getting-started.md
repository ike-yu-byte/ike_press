# Quick Start

## Requirements

- Node.js >= 18 (verified on v24 for this project)
- npm >= 9

## Install dependencies

```bash
npm install
```

## Local development

```bash
npm run dev
```

Then visit `http://localhost:5173`. Editing Markdown files under `docs/` hot-updates instantly.

## Build the static site

```bash
npm run build
```

Output goes to `docs/.vitepress/dist/` — pure static files, ready to deploy.

## Preview the build output

```bash
npm run preview
```

## Common syntax

### Frontmatter

Each Markdown file can start with a YAML block to configure the page:

```yaml
---
title: Page Title
description: Page description
---
```

### Admonitions

Common containers (must be written in pairs):

```md
::: info
Additional note
:::

::: tip
Recommended practice
:::

::: warning
Heads up
:::

::: danger
Danger
:::

::: details
Click to expand
:::
```

### Embedding Vue components

`.md` is `.html` — Vue component syntax works out of the box:

```md
<MyComponent />
```

Register global components in `docs/.vitepress/theme/index.ts`.
