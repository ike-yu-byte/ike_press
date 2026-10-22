# IKE Press

基于 [VitePress](https://vitepress.dev/) 搭建的个人站点（代码与闲话）。

## 技术栈

- [VitePress](https://vitepress.dev/) 1.x — 静态站点生成器
- [Vue](https://vuejs.org/) 3.x — 主题与组件层
- Node.js >= 18（开发验证于 v24）

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发（已默认开放局域网访问，--host 0.0.0.0）
npm run dev

# 构建静态产物，输出到 docs/.vitepress/dist
npm run build

# 本地预览构建产物
npm run preview
```

开发服务器默认地址：`http://localhost:5173`，同一局域网设备可通过终端输出的 Network 地址访问。

## 目录结构

```
ike_press/
├─ package.json                 # 脚本命令与依赖
└─ docs/                        # 文档源目录（srcDir）
   ├─ .vitepress/
   │  ├─ config.mts             # 站点配置：导航、侧边栏、搜索、页脚备案等
   │  └─ theme/
   │     ├─ index.ts            # 自定义主题入口（扩展默认主题）
   │     └─ styles/var.css      # 品牌色、首页 hero 光晕背景等 CSS 变量
   ├─ public/                   # 静态资源，构建时原样拷贝到站点根目录
   │  └─ favicon.png            # 站点图标 / 首页 hero 图
   ├─ index.md                  # 首页（home 布局：hero + features）
   └─ guide/                    # 指南章节
```

## 写作约定

- 一个 `.md` 文件对应一个路由页面，站内链接写最终路由（如 `/guide/getting-started`），不要指向 `.md` 路径
- 新章节需在 `docs/.vitepress/config.mts` 的 `nav` / `sidebar` 中登记入口
- 标题层级保持连续（h2 → h3），右侧「本页目录」收录 h2 ~ h3
- 主题定制统一改 `docs/.vitepress/theme/styles/var.css`，不直接覆盖组件样式

## 已配置能力

| 能力 | 位置 |
| --- | --- |
| 中文界面（导航 / 侧边栏 / 搜索 / 页脚） | `config.mts` → `themeConfig` |
| 本地全文搜索（无需外部服务） | `config.mts` → `search.provider: 'local'` |
| 深色模式 | 默认主题内置 |
| 页脚备案链接（可点击跳转工信部） | `config.mts` → `footer.copyright` |
| 首页 hero 光晕背景 | `theme/styles/var.css` → `--vp-home-hero-image-*` |
| 最后更新时间 / 干净 URL | `config.mts` → `lastUpdated` / `cleanUrls` |

## 部署

`npm run build` 后，将 `docs/.vitepress/dist/` 部署到任意静态托管（GitHub Pages、Vercel、Nginx 等）。

若部署在非根路径（如 GitHub Pages 的 `/仓库名/`），需先在 `config.mts` 中设置 `base: '/仓库名/'`。

## 许可

基于 MIT 许可发布。
