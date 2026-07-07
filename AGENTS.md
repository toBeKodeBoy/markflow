# AGENTS.md

本文档为 Codex 及其他编码代理提供本仓库的专属上下文，帮助后续改动更安全、更高效。

## 项目概览

- 项目名称：`markflow`
- 项目类型：`uTools` 本地 Markdown 笔记插件
- 前端技术栈：`Vue 3`、`TypeScript`、`Vite`、`Pinia`
- 编辑器技术栈：
  - 所见即所得编辑：`Milkdown`
  - 源码编辑：`CodeMirror 6`
  - Markdown 预览：`marked` + `highlight.js` + `KaTeX` + `Mermaid`
- 运行模式：
  - 本地开发时直接运行 Vite 应用
  - uTools 生产环境通过 `public/preload.js` 暴露 `window.markflow` 桥接能力

## 最重要的约束

- 保持 `src/` 中的应用代码与 `public/preload.js` 中的 uTools 桥接层分离。
- 将 `dist/` 视为构建产物，不要把它当作源码修改。
- 保留浏览器开发环境的降级能力。项目在没有 `utools` 时，依赖 `localStorage` 完成本地开发。
- 修改编辑器行为时要格外谨慎。本项目同时维护 WYSIWYG 和源码模式，回归常见于同步、粘贴、任务列表、目录生成、代码块等场景。

## 常用命令

```bash
npm run dev
npm run build
npm test
npm run test:watch
```

## 验证要求

- 大多数代码改动至少运行 `npm test`。
- 涉及构建、打包、配置的改动，同时运行 `npm run build`。
- 如果修改了下面这些区域，尽量额外运行对应的定向测试：
  - 存储与持久化：`tests/architecture/storage-abstraction.test.ts`、`tests/unit/composables/useStorage.test.ts`
  - 视图模式切换：`tests/architecture/view-mode.test.ts`、`tests/integration/view-mode.test.ts`
  - WYSIWYG 行为：`tests/integration/wysiwyg-*.test.ts`、`tests/unit/plugins/*.test.ts`
  - Markdown 渲染与代码块：`tests/unit/utils/markedSetup.test.ts`、`tests/markedSetup.taskList.test.ts`、`tests/unit/utils/updateFenceLanguage.test.ts`
  - 数学公式：`tests/unit/utils/mathRender.test.ts`、`tests/unit/utils/markedSetup.math.test.ts`、`tests/integration/wysiwyg-math.test.ts`
  - Mermaid 图示：`tests/unit/utils/mermaidRender.test.ts`、`tests/unit/utils/markedSetup.mermaid.test.ts`、`tests/integration/wysiwyg-mermaid.test.ts`
  - 文件夹导入：`tests/importFolder*.test.ts`、`tests/utils/folderTree.test.ts`

## 仓库结构

- `src/`：主应用源码
- `src/components/`：编辑器、预览、侧边栏、工具栏、目录、弹窗等界面组件
- `src/composables/`：存储、主题、目录、资源处理、滚动同步等复用逻辑
- `src/stores/`：Pinia 状态管理，重点是笔记与文件夹编排
- `src/utils/`：Markdown 工具、目录树、导入导出、剪贴板、PDF、备份、渲染相关工具函数
- `src/plugins/` 与 `src/extensions/`：编辑器增强逻辑
- `src/types/`：共享类型定义
- `public/plugin.json`：uTools 插件清单
- `public/preload.js`：uTools 桥接层，需保持简单且兼容运行时
- `tests/`：单元测试、集成测试、架构约束测试、工具测试
- `dist/`：构建输出目录

## 开发约定

### 1. uTools 桥接层与应用层分工

- `public/preload.js` 保持朴素、保守的 JavaScript 写法。
- 不要把浏览器端应用逻辑硬塞进 `preload.js`。
- 不要假设 `window.markflow` 一定存在；开发模式下，应用需要继续通过 `src/composables/useStorage.ts` 的降级路径正常运行。

### 2. 存储与数据安全

- 笔记、文件夹、设置、资源等持久化应通过统一存储抽象完成，不要在各组件里随意直接调用桥接层。
- 优先在 `src/composables/useStorage.ts`、`src/composables/useAssetStorage.ts` 或 store 层 API 上扩展，不要复制持久化逻辑。
- 除非明确引入迁移，否则不要随意修改既有存储 key。

### 3. 编辑器相关改动

- 源码模式与 WYSIWYG 模式必须保持行为一致。
- 修改 Markdown 序列化、粘贴、任务列表、行内代码、围栏代码块、目录生成等行为时，要关注两种模式的结果是否一致。
- 如果仓库里已经有编辑器插件或工具抽象，优先复用，不要新增一次性 DOM hack。

### 4. 导入、资源与预览

- 文件夹导入逻辑同时分布在应用层和 preload 桥接层，两边的扩展名规则和导入行为要保持一致。
- 相对图片路径和 `markflow-asset://` 资源链路很容易被改坏；修改相关逻辑后要同时验证渲染和持久化。
- 预览 HTML 经 `sanitizeRenderedHtml`（DOMPurify）清洗；**Mermaid hydrate 后的 SVG 不再二次 DOMPurify**，以免剥离 `foreignObject` 节点标签，安全依赖 mermaid `securityLevel: 'strict'`。
- 修改数学（`src/plugins/math.ts`、`src/utils/mathRender.ts`）或 Mermaid（`src/utils/mermaidBlock.ts`、`src/utils/mermaidRender.ts`）时，须同时验证 WYSIWYG 与分屏预览一致。

### 5. 构建产物

- 不要手改 `dist/`。
- 如果源码改动需要反映到插件产物，修改源文件后重新构建，而不是直接补丁构建结果。

## 针对文件的额外提示

- 修改 `public/plugin.json` 时，确认开发入口仍指向 `http://localhost:5173`，生产入口仍能正确加载打包后的插件。
- 修改 `vite.config.ts` 时，保留 `base: './'`，这是 uTools 本地加载所需的相对路径配置。
- 修改 CodeMirror 或 Lezer 相关依赖时，注意不要破坏 `vite.config.ts` 与 `vitest.config.ts` 中现有的 `dedupe` 配置。
- 修改 `src/stores/note.ts` 时，留意搜索索引、文件夹关系、大文件降级、目录跳转、当前笔记同步等副作用。
- 修改 `src/composables/useStorage.ts` 时，必须保留本地开发降级能力和现有的错误处理行为。

## 推荐的改动风格

- 优先做聚焦、可回滚的小改动，不要平行引入新的体系。
- 新增工具函数前，先复用已有能力。
- 修 bug 或改用户可见行为时，优先补充测试。
- 注释保持简洁，只在代码本身不够直观时再补充说明。

## 给后续代理的说明

- 当前仓库不存在 `.codegraph/` 目录，因此默认使用常规代码检索方式即可；如果后续引入，再优先使用 CodeGraph。
- 当前 `package.json` 中没有定义 `lint` 脚本，验证主要依赖测试与构建。
- 如果拿不准，优先选择小步、可验证、易回退的修改方案。
