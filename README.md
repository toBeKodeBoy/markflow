# MarkFlow - Markdown 笔记

> 随叫随到的本地 Markdown 编辑器 uTools 插件，支持所见即所得编辑、多视图模式、多文档管理和导入导出。

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Vue](https://img.shields.io/badge/Vue-3.x-42b883)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)
![uTools](https://img.shields.io/badge/platform-uTools-orange)

---

## 功能特性

### 笔记管理

- **多笔记** — 创建、重命名、删除笔记，自动从首个标题提取笔记名
- **文件夹** — 支持文件夹的创建、重命名与删除，按文件夹过滤笔记
- **全文搜索** — 侧边栏按标题实时过滤
- **导入 / 导出** — 通过 uTools 文件对话框或浏览器文件选择读写 `.md` 文件
- **持久存储** — 生产环境使用 `utools.dbStorage`，开发环境自动回退到 `localStorage`

### 编辑与预览

- **四种视图模式** — 预览、分屏、源码、专注，可按场景切换
- **所见即所得** — 预览与专注模式基于 Milkdown，直接渲染 Markdown 效果
- **源码编辑** — 分屏与源码模式基于 CodeMirror 6，支持语法高亮、行号、撤销/重做、Tab 缩进
- **GFM 语法** — 支持表格、删除线、任务列表等 GitHub Flavored Markdown 扩展
- **格式化工具栏** — 源码模式下可快捷插入加粗、斜体、删除线、标题、列表、引用、代码块、表格、链接
- **目录导航** — 按文档标题生成 TOC，点击可跳转定位
- **分屏预览** — 基于 `marked` + `highlight.js`，支持代码高亮与滚动同步
- **复制 HTML** — 将预览内容作为 HTML 复制到剪贴板

### 界面

- **明暗主题** — 手动切换，或自动跟随 uTools 深色模式
- **布局灵活** — 可独立隐藏侧边栏与目录面板
- **专注模式** — 隐藏工具栏与侧边栏，居中宽屏写作，按 `Esc` 退出

---

## 快速启动

在 uTools 中输入以下任意关键词即可唤起插件：

```
md / markdown / 笔记 / MarkFlow / markflow
```

---

## 视图模式

顶部工具栏提供四种编辑视图，对应不同的渲染引擎：

| 模式 | 说明 | 编辑区 | 渲染引擎 |
|------|------|--------|----------|
| 预览 | 默认模式，所见即所得 | `WysiwygEditor` | Milkdown（CommonMark + GFM） |
| 分屏 | 左侧源码、右侧实时预览 | `Editor` + `Preview` | CodeMirror + marked |
| 源码 | 纯 Markdown 源码编辑 | `Editor` | CodeMirror |
| 专注 | 隐藏干扰元素的全屏写作 | `WysiwygEditor` | Milkdown（CommonMark + GFM） |

```
预览 / 专注  →  Milkdown WYSIWYG（直接渲染表格、标题等）
分屏         →  CodeMirror 编辑  +  marked 预览
源码         →  CodeMirror 纯文本编辑
```

### 支持的 Markdown 语法

| 语法 | 预览 / 专注 | 分屏预览 |
|------|-------------|----------|
| 标题、段落、列表 | ✓ | ✓ |
| 加粗、斜体、行内代码 | ✓ | ✓ |
| 代码块（语法高亮） | ✓ | ✓ |
| 引用块、分隔线 | ✓ | ✓ |
| GFM 表格 | ✓ | ✓ |
| 删除线、任务列表 | ✓ | ✓ |
| 链接、图片 | ✓ | ✓ |

---

## 开发

### 环境要求

- Node.js >= 18
- uTools（用于生产调试）

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

启动后开发服务器运行在 `http://localhost:5173`。

在 uTools 开发者模式中将插件目录指向本项目根目录，`plugin.json` 中已配置 `development.main` 指向 localhost，无需额外设置。

### 构建生产版本

```bash
npm run build
```

构建产物输出至 `dist/` 目录，包含 `plugin.json`、`preload.js`、`index.html` 及静态资源。将 `dist/` 目录作为 uTools 插件目录加载即可。

### 预览构建产物

```bash
npm run preview
```

---

## 项目结构

```
markflow/
├── public/
│   ├── plugin.json          # uTools 插件清单
│   ├── preload.js           # uTools API 桥接 (window.markflow)
│   └── logo.svg
├── src/
│   ├── main.ts              # Vue 应用入口
│   ├── App.vue              # 根布局与视图模式切换
│   ├── style.css            # 全局样式 & CSS 变量主题
│   ├── components/
│   │   ├── Toolbar.vue      # 顶部工具栏（视图切换、导入导出、主题）
│   │   ├── Sidebar.vue      # 侧边栏（文件夹 + 笔记列表 + 搜索）
│   │   ├── WysiwygEditor.vue # Milkdown 所见即所得编辑器
│   │   ├── Editor.vue       # CodeMirror 源码编辑器
│   │   ├── Preview.vue      # marked 实时预览面板
│   │   └── Toc.vue          # 文档目录导航
│   ├── stores/
│   │   └── note.ts          # Pinia 笔记状态管理
│   ├── composables/
│   │   ├── useStorage.ts    # 存储抽象（uTools / localStorage）
│   │   ├── useTheme.ts      # 主题管理
│   │   └── useScrollSync.ts # 分屏模式滚动同步
│   └── types/
│       └── index.ts         # TypeScript 类型定义
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| UI 框架 | Vue 3 (Composition API + `<script setup>`) |
| 状态管理 | Pinia |
| 构建工具 | Vite 8 (Rolldown) |
| WYSIWYG 编辑器 | Milkdown 7（`preset-commonmark` + `preset-gfm`） |
| 源码编辑器 | CodeMirror 6 |
| Markdown 预览 | marked（GFM） |
| 语法高亮 | highlight.js |
| 语言 | TypeScript |
| 样式 | 原生 CSS + CSS 变量（明/暗双主题） |
| 运行平台 | uTools 插件 API |

---

## 架构说明

```
uTools 启动器
    │
    ├── plugin.json  →  加载 index.html + preload.js
    │
    ├── preload.js   →  window.markflow（存储、文件对话框、通知、主题）
    │
    └── Vue 3 应用
            ├── Pinia（笔记 Store：笔记列表、当前笔记、liveContent）
            ├── useStorage  →  markflow 桥接 或 localStorage
            └── UI
                  ├── Toolbar（视图模式 / 导入导出 / 主题）
                  ├── Sidebar（文件夹 + 笔记）
                  ├── 编辑区（按模式切换）
                  │     ├── WysiwygEditor  ← 预览 / 专注
                  │     ├── Editor         ← 分屏 / 源码
                  │     └── Preview        ← 分屏
                  └── Toc（目录导航）
```

`preload.js` 是 uTools 与 Vue 应用之间的桥梁，将 `utools.dbStorage`、文件系统操作等 API 安全地暴露为 `window.markflow`。Vue 应用只依赖这一抽象接口，因此在浏览器开发模式下也能正常运行。

### 内容同步

- 编辑内容通过 Pinia `liveContent` 在各组件间共享
- WYSIWYG 模式：Milkdown `listener` 监听变更，防抖 300ms 后持久化
- 导入文件或切换笔记时，通过 `getMarkdown` 比对避免重复刷新，确保外部内容正确同步到编辑器

---

## 数据存储

| Key | 内容 |
|-----|------|
| `markflow_note_list` | 笔记列表（id、标题、文件夹、时间等） |
| `markflow_note_{id}` | 单篇笔记正文 |
| `markflow_folder_list` | 文件夹列表 |
| `markflow_settings` | 应用设置（主题等） |

---

## License

MIT
