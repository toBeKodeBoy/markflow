# 无序列表文本粘贴到代码块异常技术方案

## 落地状态

- 状态：核心修复已落地
- 落地日期：2026-08-04
- 当前阶段：代码修复完成，回归测试完成，方案文档持续补充中

### 已完成事项

1. 已在 `markdownPaste` 粘贴链路中增加“代码块内纯文本粘贴”分支
2. 已将代码块判断收敛为“整个选区完整位于同一个代码块内”
3. 已补充 WYSIWYG 粘贴回归测试
4. 已补充跨出代码块选区的边界回归测试

### 已落地代码点

- [src/plugins/markdownPaste.ts](/D:/files/utools/markflow/src/plugins/markdownPaste.ts:57)
- [tests/integration/wysiwyg-paste.test.ts](/D:/files/utools/markflow/tests/integration/wysiwyg-paste.test.ts:98)

### 已完成验证

- `npx vitest run tests/integration/wysiwyg-paste.test.ts`
- `npx vitest run tests/unit/plugins/markdownPaste.test.ts`
- `npx vitest run tests/integration/wysiwyg-code-block-click-exit.test.ts`
- `npx vitest run tests/integration/wysiwyg-paste.test.ts tests/unit/plugins/markdownPaste.test.ts --coverage`

### 待继续关注

1. 行内代码、表格单元格等非 `code_block` 场景是否还需要单独补测试
2. 是否需要继续扩展到 ordered list、task list、引用块等结构化剪贴板来源
3. 全仓覆盖率基线偏低，本次仅保证目标改动链路的覆盖率与回归质量

## 问题背景

用户在 MarkFlow 的 WYSIWYG 编辑器中，先选中无序列表文本，再将内容粘贴到已有代码块内，实际结果与预期不一致：

- 代码块会失焦或出现“跳出代码块”的表现
- 粘贴内容没有进入代码块文本区
- 无序列表内容被插入到代码块下方，形成新的列表节点

这会导致用户在整理示例代码、命令清单或 Markdown 片段时，编辑体验被打断，且文档结构被意外改写。

## 润色后的复现提示词

可用于提测、缺陷登记或后续回归：

```text
在 MarkFlow 的 WYSIWYG 模式下，创建一个无序列表和一个代码块。
选中无序列表中的多行文本并复制，然后把焦点放到代码块内部执行粘贴。

预期结果：
复制的文本应以纯文本形式写入代码块内部，保留换行，不触发列表结构解析，也不应跳出代码块。

实际结果：
粘贴后编辑焦点异常，列表内容没有进入代码块，而是被插入到了代码块下方，形成新的列表节点。
```

## 根因分析

当前粘贴链路中，[src/plugins/markdownPaste.ts](/D:/files/utools/markflow/src/plugins/markdownPaste.ts:1) 负责优先识别剪贴板中的 Markdown 文本，并在合适场景下解析为结构化节点。

问题在于：

1. 代码块内粘贴场景被直接 `return false`
2. 插件没有在代码块上下文中主动消费 `text/plain`
3. 后续默认 clipboard 处理会优先参考 `text/html`
4. 当剪贴板中带有 `<ul><li>...</li></ul>` 等 HTML 结构时，Milkdown/ProseMirror 会把它当成列表节点插入
5. 由于代码块节点不能直接承载这类块级结构，最终内容落到了代码块外部

结论：问题不是“列表识别错了”，而是“代码块内粘贴没有被提前降级为纯文本插入”。

## 目标

修复后需满足以下行为：

- 在代码块内粘贴任意文本时，统一按纯文本写入
- 保留原始换行，不解析列表、标题、表格等 Markdown 结构
- 忽略剪贴板中的 HTML 结构化内容，避免插入到代码块外
- 不影响非代码块区域现有的 Markdown 智能粘贴能力

## 方案设计

### 方案一：在 `markdownPaste` 中拦截代码块内粘贴

在 [src/plugins/markdownPaste.ts](/D:/files/utools/markflow/src/plugins/markdownPaste.ts:1) 中新增“是否位于代码块内部”的判断：

- 若当前 selection 位于 `code_block` 上下文
- 直接读取 `text/plain`
- 将 `\r\n` / `\r` 规范化为 `\n`
- 使用 `tr.insertText(...)` 写入当前 selection
- 返回 `true`，阻断后续 clipboard HTML 解析链路

这是本次采用的方案。

### 不采用的方案

1. 修改默认 clipboard 插件行为
原因：侵入范围更大，且不利于局部控制 MarkFlow 的粘贴策略。

2. 在 `plainTextFallback` 中兜底处理代码块
原因：该插件位于更靠后的兜底层，前面的 clipboard HTML 解析已经可能生效，修复时机过晚。

3. 仅屏蔽 `text/html`
原因：不能从根本上表达“代码块内只接受纯文本”的规则，后续仍可能被别的结构化来源绕过。

## 实现要点

### 1. 代码块上下文识别

沿当前 selection 的祖先节点向上遍历，只要命中 `node.type.spec.code` 即视为代码块上下文。

### 2. 纯文本写入策略

- 只读取 `text/plain`
- 统一换行符
- 通过 `insertText` 替换当前选区或插入到光标位置

### 3. 保持原有 Markdown 粘贴能力

仅当 selection 不在代码块内时，才继续执行：

- Markdown 特征识别
- VS Code markdown 剪贴板识别
- HTML 存在时的 Markdown 优先解析

## 测试方案

新增集成回归用例到 [tests/integration/wysiwyg-paste.test.ts](/D:/files/utools/markflow/tests/integration/wysiwyg-paste.test.ts:1)：

- 初始化一个 `code_block`
- 选中占位文本
- 构造同时包含 `text/plain` 与 `text/html` 列表结构的剪贴板数据
- 执行 paste
- 断言列表源码写入代码块内部
- 断言内容没有掉到代码块闭合围栏之后

同时保留原有 3 类回归场景：

- 纯 `text/plain` Markdown 粘贴
- 同时含 `text/html` 的 Markdown 粘贴
- VS Code markdown 剪贴板粘贴

## 风险与回归点

需要重点关注以下回归：

- 代码块内粘贴普通多行文本是否仍能正常保留换行
- 代码块内粘贴代码片段时是否引入额外空行
- 非代码块区域的 Markdown 智能粘贴是否完全保持原行为
- 行内代码、表格单元格等非 `code_block` 场景是否不受影响

## 结论

本问题适合在 MarkFlow 自有的 `markdownPaste` 插件层修复。核心原则是：

代码块内粘贴一律降级为纯文本插入，非代码块区域继续保留 Markdown 结构化粘贴能力。

这样既能修复“列表掉到代码块下方”的缺陷，也能保证现有编辑体验的改动范围最小、可验证性最高。
