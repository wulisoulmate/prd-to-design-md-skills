---
name: prd-to-design-md
description: >
  PRD→DESIGN.md+preview.html 的自动化设计规范生成系统。
  输入：PRD.md（Markdown 产品需求文档）。
  核心能力：分析 PRD 项目特征 → 从 74 个企业级品牌库匹配设计参考 →
  生成 Google Stitch 标准 DESIGN.md（9 章节完整规范）→
  lint 自动验证（最多 3 轮）→ 导出单文件多页预览 HTML。
  触发关键词："设计规范"、"生成 DESIGN.md"、"出设计稿"、
  "设计系统"、"UI 规范"、"design system"、"design spec"、
  "设计预览"、"想先看 UI 效果"、"根据 PRD 做设计"、
  "design.md lint"、"Google Stitch"。
  目标用户：产品经理（想表达设计需求但不会写代码）、
  前端开发者（快速获取设计 tokens 驱动 UI 生成）、
  创业者（MVP 阶段快速验证视觉方向）。
---

# prd-to-design-md Skill

> [!CAUTION]
> ## 🚨 执行纪律
>
> 1. **串行执行** — 阶段 1→2→3→4 必须按顺序执行，不可跳跃或并行
> 2. **确认后再进入** — 阶段 1 的分析结果必须先经用户确认，才能进入阶段 2
> 3. **差异化组合** — 匹配到的参考 DESIGN.md 是风格参考，不能完全照搬。必须"借鉴设计逻辑，产出适合当前项目的风格"
> 4. **lint 不可跳过** — 阶段 3 生成的 DESIGN.md 必须通过 lint 验证（最多 3 轮），lint 命令失败场景除外
> 5. **token 一致性** — 组件定义中颜色/字体/间距必须引用 frontmatter 中定义的 tokens，不能硬编码值

## 概述

核心理念：**在投入完整前端工程生成之前，先看到 UI 效果**。

从 PRD 出发，经过 4 个阶段 + 2 个自动工作流，产出两份文件到当前工作目录：
1. **`DESIGN.md`** — 符合 [Google Stitch](https://stitch.withgoogle.com/docs/design-md/specification/) 标准的完整设计规范（9 章节）
2. **`preview.html`** — 基于 DESIGN.md 风格的多页预览（hash 路由，最多 2 页）

> 生成的 DESIGN.md 可用于任何支持该格式的工具（Claude Code、Cursor、Windsurf 等），让你用自然语言就能驱动 AI 生成风格统一的前端 UI。

---

## 完整流程

### 前置准备

#### 路径自动发现 + 环境检查

先发现 skill 目录路径，再执行一次完整环境检查：

```bash
# 自动发现 skill 目录（优先项目级，回退到用户级）
SKILL_DIR="$(dirname "$(find "$HOME/.claude/skills" "$(pwd)/.claude/skills" -maxdepth 3 -name "SKILL.md" -path "*/prd-to-design-md/*" 2>/dev/null | head -1)")"
[ -z "$SKILL_DIR" ] && SKILL_DIR="$HOME/.claude/skills/prd-to-design-md"

# 执行完整环境检查（含 design-md 库 + 索引状态）
node "$SKILL_DIR/scripts/skill-env.mjs" --check
```

> `skill-env.mjs --check` 一次性验证设计素材库（`design-md/` 存在且含有效文件）和索引文件（`design-index.json` 存在且非空），替代了原本多条内联 bash 命令。无 python3 依赖，输出人类可读的健康报告供 AI 判断后续操作。

---

### [Role Switch: Analyzer]
📖 Reading role definition: `references/analyzer.md`
📋 Current task: 阶段 1 — PRD 分析

#### 阶段 1：PRD 分析

🚧 **GATE**: 用户提供了 PRD.md 路径且文件存在、内容非空

1. 读取用户提供的 PRD.md 文件内容
2. 读取 `references/analyzer.md` 了解分析策略
3. 从 PRD 中提取项目特征（行业归类、目标受众、UI 风格意向、功能页面清单、认证需求）
   > 如平台有创意构思/需求分析工具，优先使用；否则直接由 Agent 分析
4. 输出结构化的**项目特征摘要**（Markdown 格式，包含行业归类、受众、风格意向、页面清单）

**✅ Checkpoint — PRD 分析完成，进入用户确认**

> ⛔ **BLOCKING** — 向用户展示分析摘要，用选项确认后才能进入阶段 2
>
> 通过 `AskUserQuestion` 展示两个选项供用户选择：
>
> | 选项 | 行为 |
> |------|------|
> | **① 分析准确，继续执行** | 分析满足预期 → 进入阶段 2 |
> | **② 分析需修正，我来补充** | 用户描述修正意见 → AI 合并更新摘要 → 再次展示确认 → 重复直到用户选 ① |
>
> 若用户选②：读取用户的后续输入，将其修正意见合并到项目特征摘要中，更新后再次用 `AskUserQuestion` 展示确认。循环直到用户确认。**AI 不得在用户未确认时代入阶段 2。**

---

### [Role Switch: Matcher]
📖 Reading role definition: `references/matcher.md`
📋 Current task: 阶段 2 — 设计匹配

#### 阶段 2：设计匹配

🚧 **GATE**: 阶段 1 完成且项目特征摘要已确认

**步骤 — 查询匹配**

前置准备阶段已验证索引就绪，直接查询：

```bash
node "$SKILL_DIR/scripts/index-query.mjs" --query "<项目特征描述>"
```

**步骤 — 选择与分析**
- 读取 Top 2-3 个匹配的 DESIGN.md（优先使用 `summary` 字段以节省 token）
- 分析配色逻辑、排版体系、间距网格、组件风格

**匹配失败处理**：
- 无匹配结果 → 告知用户"未找到匹配的设计参考，将直接进入阶段 3 自主生成"，然后进入阶段 3
- 索引为空或损坏 → 自动触发 `--rebuild` 后重试查询

**✅ Checkpoint — 已匹配 Top 2-3 参考 DESIGN.md，可进入生成**

---

### [Role Switch: Designer]
📖 Reading role definition: `references/stitch-designer.md`
📋 Current task: 阶段 3 — 生成 DESIGN.md

#### 阶段 3：生成 DESIGN.md

🚧 **GATE**: 阶段 2 完成，已读取匹配的参考设计

1. 读取 `references/stitch-designer.md` 了解生成规范
2. 基于阶段 1 的项目特征 + 阶段 2 的匹配参考，生成完整 9 章节 DESIGN.md
3. 确保 YAML frontmatter 中的所有 tokens 完整且引用一致

**✅ Checkpoint — DESIGN.md 已生成，进入验证工作流**

---

### 自动工作流 1：Lint 验证

此阶段自动触发 `workflows/lint-verify.md` 工作流，不依赖用户交互。

🚧 **GATE**: DESIGN.md 已写入当前工作目录

执行流程：
1. 运行 `npx @google/design.md lint --format json DESIGN.md`
2. 解析 JSON 输出，判断 errors
3. 最多 3 轮修复循环（逐轮修复 → re-lint）
4. 输出结果摘要

详见 `workflows/lint-verify.md`。

**✅ Checkpoint — lint 验证完成，进入预览导出工作流**

---

### 自动工作流 2：预览 HTML 导出

lint 验证后自动触发 `workflows/preview-export.md` 工作流。

🚧 **GATE**: DESIGN.md 内容可用，tokens 可提取

执行流程：
1. 从 DESIGN.md 提取所有设计 tokens
2. 根据阶段 1 的项目特征确定页面内容（登录页 / Hero 页 + 功能页）
3. 生成单文件 HTML（所有资源内联，hash 路由，2 页）
4. 写入 `preview.html`

详见 `workflows/preview-export.md`。

**✅ Checkpoint — preview.html 已生成**

---

### 阶段 4：输出指导

🚧 **GATE**: DESIGN.md 和 preview.html 均已生成

向用户展示以下信息：

```text
✅ 已完成！在当前工作目录下生成了：
   📄 DESIGN.md  — 符合 Google Stitch 标准的设计规范
   🌐 preview.html — 多页设计预览

🔍 lint 验证结果：{通过 / 有 X 个 error 未修复 / 已跳过}
```

**如何使用 DESIGN.md 指导 AI 生成 UI：**

DESIGN.md 本身不是 UI 生成器，而是一份**设计规范参考**——它记录了配色方案、字体层级、间距体系、组件风格。当你把它交给 AI 编码代理时，代理会读取这些 tokens 并据此生成风格统一的前端代码。

```
1. 在 Claude Code 等工具中引用：
   项目根目录下有一份 DESIGN.md 设计规范文件，
   请读取该文件，并严格按照其中的配色方案、排版规范和组件风格来生成前端 UI。

2. 在任何 AI 编码助手的 prompt 中加入：
   我们有一个 DESIGN.md 设计规范文件，包含完整的 colors/typography/components 定义。
   请先读取该文件，然后按照其中定义的设计 tokens 来生成所有页面的视觉风格。

3. 分享给团队：
   DESIGN.md 是开放格式（Google Stitch 标准），团队成员和 CI 工具都能读取和验证。
```


**预览方式：**
用浏览器直接打开 `preview.html` 即可查看设计效果。

---

## 设计索引说明

设计索引存储在 `$SKILL_DIR/scripts/design-index.json`，格式见 `references/design-index-format.md`。

| 操作 | 命令 |
|------|------|
| 索引查询 | `node $SKILL_DIR/scripts/index-query.mjs --query "<描述>"` |
| 增量更新索引 | `node $SKILL_DIR/scripts/index-builder.mjs --update` |
| 全量重建索引 | `node $SKILL_DIR/scripts/index-builder.mjs --rebuild` |

## 验证工具

| 用途 | 命令 |
|------|------|
| DESIGN.md 规范验证 | `node $SKILL_DIR/scripts/design-validator.mjs --file DESIGN.md` |

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| PRD.md 路径不存在 | 提示用户检查路径，等待用户修正 |
| PRD.md 为空 | 提示文件内容为空，要求重新提供 |
| design-md/ 为空 | 提示需 awesome-design-md 内容 |
| 索引为空 | 自动触发全量重建 |
| 无匹配结果 | 告知用户，可选择直接进入阶段 3 或更新索引重试 |
| lint 命令失败 | 跳过验证，显示提示 |
| lint 3 轮仍有 error | 输出剩余 error 列表，不阻塞后续流程 |

## 输出清单

| 文件 | 说明 |
|------|------|
| `DESIGN.md` | 符合 Google Stitch 标准的完整设计规范 |
| `preview.html` | 基于 DESIGN.md 风格的多页设计预览 |

## 设计参考

- Google Stitch DESIGN.md 规范：https://stitch.withgoogle.com/docs/design-md/specification/
- npm 包：https://www.npmjs.com/package/@google/design.md
- 设计素材来源：https://github.com/VoltAgent/awesome-design-md
