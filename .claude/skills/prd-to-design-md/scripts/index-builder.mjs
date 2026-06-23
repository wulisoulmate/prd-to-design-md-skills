#!/usr/bin/env node
/**
 * index-builder.mjs
 *
 * 设计索引构建与增量维护工具。
 * 职责单一：只负责扫描 design-md/ 目录、构建/更新索引文件。
 *
 * 使用方式：
 *   node scripts/index-builder.mjs --rebuild    # 全量重建索引
 *   node scripts/index-builder.mjs --update     # 增量更新索引
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

// ========== 索引读写（内部共享，不对外暴露） ==========

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

// ========== 文件扫描 ==========

/**
 * 计算文件的 SHA256 哈希。
 * @param {string} filepath - 文件绝对路径
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
 * @returns {string[]} 文件路径列表（绝对路径）
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
 * @param {string[]} allFiles - 所有 DESIGN.md 的绝对路径列表
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
 * 读取 DESIGN.md 文件并提取 YAML frontmatter 中的 description。
 * 使用纯字符串解析（零 npm 依赖），解析 `---` 包裹的 YAML 块。
 * @param {string} filepath - DESIGN.md 的绝对路径
 * @returns {{ description: string, rawContent: string }} 提取结果
 */
function parseFrontmatter(filepath) {
  const content = readFileSync(filepath, 'utf-8').trim();
  const lines = content.split('\n');

  // 找到第一对 `---` 之间的 YAML 块
  if (lines.length < 2 || !lines[0].trim().startsWith('---')) {
    return { description: '', rawContent: content };
  }

  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith('---')) {
      endIdx = i;
      break;
    }
  }

  if (endIdx === -1) {
    return { description: '', rawContent: content };
  }

  const yamlLines = lines.slice(1, endIdx);
  const yamlText = yamlLines.join('\n');

  // 提取顶层 description 字段（行首无缩进，不在嵌套结构内）
  let description = '';
  let inDescription = false;
  for (const line of yamlLines) {
    const trimmed = line.trim();

    // 只匹配行首（顶层）的 description: 字段，忽略组件内部缩进的 description:
    if (/^description[：:]\s/.test(line) || /^description[：:]$/.test(line)) {
      const val = trimmed.replace(/^description[：:]\s*/, '');
      if (val.startsWith('"') || val.startsWith("'")) {
        description = val.slice(1).replace(/["']\s*$/, '');
      } else if (val.startsWith('>') || val.startsWith('|')) {
        // 多行块标量 — 后续缩进行为续行
        description = val.replace(/^[>|]\s*/, '');
        inDescription = true;
      } else {
        description = val;
      }
    } else if (inDescription && (trimmed === '' || !line.startsWith('  '))) {
      // 多行 description 结束
      inDescription = false;
    } else if (inDescription) {
      // 多行 description 续行
      description += ' ' + trimmed;
    }
  }

  return { description: description.trim(), rawContent: content };
}

/**
 * 从 description 中提取风格标签（style_tags）。
 * @param {string} description - YAML description 字段
 * @returns {string[]} 风格标签列表
 */
function extractStyleTags(description) {
  const desc = description.toLowerCase();
  const tags = [];

  // 视觉风格映射
  const stylePatterns = [
    // 明暗
    { pattern: /dark|near-black|deep navy|black-ink|stark black/, tag: 'dark' },
    { pattern: /warm|cream|warm-canvas|warmth/, tag: 'warm' },
    { pattern: /pure white|white canvas|bright/, tag: 'light' },
    // 风格派别
    { pattern: /minimal|clean|stark|bare/, tag: 'minimal' },
    { pattern: /editorial|journalistic|magazine/, tag: 'editorial' },
    { pattern: /playful|joyful|colorful|fun/, tag: 'playful' },
    { pattern: /luxurious|premium|elegant|quietly luxurious/, tag: 'premium' },
    { pattern: /corporate|enterprise|institutional|professional/, tag: 'corporate' },
    { pattern: /humanist|friendly|approachable|generous/, tag: 'humanist' },
    { pattern: /technical|developer|engineering/, tag: 'technical' },
    { pattern: /modern|contemporary|sleek/, tag: 'modern' },
    { pattern: /retro|vintage|classic/, tag: 'retro' },
    // 配色特征
    { pattern: /monochrome|black-and-white|single accent/, tag: 'monochrome' },
    { pattern: /gradient|mesh|atmospheric/, tag: 'gradient-heavy' },
    { pattern: /pastel|soft color/, tag: 'pastel' },
    { pattern: /bold|saturated|high contrast/, tag: 'bold' },
    // 排版特征
    { pattern: /serif|slab-serif|editorial display/, tag: 'serif' },
    { pattern: /geometric sans|custom sans/, tag: 'geometric-sans' },
    { pattern: /monospace|mono/, tag: 'monospace' },
  ];

  for (const { pattern, tag } of stylePatterns) {
    if (pattern.test(desc) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}

/**
 * 从 description 中提取项目类型标签（project_type）。
 * @param {string} description - YAML description 字段
 * @returns {string[]} 项目类型标签
 */
function extractProjectType(description) {
  const desc = description.toLowerCase();
  const types = [];

  const typePatterns = [
    { pattern: /marketplace|consumer\s*marketplace/, tag: 'marketplace' },
    { pattern: /developer-platform|developer.*tool|developer.*platform/, tag: 'developer-tools' },
    { pattern: /financial|fintech|banking|crypto|exchange|payment/, tag: 'fintech' },
    { pattern: /enterprise|saas|platform/, tag: 'saas-platform' },
    { pattern: /e-commerce|retail|shop/, tag: 'e-commerce' },
    { pattern: /social|community|marketplace/, tag: 'social-platform' },
    { pattern: /content|media|editorial|publishing/, tag: 'content-platform' },
    { pattern: /design|creative/, tag: 'creative-tools' },
    { pattern: /dashboard|admin|analytics/, tag: 'admin-panel' },
    { pattern: /landing|marketing/, tag: 'landing-page' },
  ];

  for (const { pattern, tag } of typePatterns) {
    if (pattern.test(desc) && !types.includes(tag)) {
      types.push(tag);
    }
  }

  return types;
}

/**
 * 从 description 中提取最佳适用场景（best_for）。
 * @param {string} description - YAML description 字段
 * @returns {string[]} 适用场景列表
 */
function extractBestFor(description) {
  const desc = description.toLowerCase();
  const bestFor = [];

  const bestForPatterns = [
    { pattern: /consumer|marketplace/, tag: '面向消费者的产品' },
    { pattern: /developer|engineer|technical/, tag: '面向开发者的工具' },
    { pattern: /financial|fintech|banking|crypto/, tag: '金融科技产品' },
    { pattern: /enterprise|saas|platform/, tag: '企业级 SaaS 平台' },
    { pattern: /e-commerce|retail|shop/, tag: '电商平台' },
    { pattern: /editorial|content|media/, tag: '内容与媒体网站' },
    { pattern: /creative|design/, tag: '创意与设计工具' },
    { pattern: /social|community/, tag: '社交与社区平台' },
    { pattern: /product-ui|dashboard|admin/, tag: '后台管理系统' },
    { pattern: /marketing|landing/, tag: '品牌与营销官网' },
  ];

  for (const { pattern, tag } of bestForPatterns) {
    if (pattern.test(desc) && !bestFor.includes(tag)) {
      bestFor.push(tag);
    }
  }

  return bestFor;
}

/**
 * 从 DESIGN.md 正文中提取 Key Characteristics 列表。
 * 在 "Key Characteristics" 或 "Key Characteristics:" 标题后的无序列表项。
 * @param {string} rawContent - DESIGN.md 完整内容
 * @returns {string[]} 关键特征列表（每项截取前 120 字符）
 */
function extractKeyFeatures(rawContent) {
  const lines = rawContent.split('\n');
  const features = [];
  let inSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 检测 Key Characteristics 标题
    if (/^[*]*\s*Key Characteristic/i.test(trimmed)) {
      inSection = true;
      continue;
    }

    // 如果已在区域内，检测列表项（- 开头）
    if (inSection) {
      // 空行或新标题退出
      if (trimmed === '' || /^##/.test(trimmed)) {
        break;
      }
      if (/^-\s+/.test(trimmed)) {
        // 去掉前导 "- "，截取前 120 字符
        const item = trimmed.replace(/^-\s+/, '').trim();
        if (item) {
          features.push(item.length > 120 ? item.slice(0, 120) + '…' : item);
        }
      }
    }
  }

  return features;
}

/**
 * 从 DESIGN.md 中提取基础文件信息（路径、哈希、企业名）和语义元数据。
 * 现在会自动读取文件内容，解析 YAML frontmatter 和 Key Characteristics 列表，
 * 补充 project_type / style_tags / summary / best_for / key_features 等字段。
 * @param {string} filepath - DESIGN.md 的绝对路径
 * @returns {object} 索引条目对象
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
  const fileName = filepath.split('/').pop()
    .replace('.DESIGN.md', '')
    .replace('DESIGN.md', '')
    .replace(/[.-]+$/, '') || 'main';

  // === 新增：读取文件内容并提取语义元数据 ===
  const { description, rawContent } = parseFrontmatter(filepath);
  const summary = description;
  const style_tags = extractStyleTags(description);
  const project_type = extractProjectType(description);
  const best_for = extractBestFor(description);
  const key_features = extractKeyFeatures(rawContent);
  // ===========================================

  return {
    id: `${company}-${fileName}`,
    file_path: relPath,
    company,
    base_name: fileName,
    project_type,
    style_tags,
    summary,
    best_for,
    key_features,
    content_hash: hash,
  };
}

// ========== 功能模式 ==========

/** 增量更新模式：扫描新文件追加到索引 */
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

/** 全量重建模式：重新扫描整个仓库构建全新索引 */
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
  node scripts/index-builder.mjs --rebuild   全量重建索引
  node scripts/index-builder.mjs --update    增量更新索引

选项：
  --rebuild  强制重建完整索引（扫描所有 DESIGN.md）
  --update   增量更新索引（仅扫描未被索引的 DESIGN.md）`);
}

// ========== 主入口 ==========
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--rebuild')) {
    doRebuild();
  } else if (args.includes('--update')) {
    doUpdate();
  } else {
    printHelp();
  }
}

main();
