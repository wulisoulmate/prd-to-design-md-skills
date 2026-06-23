#!/usr/bin/env node
/**
 * design-validator.mjs
 *
 * DESIGN.md 规范验证辅助工具。
 * 职责单一：封装 npx @google/design.md lint 命令，提供结构化输出和常见错误提示。
 *
 * 使用方式：
 *   node scripts/design-validator.mjs --file path/to/DESIGN.md
 *
 * 返回码：
 *   0 — lint 通过（无 error）
 *   1 — lint 有 error
 *   2 — lint 命令执行失败（工具不可用）
 *
 * 依赖：纯 Node.js 内置模块（零 npm 依赖），运行需要 npx + @google/design.md
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// ========== 常量 ==========

/** 常见 error 类型的修复提示 */
const FIX_HINTS = {
  'broken-ref': '检查 {color.xxx} / {typography.xxx} 引用，确认 token 名称在 frontmatter 中存在（注意 colors.xxx 而非 color.xxx）',
  'invalid-color': '确保 hex 格式为 #XXXXXX，6 位完整 hex',
  'invalid-dimension': '尺寸值需带 px 单位（如 16px），数值合理',
  'invalid-typography': 'fontSize 使用有效字号，fontWeight 使用数字字重（400/500/600/700）',
  'duplicate-section': '检查是否有重复的 ## Title，合并或重命名',
  'missing-section': '补充缺失的必需章节（Google Stitch 规范要求）',
  'yaml-parse-error': '检查 frontmatter YAML 格式（缩进一致性、引号配对）',
  'wcag-contrast': '[warning] 文本/背景对比度不足，建议调整色值满足 WCAG AA',
  'unknown-component-property': '[warning] 移除不在白名单中的组件属性',
};

// ========== 核心逻辑 ==========

/**
 * 运行 Google Stitch lint 并解析结果。
 * @param {string} filePath - DESIGN.md 的绝对或相对路径
 * @returns {{ success: boolean, errors: Array, warnings: Array, raw: string }}
 */
function runLint(filePath) {
  const resolvedPath = resolve(filePath);

  if (!existsSync(resolvedPath)) {
    return { success: false, error: `文件不存在：${resolvedPath}`, errors: [], warnings: [], raw: '' };
  }

  try {
    const stdout = execSync(
      `npx @google/design.md lint --format json "${resolvedPath}"`,
      { encoding: 'utf-8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const result = JSON.parse(stdout);
    const errors = (result.errors || []).map(e => ({
      ...e,
      fixHint: FIX_HINTS[e.type] || '请参考 Google Stitch 规范修复',
    }));
    const warnings = (result.warnings || []).map(w => ({
      ...w,
      fixHint: FIX_HINTS[w.type] || '',
    }));

    return {
      success: errors.length === 0,
      errors,
      warnings,
      raw: stdout,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
    };
  } catch (err) {
    // 区分 npx 执行失败 和 lint 报错
    if (err.stderr && err.stderr.includes('command not found')) {
      return {
        success: false,
        error: 'npx 命令未找到，请确认已安装 Node.js 和 npm',
        errors: [], warnings: [], raw: '',
        isToolUnavailable: true,
      };
    }
    if (err.stdout) {
      try {
        // npx 可能返回非零退出码但 stdout 有有效 JSON
        const result = JSON.parse(err.stdout);
        const errors = (result.errors || []).map(e => ({
          ...e, fixHint: FIX_HINTS[e.type] || '',
        }));
        return {
          success: errors.length === 0,
          errors,
          warnings: (result.warnings || []).map(w => ({ ...w, fixHint: FIX_HINTS[w.type] || '' })),
          raw: err.stdout,
          totalErrors: errors.length,
          totalWarnings: (result.warnings || []).length,
        };
      } catch {
        // JSON 解析失败
      }
    }
    return {
      success: false,
      error: `lint 执行失败：${err.message}`,
      errors: [], warnings: [], raw: err.stdout || err.stderr || '',
      isToolUnavailable: true,
    };
  }
}

/**
 * 格式化 lint 结果为人类可读文本。
 * @param {object} result - runLint 返回结果
 * @returns {string} 格式化字符串
 */
function formatResult(result) {
  if (result.error && !result.errors.length) {
    return `⚠️ ${result.error}`;
  }

  const lines = [];
  if (result.success) {
    lines.push('✅ lint 验证通过 — 无 error');
  } else {
    lines.push(`❌ 发现 ${result.totalErrors} 个 error`);
  }

  if (result.errors.length > 0) {
    lines.push('\n--- Errors ---');
    for (const err of result.errors) {
      lines.push(`  [${err.type}] ${err.message || ''}`);
      lines.push(`    ${err.sourcePath || err.location || ''}`);
      lines.push(`    💡 ${err.fixHint}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push(`\n--- Warnings（${result.totalWarnings} 个） ---`);
    for (const w of result.warnings) {
      lines.push(`  [${w.type}] ${w.message || ''}`);
    }
  }

  if (result.totalErrors > 0) {
    lines.push('\n🔧 修复建议：根据以上 Hint 逐条修复后重新运行验证。');
  }

  return lines.join('\n');
}

/** 打印帮助信息 */
function printHelp() {
  console.log(`用法：
  node scripts/design-validator.mjs --file <DESIGN.md 路径>

选项：
  --file   要验证的 DESIGN.md 文件路径
  --json   输出原始 JSON（适用于 CI/自动化场景）

返回码：
  0  验证通过
  1  存在 error
  2  工具不可用

示例：
  node scripts/design-validator.mjs --file ./DESIGN.md
  node scripts/design-validator.mjs --file ./DESIGN.md --json`);
}

// ========== 主入口 ==========
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--file')) {
    const idx = args.indexOf('--file');
    const filePath = idx + 1 < args.length ? args[idx + 1] : '';
    if (!filePath) {
      console.error('错误：--file 后需要提供 DESIGN.md 路径。');
      process.exit(2);
    }

    const result = runLint(filePath);

    if (args.includes('--json')) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatResult(result));
    }

    if (result.isToolUnavailable) {
      process.exit(2);
    }
    process.exit(result.success ? 0 : 1);
  } else {
    printHelp();
  }
}

main();
