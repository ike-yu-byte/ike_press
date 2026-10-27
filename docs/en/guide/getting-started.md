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

The build output goes to **`dist/` at the repository root** — pure static files, ready to deploy.

::: info Default location vs this project's change
- **VitePress default**: output lands in `docs/.vitepress/dist/` (i.e. `.vitepress/dist` under `srcDir`).
- **This project moved it to the root `dist/`**: a single line `outDir: '../dist'` was added to `docs/.vitepress/config.mts` (resolved relative to `srcDir`, i.e. `docs/`: `docs/../dist` → root `dist/`). `outDir` is the only knob — the `npm run build` script itself takes no output-directory flag.
- **Why**: the deploy workflow `.github/workflows/deploy.yml` uploads `dist/*` straight to the server, so a root-level path is the shortest and clearest.

To revert to the default, just delete the `outDir` line — but also update `source: "dist/*"` in `deploy.yml` to `docs/.vitepress/dist/*`. Note `dist/` is already in `.gitignore`, so it's never committed.
:::

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
