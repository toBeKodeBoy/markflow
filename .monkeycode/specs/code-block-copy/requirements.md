# 代码块复制功能需求

## 功能概述

在预览模式和 WYSIWYG 编辑模式中，为每个代码块添加一键复制按钮，hover 代码块时显示在右上角语言标签旁，点击后将纯文本代码复制到剪贴板，并提供短暂的成功反馈。

## 术语

- **代码块**：Markdown 中由三个反引号包裹的多行代码区域，可能包含语言标识
- **预览模式**：基于 marked 渲染的只读 HTML 预览视图（`Preview.vue`）
- **WYSIWYG 模式**：基于 Milkdown/ProseMirror 的所见即所得编辑视图（`WysiwygEditor.vue`）

## EARS 需求

### REQ-COPY-001: 预览模式代码块复制按钮

- **MODE**: WHEN 用户处于分屏（split）或实时预览（live）视图
- **TRIGGER**: 用户 hover 预览区域中的 `.code-block-wrapper` 元素
- **BEHAVIOR**: 复制按钮在代码块右上角语言标签旁显示。按钮使用与现有 `.code-lang-label` 一致的视觉风格

### REQ-COPY-002: 预览模式复制行为

- **MODE**: WHEN 预览区域中的代码块复制按钮可见
- **TRIGGER**: 用户点击复制按钮
- **BEHAVIOR**: 系统将代码块中的纯文本代码（不含 HTML 标签和语法高亮标记）写入系统剪贴板

### REQ-COPY-003: WYSIWYG 模式代码块复制按钮

- **MODE**: WHEN 用户处于实时预览（live）或专注（focus）视图
- **TRIGGER**: 用户 hover WYSIWYG 编辑器中的 `.code-block-wrapper`（Milkdown code_block 节点）
- **BEHAVIOR**: 复制按钮在代码块右上角语言标签旁显示，与预览模式按钮样式一致

### REQ-COPY-004: WYSIWYG 模式复制行为

- **MODE**: WHEN WYSIWYG 模式中的代码块复制按钮可见
- **TRIGGER**: 用户点击复制按钮
- **BEHAVIOR**: 系统从 ProseMirror node 的 `textContent` 中提取纯文本代码，写入系统剪贴板

### REQ-COPY-005: 复制成功反馈

- **MODE**: WHEN 用户点击复制按钮且剪贴板写入成功
- **TRIGGER**: `navigator.clipboard.writeText()` 返回 resolved
- **BEHAVIOR**: 按钮文字从"复制"变为"已复制!"，持续 2000ms 后自动恢复为"复制"。若按钮在恢复前失去 hover 而隐藏，再次 hover 时若未过 2000ms 仍显示"已复制!"并继续计时

### REQ-COPY-006: 复制失败处理

- **MODE**: IF 剪贴板 API 不可用或写入失败
- **TRIGGER**: `navigator.clipboard.writeText()` 返回 rejected
- **BEHAVIOR**: 系统通过 `window.markflow.showNotification()` 显示错误通知"复制失败"

### REQ-COPY-007: 按钮视觉与交互

- **MODE**: WHEN 复制按钮渲染
- **BEHAVIOR**: 按钮文字为"复制"，使用等宽字体 11px，颜色与 `.code-lang-label` 一致（`var(--text-muted)`），hover 时高亮。按钮背景与语言标签相同（`var(--bg-sidebar)`），左下圆角 6px。按钮不参与代码块内容文本选择。触摸设备上按钮始终可见

### REQ-COPY-008: 无语言标签时的布局

- **MODE**: WHEN 代码块无语言标识
- **TRIGGER**: 代码块渲染
- **BEHAVIOR**: 复制按钮独立出现在右上角，与有语言标签时位置一致（占位在同一区域），不因缺少语言标签而偏移
