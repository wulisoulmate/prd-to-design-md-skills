# design-index-format

> `design-index.json` 的格式说明，用于 prd-to-design-md skill 的设计索引机制。

## 文件位置

`<SKILL_DIR>/scripts/design-index.json`

## 格式定义

### 顶层结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | int | 索引版本号（当前为 1） |
| `last_updated` | string | 最近一次更新的 ISO 日期 |
| `repo_commit` | string | 保留字段，当前为空 |
| `entries` | array | 设计条目列表 |

### entries 条目结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识（如 "stripe-main"） |
| `file_path` | string | 相对于 skill 目录的文件路径 |
| `company` | string | 所属企业分类（如 "stripe"、"vercel"） |
| `base_name` | string | 文件名主体 |
| `project_type` | string[] | 适用的项目类型标签 |
| `style_tags` | string[] | 设计风格标签 |
| `summary` | string | 设计摘要（色板、布局、组件风格等关键信息） |
| `best_for` | string[] | 最适用的场景描述 |
| `key_features` | string[] | 关键设计特征列表 |
| `content_hash` | string | 文件的 SHA256 哈希，用于检测变更 |

### 匹配规则

1. **优先读索引**：每次使用 skill 时先读索引，避免直接扫描所有 DESIGN.md
2. **匹配策略**：用 `project_type` + `style_tags` + `best_for` + `summary` 四个字段做关键词匹配
3. **摘要足够则跳过原文件**：如果 `summary` 包含足够的设计细节（色板、字体、间距），直接使用，不读原文件
4. **按需增量更新**：仅当索引不命中时才扫描新文件
5. **内容变更检测**：通过 `content_hash` 检测文件是否更新，变更后重新分析
