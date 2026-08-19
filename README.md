# MarkFlow - Markdown 笔记

uTools 里随叫随到的本地 Markdown 写作软件。默认所见即所得，文档只存在本机，随时导出为 `.md`。

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![Vue](https://img.shields.io/badge/Vue-3.5-42b883)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6)
![uTools](https://img.shields.io/badge/platform-uTools-orange)
![License](https://img.shields.io/badge/license-MIT-green)

## 目录

1. [产品定位](#产品定位)
2. [项目介绍](#项目介绍)
3. [功能特性](#功能特性)
4. [环境依赖](#环境依赖)
5. [快速启动](#快速启动)
6. [视图模式](#视图模式)
7. [项目结构](#项目结构)
8. [配置说明](#配置说明)
9. [常见问题 FAQ](#常见问题-faq)
10. [贡献指南](#贡献指南)
11. [许可证](#许可证)

## 产品定位

**MarkFlow：uTools 里随叫随到的本地 Markdown 写作软件。默认所见即所得，文档只存在本机，随时导出为 `.md`。**

三件事构成产品：

| 柱子 | 用户能感知到什么 |
|------|------------------|
| **本地为主** | 生产环境写入 `utools.dbStorage`，开发环境回退 `localStorage`。无账号、不上传；设置里可备份，随时导出 `.md` / PDF |
| **所见即所得** | 默认视图是 Milkdown WYSIWYG（界面标签「预览」）。打开就能写；源码 / 分屏是进阶，不是主路径 |
| **随叫随到** | uTools 插件，用 `md` / `markdown` / `笔记` 唤起，不必再开独立 IDE |

**适合**：技术文档、学习笔记、会议记录、博客草稿。

**不是**：云笔记、磁盘文件夹仓库（Obsidian 式）、知识库 / 标签 / 图谱产品。笔记不在 `Documents/MarkFlow笔记` 这类路径里，而在本机 uTools 数据库；需要分享或归档时再导出。

## 项目介绍

MarkFlow 面向日常 Markdown 写作。默认所见即所得，避免「写源码再切预览」；文档按空间 / 文件夹管理，数据只在本机。

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

**首启与空态**
- 空库且无打开页签时进入空白首页（`EmptyHome`），不再自动创建欢迎笔记
- 首页三按钮：新建文档、新建文件夹、导入 `.md`
- 四张模板卡一键创建（技术开发文档 / 学习教程笔记 / 日常随笔计划 / Agent 提示词）
- 空库可「导入示例笔记」（幂等，可整夹进回收站）
- 空库首启 3 步引导气泡（`OnboardingCoach`）：新建 → 我的空间 → 搜索；可跳过，勾选后不再展示
- 存储说明写清「uTools 本地数据库」，禁止伪造磁盘路径

**文档管理**
- 创建、重命名、复制文档；标题可从首个标题提取；`CreateEntryModal` 一步创建文档或文件夹
- 侧栏壳层：品牌 + 导航（首页 / 文档 / 回收站）+ **空间**树（`SidebarSpaces`）
- 「我的空间」为未归入顶层文件夹的文档；用户可新建顶层空间（即顶层文件夹），点箭头展开子树
- 文件夹创建、重命名、拖拽移动与层级展开/折叠；多级树、虚拟列表（>150 行）；侧栏可拖拽调宽
- **置顶**：文档可置顶；仅顶层文件夹可置顶，树内单独显示「常用文件夹」分区
- **回收站**（`TrashPanel`）：删除文档/文件夹为软删除，可恢复或彻底删除；容量上限 200 条；启动时按保留天数自动清理（默认 30 天）
- 删除文件夹时连同子树与其中文档一并移入回收站
- 文档多选（Ctrl/Cmd 点击）后批量移动；右键可定位所在文件夹
- **多文档页签**（`EditorTabBar`）：同时打开多个文档，页签切换、拖拽排序、关闭，上限 10 个（`MAX_EDITOR_TABS`）
- 顶栏前进 / 后退浏览历史（`useNoteHistory`）
- **全文搜索**：标题 + 正文联合搜索，匹配摘要高亮（`SearchModal`；顶栏「搜索文档」与 `Ctrl/Cmd+K`）
- **排序**：文档置顶优先，同文件夹内拖拽重排（`sortOrder`）
- 导入/导出 `.md`；**批量导入文件夹**（`ImportFolderModal`，可选保留目录结构与图片）
- 导出 Markdown 时可按设置写出图片（同级目录 / `.assets` / 自定义模板 / Typora 缓存路径）
- 导出 **PDF**（`PdfExportModal`；uTools 走 Chromium `printToPDF`，浏览器回退系统打印）
- **数据备份 v2**（JSON 含文档、文件夹、设置与图片资产）；设置页可**清空全部数据**（同时清空回收站）；支持**自动备份**
- 生产环境使用 `utools.dbStorage`，开发环境自动回退 `localStorage`

**编辑与预览**
- 四种视图模式：预览、分屏、源码、专注（编辑区格式工具栏下拉切换，不在顶栏）
- 预览/专注模式基于 Milkdown，所见即所得
- 源码/分屏模式基于 CodeMirror 6，支持语法高亮、行号、撤销/重做、Tab 缩进
- GFM：表格、删除线、任务列表、代码高亮
- **LaTeX 数学**：`$E=mc^2$`（行内）、`$$...$$`（块级），KaTeX 渲染
- **Mermaid 图示**：`` ```mermaid `` 围栏，分屏预览 SVG + WYSIWYG 实时代码块预览
- 下划线（`<u>`）、==高亮==、行内代码与反引号自动闭合
- 代码块复制按钮、语言标签切换（含 `mermaid`）
- **表格工具栏**（`TableToolbar`）：选中表格时浮动显示，插入/删除行列、合并单元格等
- **脚注**：`[^1]` 引用与 `[^1]: ` 定义；WYSIWYG 与分屏预览均支持
- **任务列表增强**：勾选切换、完成态样式、列表项插入/删除
- **图片**：粘贴/拖放入库（`markflow-asset://`）、压缩存储、比例缩放、**双击全屏预览**（`ImageLightbox`）
- 格式化工具栏（`FormatToolbar`）；专注模式浮动工具栏（`FocusFormatToolbar`）
- 按文档标题生成目录导航；分屏预览滚动同步
- 超过 200KB 文件自动降级为分屏模式，避免卡顿
- 一键复制预览内容为 HTML

**界面与设置**
- 顶栏：侧栏开关、前进/后退、当前路径、居中「搜索文档」、目录（仅编辑视图）、更多菜单（导出 / 导入 / 新手教程）
- 主题只在设置面板切换（浅色 / 深色 / 跟随系统或 uTools），顶栏无主题快捷按钮
- **设置面板**（`SettingsModal`，侧栏底栏入口）：主题、源码字号、等宽字体、自动备份、图片导出路径、存储用量、备份与清空
- 侧栏底栏另有「帮助与反馈」，打开内置新手教程
- 侧栏显隐与宽度会记住；回收站走导航，不在底栏
- 专注模式隐藏顶栏与侧栏，居中宽屏写作，按 `Esc` 退出
- **全屏模式**（`useFullscreen`）：编辑区独立全屏

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

开发服务器运行在 `http://localhost:5174`。在 uTools 开发者模式中将插件目录指向本项目根目录，`plugin.json` 已配置 `development.main` 指向 localhost。

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

编辑区格式工具栏（`FormatToolbar` / `FocusFormatToolbar`）的 `ViewModeDropdown` 提供四种编辑视图：

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
| Mermaid `` ```mermaid `` | 支持 | 支持 |
| 脚注 `[^1]` | 支持 | 支持 |
| 任务列表 `- [ ]` | 支持 | 支持 |

## 项目结构

```
markflow/
├── public/
│   ├── plugin.json          # uTools 插件清单
│   ├── preload.js           # uTools API 桥接 (window.markflow)
│   └── logo.png             # 插件图标
├── src/
│   ├── main.ts              # Vue 应用入口
│   ├── App.vue              # 根布局：首页 / 编辑 / 回收站
│   ├── style.css            # 全局样式与 CSS 变量（明/暗主题）
│   ├── constants.ts         # 阈值与防抖常量
│   ├── constants/
│   │   ├── welcomeNote.ts       # 按需打开的新手教程正文
│   │   ├── emptyHomeCopy.ts     # 空白首页文案（含本机库说明）
│   │   ├── sidebarShell.ts      # 侧栏/顶栏用户可见文案
│   │   ├── noteTemplates.ts     # 首页模板卡
│   │   ├── exampleLibrary.ts    # 示例笔记种子
│   │   ├── myFolder.ts          # 「我的空间」内部 id（非用户文案）
│   │   └── recentFolder.ts      # 最近访问上限（内部 LRU）
│   ├── types/               # TypeScript 核心类型
│   ├── extensions/
│   │   └── autoCloseBrackets.ts  # CodeMirror 括号自动闭合
│   ├── components/
│   │   ├── Toolbar.vue              # 顶栏（侧栏开关 / 历史 / 搜索 / 更多）
│   │   ├── EmptyHome.vue            # 空白首页
│   │   ├── OnboardingCoach.vue      # 首启引导气泡
│   │   ├── Sidebar.vue              # 侧栏编排
│   │   ├── sidebar/                 # Brand / Nav / Spaces / Footer
│   │   ├── SidebarTreeRow.vue       # 空间内树行
│   │   ├── TRashPanel.vue           # 回收站面板
│   │   ├── EditorTabBar.vue         # 多文档页签栏
│   │   ├── ViewModeDropdown.vue     # 视图模式切换
│   │   ├── CreateEntryModal.vue     # 新建文档/文件夹
│   │   ├── SearchModal.vue          # 全文搜索
│   │   ├── WysiwygEditor.vue        # Milkdown WYSIWYG
│   │   ├── Editor.vue               # CodeMirror 源码编辑
│   │   ├── Preview.vue              # marked 实时预览
│   │   ├── FormatToolbar.vue        # 格式化工具栏（含视图切换）
│   │   ├── FocusFormatToolbar.vue   # 专注模式浮动工具栏
│   │   ├── TableToolbar.vue         # 表格编辑工具栏
│   │   ├── Toc.vue                  # 文档目录
│   │   ├── SettingsModal.vue        # 设置、备份、清空
│   │   └── …                        # 导入、PDF、灯箱、链接等弹窗
│   ├── stores/
│   │   ├── note.ts                  # 文档/文件夹 CRUD、置顶、回收站
│   │   ├── editorTabs.ts            # 多文档页签、浏览历史、教程笔记
│   │   ├── editorTabsBridge.ts      # 页签与文档同步
│   │   ├── tabContentCache.ts       # 页签内容缓存
│   │   └── workspace.ts             # 首页 / 编辑 / 回收站视图
│   ├── composables/         # 可复用组合式逻辑（20 个）
│   ├── plugins/             # Milkdown 插件（15 个）
│   └── utils/               # 纯函数（约 63 个）：渲染、导入导出、备份、树构建等
├── tests/
│   ├── unit/                # 组件 / composables / stores / plugins / utils
│   ├── integration/         # WYSIWYG、备份、CRUD、空态、工作区等
│   ├── architecture/        # 壳层、空首页、存储、视图约束
│   ├── helpers/
│   └── setup.ts
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

前端通过 `window.markflow` 访问宿主能力，禁止在 Vue 里直接扩散 Node / uTools 专属调用。目录职责见仓库 `AGENTS.md`。

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
    "main": "http://localhost:5174",
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

其它默认值：

| 常量 / 设置 | 值 | 说明 |
|-----|-----|------|
| `TRASH_MAX_ITEMS` | 200 | 回收站容量上限（`stores/note.ts`） |
| `trashRetentionDays` | 30 | 回收站保留天数（`AppSettings`，启动时自动清理） |
| `RECENT_NOTE_LIMIT` | 30 | 最近访问 LRU 上限（内部，非侧栏虚拟目录） |
| 侧栏默认宽度 | 260 px | `useAppSettings` / CSS `--sidebar-width` |

### 数据存储 Key

| Key | 内容 |
|-----|------|
| `markflow_note_list` | 文档列表（id、标题、文件夹、时间等） |
| `markflow_note_{id}` | 单篇文档正文 |
| `markflow_folder_list` | 文件夹 / 空间列表 |
| `markflow_settings` | 应用设置（主题、字号、PDF、图片导出、侧栏状态、引导等） |
| `markflow_trash_notes` | 回收站文档 |
| `markflow_trash_folders` | 回收站文件夹条目（含子树快照） |
| `markflow_asset_*` | 图片等资源索引与二进制（IndexedDB / 桥接层） |

## 常见问题 FAQ

**Q1：启动报错 "utools is not defined"？**

开发环境不支持 uTools API，`useStorage` 会自动回退到 `localStorage`。确保以 `npm run dev` 方式在浏览器中开发，不要直接双击 `index.html`。

**Q2：文档存在哪里？找不到 `.md` 文件？**

生产环境保存在 **uTools 本地数据库**（`utools.dbStorage`），不是磁盘上的 `Documents/MarkFlow笔记`。需要文件时用「更多 → 导出 Markdown」，或在设置 → 数据管理里备份。

**Q3：分屏预览不更新？**

编辑内容通过 `liveContent` 实时同步到预览；若仍异常，可切换文档或检查是否为大文件防抖延迟。默认「预览」模式是所见即所得，不必依赖分屏。

**Q4：Mermaid 流程图只有形状、没有文字？**

请使用最新版本；节点标签在 Mermaid SVG 的 `foreignObject` 中，勿对 hydrate 后的 SVG 二次 DOMPurify 清洗（见 `sanitizeMermaidSvg`）。

**Q5：打开大文件卡顿？**

超过 200KB 的文档会自动降级为分屏模式，渲染防抖延长。如需编辑大文件，建议切到源码模式操作。

**Q6：构建后插件不显示？**

确认 `dist/plugin.json` 文件存在，且 uTools 插件的 `main` 字段指向 `index.html`。构建时 `plugin.json` 从 `public/` 复制到 `dist/` 根目录。

**Q7：如何清除本地文档数据？**

侧栏导航打开 **回收站**，可恢复或彻底删除单条；也可「清空回收站」。设置 → 数据管理 → **清空全部数据**（二次确认）会删除全部文档、文件夹、图片与回收站（保留应用设置）；或移除 uTools 插件重装（清除 `utools.dbStorage`）。

**Q8：删除的文档还能找回吗？**

可以。删除文档或文件夹会进入回收站，默认保留 30 天，启动时自动清理过期条目。容量上限 200 条；满了之后需要先清空部分条目才能继续删除。

## 贡献指南

1. Fork 本仓库
2. 从 `main` 新建功能分支：`feature/pmb-YYMMdd-简述`（示例：`feature/pmb-260707-md`）
3. 提交改动（commit 规范：`feat` 新增功能、`fix` 修复 bug、`docs` 文档修改、`chore` 杂项）
4. 推送到远程并提交 Pull Request（目标分支 `main`）

运行全部测试确保改动不影响现有功能：

```bash
npm test
```

用户可见文案不要使用「知识库」「我的文件夹」；存储说明必须写 uTools 本地数据库，不要写伪造磁盘路径。架构测试会锁这些约束。

## 许可证

MIT
