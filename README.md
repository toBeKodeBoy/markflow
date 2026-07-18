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
| Markdown 预览 | marked 18 + marked-highlight + highlight.js 11 + KaTeX + Mermaid |
| 语言 | TypeScript 6 |
| 样式 | 原生 CSS 变量（明/暗双主题） |
| 运行平台 | uTools |

## 功能特性

**笔记管理**
- 创建、重命名、删除笔记，自动从首个标题提取笔记名；**新建笔记/文件夹弹窗**（`CreateEntryModal`）支持一步创建
- 文件夹创建、重命名与删除，多级文件夹树、拖拽移动、虚拟列表（>150 行）
- **多文档页签**（`EditorTabBar`）：同时打开多个笔记，页签切换、拖拽排序、关闭，上限 10 个（`MAX_EDITOR_TABS`）
- **全文搜索**：标题 + 正文 + 标签联合搜索，匹配摘要高亮，300ms 防抖（`SearchBar` / `SearchResultsList` / `SearchResultItem` / `SearchEmptyState`）
- **标签**：笔记标签编辑（`TagInput`）、顶栏展示（`NoteTagsBar`）、侧栏标签云过滤（`TagCloud` / `TagCloudPanel`）
- **排序**：置顶/取消置顶，同文件夹内拖拽重排（`sortOrder`）
- 导入/导出 `.md` 文件；**批量导入文件夹**（`ImportFolderModal`，可选保留目录结构与图片）
- 导出 **PDF**（`PdfExportModal` 配置选项，uTools 环境走 Chromium `printToPDF`，浏览器环境回退系统打印）
- **数据备份 v2**（JSON 含笔记、文件夹、设置与图片资产）；设置页可**清空全部数据**；支持**自动备份**
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
- **图片**：粘贴/拖放入库（`markflow-asset://`）、压缩存储、比例缩放、**双击全屏预览**（`ImageLightbox`）
- 格式化工具栏（`FormatToolbar`）支持加粗、斜体、标题、列表、引用、代码块等快捷插入；**专注模式浮动格式工具栏**（`FocusFormatToolbar`）
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
│   ├── plugin.json          # uTools 插件清单
│   ├── preload.js           # uTools API 桥接 (window.markflow)
│   └── logo.png             # 插件图标
├── src/
│   ├── main.ts              # Vue 应用入口
│   ├── App.vue              # 根布局与视图模式切换
│   ├── style.css            # 全局样式与 CSS 变量（明/暗主题）
│   ├── constants.ts         # 阈值与防抖常量
│   ├── constants/
│   │   └── welcomeNote.ts   # 默认欢迎笔记内容
│   ├── types/
│   │   ├── index.ts         # TypeScript 核心类型定义
│   │   ├── asset.ts         # 图片资源类型
│   │   └── import.ts        # 导入功能类型
│   ├── extensions/
│   │   └── autoCloseBrackets.ts  # CodeMirror 括号自动闭合扩展
│   ├── components/          # 界面组件（24 个）
│   │   ├── Toolbar.vue          # 工具栏（视图切换/导入导出/主题）
│   │   ├── Sidebar.vue          # 侧边栏（文件夹树/笔记/搜索/标签云）
│   │   ├── EditorTabBar.vue     # 多文档页签栏
│   │   ├── CreateEntryModal.vue # 新建笔记/文件夹弹窗
│   │   ├── SearchBar.vue        # 全文搜索栏
│   │   ├── SearchEmptyState.vue # 搜索空状态提示
│   │   ├── SearchResultItem.vue # 搜索结果单项
│   │   ├── SearchResultsList.vue# 搜索结果列表
│   │   ├── WysiwygEditor.vue    # Milkdown WYSIWYG 编辑器
│   │   ├── Editor.vue           # CodeMirror 源码编辑器
│   │   ├── Preview.vue          # marked 实时预览（含 Mermaid hydrate）
│   │   ├── FormatToolbar.vue    # 文本格式化工具栏
│   │   ├── FocusFormatToolbar.vue # 专注模式浮动格式工具栏
│   │   ├── Toc.vue              # 文档目录导航
│   │   ├── TagInput.vue         # 笔记标签编辑
│   │   ├── NoteTagsBar.vue      # 顶栏笔记标签展示
│   │   ├── TagCloud.vue         # 标签云视图
│   │   ├── TagCloudPanel.vue    # 标签云面板容器
│   │   ├── SidebarTreeRow.vue   # 侧栏树行组件
│   │   ├── ImageLightbox.vue    # 图片全屏预览灯箱
│   │   ├── ImportFolderModal.vue# 批量导入文件夹弹窗
│   │   ├── SettingsModal.vue    # 设置、备份、清空数据
│   │   ├── PdfExportModal.vue   # PDF 导出配置弹窗
│   │   └── AppIcon.vue          # 应用图标 / 状态指示
│   ├── stores/              # Pinia 状态管理
│   │   ├── note.ts              # 笔记 CRUD 与状态
│   │   ├── editorTabs.ts        # 多文档页签管理
│   │   ├── editorTabsBridge.ts  # 页签与笔记同步桥接
│   │   └── tabContentCache.ts   # 页签内容缓存
│   ├── composables/         # 可复用组合式逻辑（16 个）
│   │   ├── useStorage.ts        # 存储抽象（utools / localStorage）
│   │   ├── useTheme.ts          # 主题切换（明/暗/跟随系统）
│   │   ├── useAppSettings.ts    # 应用设置读写
│   │   ├── useScrollSync.ts     # 分屏滚动同步
│   │   ├── useTocHeadings.ts    # 目录标题提取
│   │   ├── useTocScroll.ts      # 目录滚动监听
│   │   ├── useTocScrollSpy.ts   # 目录滚动跟踪
│   │   ├── useTocJumpHandler.ts # 目录跳转处理
│   │   ├── useDebouncedSearch.ts# 防抖搜索
│   │   ├── useNoteSort.ts       # 笔记排序逻辑
│   │   ├── useAssetStorage.ts   # 图片资源存储
│   │   ├── useImageLightbox.ts  # 图片灯箱控制
│   │   ├── useAutoBackup.ts     # 自动备份
│   │   ├── useBackup.ts         # 手动备份/恢复
│   │   ├── useFocusToolbarVisibility.ts # 专注模式工具栏显隐
│   │   └── useTagCloudLayout.ts # 标签云布局计算
│   ├── plugins/             # Milkdown 插件（11 个）
│   │   ├── math.ts              # LaTeX 数学公式支持
│   │   ├── codeBlockLabel.ts    # 代码块语言标签
│   │   ├── headingId.ts         # 标题自动编号
│   │   ├── underlineMark.ts     # 下划线 `<u>` 语法
│   │   ├── highlightMark.ts     # ==高亮== 语法
│   │   ├── imagePaste.ts        # 粘贴图片入库
│   │   ├── imageScale.ts        # 图片比例缩放
│   │   ├── markdownPaste.ts     # Markdown 粘贴解析
│   │   ├── htmlRender.ts        # HTML 自定义渲染
│   │   ├── autoCloseBrackets.ts # 括号自动闭合
│   │   └── plainTextFallback.ts # 纯文本回退保护
│   └── utils/               # 工具函数（40+ 个）
│       ├── markedSetup.ts       # marked 解析器配置
│       ├── mathRender.ts        # KaTeX 数学渲染
│       ├── mermaidRender.ts     # Mermaid 图示渲染
│       ├── mermaidBlock.ts      # Mermaid 代码块处理
│       ├── sanitizeHtml.ts      # HTML 安全清洗
│       ├── escapeHtml.ts        # HTML 转义
│       ├── exportPdf.ts         # PDF 导出
│       ├── pdfOptions.ts        # PDF 导出选项
│       ├── printDocument.ts     # 系统打印
│       ├── printStyles.ts       # 打印样式
│       ├── clipboard.ts         # 剪贴板操作
│       ├── codeCopy.ts          # 代码块复制按钮
│       ├── codeLanguageDropdown.ts # 代码块语言切换
│       ├── updateFenceLanguage.ts  # 围栏语言更新
│       ├── imageCompress.ts     # 图片压缩
│       ├── imageInsert.ts       # 图片插入
│       ├── imageScale.ts        # 图片缩放
│       ├── imageLightbox.ts     # 图片灯箱逻辑
│       ├── assetUri.ts          # 资源 URI 处理
│       ├── resolveMarkdownAssets.ts # Markdown 资源路径解析
│       ├── backup.ts            # 备份/恢复核心逻辑
│       ├── autoBackup.ts        # 自动备份核心
│       ├── autoBackupBrowser.ts # 浏览器环境自动备份
│       ├── noteTitle.ts         # 笔记标题提取
│       ├── noteSort.ts          # 笔记排序
│       ├── migrateNoteSortOrder.ts # 排序兼容迁移
│       ├── folderTree.ts        # 文件夹树操作
│       ├── sidebarTree.ts       # 侧栏树构建
│       ├── treeIndex.ts         # 树形索引
│       ├── importFolderDevScan.ts   # 开发环境文件夹扫描
│       ├── importFolderHelpers.ts   # 导入辅助函数
│       ├── importFolderOptions.ts   # 导入选项配置
│       ├── importFolderService.ts   # 导入服务
│       ├── importFolderTree.ts      # 导入目录树
│       ├── importMarkdownImages.ts  # 导入 Markdown 图片
│       ├── normalizeBlockMath.ts    # 块级数学标准化
│       ├── headingSlug.ts       # 标题锚点生成
│       ├── generateTocMarkdown.ts   # 目录 Markdown 生成
│       ├── previewFragmentNav.ts    # 预览片段导航
│       ├── searchSnippet.ts     # 搜索摘要高亮
│       ├── tagNormalize.ts      # 标签规范化
│       ├── tagStats.ts          # 标签统计
│       ├── storageStats.ts      # 存储用量统计
│       ├── inlineCode.ts        # 行内代码处理
│       ├── notify.ts            # 通知提示
│       └── wysiwygFormat.ts     # WYSIWYG 格式化
├── tests/
│   ├── unit/                   # 单元测试
│   │   ├── components/             # 组件测试
│   │   ├── composables/            # composables 测试
│   │   ├── stores/                 # 状态管理测试
│   │   ├── plugins/                # 插件测试
│   │   └── utils/                  # 工具函数测试
│   ├── integration/            # 集成测试（WYSIWYG、备份恢复、笔记 CRUD 等）
│   ├── architecture/           # 架构约束测试
│   ├── helpers/                # 测试辅助工具
│   ├── utils/                  # 测试工具函数
│   ├── setup.ts                # 测试环境配置
│   └── tsconfig.json           # 测试 TypeScript 配置
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 配置说明

### uTools 插件配置 (`public/plugin.json`)

```json
{
  "pluginName": "MarkFlow - Markdown笔记",
  "description": "随叫随到的本地Markdown编辑器，支持实时预览、多文档管理和导出",
  "version": "1.1.0",
  "logo": "logo.png",
  "main": "index.html",
  "preload": "preload.js",
  "development": {
    "main": "http://localhost:5173",
    "preload": "preload.js"
  },
  "features": [{
    "code": "open-editor",
    "cmds": ["md", "markdown", "笔记", "MarkFlow", "markflow"],
    "explain": "打开 Markdown 编辑器"
  }]
}
```

### Vite 配置核心项

- `base: './'` — 相对路径打包，适配 uTools 本地加载
- `dedupe` — 确保 CodeMirror 与 Lezer 包单例，避免插件注册失败
- `manualChunks` — 按 editor / markdown / vendor 拆包，优化加载
- `allowedHosts` — 允许 `.monkeycode-ai.online` 域名访问

### 关键常量 (`src/constants.ts`)

| 常量 | 值 | 说明 |
|-----|-----|------|
| `LARGE_FILE_THRESHOLD` | 200,000 bytes | 超过此大小自动降级为分屏模式 |
| `TOC_PARSE_DEBOUNCE_MS` | 400 ms | 目录标题重解析防抖延迟 |
| `PREVIEW_RENDER_DEBOUNCE_MS` | 150 ms | 预览 HTML 渲染防抖（正常文件） |
| `PREVIEW_LARGE_DEBOUNCE_MS` | 600 ms | 预览 HTML 渲染防抖（大文件） |
| `ASSET_MAX_DIMENSION` | 1920 px | 图片资源存储最大边长 |
| `ASSET_MAX_BYTES` | 2 MB | 单张图片资源最大体积 |
| `MAX_EDITOR_TABS` | 10 | 同时打开的最大编辑器页签数 |

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
