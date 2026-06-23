# 工作流：Lint 验证（lint-verify）

## 概述

对生成的 DESIGN.md 执行 Google Stitch 规范验证，支持最多 3 轮自动修复循环。

**触发方式**：主流程阶段 3（DESIGN.md 生成完成）后自动触发。

**输入**：当前工作目录下的 `DESIGN.md`

**输出**：lint 验证结果摘要

---

## 流程

### Step 1: 执行验证

```bash
npx @google/design.md lint --format json <工作目录>/DESIGN.md
```

**分支判断**：
- ✅ 命令成功执行 → 解析 JSON 输出，进入 Step 2
- ⚠️ 命令失败（未安装 Node.js / 网络不通）→ 显示提示信息，工作流结束（跳过验证）
- ⚠️ 输出无法解析 → 显示原始输出，工作流结束

### Step 2: 解析结果

读取 lint 输出的 JSON，提取：
- `errors` 数组（严重 error）
- `warnings` 数组（非严重 warning）

**分支判断**：
- ✅ errors 为空 → **验证通过**，工作流结束
- ❌ errors 非空 → 进入 Step 3（修复循环）

### Step 3: 修复循环（最多 3 轮）

#### 第 1 轮
1. 读取 `references/lint-rules.md` 了解各 error 类型的修复策略
2. 按 `errors` 列表逐一修复 DESIGN.md
3. 修复完成后返回 Step 1 重新 lint

#### 第 2 轮
1. 读取新 lint 结果的 errors
2. 修复仍有问题的区域
3. 返回 Step 1 重新 lint

#### 第 3 轮（终轮）
1. 读取新 lint 结果的 errors
2. 尽最大努力修复
3. 返回 Step 1 最终 lint
4. 无论是否有剩余 error，工作流均结束

---

## Error 修复策略速查

| error 类型 | 快速修复 |
|-----------|---------|
| `broken-ref` | 检查 `{color.xxx}` → 确保 token 名在 frontmatter 中存在 |
| `invalid-color` | 确保 hex 格式 `#XXXXXX`，6 位完整 |
| `invalid-dimension` | 确保有 `px` 单位 |
| `invalid-typography` | fontSize 有效字号 + fontWeight 数字字重 |
| `duplicate-section` | 合并或重命名重复章节 |
| `missing-section` | 补充缺失的必需章节 |
| `yaml-parse-error` | 检查 frontmatter YAML 缩进 |

> 完整策略见 `references/lint-rules.md`。

## 输出格式

工作流结束后输出摘要到主流程：

```text
🔍 lint 验证结果：{通过 / 有 X 个 error 未修复 / 已跳过}
```

## 错误处理

| 异常场景 | 处理方式 |
|---------|---------|
| npx 未安装 | 显示提示，跳过验证，不阻塞主流程 |
| DESIGN.md 不存在 | 报错，终止工作流，通知主流程 |
| 3 轮后仍有 error | 输出剩余 error 列表，告知用户须手动修复 |
| lint 工具版本不兼容 | 显示原始错误信息，跳过验证 |
