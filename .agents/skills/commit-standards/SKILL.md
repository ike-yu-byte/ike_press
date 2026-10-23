---
name: commit-standards
description: 本仓库的 Git 代码提交规范。生成或执行任何 git commit、撰写提交信息、拆分/整理提交、编写 CHANGELOG 时必须遵循。基于 Conventional Commits，描述统一用中文。
---

# 代码提交规范（Commit Standards）

本仓库提交信息遵循 **Conventional Commits**，描述**统一使用中文**。所有 AI 助手生成提交、以及人工 `git commit` 一律遵循本规范。

## 1. 提交信息格式

```
<type>(<scope>): <中文描述>

[可选正文：说明动机、影响、与上一版本的对比，每行不超过 72 字符]

[可选脚注：BREAKING CHANGE: ... / Closes #123 ...]
```

- `<type>`：见下方枚举，必填、全小写。
- `<scope>`：可选，改动所属模块，用小写短词（见第 3 节）。
- 冒号 `:` 后**必须有一个空格**，再接中文描述。
- 中文描述：简洁说明「改了什么、为什么」，**结尾不加句号**，标题行 ≤ 72 字符。

## 2. type 取值

| type | 含义 |
| --- | --- |
| `feat` | 新增功能 / 新增文档页 / 新增示例 |
| `fix` | 修复 Bug（渲染错误、逻辑缺陷、死链） |
| `docs` | 文档内容本身增删改（README、注释、示例文案） |
| `style` | 格式/样式，不影响逻辑（缩进、Prettier、CSS 视觉微调） |
| `refactor` | 重构（非新增功能、也非修 Bug） |
| `perf` | 性能优化（构建、渲染提速） |
| `test` | 新增/调整测试 |
| `build` | 构建系统 / 依赖 / VitePress 配置改动 |
| `ci` | CI/CD 工作流改动 |
| `chore` | 杂项（脚本、脚手架、清理，不改源码逻辑） |
| `revert` | 回滚某次提交 |

## 3. scope 建议取值（ike_press）

按改动落点选择，可省略：

- `docs` — `docs/**` 文档正文
- `docs-zh` / `docs-en` — 分别指中/英文站
- `theme` — `docs/.vitepress/theme` 主题与组件
- `config` — VitePress 配置、侧边栏、导航
- `agents` — `.agents/skills` 规范与工具链接脚本
- `deps` — 依赖升级 / lockfile
- `build` — 构建脚本、package.json scripts

示例：`feat(docs): 新增 Container 容器组件渐变阴影示例`

## 4. 示例

- `feat(docs-en): 补齐 Button 家族状态样式英文示例`
- `fix(theme): 修复右栏预览 iframe 高度计算错误`
- `fix(docs): 修正 align.md 示例代码缩进`
- `docs(agents): 新增 code-standards 与 commit-standards 规范`
- `refactor(theme): 抽离按来源分流的 K 线预览跳转逻辑`
- `build(deps): 升级 vitepress 至 1.6.4`
- `chore(agents): 新增 link-agent-skills 链接脚本`
- `perf(build): 关闭死链检查加速构建`
- `revert: 回滚 "feat(docs): 试验性侧边栏分组"`

## 5. 拆分与内容要求

1. **一个提交只做一件事**：功能、格式化、依赖升级分开提交；禁止把无关改动塞进同一 commit。
2. 描述必须具体到「哪个文件/模块完成了什么」，不要写「更新代码」「修改 bug」这类空话。
3. 破坏性变更必须在脚注以 `BREAKING CHANGE:` 说明影响与迁移方式，并在 type 后加 `!`（如 `feat(theme)!: ...`）。
4. 提交前自检：`git status` / `git diff` 确认无遗留临时文件、无密钥/token、未误改无关文件。
5. 关联 issue 用脚注：`Closes #123`。

## 6. 禁止事项

- 不使用 `--no-verify`、`--no-gpg-sign` 等跳过钩子的参数（除非用户明确要求）。
- 不修改 git 配置；不对 main/master 强推（`push --force`）。
- 未经用户明确要求，不擅自创建提交（`git commit`）或推送。
- 提交信息不得是纯英文、全大写或无类型的流水账。
