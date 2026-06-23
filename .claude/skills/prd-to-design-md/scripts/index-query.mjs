#!/usr/bin/env node
/**
 * index-query.mjs
 *
 * 设计索引查询工具。
 * 职责单一：只接收项目特征描述，从索引中匹配最合适的 DESIGN.md 参考。
 *
 * 使用方式：
 *   node scripts/index-query.mjs --query "金融SaaS支付平台，企业级后台"
 *
 * 依赖：纯 Node.js 内置模块（零 npm 依赖）
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ========== 路径配置 ==========
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPT_DIR = resolve(__dirname);
const SKILL_DIR = resolve(SCRIPT_DIR, '..');
const INDEX_FILE = join(SCRIPT_DIR, 'design-index.json');

// ========== 索引读取 ==========

/**
 * 读取索引文件，不存在则返回空索引结构。
 * @returns {{ version: number, last_updated: string, repo_commit: string, entries: Array }}
 */
function loadIndex() {
  if (!existsSync(INDEX_FILE)) {
    return { version: 1, last_updated: '', repo_commit: '', entries: [] };
  }
  return JSON.parse(readFileSync(INDEX_FILE, 'utf-8'));
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
      // style_tags 权重 2（视觉风格是设计匹配最重要的维度）
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

  // 按分数降序排列，返回 Top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map(item => item.entry);
}

// ========== 输出格式化 ==========

/**
 * 将匹配结果格式化为 Markdown 字符串。
 * @param {object[]} matched - 匹配结果列表
 * @returns {string} Markdown 格式输出
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

// ========== 查询模式 ==========

/** 执行查询：读取索引 → 提取关键词 → 匹配评分 → 输出结果 */
function doQuery(description) {
  const index = loadIndex();
  if (!index.entries || index.entries.length === 0) {
    console.log('索引为空，请先运行 index-builder.mjs --rebuild 或 --update 构建索引。');
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

/** 打印帮助信息 */
function printHelp() {
  console.log(`用法：
  node scripts/index-query.mjs --query "<项目特征描述>"

选项：
  --query   按项目描述匹配设计索引，返回 Top 3 匹配结果
            示例：node scripts/index-query.mjs --query "移动端电商应用，iOS风格"`);
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
  } else {
    printHelp();
  }
}

main();
