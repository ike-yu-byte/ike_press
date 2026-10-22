# Project Structure

```
ike_press/
├─ package.json                 # Scripts and dependencies
└─ docs/                        # Source directory (VitePress srcDir)
   ├─ .vitepress/
   │  ├─ config.mts             # Site config: nav, sidebar, search, i18n locales, etc.
   │  └─ theme/
   │     ├─ index.ts            # Custom theme entry (extends the default theme)
   │     └─ styles/var.css      # Brand colors and other CSS variable overrides
   ├─ public/                   # Static assets, copied to site root as-is on build
   │  └─ favicon.png
   ├─ index.md                  # Site homepage (home layout, Chinese)
   ├─ guide/                    # Chinese guide chapters
   └─ en/                       # English content (served under /en/)
      ├─ index.md               # English homepage
      └─ guide/                 # English guide chapters
```

## Key conventions

| Location | Purpose |
| --- | --- |
| `docs/**.md` | Each `.md` file maps to one route |
| `docs/.vitepress/config.mts` | Single entry for all site-level configuration |
| `docs/.vitepress/theme/` | Theme customization, global components, style overrides |
| `docs/public/` | Static assets excluded from compilation |
| `docs/.vitepress/dist/` | Output of `npm run build` (never edit or commit) |

## Internationalization

Content is organized by locale: Chinese lives at the site root, English under `docs/en/`.
The `locales` option in `config.mts` defines each language's `label`, `lang`, `link` and its own `themeConfig` (nav / sidebar / UI texts) — which also renders the language switcher in the navbar.

When adding a page, mirror it in both languages:

1. Create the file under `docs/...` (Chinese) and the matching one under `docs/en/...` (English)
2. Register both in the corresponding locale's `nav` / `sidebar` in `config.mts`

## Adding a new section

1. Create a directory and Markdown files under `docs/`, e.g. `docs/faq/index.md`
2. Add an entry to `nav` and a `sidebar` group for that path in `config.mts`
3. Save and refresh — the new page is live

## Deployment note

If the site is deployed under a non-root path (e.g. GitHub Pages `/repo-name/`), set `base: '/repo-name/'` in `config.mts`.
