# prd-to-design-md

> PRD（产品需求文档）→ DESIGN.md + preview.html 的自动化设计规范生成系统。
>
> **核心理念**：让 AI 生成的前端 UI 从"风格随机"变成"风格确定"，沉淀可复用的设计规范。

---

## 这能解决什么问题？

Agent根据 PRD 生成前端 UI 时，痛点之一**风格不确定性**——每次生成的界面视觉风格都不同，反复调整 prompt 也很难稳定。

**PRD → DESIGN.md** 在生成代码之前，先根据PRD确定一套完整的**设计规范**（配色、字体、间距、组件风格），然后用它在 `preview.html` 中预览视觉效果。确认满意后，再交给编码代理生成风格一致的代码——整个过程从"碰运气"变成了"按规范来"。

## 这不能做到什么

- ❌ **不是一句话生成前端** — 它的产出是设计规范（DESIGN.md）和设计预览（preview.html），不是完整的前端页面代码。你需要将 DESIGN.md 交给 AI 编码代理来生成实际 UI
- ❌ **不是 Figma/Sketch 替代品** — 它不产出设计源文件，产出的是 AI 代理可读的 tokens 文件

## 适用人群

| 角色 | 价值 |
|------|------|
| **产品经理** | 不需要会写代码，写好 PRD 就能出设计规范 + 预览页，快速验证想法 |
| **前端开发者** | 获取结构化的设计 tokens，驱动 AI 生成风格统一的前端代码 |
| **创业者** | MVP 阶段快速试错，先看 UI 效果再决定是否投入完整开发 |
| **有现成 UI 的人** | 已有 AI 生成的前端工程？用它提取 DESIGN.md 沉淀为自己可复用的设计规范 |

## 工作流程

```
PRD.md ──→ PRD 分析 ──→ 设计匹配（74 个品牌库）──→ DESIGN.md 生成
                                                     │
                                            ┌────────┴────────┐
                                            ▼                  ▼
                                      preview.html     前端工程代码
                                      （预览效果）    （风格统一的 UI）
```

## 产出物

| 文件 | 说明 |
|------|------|
| **`DESIGN.md`** | 符合 Google Stitch 标准的完整设计规范（9 章节），包含 colors/typography/spacing/components 等 tokens |
| **`preview.html`** | 基于 DESIGN.md tokens 的交互式预览页面，浏览器直接打开即可查看设计效果 |

生成的 DESIGN.md 是开放格式（Google Stitch 标准），可在 Claude Code、Cursor、Windsurf 等工具中直接使用，也可通过 `npx @google/design.md lint` 验证规范合规性。

DESIGN.md 本身不是 UI 生成器，而是一份**设计规范参考**——它记录了配色方案、字体层级、间距体系、组件风格。当你把它交给 AI 编码代理时，代理会读取这些 tokens 并据此生成风格统一的前端代码。该格式起源于 [Google Stitch](https://stitch.withgoogle.com/docs/design-md/overview)，是 AI 编码生态中通用的视觉语言描述标准。

## 安装

```bash
# 没有全局 skill 目录，先创建
mkdir -p ~/.claude/skills
# 克隆到 Claude Code 全局 skill 目录
git clone https://github.com/wulisoulmate/prd-to-design-md-skills.git ~/.claude/skills/prd-to-design-md
```

安装后在 Claude Code 中执行 `/prd-to-design-md` 即可使用。也可以安装为项目级skill，在项目目录中中放一份 `.claude/skills/prd-to-design-md/` 即可。

## 使用方式

在 Claude Code 中，通过 `/prd-to-design-md` 命令触发，然后提供 PRD 文件路径即可：

```text
/prd-to-design-md 请根据项目根目录下的 prd.md 生成设计规范
```

或直接引用文件：

```text
/prd-to-design-md @./prd.md
```

触发后 skill 会自动执行 4 个阶段（PRD 分析 → 设计匹配 → DESIGN.md 生成 → lint 验证 → 预览导出），部分关键节点会与你确认后继续。

### 场景一：新项目从 PRD 起步

写好 PRD → 执行 skill → 生成 DESIGN.md + preview.html → 预览确认 → 交给 AI 生成前端代码

### 场景二：已有前端工程，沉淀设计规范（TODO）

已有前端工程？可以使用本技能提取其 UI 风格特征，生成 DESIGN.md，沉淀为团队可复用的设计规范。

## 设计参考库

内置 74 个企业级 DESIGN.md 参考（来自 [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)），包括：

airbnb、apple、stripe、vercel、figma、linear、notion、supabase、coinbase、shopify、nike、tesla 等

## 项目结构

```
prd-to-design-md/
├── SKILL.md                        # 技能主流程（4 阶段 + 2 自动工作流）
├── references/                     # 角色专业知识
│   ├── analyzer.md                 # PRD 分析策略
│   ├── matcher.md                  # 设计匹配与融合规则
│   ├── stitch-designer.md          # Google Stitch 生成规则
│   ├── lint-rules.md               # lint 修复策略
│   └── html-builder.md             # 预览页生成规范
├── workflows/                      # 独立工作流
│   ├── lint-verify.md              # Google Stitch lint 验证
│   └── preview-export.md           # 预览 HTML 导出
├── scripts/                        # 辅助脚本
│   ├── index-builder.mjs           # 索引构建与增量更新
│   ├── index-query.mjs             # 索引查询
│   ├── design-validator.mjs        # lint 验证辅助
│   └── skill-env.mjs               # 环境发现与健康检查
└── design-md/                      # 74 个企业级设计参考
    ├── airbnb/
    ├── apple/
    └── ...
```

## TODO

- [ ] **从前端工程提取 DESIGN.md 工作流** — 分析用户已有的前端项目代码，自动提取样式特征（颜色、字体、间距等），生成可直接复用的 DESIGN.md 文件
- [ ] **预览页面增强** — 不再局限于"登录页 + 功能页"两个固定页面，根据 PRD 内容动态生成更多页面类型（仪表盘、列表页、详情页等），增加交互操作
- [ ] **多平台支持** — 当前路径发现机制基于 Claude Code 目录结构，需适配 Codex、Cursor 等其他 AI 编码工具的安装路径规范
- [ ] ......

## 设计参考

- Google Stitch DESIGN.md 规范：https://stitch.withgoogle.com/docs/design-md/specification/
- npm 包 `@google/design.md`：https://www.npmjs.com/package/@google/design.md
- 设计素材来源：https://github.com/VoltAgent/awesome-design-md

## 许可证

MIT
