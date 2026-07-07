# MarkFlow - Markdown 笔记

随叫随到的本地 Markdown 编辑器 uTools 插件，支持所见即所得编辑、多视图模式、多文档管理和导入导出。

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![Vue](https://img.shields.io/badge/Vue-3.5-42b883)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6)
![uTools](https://img.shields.io/badge/platform-uTools-orange)
![License](https://img.shields.io/badge/license-MIT-green)

## 目录

1. [项目介绍](#项目介绍)
2. [功能特性](#功能特性)
3. [环境依赖](#环境依赖)
4. [快速启动](#快速启动)
5. [视图模式](#视图模式)
6. [项目结构](#项目结构)
7. [配置说明](#配置说明)
8. [常见问题 FAQ](#常见问题-faq)
9. [贡献指南](#贡献指南)
10. [许可证](#许可证)

## 项目介绍

MarkFlow 是一个面向日常 Markdown 写作的 uTools 插件。解决本地笔记编辑时需要频繁切换工具、预览不便的痛点，提供编辑预览一体化体验。

**适用场景**：技术文档编写、个人知识管理、会议记录、博客草稿。

**技术栈**：

| 层级 | 技术 |
|------|------|
| UI 框架 | Vue 3.5 (Composition API) |
| 状态管理 | Pinia 3 |
| 构建工具 | Vite 8 |
| WYSIWYG 编辑器 | Milkdown 7 (CommonMark + GFM) |
| 源码编辑器 | CodeMirror 6 |
| Markdown 预览 | marked 18 + highlight.js 11 + KaTeX + Mermaid |
| 语言 | TypeScript 6 |
| 样式 | 原生 CSS 变量（明/暗双主题） |
| 运行平台 | uTools |

## 功能特性

**笔记管理**
- 创建、重命名、删除笔记，自动从首个标题提取笔记名
- 文件夹创建、重命名与删除，多级文件夹树、拖拽移动、虚拟列表（>150 行）
- **全文搜索**：标题 + 正文 + 标签联合搜索，匹配摘要高亮，300ms 防抖（`SearchBar` / `SearchResultsList`）
- **标签**：笔记标签编辑（`TagInput`）、顶栏展示（`NoteTagsBar`）、侧栏标签云过滤
- **排序**：置顶/取消置顶，同文件夹内拖拽重排（`sortOrder`）
- 导入/导出 `.md` 文件；**批量导入文件夹**（`ImportFolderModal`，可选保留目录结构与图片）
- 导出 **PDF**（uTools 环境走 Chromium `printToPDF`，浏览器环境回退系统打印）
- **数据备份 v2**（JSON 含笔记、文件夹、设置与图片资产）；设置页可**清空全部数据**
- 生产环境使用 `utools.dbStorage`，开发环境自动回退 `localStorage`

**编辑与预览**
- 四种视图模式：预览、分屏、源码、专注
- 预览/专注模式基于 Milkdown，所见即所得渲染
- 源码/分屏模式基于 CodeMirror 6，支持语法高亮、行号、撤销/重做、Tab 缩进
- GFM 语法支持：表格、删除线、任务列表、代码高亮
- **LaTeX 数学**：`$E=mc^2$`（行内）、`$$...$$`（块级），KaTeX 渲染
- **Mermaid 图示**：` ```mermaid ` 围栏，分屏预览 SVG + WYSIWYG 实时代码块预览
- 下划线（`<u>`）、==高亮==、行内代码与反引号自动闭合
- 代码块复制按钮、语言标签切换（含 `mermaid`）
- **图片**：粘贴/拖放入库（`markflow-asset://`）、压缩存储、比例缩放、双击全屏预览
- 格式化工具栏；**专注模式浮动格式工具栏**（`FocusFormatToolbar`）
- 按文档标题生成目录导航，点击可跳转
- 分屏预览支持滚动同步
- 超过 200KB 文件自动降级为分屏模式，避免卡顿
- 一键复制预览内容为 HTML

**界面与设置**
- 工具栏 ⚙ **设置面板**（`SettingsModal`）：主题、源码字号、等宽字体、PDF 选项、存储用量、备份与清空
- 明暗主题快捷切换，或自动跟随 uTools / 系统深色模式
- 可独立隐藏侧边栏与目录面板（侧边栏显隐会记住）
- 专注模式隐藏工具栏与侧边栏，居中宽屏写作，按 `Esc` 退出

## 环境依赖

- Node.js >= 18
- uTools（生产调试需安装）

## 快速启动

### 本地开发

```bash
# 1. 克隆代码
git clone <仓库地址>
cd markflow

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

开发服务器运行在 `http://localhost:5173`。在 uTools 开发者模式中将插件目录指向本项目根目录，`plugin.json` 已配置 `development.main` 指向 localhost。

### 生产构建

```bash
# 构建
npm run build

# 预览构建产物
npm run preview
```

构建产物输出至 `dist/` 目录，包含 `plugin.json`、`preload.js`、`index.html` 及静态资源。将 `dist/` 目录作为 uTools 插件目录加载即可。

### 使用方式

在 uTools 输入框中输入以下任意关键词唤起插件：

```
md / markdown / 笔记 / MarkFlow / markflow
```

### 运行测试

```bash
# 运行全部测试
npm test

# 监听模式
npm run test:watch
```

## 视图模式

顶部工具栏提供四种编辑视图：

| 模式 | 说明 | 编辑区 | 渲染引擎 |
|------|------|--------|----------|
| 预览 | 默认模式，所见即所得 | WysiwygEditor | Milkdown (CommonMark + GFM) |
| 分屏 | 左侧源码、右侧实时预览 | Editor + Preview | CodeMirror + marked |
| 源码 | 纯 Markdown 源码编辑 | Editor | CodeMirror |
| 专注 | 隐藏干扰元素的全屏写作 | WysiwygEditor | Milkdown (CommonMark + GFM) |

**支持的 Markdown 语法**

| 语法 | 预览/专注 | 分屏预览 |
|------|-----------|----------|
| 标题、段落、列表 | 支持 | 支持 |
| 加粗、斜体、行内代码 | 支持 | 支持 |
| 代码块（语法高亮） | 支持 | 支持 |
| 引用块、分隔线 | 支持 | 支持 |
| GFM 表格 | 支持 | 支持 |
| 删除线、任务列表 | 支持 | 支持 |
| 链接、图片 | 支持 | 支持 |
| 下划线 `<u>`、==高亮== | 支持 | 支持 |
| LaTeX 数学 `$...$` / `$$...$$` | 支持 | 支持 |
| Mermaid ` ```mermaid ` | 支持 | 支持 |

## 项目结构

```
markflow/
├── public/
│   ├── plugin.json        # uTools 插件清单
│   └── preload.js         # uTools API 桥接 (window.markflow)
├── src/
│   ├── main.ts            # Vue 应用入口
│   ├── App.vue            # 根布局与视图模式切换
│   ├── constants.ts       # 阈值与防抖常量
│   ├── components/        # 核心组件
│   │   ├── Toolbar.vue        # 工具栏（视图切换/导入导出/主题）
│   │   ├── Sidebar.vue        # 侧边栏（文件夹树/笔记/搜索/标签云）
│   │   ├── SearchBar.vue      # 全文搜索
│   │   ├── WysiwygEditor.vue  # Milkdown WYSIWYG 编辑器
│   │   ├── Editor.vue         # CodeMirror 源码编辑器
│   │   ├── Preview.vue        # marked 实时预览（含 Mermaid hydrate）
│   │   ├── Toc.vue            # 文档目录导航
│   │   ├── SettingsModal.vue  # 设置、备份、清空数据
│   │   ├── ImportFolderModal.vue
│   │   ├── NoteTagsBar.vue / TagInput.vue
│   │   └── FocusFormatToolbar.vue
│   ├── stores/note.ts     # Pinia 笔记状态管理
│   ├── composables/       # 存储/主题/滚动同步/TOC/资源等
│   ├── plugins/           # Milkdown 插件（math、代码块标签等）
│   ├── types/index.ts     # TypeScript 类型定义
│   └── utils/             # marked、mathRender、mermaidRender、PDF 等
├── tests/
│   ├── unit/              # 单元测试
│   ├── integration/       # 集成测试
│   └── architecture/      # 架构约束测试
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 配置说明

### uTools 插件配置 (`public/plugin.json`)

```json
{
  "pluginName": "MarkFlow - Markdown笔记",
  "main": "index.html",
  "preload": "preload.js",
  "features": [{
    "code": "open-editor",
    "cmds": ["md", "markdown", "笔记", "MarkFlow", "markflow"]
  }]
}
```

### Vite 配置核心项

- `base: './'` — 相对路径打包，适配 uTools 本地加载
- `dedupe` — 确保 CodeMirror 与 Lezer 包单例，避免插件注册失败
- `manualChunks` — 按 editor / markdown / vendor 拆包，优化加载
- `allowedHosts` — 允许 `.monkeycode-ai.online` 域名访问

### 数据存储 Key

| Key | 内容 |
|-----|------|
| `markflow_note_list` | 笔记列表（id、标题、文件夹、时间等） |
| `markflow_note_{id}` | 单篇笔记正文 |
| `markflow_folder_list` | 文件夹列表 |
| `markflow_settings` | 应用设置（主题、字号、PDF 等） |
| `markflow_asset_*` | 图片等资源索引与二进制（IndexedDB / 桥接层） |

## 常见问题 FAQ

**Q1：启动报错 "utools is not defined"？**

开发环境不支持 uTools API，`useStorage` 会自动回退到 `localStorage`。确保以 `npm run dev` 方式在浏览器中开发，不要直接双击 `index.html`。

**Q2：分屏预览不更新？**

编辑内容通过 `liveContent` 实时同步到预览；若仍异常，可切换笔记或检查是否为大文件防抖延迟。

**Q3：Mermaid 流程图只有形状、没有文字？**

请使用最新版本；节点标签在 Mermaid SVG 的 `foreignObject` 中，勿对 hydrate 后的 SVG 二次 DOMPurify 清洗（见 `sanitizeMermaidSvg`）。

**Q4：打开大文件卡顿？**

超过 200KB 的文档会自动降级为分屏模式，渲染防抖延长。如需编辑大文件，建议切到源码模式操作。

**Q5：构建后插件不显示？**

确认 `dist/plugin.json` 文件存在，且 uTools 插件的 `main` 字段指向 `index.html`。构建时 `plugin.json` 从 `public/` 复制到 `dist/` 根目录。

**Q6：如何清除本地笔记数据？**

设置 → 数据管理 → **清空全部数据**（二次确认）；或移除 uTools 插件重装（清除 `utools.dbStorage`）。

## 贡献指南

1. Fork 本仓库
2. 从 `main` 新建功能分支：`feature/pmb-YYMMdd-简述`（示例：`feature/pmb-260707-md`）
3. 提交改动（commit 规范：`feat` 新增功能、`fix` 修复 bug、`docs` 文档修改、`chore` 杂项）
4. 推送到远程并提交 Pull Request（目标分支 `main`）

运行全部测试确保改动不影响现有功能：

```bash
npm test
```

## 许可证

MIT
