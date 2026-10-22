# 目录结构

```
ike_press/
├─ package.json                 # 脚本命令与依赖
└─ docs/                        # 文档源目录（VitePress srcDir）
   ├─ .vitepress/
   │  ├─ config.mts             # 站点配置：导航、侧边栏、搜索、主题等
   │  └─ theme/
   │     ├─ index.ts            # 自定义主题入口（扩展默认主题）
   │     └─ styles/var.css      # 品牌色等 CSS 变量覆盖
   ├─ public/                   # 静态资源，构建时原样拷贝到站点根目录
   │  └─ favicon.png
   ├─ index.md                  # 站点首页（home 布局）
   └─ guide/                    # 指南章节
      ├─ index.md               # /guide/ 介绍
      ├─ getting-started.md     # 快速开始
      └─ project-structure.md   # 本页
```

## 关键约定

| 位置 | 作用 |
| --- | --- |
| `docs/**.md` | 一个 `.md` 文件对应一个路由页面 |
| `docs/.vitepress/config.mts` | 所有站点级配置的唯一入口 |
| `docs/.vitepress/theme/` | 主题定制、全局组件注册、样式覆盖 |
| `docs/public/` | 不参与编译的静态资源 |
| `docs/.vitepress/dist/` | `docs:build` 的输出目录（勿手动修改、勿提交） |

## 如何新增一个章节

1. 在 `docs/` 下新建目录与 Markdown 文件，例如 `docs/faq/index.md`
2. 在 `config.mts` 的 `nav` 中添加入口，在 `sidebar` 中为该路径配置侧边栏
3. 保存后刷新浏览器即可看到新页面

## 部署提示

若站点部署在非根路径（如 GitHub Pages 的 `/仓库名/`），需要在 `config.mts` 中设置 `base: '/仓库名/'`。
