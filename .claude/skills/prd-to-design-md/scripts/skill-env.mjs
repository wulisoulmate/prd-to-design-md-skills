#!/usr/bin/env node
/**
 * skill-env.mjs
 *
 * Skill 运行环境检测工具。
 * 职责单一：自动发现 SKILL_DIR、验证关键目录和文件完整性。
 * 替代 SKILL.md 中的内联 bash 路径发现 + design-md 内容检查。
 *
 * 使用方式：
 *   node scripts/skill-env.mjs --discover    # 发现并输出 SKILL_DIR 路径
 *   node scripts/skill-env.mjs --check       # 完整环境健康检查
 *
 * 依赖：纯 Node.js 内置模块（零 npm 依赖）
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ========== 路径发现 ==========

/**
 * 自动发现 skill 目录路径。
 * 搜索路径：当前工作目录的 .claude/skills/ → 用户目录的 .claude/skills/
 * @returns {string} SKILL_DIR 绝对路径
 */
function discoverSkillDir() {
  const cwd = process.cwd();
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';

  const searchPaths = [
    // 优先项目级的 skills 目录
    ...(cwd ? [join(cwd, '.claude', 'skills')] : []),
    // 回退到用户级
    ...(homeDir ? [join(homeDir, '.claude', 'skills')] : []),
  ];

  for (const base of searchPaths) {
    if (!existsSync(base)) continue;
    const entries = readdirSync(base, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillDir = join(base, entry.name);
        const skinMdPath = join(skillDir, 'SKILL.md');
        if (existsSync(skinMdPath)) {
          // 确认是 prd-to-design-md skill（通过 name 字段匹配）
          try {
            const content = require('fs').readFileSync(skinMdPath, 'utf-8');
            if (content.includes('name: prd-to-design-md')) {
              return skillDir;
            }
          } catch { /* 跳过无法读取的目录 */ }
        }
      }
    }
  }

  // 最后尝试本脚本所在目录的父目录（脚本安装在 scripts/ 下时）
  const selfDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  if (existsSync(join(selfDir, 'SKILL.md'))) return selfDir;

  return null;
}

// ========== 环境检查 ==========

/**
 * 执行完整环境健康检查。
 * @returns {object} 检查结果对象
 */
function doCheck() {
  const results = {
    skill_dir: { ok: false, path: '' },
    design_md: { ok: false, file_count: 0, message: '' },
    design_index: { ok: false, entry_count: 0, last_updated: '', message: '' },
    overall: { ready: false, message: '' },
  };

  // 1. 检查 SKILL_DIR
  const skillDir = discoverSkillDir();
  if (!skillDir) {
    results.skill_dir.message = '❌ 未能自动发现 SKILL_DIR，请确认 skill 已正确安装';
    results.overall.message = '环境未就绪：无法定位 skill 目录';
    return results;
  }

  results.skill_dir.ok = true;
  results.skill_dir.path = skillDir;

  // 2. 检查 design-md/
  const designRepo = join(skillDir, 'design-md');
  if (!existsSync(designRepo)) {
    results.design_md.message = '⚠️ design-md/ 目录不存在，请确保 awesome-design-md 内容已放置';
    results.overall.message = '环境未完整：缺少设计素材库';
  } else {
    const files = scanDesignFiles(designRepo);
    results.design_md.ok = files.length > 0;
    results.design_md.file_count = files.length;
    results.design_md.message = files.length > 0
      ? `✅ design-md/ 就绪，包含 ${files.length} 个 DESIGN.md 文件`
      : '⚠️ design-md/ 目录为空，未找到任何 DESIGN.md 文件';
  }

  // 3. 检查 design-index.json
  const indexFile = join(skillDir, 'scripts', 'design-index.json');
  if (!existsSync(indexFile)) {
    results.design_index.message = '⚠️ 设计索引文件不存在，请运行 index-builder.mjs --rebuild';
    results.overall.message = results.overall.message || '索引未构建';
  } else {
    try {
      const index = JSON.parse(require('fs').readFileSync(indexFile, 'utf-8'));
      const entryCount = (index.entries || []).length;
      results.design_index.ok = entryCount > 0;
      results.design_index.entry_count = entryCount;
      results.design_index.last_updated = index.last_updated || '未知';
      results.design_index.message = entryCount > 0
        ? `✅ 索引就绪，共 ${entryCount} 条记录（最后更新：${results.design_index.last_updated}）`
        : '⚠️ 索引文件存在但为空，请运行 index-builder.mjs --rebuild';
    } catch (e) {
      results.design_index.message = `⚠️ 索引文件损坏：${e.message}`;
    }
  }

  // 4. 综合状态
  results.overall.ready = results.design_md.ok && results.design_index.ok;
  if (!results.overall.ready) {
    const reasons = [];
    if (!results.design_md.ok) reasons.push('设计素材库问题');
    if (!results.design_index.ok) reasons.push('索引问题');
    results.overall.message = `环境部分就绪（${reasons.join('、')}）`;
  } else {
    results.overall.message = '✅ 环境完全就绪';
  }

  return results;
}

/**
 * 递归扫描目录下所有 DESIGN.md 文件。
 * @param {string} dir - 要扫描的目录
 * @returns {string[]} 文件相对路径列表
 */
function scanDesignFiles(dir) {
  const results = [];
  function walk(currentDir) {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === 'DESIGN.md') {
        results.push(fullPath);
      }
    }
  }

  try { walk(dir); } catch { /* 忽略不可读目录 */ }
  return results;
}

/** 格式化检查结果为人类可读文本。 */
function formatCheckResult(results) {
  const lines = [];
  lines.push('🔍 prd-to-design-md 环境检查：\n');

  lines.push(results.skill_dir.ok
    ? `  ✅ SKILL_DIR: ${results.skill_dir.path}`
    : `  ❌ ${results.skill_dir.message}`);

  lines.push(results.design_md.ok
    ? `  ✅ design-md/: ${results.design_md.file_count} 个 DESIGN.md 文件`
    : `  ${results.design_md.message}`);

  lines.push(results.design_index.ok
    ? `  ✅ 索引已就绪：${results.design_index.entry_count} 条记录（${results.design_index.last_updated}）`
    : `  ${results.design_index.message}`);

  lines.push(`\n  综合：${results.overall.message}`);
  return lines.join('\n');
}

// ========== 主入口 ==========

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--discover')) {
    const dir = discoverSkillDir();
    if (dir) {
      console.log(dir);
      process.exit(0);
    } else {
      console.error('未找到 prd-to-design-md skill 目录');
      process.exit(1);
    }
  } else if (args.includes('--check')) {
    const results = doCheck();
    console.log(formatCheckResult(results));
    process.exit(results.overall.ready ? 0 : 1);
  } else {
    console.log(`用法：
  node scripts/skill-env.mjs --discover   发现 SKILL_DIR 路径
  node scripts/skill-env.mjs --check      完整环境健康检查

选项：
  --discover  输出 SKILL_DIR 绝对路径（供脚本引用）
  --check     检查 design-md/ 和索引状态，输出健康报告`);
  }
}

main();
