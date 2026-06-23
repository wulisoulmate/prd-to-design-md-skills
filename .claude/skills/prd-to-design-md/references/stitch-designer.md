# 角色：Stitch 设计师（Designer）

## 职责

根据 PRD 分析结果和匹配的设计参考，生成符合 Google Stitch 规范（v0.3.0）的完整 DESIGN.md 文件。
Google Stitch 规范文档：https://stitch.withgoogle.com/docs/design-md/specification/

## 核心原则

1. **参考为主，创作为辅**：以匹配到的 2-3 个参考 DESIGN.md 的风格为基础，取其中最匹配当前项目行业特征和受众的设计元素。不要完全照搬任何一个参考，而要"借鉴其设计逻辑，产出适合当前项目的风格"
2. **保持合理完整**：产出所有 9 个章节（Overview / Colors / Typography / Layout / Elevation & Depth / Shapes / Components / Do's & Don'ts / Responsive Behavior），但不必追求极端的细节——每个章节做到"够用"即可
3. **token 引用一致**：所有组件定义中的颜色、字体、间距、圆角必须引用 frontmatter 中定义的 tokens，不能硬编码值。使用 `{token.path}` 语法（如 `{colors.primary}`、`{rounded.md}`）
4. **对比度合规**：组件定义中 `textColor` vs `backgroundColor` 确保通过 WCAG AA（lint 会验证）
5. **Token、规则、理由三者并存**：YAML 提供精确值（token），prose 描述适用场景（rule），设计理由（rationale）让 AI 代理在遇到文件未覆盖的情况时仍能做出正确判断
6. **命名传递意图，而非位置**：颜色命名使用语义角色（`ink`、`canvas`、`hairline`、`muted`、`on-primary`），而非数字编号（`gray-100`、`blue1`、`accent-2`）。代理从命名就能理解颜色的职责
7. **YAML 组件与 prose 组件一一对应**：`components:` 块中的每个键必须在 `## Components` prose 中有对应的正文条目，反之亦然。lint 会检查覆盖一致性

## 结构总览

DESIGN.md 包含两层：
- **YAML frontmatter**（第 1-5 项）— 结构化的机器可读 tokens
- **Markdown prose**（第 6-9 项）— 将 tokens 转化为代理可执行的设计语言

每个部分回答一个层次的问题：

| 部分 | 回答问题 |
|------|---------|
| YAML tokens (1-5) | "精确值是多少？" |
| Overview (6) | "为什么长这样？"（设计理念） |
| Colors / Typography / Layout / Elevation / Shapes (7) | "每个 token 用在哪？为什么？" |
| Components (8) | "组件由这些 token 组合成什么样？" |
| Do's & Don'ts + Responsive (9) | "边界在哪？屏幕变化时怎么变？还有哪些没覆盖？" |

## YAML Frontmatter 模板与命名哲学

```yaml
---
version: alpha
name: <项目名>-design
description: <一句话描述项目的外观风格定位，要求包含"氛围"（atmosphere）信息，供代理在读正文前建立第一印象>

colors:
  primary: "#xxxxxx"        # 主色 — 品牌色，用于主要 CTA、链接强调
  primary-pressed: "#xxxxxx"
  secondary: "#xxxxxx"      # 辅助色
  ink: "#xxxxxx"            # 主文字色（用 "ink" 而非 "text-primary"，因为角色是"墨水"，比"文字"更语义化）
  ink-secondary: "#xxxxxx"  # 次要文字色
  ink-mute: "#xxxxxx"       # 弱化文字色（用于占位符、禁用文字）
  on-primary: "#ffffff"     # 主色上的文字色
  canvas: "#ffffff"         # 页面背景色（用 "canvas" 而非 "bg-primary"，因为角色是"画布"）
  canvas-soft: "#xxxxxx"    # 柔和背景色（卡片区的次级背景）
  surface-card: "#xxxxxx"   # 卡片表面色（如果有独立的卡片白色背景）
  hairline: "#xxxxxx"       # 分割线色（1px 边框线，用 "hairline" 而非 "border"，因为角色更具体）
  success: "#xxxxxx"        # 成功色（语义）
  warning: "#xxxxxx"        # 警告色（语义）
  error: "#xxxxxx"          # 错误色（语义）

typography:
  display-xl:               # 命名用角色（display-xl）而非 HTML 元素（h1）
    fontFamily: "..."
    fontSize: XXpx
    fontWeight: XXX
    lineHeight: X.X
    letterSpacing: X.Xpx
  # ... 其他层级（display-lg, display-md, display-sm, body-lg, body-md, body-sm, label-lg, label-md, label-sm）

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
  # 注意：变体（hover/active/disabled）作为独立条目，不嵌套
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 18px
  button-primary-hover:
    backgroundColor: "{colors.primary-pressed}"
---
```

### 命名哲学要点
- 颜色名传递**角色职责**：`ink`（墨水=文字）、`canvas`（画布=背景）、`hairline`（发丝线=边框）
- 排版名传递**使用场景**：`display-lg`、`body-md`、`button`、`caption` — 而非 `h1`、`h2`（HTML 元素）
- 间距/圆角名使用**T 恤尺码**：`xs` / `sm` / `md` / `lg` / `xl`
- 语义色传递**意义**：`success` / `warning` / `error`

### 组件定义规则
- 每个组件完全通过 `{token.refs}` 定义，不内联 hex 或 px
- 变体（hover、active、disabled、pressed）作为**独立的组件条目**（如 `button-primary-hover`），不嵌套在 `button-primary` 内
- 允许的属性：`backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height`, `width`

## 正文章节规则

### 1. Overview（视觉主题概述）
- 150-300 字，包含两部分：
  - **氛围陈述**：描述氛围（atmosphere）、密度（density）、设计哲学（design philosophy），引用相关 token
  - **Key Characteristics**：一个无序列表，总结最核心的设计特征（3-5 条），每条尽量使用 token 引用
- 可以参考匹配的 DESIGN.md 的写法
- 说明当前项目面向的受众和行业背景
- **这个段落回答的是"为什么长这样？"，不只是"长什么样"**

```markdown
## Overview

<品牌名> reads like a product brand that wants to feel both warm and
deliberate. The base canvas is a pale cream {colors.canvas} holding deep
ink type, with a single accent {colors.primary} carrying every primary CTA.

**Key Characteristics:**
- Single accent color: {colors.primary} carries every primary CTA and brand link.
- Modest display weights — display-lg at weight 500, not 700+.
- Hairline-only depth. Cards separate from canvas via 1px {colors.hairline} borders.
```

### 2. Colors（色彩体系）
- 列出所有颜色 token 的用途，使用子标题分组：
  - `### Brand & Accent` — 品牌色、强调色
  - `### Surface` — 背景色、卡片色、画布
  - `### Hairlines & Borders` — 分割线、边框
  - `### Text` — 各层级文字色
  - `### Semantic` — 成功 / 警告 / 错误色
- 每个颜色子项格式：**`{token.xxx}` 色名 (#HEX)**：一句用途说明
- 说明暗色模式下的色彩调整策略（若需要）

```markdown
## Colors

### Brand & Accent
- **Tangerine** ({colors.primary} — #F76B1C): The single brand color.
  Used on every primary CTA and brand wordmark.

### Surface
- **Canvas** ({colors.canvas} — #FFFAF1): The default page floor. A pale
  cream rather than pure white — warmer, calmer, lower-glare.
```

### 3. Typography（字体层级）
- 字体层级表，包含：fontFamily、fontSize、fontWeight、lineHeight、letterSpacing、使用场景
- 至少 6 个层级：display-xl → body-sm
- 包含 `### Principles` 段落：解释为什么层级比例如此设计
- 包含 `### Note on Font Substitutes`：列出推荐的开源替代字体（如 Noto Sans SC 替代苹方等版权字体）
- 说明中英文混排策略

### 4. Layout（布局与间距）
- 间距体系：基础单位（4px 或 8px 网格）、各 token 对应值
- 页面内容容器宽度（如 max-width: 1200px）
- 栅格策略（列数、列间距、边距）
- 留白哲学（如"呼吸感"、"内容优先"），使用 `{spacing.xxx}` 引用

### 5. Elevation & Depth（阴影层级）
- 阴影层级表（Level 0-4/5）
- 每级阴影的用途（如 Level 1=卡片，Level 3=模态框）
- 装饰性深度处理（叠加层、模糊背景）
- 如果系统只使用一个阴影层级，**明确说出来**

### 6. Shapes（形状与圆角）
- 圆角层级表（各 token 的值和用途：如 `{rounded.none}=0px` 用于按钮、`{rounded.full}=9999px` 用于胶囊）
- 组件几何特征描述（如按钮矩形/胶囊、卡片圆角、输入框圆角）
- 可选的图标风格（线性/面性/描边粗细）

### 7. Components（组件定义）
- 定义 6-10 个核心组件
- **YAML 与 prose 必须 1:1 匹配**：YAML `components:` 块中的每个键在此都有对应的 prose 条目，反之亦然
- 每个组件的 prose 格式：
  - `**\`组件名\`**` — 一句话说明用途
  - 逐项描述 surface、typography、padding、rounded，全部引用 `{token.refs}`
- 变体同样作为独立条目列出
- 推荐组件列表：按钮（主要/次要/幽灵，含 hover/disabled）、表单输入框（默认/聚焦/错误/禁用）、卡片（默认/可交互）、导航栏（顶部/侧边）、标签/徽章、页脚、数据表格、弹窗/模态框

```markdown
## Components

**`button-primary`** — The signature primary CTA. Background
`{colors.primary}`, text `{colors.on-primary}`, type
`{typography.button}`, padding 10px × 18px, rounded `{rounded.md}`.

**`card`** — The default content card. Background
`{colors.surface-card}`, text `{colors.ink}`, rounded `{rounded.lg}`,
padding 20px, separated from canvas by a 1px `{colors.hairline}` border.
```

### 8. Do's and Don'ts（设计约束与反模式）
- 列出 5-8 条设计约束和反模式
- 每条引用具体的 token 值，给出明确规则

```markdown
## Do's and Don'ts

- ✅ 主色 `{colors.primary}` 用于关键操作和品牌强调，不要作为大面积背景。
- ✅ 正文使用高对比度的 `{colors.ink}`，不要用 `{colors.ink-mute}`。
- ✅ 卡片之间间距统一使用 `{spacing.lg}`。
- ✅ 所有按钮圆角统一使用 `{rounded.md}`。
- ❌ 不要用主色作为正文字体颜色。
- ❌ 不要在白色背景上使用浅灰文字。
- ❌ 不要在不同页面使用不同的圆角值。
```

### 9. Responsive Behavior & Known Gaps（响应式行为与已知未覆盖范围）

分为两个子部分：

**### Responsive Behavior：**
- 推荐使用断点表格式：

```markdown
| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 720px | Hamburger nav; hero h1 56→32px; cards stack 1-up. |
| Tablet | 720-1024px | Top nav narrows; cards 2-up; sidebar collapses. |
| Desktop | 1024-1440px | Full top nav; 3-up card grid; sticky sidebar. |
| Wide | > 1440px | Content caps at 1440px; gutters absorb the rest. |
```

- 包含 `### Touch Targets`：触控目标尺寸（至少 44×44px，WCAG AAA）、表单输入高度
- 包含 `### Collapsing Strategy`：导航→汉堡菜单、网格列数降级、间距调整策略
- 图片自适应行为（object-fit 策略）
- 表格在窄屏上的处理（横向滚动 / 隐藏列 / 卡片式折叠）

**### Known Gaps：**
- 明确列出当前文件**未覆盖**的设计领域
- 保持契约诚实：让使用该 DESIGN.md 的代理知道哪些决策不在规范范围内

```markdown
### Known Gaps

- Animation and transition timings are out of scope.
- Form error/success states are not extracted.
- Dark mode is not a documented variant — the brand renders one canvas mode.
```

## 设计参考分析要点

读取匹配的参考 DESIGN.md 时，重点关注：
- 配色体系的组合逻辑（主色如何选定？辅助色如何搭配？）
- 排版层级的比例关系（字号如何递进？）
- 间距体系的基础单位（4px 还是 8px？）
- 组件的风格特征（圆角大小、按钮形状、卡片样式）
- 适用于当前项目的设计元素
- **设计理由（rationale）**：参考不仅仅是"用什么值"，更是"为什么选择这个值"

## 使用方式

本文件由主流程阶段 3（生成 DESIGN.md）引用。在阶段 3 先读取本文件了解生成规范，然后基于阶段 1 的项目特征和阶段 2 的匹配参考，生成符合 Google Stitch 标准的 DESIGN.md。
