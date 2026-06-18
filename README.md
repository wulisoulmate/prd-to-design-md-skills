# prd-to-design-md

从 PRD 文档自动生成符合 [Google Stitch](https://stitch.withgoogle.com/docs/design-md/specification/) 标准的 `DESIGN.md` 设计规范文件和预览 HTML。

## 功能

- 分析 PRD 中的行业、受众、UI 风格
- 从 70+ 知名品牌设计规范库中自动匹配参考风格
- 按 Google Stitch 规范生成完整 9 章节的 DESIGN.md
- 内置 lint 自动验证（最多 3 轮修复轮次）
- 同时生成可交互的多页预览 HTML

## 安装

```bash
# 克隆到 Claude Code 全局 skill 目录
mkdir -p ~/.claude/skills
git clone https://github.com/wulisoulmate/prd-to-design-md-skills.git ~/.claude/skills/prd-to-design-md
```

或复制到项目级 `.claude/skills/` 目录下。

## 使用

1. 在项目根目录准备好 `PRD.md`
2. 在 Claude Code 中执行：

   ```
   /prd-to-design-md
   ```

3. 按提示完成 6 个阶段交互。
4. 在当前目录得到 `DESIGN.md` 和 `preview.html`。

## 结构

```
prd-to-design-md/
├── SKILL.md                       # 技能定义（入口）
├── scripts/
│   ├── search-design-index.mjs    # 设计索引查询脚本
│   └── design-index.json          # 预构建索引
├── references/
│   └── design-index-format.md     # 索引格式说明
└── design-md/                     # 设计参考库（74 个品牌）
    ├── airbnb/
    ├── apple/
    └── ...
```

## 设计素材来源

`design-md/` 内容来自 [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)，使用 MIT 许可证。详见 [NOTICE](./NOTICE)。

## 许可证

MIT
