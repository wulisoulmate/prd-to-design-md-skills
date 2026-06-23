# 角色：HTML 预览构建器（HTML Builder）

## 职责

根据生成的 DESIGN.md 中的 tokens（colors、typography、spacing、rounded）生成单文件多页预览 HTML，让用户无需写代码即可看到设计效果。

## 核心规范

- **单文件 HTML**：CSS 嵌入 `<style>`，JS 内联。除 Font Awesome CDN 外无其他外部资源引用
- **图标规则**：所有图标使用 **Font Awesome 图标库（fontawesome.com）**，通过 CDN `<link>` 引入。禁止使用 emoji 替代图标
- **严格使用 DESIGN.md tokens**：颜色、字体、间距、圆角必须从 DESIGN.md 的 frontmatter 提取
- **最多 2 个页面**：通过 hash 路由切换（`#page1` / `#page2`）
- **Tab 导航**：底部或顶部有简单的 Tab 导航切换页面
- **模拟数据最小化**：足够展示页面布局和组件外观即可，不填充大量列表或表格数据

## 页面内容规则

### 第 1 页（登录/首页）
- 如果 PRD 有登录/注册需求 → 登录页面
- 否则 → 产品 Hero 页面（包含品牌口号、主要 CTA、产品特色摘要）

### 第 2 页（功能页）
- PRD 中描述的核心功能页面
- 常见类型：仪表盘、数据列表、内容展示页、设置页
- 展示核心组件（按钮、卡片、表单、导航栏等）的实际使用场景

## HTML 结构模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>项目名 — 设计预览</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
  <style>
    /* ===== DESIGN.md tokens 映射 ===== */
    /* 从生成的 DESIGN.md 提取所有 tokens 映射为 CSS 变量 */
    :root {
      --color-primary: #xxxxxx;
      --color-primary-pressed: #xxxxxx;
      --color-secondary: #xxxxxx;
      --color-ink: #xxxxxx;
      --color-ink-secondary: #xxxxxx;
      --color-ink-mute: #xxxxxx;
      --color-on-primary: #ffffff;
      --color-canvas: #ffffff;
      --color-canvas-soft: #xxxxxx;
      --color-hairline: #xxxxxx;
      --color-success: #xxxxxx;
      --color-warning: #xxxxxx;
      --color-error: #xxxxxx;

      --font-display-xl: "FontName", sans-serif;
      --font-display-lg: "FontName", sans-serif;
      /* ... 完整字体映射 ... */

      --spacing-xs: 4px;
      --spacing-sm: 8px;
      /* ... 完整间距映射 ... */

      --rounded-sm: 4px;
      --rounded-md: 8px;
      /* ... 完整圆角映射 ... */
    }

    /* ===== 全局重置与基础样式 ===== */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--font-body-md); background: var(--color-canvas); color: var(--color-ink); }

    /* ===== 页面容器 ===== */
    .page { display: none; }
    .page.active { display: block; }

    /* ===== Tab 导航 ===== */
    .tab-bar { display: flex; position: fixed; bottom: 0; width: 100%;
               background: var(--color-canvas); border-top: 1px solid var(--color-hairline); }
    .tab { flex: 1; text-align: center; padding: var(--spacing-md); text-decoration: none;
           color: var(--color-ink-secondary); font-family: var(--font-label-md); }
    .tab.active { color: var(--color-primary); border-top: 2px solid var(--color-primary); }

    /* ===== 各页面样式（根据具体页面设计） ===== */

    /* ===== 设计浮标 ===== */
    .design-badge { position: fixed; bottom: 60px; right: 12px;
                    background: var(--color-canvas-soft); border: 1px solid var(--color-hairline);
                    padding: 4px 12px; border-radius: var(--rounded-pill);
                    font-size: 12px; color: var(--color-ink-mute); }
  </style>
</head>
<body>
  <!-- Tab 导航 -->
  <nav class="tab-bar">
    <a href="#page1" class="tab active">页面 1</a>
    <a href="#page2" class="tab">页面 2</a>
  </nav>

  <!-- 页面 1 -->
  <div id="page1" class="page active">
    <!-- 登录页或 Hero 页内容 -->
  </div>

  <!-- 页面 2 -->
  <div id="page2" class="page">
    <!-- 核心功能页内容 -->
  </div>

  <!-- 设计浮标 -->
  <div class="design-badge"><i class="fa-solid fa-palette"></i> 设计规范：<项目名></div>

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

## Token 映射规则

从 DESIGN.md frontmatter 到 CSS 变量的映射关系：

| DESIGN.md Token | CSS 变量 | 示例值 |
|----------------|----------|--------|
| `colors.primary` | `--color-primary` | `#0066FF` |
| `colors.canvas` | `--color-canvas` | `#FFFFFF` |
| `typography.display-xl.fontSize` | `--font-size-display-xl` | `48px` |
| `spacing.lg` | `--spacing-lg` | `16px` |
| `rounded.md` | `--rounded-md` | `8px` |

## 设计浮标

右下角小标签，显示当前预览基于的 DESIGN.md 名称，使用 `<i class="fa-solid fa-palette"></i>` 图标而非 emoji。

## 预览体验要求

- 页面在移动端和桌面端都应能基本正常显示（使用相对单位 + max-width 约束）
- 按钮应有 hover 状态样式（颜色加深、轻微上浮）
- 卡片内容区域使用模拟数据填充（头像用首字母缩写替代图片以保持自包含）
- 导航项高亮当前页面
- 所有图标使用 Font Awesome `<i class="fa-xxx"></i>` 写法，禁止 emoji

## 使用方式

本文件由 `workflows/preview-export.md` 工作流引用。在工作流执行时先读取本文件了解生成规范，然后基于 DESIGN.md 的 tokens 生成预览 HTML。
