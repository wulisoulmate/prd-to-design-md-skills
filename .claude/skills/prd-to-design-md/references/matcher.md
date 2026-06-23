# 角色：设计匹配器（Matcher）

## 职责

根据 PRD 分析得出的项目特征，从设计索引中匹配最合适的参考 DESIGN.md，为后续的 DESIGN.md 生成提供风格参考。

## 匹配策略

### 索引结构

设计索引存储在 `scripts/design-index.json`，格式见 `references/design-index-format.md`。

索引的核心作用是**避免每次使用 skill 都重复读取所有 DESIGN.md 文件**，从而节省大量 token。

### 匹配字段与权重

| 字段 | 权重 | 说明 |
|------|------|------|
| `project_type` | 1.0 | 项目类型（如 web-app、mobile-app、landing-page） |
| `style_tags` | 2.0 | 风格标签（如 minimal、tech-forward、warm） |
| `best_for` | 1.0 | 适用场景描述 |
| `summary` | 0.5 | 设计概述摘要 |
| `key_features` | 0.5 | 关键设计特征 |

### 匹配流程

1. 将阶段 1 的项目特征摘要拼接为描述文本
   - 示例：`"金融SaaS支付平台，企业级后台管理系统，极简科技感风格"`
2. 调用索引查询命令：
   ```bash
   node "$SKILL_DIR/scripts/index-query.mjs" --query "<项目特征描述>"
   ```
3. 解析查询结果，对每个匹配字段做关键词交集评分
4. 按综合得分降序返回结果
5. 选择 **Top 2-3** 个匹配结果进行读取

### 结果选择逻辑

- **Top 1**：最匹配的参考，作为主要风格基调
- **Top 2**：次级匹配，补充 Top 1 未覆盖的设计元素
- **Top 3**（可选）：在需要更多灵感时参考

### 差异化组合规则

匹配到的参考 DESIGN.md 是**风格参考**，不能完全照搬：

1. **配色体系**：参考其组合逻辑（如"主色+辅助色+语义色"的关系），但使用适合当前项目的色值
2. **排版层级**：参考比例关系（如标题/正文的字号递进倍数），但选择适合内容密度的绝对值
3. **间距体系**：参考基础单位（4px/8px 网格），但根据信息密度调整间距大小
4. **组件风格**：参考形状和交互模式，但要适配行业特征（金融产品需更稳妥的按钮形状）

## 索引就绪说明

前置准备阶段已通过 `skill-env.mjs --check` 完成环境检查和索引验证。本阶段直接查询索引即可，无需重复检查。

> 环境检查：`node "$SKILL_DIR/scripts/skill-env.mjs" --check`（替代了原本的 bash+python3 内联逻辑）

## 匹配失败处理

| 场景 | 处理方式 |
|------|---------|
| 无匹配结果 | 告知用户索引中无匹配项，提供两个选项：① 直接进入阶段 3（由 Agent 自主生成设计）；② 先运行 `--update` 更新索引再试 |
| 索引为空或损坏 | 自动触发 `--rebuild` 重建索引后重试查询 |

## 参考读取策略

为节省 token，读取参考 DESIGN.md 时：

1. 优先读取 entry 中的 `summary` 字段——如果已包含足够的色板、字体、间距细节，可以跳过原文件读取
2. 若 summary 信息不足，再读取完整的 DESIGN.md
3. 对于匹配度较低的参考，只读取 Overview + Colors + Typography 三个核心章节

## 设计来源

设计素材库位于 `design-md/`，包含 74 个企业级 DESIGN.md 参考（airbnb、apple、stripe、vercel、figma 等），来自社区项目：
- https://github.com/VoltAgent/awesome-design-md

## 使用方式

本文件由主流程阶段 2（设计匹配阶段）引用。在此阶段先读取本文件了解匹配策略，然后执行索引查询和结果选择。
