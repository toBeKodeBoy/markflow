# 下划线快捷键技术设计

## 架构概览

在两种编辑器组件中分别实现下划线快捷插入功能：

| 编辑器 | 视图模式 | 实现方式 |
|--------|---------|---------|
| CodeMirror (Editor.vue) | split / source | 工具栏按钮 + Ctrl+U keybinding → 包裹 `<u></u>` |
| Milkdown (WysiwygEditor.vue) | live / focus | Ctrl+U keybinding → toggleMark underline |

两编辑器独立实现，不共享逻辑，因为底层机制不同（纯文本插入 vs ProseMirror mark toggle）。

---

## 一、Editor.vue（CodeMirror 源码编辑器）

### 1.1 工具栏按钮

在删除线按钮 `<s>S</s>` 之后、分隔符 `<span class="sep">\|</span>` 之前，增加下划线按钮：

```html
<button @click="insertMarkdown('<u>', '</u>', '下划线')" title="下划线 (Ctrl+U)"><u>U</u></button>
```

### 1.2 Ctrl+U 快捷键

在 `buildExtensions()` 的 `keymap.of([...])` 数组中增加自定义 keybinding：

```typescript
import { insertNewlineAndIndent } from '@codemirror/commands' // 已有

// 在 keymap.of([...]) 数组中追加：
{ key: 'Ctrl-u', run: insertUnderline, preventDefault: true }
```

定义 `insertUnderline` 函数（命令函数签名 `(view: EditorView) => boolean`）：

```typescript
function insertUnderline(): boolean {
  if (!view) return false
  const sel = view.state.selection.main
  const selectedText = view.state.sliceDoc(sel.from, sel.to) || '下划线'
  const before = '<u>'
  const after = '</u>'
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: before + selectedText + after },
    selection: { anchor: sel.from + before.length, head: sel.from + before.length + selectedText.length }
  })
  return true
}
```

> 复用 `insertMarkdown` 的逻辑，但用 `Ctrl-u` 的 keybinding 格式定义，`preventDefault: true` 阻止浏览器默认行为。

### 1.3 变更文件

- `src/components/Editor.vue`：模板增加按钮，`buildExtensions()` 增加 keybinding，新增 `insertUnderline` 命令函数

---

## 二、WysiwygEditor.vue（Milkdown WYSIWYG 编辑器）

### 2.1 新增 underlineShortcut 插件

Milkdown 已在 `underlineMark.ts` 中定义了 `underlineSchema`（底层 ProseMirror mark）。通过新增 `$shortcut` 创建 Ctrl+U keybinding，调用 `toggleMark(underlineType)`。

在 `src/plugins/underlineMark.ts` 末尾追加：

```typescript
import { toggleMark } from '@milkdown/prose/commands'
import { $shortcut } from '@milkdown/utils'

export const underlineShortcut = $shortcut((ctx) => ({
  'Ctrl-u': toggleMark(underlineSchema.type(ctx))
}))
```

并在 `underlineMarkPlugins` 数组中注册：

```typescript
export const underlineMarkPlugins: MilkdownPlugin[] = [
  underlineRemark,
  underlineAttr,
  underlineSchema,
  underlineInputRule,
  underlineAutoConvertPlugin,
  underlineShortcut,  // 新增
].flat()
```

`toggleMark(underlineType)` 的行为：
- 有选中文本 → 对选中文本切换 underline mark 开/关
- 无选中文本 → 设置 `storedMarks`，后续输入自动带 underline

`preventDefault` 由 ProseMirror `keymap` 内部处理。

### 2.2 变更文件

- `src/plugins/underlineMark.ts`：新增 `underlineShortcut` 定义及导入，更新 `underlineMarkPlugins` 数组
- `src/components/WysiwygEditor.vue`：无需变更（插件已在 initEditor 中通过 `underlineMarkPlugins` 自动加载）

---

## 三、快捷键兼容性

| 按键 | 编辑器 | 行为 |
|------|--------|------|
| Ctrl+U | CodeMirror | 包裹 `<u>`...`</u>` |
| Ctrl+U | Milkdown WYSIWYG | toggleMark underline |

两种编辑器不会同时激活，同一个 `Ctrl+U` 在不同视图中表现一致但不冲突。
