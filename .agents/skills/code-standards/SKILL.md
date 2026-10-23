\---  
name: code-standards  
description: 本仓库（ike_press / VitePress Flutter 组件文档站）的代码与内容编写规范。新增或修改任何 Markdown 文档、Vue 主题组件、Dart 示例代码、目录结构时必须遵循。  
\---

# 代码编写规范（Code Standards）

适用于 ike_press 全站：VitePress 文档内容（Markdown）、`.vitepress/theme` 下的 Vue 主题组件、以及文档内嵌的 Dart 示例代码。所有 AI 编码助手与人工提交一律遵循本规范。

## 1. 项目与目录约定

- 技术栈：VitePress `^1.6` + Vue 3（`<script setup>` 组合式 API），纯前端静态站，`"type": "module"`（一律 ESM `import`）。
- 文档正文放在 `docs/`；中文站在 `docs/`，英文站在 `docs/en/`，两侧目录与文件名**一一对应**（如 `docs/flutter/components/container.md` ↔ `docs/en/flutter/components/container.md`）。
- 组件文档放 `docs/{lang}/flutter/components/<component>.md`，文件名全小写、无分隔（如 `bottomnavigationbar.md`）。
- 主题代码放 `docs/.vitepress/theme/`，自定义组件放其 `components/` 子目录，样式放 `styles/`。
- 新增文档页必须手动在 `docs/.vitepress/config.*` 的侧边栏（sidebar）注册，否则页面不可达。

## 2. Markdown 文档规范

- 每篇组件文档顶部用 frontmatter 声明式配置 UI：至少包含 `pageClass: flutter-doc`（启用加宽右栏预览样式）与 `preview`（Flutter Web 预览地址，暂空则写 `''`）。
- 标题层级：`#` 组件名（唯一）→ `##` 各示例/API 小节 → `###` 子参数表；不得跳级或并列多个 `#`。
- 内链使用 VitePress 相对路径且**不带** `.md` 后缀（如 `/flutter/components/container`）。
- 提示块统一用 VitePress 容器语法：`::: tip` / `::: warning` / `::: danger` / `::: details`，成对闭合。
- 引用外部资源链接一律用 HTML 内联标签 `<a target="_blank" href="...">`，不要用 Markdown 扩展语法（如 `{target="_blank"}`），VitePress 不支持后者。

## 3. Dart 示例代码规范（重点）

每个 ` ```dart ` 代码块必须是**自包含、可直接复制运行**的完整单元：

- **必须自带依赖导入**：块内首行写 `import 'package:flutter/material.dart';`，import 与后续内容之间空一行。若示例用到 `Cupertino`、`dart:async` 等，额外补对应 import。
- 每个示例是一个独立的可运行 Widget 类（`XxxDemo extends StatelessWidget/StatefulWidget`），并在上一行用注释标注示例语义 id：`/// 示例: <component>-<variant> —— <一句话说明>`，id 全站唯一，供预览系统映射。
- 代码风格遵循 Dart 官方规范：2 空格缩进、尾逗号、`const` 优先、私有成员 `_` 前缀、类名 `PascalCase`、其余 `camelCase`。
- 只依赖 Flutter SDK 内置能力，不引入三方包（本项目定位是讲清官方组件）。

## 4. Vue / JS / TS 规范

- 组件用 `<script setup>`，props 显式声明，事件用 `defineEmits`。
- 变量 `camelCase`，组件文件与组件名 `PascalCase`，常量 `UPPER_SNAKE_CASE`。
- 字符串单引号、语句加分号、箭头函数优先，遵循仓库 Prettier 配置。
- 避免全局副作用；主题增强逻辑集中在 `.vitepress/theme/index` 注册。
- 静态基础数据用本地 JSON，不硬编码在组件里；不在源码中写死密钥、token 等敏感信息。

## 5. CSS 规范

- 覆盖 scoped 样式时用足够具体的选择器，且**特殊字符必须转义**（如 class 含冒号 `text-2xl` 需写成 `.text-2xl` 的选择器要转义 `\:`）。
- 隐藏整棵无可见后代的子树用 `display: none`（而非 `visibility`），避免仍占位导致布局撑爆。
- 主题样式集中在 `styles/`，页面级样式随组件走 scoped。

## 6. 通用工程原则

- 改动最小化：只动与需求直接相关的文件；跨会话批量修改前**必须先读磁盘现状**，不用历史记忆代替实读。
- 一次改动的文本参数总行数尽量集中、相关修改合并处理，避免碎片化编辑。
- 保持中英文两侧结构、示例 id 集合一致；批量产出后用脚本统计两侧数量做兜底比对。
- 提交前本地 `npm run dev` 或 `npm run build` 自检，确保无渲染报错、无死链。
