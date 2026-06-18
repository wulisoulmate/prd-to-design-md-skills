---
name: prd-to-design-md
description: >
  从PRD文档自动生成符合Google Stitch标准的DESIGN.md设计规范文件和预览HTML。
  分析PRD中行业、受众、UI风格 → 从awesome-design-md设计库匹配参考 →
  按Google Stitch规范生成DESIGN.md → lint验证（最多3轮）→ 生成预览HTML。
  当你需要"为项目生成设计规范"、"根据PRD出设计稿"、"想要预览UI效果"、
  "需要DESIGN.md来指导前端生成"时，务必使用此skill。
  特别适合：先看UI效果再决定是否生成完整工程的场景，以及非前端用户需要
  结构化表达设计需求的场景。
---

# prd-to-design-md Skill

## 概述

本 skill 的核心理念：**在投入完整前端工程生成之前，先看到 UI 效果**。

从 PRD 出发，经过 6 个阶段，产出两份文件到当前工作目录：
1. **`DESIGN.md`** — 符合 Google Stitch 标准的完整设计规范（9 个章节）
2. **`preview.html`** — 基于 DESIGN.md 风格的多页预览（最多 2 页）

> 生成的 DESIGN.md 可用于任何支持该格式的工具（Claude Code、Cursor、Windsurf 等），
> 让你用自然语言就能驱动 AI 生成风格统一的前端 UI。

---

## 完整流程

### 前置准备

#### 路径自动发现

本 skill 的脚本通过运行时动态定位：

```bash
# 自动发现 skill 目录（优先项目级，回退到用户级）
SKILL_DIR="$(cd "$(dirname "$(find "$HOME/.claude/skills" "$(pwd)/.claude/skills" -maxdepth 3 -name "SKILL.md" -path "*/prd-to-design-md/*" 2>/dev/null | head -1)")" && pwd)"
[ -z "$SKILL_DIR" ] && SKILL_DIR="$HOME/.claude/skills/prd-to-design-md"
```

> 其他平台请使用对应平台约定替换 `~/.claude/skills/`。

#### design-md 内容确认

```bash
# 检查设计素材库是否存在
if [ -d "$SKILL_DIR/design-md" ] && [ "$(ls -A "$SKILL_DIR/design-md" 2>/dev/null)" ]; then
  echo "设计素材库已就绪，共 $(find "$SKILL_DIR/design-md" -name "DESIGN.md" | wc -l) 个设计文件"
else
  echo "⚠️ design-md/ 目录为空。请确保将 awesome-design-md 内容放置到 $SKILL_DIR/design-md/ 下"
fi
```

### 阶段 1：PRD 分析

**输入**：用户提供的 PRD.md 路径

**步骤**：

1. 读取用户提供的 PRD.md 文件内容
2. 打印信息告知用户即将进入阶段 1"PRD 分析"
3. 从 PRD 中提取以下项目特征——如平台有创意构思/需求分析工具，优先使用；否则由 Agent 直接分析：
   - **行业归类**（如 fintech、healthcare、e-commerce、education、SaaS、social）
   - **目标受众**（如 C 端消费者、B 端企业用户、开发者、内部员工）
   - **UI 风格意向**（如 极简/科技感/温暖友好/专业可靠/活泼/沉稳）
   - **功能页面清单**（如 登录页、仪表盘、列表页、详情页、设置页...）
   - **是否包含登录/认证功能**（影响预览 HTML 第一页的内容选择）
4. 输出结构化的项目特征摘要，告知用户分析结果，等待确认后进入阶段 2

### 阶段 2：设计匹配

**输入**：阶段 1 得出的项目特征摘要

**子步骤 A — 索引就绪检查**

```bash
if [ -f "$SKILL_DIR/scripts/design-index.json" ] && [ "$(cat "$SKILL_DIR/scripts/design-index.json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('entries',[])))" 2>/dev/null)" -gt 0 ]; then
  echo "设计索引已就绪（共 X 条记录）"
else
  echo "索引为空，正在重建..."
  node "$SKILL_DIR/scripts/search-design-index.mjs" --rebuild
fi
```

> 注意：首次重建索引需要扫描所有 DESIGN.md 文件并记录路径和哈希，消耗一定的处理时间。完成后后续查询将非常快速。

**子步骤 B — 查询匹配**

将阶段 1 的项目特征摘要拼接为描述文本（如"金融SaaS支付平台，企业级后台管理系统，极简科技感风格"），调用索引查询：

```bash
node "$SKILL_DIR/scripts/search-design-index.mjs" --query "<项目特征描述>"
```

根据查询结果，选择 **Top 2-3** 个匹配的 DESIGN.md 进行读取：
- 读取每个匹配 entry 的 `file_path` 对应的 `DESIGN.md` 全文
- 如果 `summary` 字段已包含足够的色板、字体、间距细节，可以跳过原文件读取以节省 token
- 认真分析这些参考 DESIGN.md 的结构、配色逻辑、排版体系、组件风格

**匹配失败处理**：
- 无匹配结果 → 告知用户索引中无匹配项，可选择：① 直接进入阶段 3（由 Agent 自主生成设计）；② 先运行 `--update` 更新索引再试
- 索引为空 → 自动触发 `--rebuild` 重建

**设计参考分析要点**（读取参考 DESIGN.md 时关注）：
- 配色体系的组合逻辑（主色如何选定？辅助色如何搭配？）
- 排版层级的比例关系（字号如何递进？）
- 间距体系的基础单位（4px 还是 8px？）
- 组件的风格特征（圆角大小、按钮形状、卡片样式）
- 适用于当前项目的设计元素

### 阶段 3：生成 DESIGN.md

**输出**：当前工作目录下的 `DESIGN.md`

严格遵循 Google Stitch 规范，产出包含完整 9 个章节的 DESIGN.md。

#### 整体原则

1. **参考为主，创作为辅**：以阶段 2 匹配到的 2-3 个参考 DESIGN.md 的风格为基础，取其中最匹配当前项目行业特征和受众的设计元素。不要完全照搬任何一个参考，而是要"借鉴其设计逻辑，产出适合当前项目的风格"
2. **保持合理完整**：产出 9 个章节，但不必追求极端的细节——每个章节做到"够用"即可
3. **token 引用一致**：所有组件定义中的颜色、字体、间距、圆角必须引用 frontmatter 中定义的 tokens，不能硬编码值
4. **对比度合规**：组件定义中 `textColor` vs `backgroundColor` 确保通过 WCAG AA（lint 会验证）

#### YAML Frontmatter 模板

```yaml
---
version: alpha
name: <项目名>-design
description: <一句话描述项目的外观风格定位>

colors:
  primary: "#xxxxxx"
  # 主色 — 品牌色，用于主要 CTA、链接强调
  primary-pressed: "#xxxxxx"
  # 辅助色
  secondary: "#xxxxxx"
  # 文字色
  ink: "#xxxxxx"
  ink-secondary: "#xxxxxx"
  ink-mute: "#xxxxxx"
  on-primary: "#ffffff"
  # 表面色
  canvas: "#ffffff"
  canvas-soft: "#xxxxxx"
  hairline: "#xxxxxx"
  # 语义色
  success: "#xxxxxx"
  warning: "#xxxxxx"
  error: "#xxxxxx"

typography:
  display-xl:
    fontFamily: "..."
    fontSize: XXpx
    fontWeight: XXX
    lineHeight: X.X
    letterSpacing: X.Xpx
  # ... 其他层级

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  section: 64px

rounded:
  sm: 4px
  md: 8px
  lg: 12px
  pill: 9999px

components:
  # 组件定义，引用上面的 tokens
---
```

#### Markdown 正文章节（严格执行顺序）

| # | 章节 | 内容要点 |
|---|------|---------|
| 1 | **Overview** | 视觉主题概述（150-300 字）。描述氛围、密度、设计哲学。可以参考匹配的 DESIGN.md 的写法 |
| 2 | **Colors** | 色板详细说明。列出所有颜色 token 的用途，每个颜色给出：token名、hex值、功能角色、使用场景 |
| 3 | **Typography** | 字体层级表。包含 fontFamily、fontSize、fontWeight、lineHeight、letterSpacing、使用场景。列出推荐的开源替代字体 |
| 4 | **Layout** | 间距体系（基础单位、token 对应值）、页面内容容器宽度、栅格策略、留白哲学 |
| 5 | **Elevation & Depth** | 阴影层级表（Level 0-4/5）、装饰性深度处理方式 |
| 6 | **Shapes** | 圆角层级表（各 token 的值和用途）、组件几何特征描述 |
| 7 | **Components** | 定义 6-10 个核心组件：按钮（主要/次要）、卡片、表单输入框、导航栏、标签/徽章、页脚等。必须引用 tokens |
| 8 | **Do's and Don'ts** | 列出 5-8 条设计约束和反模式（如"不要用主色作为正文颜色"） |
| 9 | **Responsive Behavior** | 断点定义、折叠策略、触控目标、图片自适应行为 |

### 阶段 3b：lint 验证（最多 3 轮）

**验证命令**：

```bash
npx @google/design.md lint --format json <工作目录>/DESIGN.md
```

**流程**：

1. **第 1 轮**：运行 lint，解析 JSON 输出
   - ✅ 无 errors → 进入阶段 4
   - ❌ 有 errors → 按修复策略逐个修复后进入第 2 轮
   - ⚠️ `npx` 命令失败（未安装 Node.js / 网络不通）→ 显示提示，跳过验证

2. **第 2 轮**：重新 lint
   - ✅ 无 errors → 进入阶段 4
   - ❌ 仍有 errors → 修复后进入第 3 轮

3. **第 3 轮（终轮）**：重新 lint
   - ✅ 无 errors → 进入阶段 4
   - ❌ 仍有 errors → 输出剩余 error 列表，告知用户"已达到最大重试次数，剩余 errors 需要手动修复"

**针对各 error 类型的修复策略**：

| error 类型 | 修复方式 |
|-----------|---------|
| `broken-ref` | 检查 `{color.xxx}` 引用，确认 token 名称在 frontmatter 中存在（注意 `colors.xxx` 而非 `color.xxx`） |
| `invalid-color` | 确保 hex 格式为 `#XXXXXX`，6 位完整 hex |
| `invalid-dimension` | 尺寸值带单位（`px`），数值合理 |
| `invalid-typography` | fontSize 使用有效字号值，fontWeight 使用有效字重值 |
| `duplicate-section` | 检查是否有重复的 `## Title`，合并或重命名 |
| `wcag-contrast` | **warning 级别**，注记输出但不强制修复 |
| `unknown-component-property` | **warning 级别**，移除不在白名单中的属性 |

> lint 验证后，无论是否全部通过，都在返回信息中显示 lint 结果摘要供用户查看。

### 阶段 4：生成预览 HTML

**输出**：当前工作目录下的 `preview.html`

**规范**：
- 单文件 HTML，所有资源内联（CSS 嵌入 `<style>`，无外部资源引用）
- 严格使用 DESIGN.md 的 tokens（colors、typography、spacing、rounded）作为样式
- 最多 2 个页面，通过 hash 路由切换（`#page1` / `#page2`）
- 底部或顶部有简单的 Tab 导航切换页面

**页面内容规则**：
- **第 1 页（登录/首页）**：如果 PRD 有登录/注册需求 → 登录页面；否则 → 产品 Hero 页面
- **第 2 页（功能页）**：PRD 中描述的核心功能页面（如仪表盘、数据列表、内容展示页）
- 使用**最小化的模拟数据**——足够展示页面布局和组件外观即可，不填充大量列表或表格数据

**HTML 结构模板**：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>项目名 — 设计预览</title>
  <style>
    /* ===== DESIGN.md tokens 映射 ===== */
    /* 从生成的 DESIGN.md 提取所有 tokens 映射为 CSS 变量 */
    :root {
      --color-primary: #xxxxxx;
      --color-canvas: #xxxxxx;
      --font-display-xl: "FontName", sans-serif;
      /* ... 完整映射 ... */
    }

    /* ===== 全局重置与基础样式 ===== */
    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* ===== 页面容器 ===== */
    .page { display: none; }
    .page.active { display: block; }

    /* ===== Tab 导航 ===== */
    .tab-bar { /* ... */ }

    /* ===== 登录页样式 ===== */
    /* ===== 功能页样式 ===== */
    /* ===== 组件样式（按钮、卡片、输入框等） ===== */

    /* ===== 设计浮标 ===== */
    .design-badge { /* 右下角小浮标，显示设计风格名称 */ }
  </style>
</head>
<body>
  <!-- Tab 导航 -->
  <nav class="tab-bar">
    <a href="#page1" class="tab active">登录</a>
    <a href="#page2" class="tab">仪表盘</a>
  </nav>

  <!-- 页面 1 -->
  <div id="page1" class="page active">
    <!-- 登录页内容 -->
  </div>

  <!-- 页面 2 -->
  <div id="page2" class="page">
    <!-- 功能页内容 -->
  </div>

  <!-- 设计浮标 -->
  <div class="design-badge">🎨 设计规范：<项目名></div>

  <script>
    // hash 路由切换逻辑
    function switchPage() {
      const hash = location.hash || '#page1';
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const target = document.querySelector(hash);
      if (target) target.classList.add('active');
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      const tab = document.querySelector(`.tab[href="${hash}"]`);
      if (tab) tab.classList.add('active');
    }
    window.addEventListener('hashchange', switchPage);
    window.addEventListener('DOMContentLoaded', switchPage);
  </script>
</body>
</html>
```

**设计浮标**：右下角小标签，显示当前预览基于的 DESIGN.md 名称，帮助用户理解这个预览与设计规范的关联。

### 阶段 5：输出指导

在流程结束后，向用户展示以下信息：

1. **生成了什么**
   ```
   ✅ 已完成！在当前工作目录下生成了：
      📄 DESIGN.md  — 符合 Google Stitch 标准的设计规范（${章节数} 个章节）
      🌐 preview.html — 多页设计预览（${页数} 页）
   ```

2. **lint 验证结果**
   ```
   🔍 lint 验证结果：${通过/有 X 个 error 未修复/已跳过}
   ```

3. **如何使用 DESIGN.md 指导 AI 生成 UI**
   ```
   你可以在后续对话中使用以下方式引用此 DESIGN.md：

   1. Claude Code / Cursor / Windsurf 等工具中：
      请根据项目根目录下的 DESIGN.md 设计规范来生成前端 UI，
      严格遵循其中的配色方案、排版规范和组件定义。

   2. 在任何 AI 编码助手的 prompt 中：
      我们有一个 DESIGN.md 设计规范文件，包含完整的 colors/typography/components 定义。
      请先读取该文件，然后严格按照其中的设计 tokens 来生成所有页面。

   3. 分享给团队：
      DESIGN.md 是开放格式（Google Stitch 标准），团队成员和 CI 工具都能读取和验证。
   ```

4. **预览方式**
   ```
   用浏览器直接打开 preview.html 即可查看设计效果。
   ```

---

## 设计索引说明

设计索引存储在 `$SKILL_DIR/scripts/design-index.json`，格式见 `references/design-index-format.md`。

索引的核心作用是**避免每次使用 skill 都重复读取所有 DESIGN.md 文件**，从而节省大量 token。

索引的更新策略：
- **首次使用**：全量扫描 design-md/，构建索引（触发 `--rebuild`）
- **后续使用**：仅读取索引，按需增量更新（运行 `--update` 扫描新文件）
- **手动重建**：运行 `node $SKILL_DIR/scripts/search-design-index.mjs --rebuild`

## 常用脚本路径

| 用途 | 路径 |
|------|------|
| 索引查询 | `$SKILL_DIR/scripts/search-design-index.mjs --query "<描述>"` |
| 增量更新索引 | `$SKILL_DIR/scripts/search-design-index.mjs --update` |
| 全量重建索引 | `$SKILL_DIR/scripts/search-design-index.mjs --rebuild` |
| 验证 DESIGN.md | `npx @google/design.md lint --format json DESIGN.md` |

## 输出清单

| 文件 | 说明 |
|------|------|
| `DESIGN.md` | 符合 Google Stitch 标准的完整设计规范 |
| `preview.html` | 基于 DESIGN.md 风格的多页设计预览 |

## 错误处理

- **PRD.md 路径不存在**：提示用户检查路径，等待用户修正
- **PRD.md 为空**：提示用户文件内容为空，要求重新提供
- **design-md/ 目录为空**：提示需要 awesome-design-md 内容，说明如何维护
- **索引为空**：自动触发全量重建
- **无匹配结果**：告知用户，可选择直接进入阶段 3（Agent 自主生成）或更新索引后重试
- **npx @google/design.md lint 失败**（未安装 Node.js / 网络不通）：跳过 lint，显示提示信息
- **lint 超过 3 轮仍有 error**：输出剩余 error 列表，不阻塞后续流程

## 设计参考

Google Stitch DESIGN.md 规范：https://stitch.withgoogle.com/docs/design-md/specification/
npm 包：https://www.npmjs.com/package/@google/design.md
设计素材来源：https://github.com/VoltAgent/awesome-design-md
