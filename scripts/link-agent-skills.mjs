// link-agent-skills.mjs
// 单一数据源：所有规范/技能只写在 .agents/skills 下。
// 本脚本把各 AI 编码工具（claude/cursor/trae/qoder/codebuddy/workbuddy）的
// skills 目录链接到 .agents/skills，让所有工具"一律指向"同一份规范。
//
// 跨平台策略：优先创建符号链接(symlink，可提交进 git)；
// Windows 无管理员权限/未开启开发者模式时回退为目录联接(junction，本地生效，已 gitignore)。
//
// 用法：node scripts/link-agent-skills.mjs  （或 npm run link:skills）

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const source = path.join(repoRoot, '.agents', 'skills');

// 需要接入的工具目录（各工具在其下自动读取 skills/）
const TOOLS = [
  '.claude', // Claude Code
  '.cursor', // Cursor
  '.trae', // Trae
  '.qoder', // Qoder
  '.codebuddy', // CodeBuddy
  '.workbuddy', // WorkBuddy
];

function log(...a) {
  console.log('[agents]', ...a);
}

function ensureSource() {
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    console.error(`[agents] 源目录不存在：${source}`);
    process.exit(1);
  }
}

// 安全移除一个链接（symlink / junction / 空目录 / 文件），绝不递归删除链接内容
function removeLink(linkPath) {
  const st = fs.lstatSync(linkPath);
  if (st.isSymbolicLink()) {
    fs.unlinkSync(linkPath);
  } else if (st.isDirectory()) {
    // junction 用 rmdir 只删链接本身；真实非空目录会抛 ENOTEMPTY（上层捕获后跳过）
    fs.rmdirSync(linkPath);
  } else {
    fs.unlinkSync(linkPath);
  }
}

function createLink(linkPath) {
  const rel = path
    .relative(path.dirname(linkPath), source)
    .replace(/\\/g, '/'); // ../.agents/skills
  try {
    fs.symlinkSync(rel, linkPath, 'dir');
    return 'symlink';
  } catch (e) {
    if (process.platform === 'win32') {
      fs.symlinkSync(source, linkPath, 'junction'); // junction 需绝对路径
      return 'junction';
    }
    throw e;
  }
}

function linkTool(toolDir) {
  const linkPath = path.join(repoRoot, toolDir, 'skills');
  const parent = path.dirname(linkPath);
  fs.mkdirSync(parent, { recursive: true });

  let exists = false;
  try {
    fs.lstatSync(linkPath);
    exists = true;
  } catch {}

  if (exists) {
    // 已正确指向源目录则跳过（幂等）
    try {
      if (fs.realpathSync(linkPath) === fs.realpathSync(source)) {
        log(`跳过 ${toolDir}/skills（已指向 .agents/skills）`);
        return;
      }
    } catch {}
    try {
      removeLink(linkPath);
    } catch (e) {
      if (e.code === 'ENOTEMPTY' || e.code === 'EEXIST' || e.code === 'EPERM') {
        log(`⚠ 跳过 ${toolDir}/skills：已存在非空真实目录，未覆盖（请手动确认后删除再重跑）`);
        return;
      }
      throw e;
    }
  }

  const kind = createLink(linkPath);
  log(`✓ ${toolDir}/skills -> ../.agents/skills  (${kind})`);
}

function main() {
  ensureSource();
  log(`源目录：${path.relative(repoRoot, source).replace(/\\/g, '/')}`);
  for (const t of TOOLS) linkTool(t);
  log('完成。');
}

main();
