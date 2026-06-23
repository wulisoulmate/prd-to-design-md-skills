# 角色：Lint 验证器（Validator）

## 职责

对生成的 DESIGN.md 执行 Google Stitch 规范验证（最多 3 轮修复循环），确保输出符合标准格式。

## 验证命令

```bash
npx @google/design.md lint --format json <工作目录>/DESIGN.md
```

> ⚠️ `npx` 命令失败（未安装 Node.js / 网络不通）→ 显示提示信息，跳过验证流程。

## 修复循环流程

```
第 1 轮: 运行 lint → 解析 JSON 输出
  ├─ ✅ 无 errors → 验证通过
  ├─ ❌ 有 errors → 按修复策略修复 → 进入第 2 轮
  └─ ⚠️ 命令失败 → 显示提示，跳过验证

第 2 轮: 重新运行 lint
  ├─ ✅ 无 errors → 验证通过
  └─ ❌ 仍有 errors → 修复后进入第 3 轮

第 3 轮（终轮）: 重新运行 lint
  ├─ ✅ 无 errors → 验证通过
  └─ ❌ 仍有 errors → 输出剩余 error 列表，告知用户已达到最大重试次数
```

## Error 类型修复策略

| error 类型 | 严重度 | 修复方式 |
|-----------|--------|---------|
| `broken-ref` | error | 检查 `{color.xxx}` 引用，确认 token 名称在 frontmatter 中存在（注意 `colors.xxx` 而非 `color.xxx`）|
| `invalid-color` | error | 确保 hex 格式为 `#XXXXXX`，6 位完整 hex，字母大写 |
| `invalid-dimension` | error | 尺寸值带单位（`px`），数值合理 |
| `invalid-typography` | error | fontSize 使用有效字号值（如 14px、16px），fontWeight 使用有效字重值（如 400、500、600、700）|
| `duplicate-section` | error | 检查是否有重复的 `## Title`，合并或重命名 |
| `wcag-contrast` | warning | **warning 级别**，注记输出但不强制修复 |
| `unknown-component-property` | warning | **warning 级别**，移除不在白名单中的属性 |
| `missing-section` | error | 补充缺失的必需章节（Google Stitch 规范要求） |
| `yaml-parse-error` | error | 检查 frontmatter YAML 格式（缩进一致性、引号配对） |

## 常见陷阱

### broken-ref 高频原因
- 在组件定义中用 `{color.xxx}` 但 frontmatter 中是 `colors.xxx`——注意复数形式
- 引用了不存在的 token 名（如 `{color.primary-light}` 但 frontmatter 中只有 `primary`）

### invalid-color 高频原因
- 3 位简写 hex（如 `#333`）→ 必须改为 6 位（`#333333`）
- hex 值未以 `#` 开头

### invalid-dimension 高频原因
- 纯数字无单位（如 `16`）→ 必须加 `px`（如 `16px`）
- 使用了非 px 单位（如 rem、em）→ 统一使用 px

### invalid-typography 高频原因
- fontWeight 使用了文字值（如 `"bold"`）→ 必须改为数字字重（如 `700`）
- lineHeight 格式不正确（如 `1.5` 不带单位是可以的，但 `1.5em` 不行）→ 纯数字或带 px

## WCAG AA 对比度指南

| 使用场景 | 最小对比度 | 说明 |
|---------|-----------|------|
| 正文文本 | 4.5:1 | 小于 18px 的普通文本 |
| 大号文本 | 3:1 | 大于 18px bold 或 24px 以上的文本 |
| UI 组件 | 3:1 | 按钮、输入框边框等交互元素 |

## 验证完成后的输出格式

```text
🔍 lint 验证结果：
   - 通过: 0 errors / 0 warnings
   或
   - 有 X 个 error 未修复（已达到最大重试次数，需手动修复）
   或
   - 已跳过（npx 执行失败）
```

## 使用方式

本文件由 `workflows/lint-verify.md` 工作流引用。在工作流执行时先读取本文件了解修复策略，然后执行验证循环。
