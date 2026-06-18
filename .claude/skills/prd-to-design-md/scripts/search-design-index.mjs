#!/usr/bin/env node
/**
 * search-design-index.mjs
 *
 * prd-to-design-md skill 的设计索引查询与增量更新工具。
 *
 * 功能模式：
 *   --query "<项目描述>"   按项目特征匹配设计索引，返回匹配的 DESIGN.md 信息
 *   --update              扫描仓库中未被索引的 DESIGN.md，增量更新索引
 *   --rebuild             强制重建完整索引（扫描所有 DESIGN.md）
 *
 * 使用方式：
 *   node scripts/search-design-index.mjs --query "移动端电商应用，iOS风格"
 *   node scripts/search-design-index.mjs --update
 *   node scripts/search-design-index.mjs --rebuild
 *
 * 依赖：纯 Node.js 内置模块（零 npm 依赖）
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ========== 路径配置 ==========
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPT_DIR = resolve(__dirname);
const SKILL_DIR = resolve(SCRIPT_DIR, '..');
const INDEX_FILE = join(SCRIPT_DIR, 'design-index.json');
const DESIGN_REPO = join(SKILL_DIR, 'design-md');

// ========== 索引读写 ==========

/**
 * 读取索引文件，不存在则返回空的索引结构。
 * @returns {{ version: number, last_updated: string, repo_commit: string, entries: Array }}
 */
function loadIndex() {
  if (!existsSync(INDEX_FILE)) {
    return { version: 1, last_updated: '', repo_commit: '', entries: [] };
  }
  return JSON.parse(readFileSync(INDEX_FILE, 'utf-8'));
}

/**
 * 写回索引文件。
 * @param {object} index - 索引对象
 */
function saveIndex(index) {
  const content = JSON.stringify(index, null, 2);
  writeFileSync(INDEX_FILE, content, 'utf-8');
  console.log(`索引已保存，共 ${index.entries.length} 条记录，路径：${INDEX_FILE}`);
}

// ========== 关键词提取 ==========

/**
 * 从项目描述中提取特征关键词。
 * 关键词来源：项目类型描述、行业领域、功能特征等。
 * @param {string} description - 项目描述文本
 * @returns {string[]} 关键词列表
 */
function extractKeywords(description) {
  const desc = description.toLowerCase();
  const keywords = [];

  // 项目类型关键词映射
  const typePatterns = [
    { pattern: /移动端|移动|mobile|app|小程序/, tags: ['mobile-app'] },
    { pattern: /后台|管理|dashboard|admin|控制台/, tags: ['admin-panel', 'dashboard'] },
    { pattern: /电商|商城|shop|store|ecommerce|e-commerce|购物/, tags: ['e-commerce'] },
    { pattern: /社交|social|社区|community|论坛|feed/, tags: ['social-app'] },
    { pattern: /官网|landing|landing-page|企业站|展示/, tags: ['landing-page'] },
    { pattern: /内容|content|blog|博客|媒体|media|文章/, tags: ['content-platform'] },
    { pattern: /教育|edu|学习|learn|course|课程/, tags: ['education'] },
    { pattern: /医疗|health|健康|healthcare|医药/, tags: ['healthcare'] },
    { pattern: /金融|finance|fintech|银行|支付/, tags: ['fintech'] },
    { pattern: /数据|data|图表|chart|可视/, tags: ['data-visualization'] },
    { pattern: /SaaS|saas|平台|platform/, tags: ['saas-platform'] },
    { pattern: /工具|tool|utility/, tags: ['tool-app'] },
  ];

  for (const { pattern, tags } of typePatterns) {
    if (pattern.test(desc)) {
      for (const tag of tags) {
        if (!keywords.includes(tag)) keywords.push(tag);
      }
    }
  }

  // 行业领域映射
  const industryPatterns = [
    { pattern: /医疗|医药|医院|健康/, tag: 'healthcare' },
    { pattern: /金融|银行|证券|保险|支付/, tag: 'fintech' },
    { pattern: /教育|学校|培训|课程|学习/, tag: 'education' },
    { pattern: /电商|零售|购物|商品|订单/, tag: 'e-commerce' },
    { pattern: /物流|运输|快递|供应链/, tag: 'logistics' },
    { pattern: /社交|IM|聊天|社区|论坛/, tag: 'social' },
    { pattern: /企业|SaaS|办公|协作|团队/, tag: 'enterprise' },
  ];

  for (const { pattern, tag } of industryPatterns) {
    if (pattern.test(desc) && !keywords.includes(tag)) {
      keywords.push(tag);
    }
  }

  return keywords;
}

// ========== 匹配评分 ==========

/**
 * 根据关键词匹配索引 entries，按匹配度排序返回 Top N。
 * 匹配度计算：entry 的 project_type、style_tags、best_for、summary、key_features 中命中关键词的个数。
 * @param {object} index - 索引对象
 * @param {string[]} keywords - 关键词列表
 * @param {number} topN - 返回 Top N 条结果
 * @returns {object[]} 匹配结果列表（按分数降序）
 */
function matchEntries(index, keywords, topN = 3) {
  const scored = [];

  for (const entry of index.entries || []) {
    // 收集该 entry 的所有可匹配字段
    const searchable = [
      ...(entry.project_type || []),
      ...(entry.style_tags || []),
      ...(entry.best_for || []),
      entry.summary || '',
      ...(entry.key_features || []),
    ].join(' ').toLowerCase();

    let score = 0;
    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase();
      // project_type 和 best_for 权重 1
      const ptMatch = (entry.project_type || []).some(t => t.toLowerCase().includes(lowerKw));
      const bfMatch = (entry.best_for || []).some(t => t.toLowerCase().includes(lowerKw));
      // style_tags 权重 2
      const stMatch = (entry.style_tags || []).some(t => t.toLowerCase().includes(lowerKw));
      // summary 权重 0.5
      const smMatch = (entry.summary || '').toLowerCase().includes(lowerKw);
      // key_features 权重 0.5
      const kfMatch = (entry.key_features || []).some(t => t.toLowerCase().includes(lowerKw));

      if (ptMatch) score += 1;
      if (stMatch) score += 2;
      if (bfMatch) score += 1;
      if (smMatch) score += 0.5;
      if (kfMatch) score += 0.5;
    }

    if (score > 0) {
      scored.push({ score, entry });
    }
  }

  // 按分数降序排列
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map(item => item.entry);
}

// ========== 文件扫描 ==========

/**
 * 计算文件的 SHA256 哈希。
 * @param {string} filepath - 文件路径
 * @returns {string} SHA256 十六进制字符串
 */
function fileHash(filepath) {
  const hash = createHash('sha256');
  const content = readFileSync(filepath);
  hash.update(content);
  return hash.digest('hex');
}

/**
 * 递归扫描设计仓库，返回所有 DESIGN.md 文件的路径。
 * @returns {string[]} 文件路径列表
 */
function scanDesignFiles() {
  if (!existsSync(DESIGN_REPO)) {
    console.error(`设计仓库不存在：${DESIGN_REPO}`);
    return [];
  }

  const results = [];
  function walk(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === 'DESIGN.md') {
        results.push(fullPath);
      }
    }
  }
  walk(DESIGN_REPO);
  return results;
}

/**
 * 找出索引中尚未收录的设计文件。
 * @param {string[]} allFiles - 所有 DESIGN.md 路径
 * @param {object} index - 索引对象
 * @returns {string[]} 未被索引的文件路径列表
 */
function findUnindexedFiles(allFiles, index) {
  const indexedPaths = new Set(
    (index.entries || []).map(e => e.file_path).filter(Boolean)
  );
  return allFiles.filter(f => {
    const relPath = relative(SKILL_DIR, f);
    return !indexedPaths.has(relPath);
  });
}

/**
 * 从 DESIGN.md 中提取基础文件信息（路径、哈希、企业名）。
 * 完整的语义分析由 Agent 在后续步骤中完成。
 * @param {string} filepath - DESIGN.md 的绝对路径
 * @returns {object} 基础信息对象
 */
function extractDesignInfo(filepath) {
  const relPath = relative(SKILL_DIR, filepath);
  const hash = fileHash(filepath);

  // 从路径提取企业名：design-md/<company>/DESIGN.md
  const pathParts = filepath.split('/');
  let company = '';
  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i] === 'design-md' && i + 1 < pathParts.length) {
      company = pathParts[i + 1];
      break;
    }
  }

  // 从文件名生成 base_name
  const fileName = filepath.split('/').pop().replace('.DESIGN.md', '').replace('DESIGN.md', '').replace(/[.-]+$/, '') || 'main';

  return {
    id: `${company}-${fileName}`,
    file_path: relPath,
    company,
    base_name: fileName,
    project_type: [],
    style_tags: [],
    summary: '',
    best_for: [],
    key_features: [],
    content_hash: hash,
  };
}

// ========== 输出格式化 ==========

/**
 * 将匹配结果格式化为 markdown 字符串。
 * @param {object[]} matched - 匹配结果列表
 * @returns {string} markdown 格式输出
 */
function formatResults(matched) {
  if (!matched || matched.length === 0) {
    return '未找到匹配的设计参考。';
  }

  const lines = [`找到 ${matched.length} 个匹配的设计参考：\n`];
  for (let i = 0; i < matched.length; i++) {
    const e = matched[i];
    lines.push(`### 匹配 ${i + 1}：${e.id || 'unknown'}`);
    lines.push(`- 文件：\`${e.file_path || ''}\``);
    lines.push(`- 企业：${e.company || '未知'}`);
    if (e.style_tags?.length) lines.push(`- 设计风格：${e.style_tags.join('、')}`);
    if (e.best_for?.length) lines.push(`- 适用场景：${e.best_for.join('、')}`);
    if (e.summary) lines.push(`- 设计摘要：${e.summary}`);
    if (e.key_features?.length) lines.push(`- 关键特征：${e.key_features.join('、')}`);
    lines.push('');
  }
  return lines.join('\n');
}

// ========== 功能模式 ==========

/** 查询模式 */
function doQuery(description) {
  const index = loadIndex();
  if (!index.entries || index.entries.length === 0) {
    console.log('索引为空，请先运行 --update 或 --rebuild 构建索引。');
    return;
  }

  const keywords = extractKeywords(description);
  console.log(`提取到的项目特征关键词：${JSON.stringify(keywords)}\n`);

  const matched = matchEntries(index, keywords, 3);
  if (matched.length > 0) {
    console.log(formatResults(matched));
  } else {
    console.log('未找到匹配的设计参考。');
  }
}

/** 增量更新模式 */
function doUpdate() {
  const index = loadIndex();
  const allFiles = scanDesignFiles();

  if (allFiles.length === 0) {
    console.log('design-md/ 目录中未找到 DESIGN.md 文件。');
    return;
  }

  const unindexed = findUnindexedFiles(allFiles, index);
  console.log(
    `共 ${allFiles.length} 个设计文件，` +
    `${index.entries.length} 条已索引，` +
    `${unindexed.length} 个待索引`
  );

  if (unindexed.length === 0) {
    console.log('索引已是最新，无需更新。');
    return;
  }

  const newEntries = unindexed.map(f => {
    const info = extractDesignInfo(f);
    console.log(`  + ${info.file_path}`);
    return info;
  });

  index.entries.push(...newEntries);
  index.last_updated = new Date().toISOString().split('T')[0];
  saveIndex(index);
  console.log(
    `\n已添加 ${newEntries.length} 条待分析的索引记录。` +
    'Agent 需要读取这些文件并补充 project_type/style_tags/summary 等字段。'
  );
}

/** 全量重建模式 */
function doRebuild() {
  console.log('正在全量重建索引...');
  const index = {
    version: 1,
    last_updated: new Date().toISOString().split('T')[0],
    repo_commit: '',
    entries: [],
  };

  const allFiles = scanDesignFiles();
  if (allFiles.length === 0) {
    console.log('design-md/ 目录中未找到 DESIGN.md 文件。');
    saveIndex(index);
    return;
  }

  for (const f of allFiles) {
    const info = extractDesignInfo(f);
    index.entries.push(info);
    console.log(`  + ${info.file_path}`);
  }

  saveIndex(index);
  console.log(
    `\n索引重建完成，共 ${allFiles.length} 条记录。` +
    'Agent 需要读取这些文件并补充详细分析字段。'
  );
}

/** 打印帮助信息 */
function printHelp() {
  console.log(`用法：
  node scripts/search-design-index.mjs --query "<项目描述>"
  node scripts/search-design-index.mjs --update
  node scripts/search-design-index.mjs --rebuild

选项：
  --query   按项目描述匹配设计索引，返回 Top 3 匹配结果
  --update  增量更新索引（扫描新 DESIGN.md 追加到索引）
  --rebuild 全量重建索引（重新扫描所有 DESIGN.md）`);
}

// ========== 主入口 ==========
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--query')) {
    const idx = args.indexOf('--query');
    const query = idx + 1 < args.length ? args[idx + 1] : '';
    if (!query) {
      console.error('错误：--query 后需要提供项目描述。');
      process.exit(1);
    }
    doQuery(query);
  } else if (args.includes('--update')) {
    doUpdate();
  } else if (args.includes('--rebuild')) {
    doRebuild();
  } else {
    printHelp();
  }
}

main();
