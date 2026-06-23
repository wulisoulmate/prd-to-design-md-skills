# 工作流：预览 HTML 导出（preview-export）

## 概述

根据生成的 DESIGN.md 中的设计 tokens，生成单文件多页预览 HTML。

**触发方式**：lint-verify 工作流完成后自动触发（lint 失败不阻塞预览生成）。

**输入**：当前工作目录下的 `DESIGN.md`

**输出**：当前工作目录下的 `preview.html`

---

## 流程

### Step 1: 读取 DESIGN.md tokens

从 `DESIGN.md` 的 YAML frontmatter 中提取：
- `colors` — 所有颜色 token
- `typography` — 所有字体层级
- `spacing` — 间距体系
- `rounded` — 圆角体系

### Step 2: 确定页面内容

根据主流程阶段 1 的项目特征摘要确定页面内容：

**第 1 页（登录/首页）**：
- 如果 PRD 包含登录/注册需求 → 登录页面（表单 + 品牌标识）
- 否则 → 产品 Hero 页面（品牌口号 + CTA + 特色摘要）

**第 2 页（功能页）**：
- PRD 中描述的核心功能页面（仪表盘、数据列表、内容展示页等）
- 使用最小化模拟数据

### Step 3: 生成 HTML

参考 `references/html-builder.md` 的规范，生成单文件 HTML：

1. 将 DESIGN.md 的 tokens 映射为 CSS 变量
2. 构建页面结构（Tab 导航 + 2 个页面 + 设计浮标）
3. 使用模拟数据填充页面内容
4. 添加 hash 路由 JS 逻辑

### Step 4: 写入文件

将生成的 HTML 写入当前工作目录的 `preview.html`。

---

## 产出物规范

| 维度 | 要求 |
|------|------|
| 文件格式 | 单文件 HTML，所有资源内联 |
| 外部依赖 | 零外部依赖（无 CDN、图片、字体文件引用） |
| 页面数量 | 最多 2 页 |
| 路由方式 | Hash 路由（`#page1` / `#page2`） |
| Token 使用 | 严格使用 DESIGN.md 的 tokens，无硬编码值 |
| 模拟数据 | 最小化，仅展示布局和组件外观 |

## 输出格式

工作流结束后在主流程中显示：

```text
🌐 预览 HTML 已生成：preview.html（2 页，基于 <项目名> 设计规范）
```

## 错误处理

| 异常场景 | 处理方式 |
|---------|---------|
| DESIGN.md 读取失败 | 报错并终止，通知主流程 |
| tokens 解析失败 | 使用兜底默认值（Material Design 基础色），继续生成 |
| 写入文件失败 | 提示用户检查工作目录权限 |
