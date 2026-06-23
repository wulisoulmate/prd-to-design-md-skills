#!/usr/bin/env node
/**
 * search-design-index.mjs
 *
 * 【向后兼容包装器】
 *
 * 本文件已按职责拆分为三个独立脚本，此处保留为委派入口以兼容旧引用。
 *
 * 各功能对应新脚本：
 *   --rebuild  →  node scripts/index-builder.mjs --rebuild
 *   --update   →  node scripts/index-builder.mjs --update
 *   --query    →  node scripts/index-query.mjs --query "<描述>"
 *
 * 请更新引用到对应新脚本以获得更清晰的职责边界和更好的可维护性。
 */

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`用法（向后兼容模式）：
  node scripts/search-design-index.mjs --query "<描述>"
  node scripts/search-design-index.mjs --update
  node scripts/search-design-index.mjs --rebuild

🔔 提示：本脚本已按职责拆分，建议迁移到新命令：
  index-builder.mjs   → 索引构建与更新（--rebuild / --update）
  index-query.mjs     → 索引查询（--query）
  design-validator.mjs → lint 验证辅助（--file）
`);
    return;
  }

  // 检测模式并委派到对应新脚本
  if (args.includes('--query') || args.includes('--rebuild') || args.includes('--update')) {
    const command = args.includes('--query')
      ? `node "${resolve(__dirname, 'index-query.mjs')}" ${args.join(' ')}`
      : `node "${resolve(__dirname, 'index-builder.mjs')}" ${args.join(' ')}`;

    try {
      execSync(command, { stdio: 'inherit', encoding: 'utf-8' });
    } catch {
      process.exit(1);
    }
  } else {
    console.log('未知参数，请使用 --query / --update / --rebuild');
  }
}

main();
