# .agents — AI 编码助手规范中心（单一数据源）

本目录是仓库内所有 AI 编码助手（Claude、Cursor、Trae、Qoder、CodeBuddy、WorkBuddy）
共享的**技能 / 规范唯一来源**。各工具不再各自维护一份规则，而是一律指向这里。

## 结构

```
.agents/
└─ skills/
   ├─ code-standards/SKILL.md     # 代码与内容编写规范
   └─ commit-standards/SKILL.md   # Git 代码提交规范
```

每个技能是一个目录，内含 `SKILL.md`（YAML frontmatter：`name` + `description`，正文为规范内容），
遵循通用 Agent Skills 约定，可被各工具自动发现与加载。

## 工具目录如何指向这里

各工具目录下的 `skills` 都是指向 `.agents/skills` 的链接：

| 工具 | 链接路径 |
| --- | --- |
| Claude | `.claude/skills` |
| Cursor | `.cursor/skills` |
| Trae | `.trae/skills` |
| Qoder | `.qoder/skills` |
| CodeBuddy | `.codebuddy/skills` |
| WorkBuddy | `.workbuddy/skills` |

这些 `skills` 是**符号链接（symlink）并随仓库一起提交**（git 中以 mode `120000` 存储，内容仅一行 `../.agents/skills`），与 ant-design 完全一致：

- 实体文件只存在一份，位于 `.agents/skills`；各工具目录不产生任何副本。
- macOS / Linux 及已开启开发者模式的 Windows 用户 `git clone` 后，git 会自动还原成真正的符号链接，开箱即用，无需任何脚本。

### Windows 克隆后链接失效的修复

若某台 Windows 机器 `core.symlinks=false`，`git clone` 可能把链接检出成内容为 `../.agents/skills` 的**纯文本文件**（而非真链接）。此时运行一次：

```bash
npm run link:skills        # 重建为真正的符号链接（无权限时回退 junction）
# 或 npm install 时自动执行（postinstall 钩子）
```

脚本是幂等的：已正确指向的跳过；遇到工具目录下已有的非空真实目录会跳过并告警，不覆盖你的文件。

## 维护约定

- **只改 `.agents/skills` 下的内容**，不要在某个工具目录里单独写规则——那会与各工具产生分歧。
- 新增一个规范：在 `.agents/skills/<name>/SKILL.md` 建目录与文件即可，所有工具通过链接自动获得。
- 接入新工具：在 `scripts/link-agent-skills.mjs` 的 `TOOLS` 数组追加工具目录名，重跑脚本。
