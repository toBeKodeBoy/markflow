# 下划线快捷键功能需求

## 功能概述

在源码编辑器（CodeMirror）和 WYSIWYG 编辑器（Milkdown）中，提供快捷方式将选中文本包裹为 `<u></u>` 标签，实现 Markdown 下划线格式。

## EARS 需求

### REQ-UNDERLINE-001: CodeMirror 工具栏按钮
- **MODE**: WHEN 用户处于分屏（split）或源码（source）视图
- **TRIGGER**: 用户点击编辑器工具栏中的下划线按钮（U）
- **BEHAVIOR**: 若已选中文本 → 用 `<u>` 和 `</u>` 包裹选中文本；若未选中 → 插入 `<u></u>` 并将光标置于标签之间

### REQ-UNDERLINE-002: CodeMirror 键盘快捷键
- **MODE**: WHEN 用户处于分屏（split）或源码（source）视图
- **TRIGGER**: 用户按下 Ctrl+U
- **BEHAVIOR**: 同 REQ-UNDERLINE-001

### REQ-UNDERLINE-003: WYSIWYG Milkdown 键盘快捷键
- **MODE**: WHEN 用户处于实时预览（live）或专注（focus）视图
- **TRIGGER**: 用户按下 Ctrl+U
- **BEHAVIOR**: 切换选中文本的下划线样式（Milkdown underline mark）的开/关状态。若未选中文本，则激活下划线样式继续输入

### REQ-UNDERLINE-004: 快捷键避免冲突
- **MODE**: WHEN 编辑器聚焦
- **TRIGGER**: 用户按下 Ctrl+U
- **BEHAVIOR**: 仅触发下划线功能，不触发浏览器默认行为（如查看源代码）

### REQ-UNDERLINE-005: 工具栏按钮一致性
- **MODE**: WHEN 源码编辑器工具栏渲染
- **BEHAVIOR**: 下划线按钮（U）放置在删除线按钮（S）之后，样式与现有按钮一致
