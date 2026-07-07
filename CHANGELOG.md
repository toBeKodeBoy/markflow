# Changelog

本文件记录 MarkFlow 各版本的 notable 变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

### Changed

### Fixed

---

## [1.1.0] — 2026-07-07

> 组织与检索：搜索增强、标签、排序置顶、数据备份 v2 与清空入口。

### Added

- **全文搜索增强**：标题 + 正文 + 标签联合搜索；匹配摘要高亮；300ms 防抖；搜索模式 UI（`SearchBar` / `SearchResultsList`）
- **标签系统**：`TagInput` 编辑（Enter/逗号添加、自动补全）；编辑器顶栏 `NoteTagsBar`；侧栏标签过滤与标签云；`tagNormalize` 规范化（去重、最长 20 字符）
- **笔记排序**：置顶/取消置顶；同文件夹内拖拽重排；`sortOrder` 懒迁移（`migrateNoteSortOrder`）
- **导入文件夹**：批量导入 Markdown / 文本 / 代码文件，可选保留目录结构、导入图片、导入选项记忆
- **侧栏文件夹树**：多级目录、右键菜单、拖拽移动、笔记数量角标、展开状态持久化；虚拟列表（>150 行）
- **数据备份 v2**：JSON 导出/恢复含笔记、文件夹、设置与**图片资产**；uTools 原生保存/打开对话框；设置页存储用量估算
- **清空全部数据**：设置 → 数据管理 → 二次确认后清空笔记/文件夹/图片（保留应用设置）
- Store API：`addTag` / `removeTag` / `reorderNotes` / `toggleNotePinned` / `clearAllLibraryData`
- 导入笔记标题默认使用文件名；`importSourcePath` 防止编辑时被正文标题覆盖

### Changed

- 笔记列表排序：置顶 > `sortOrder` > `updatedAt`（置顶组内按 `updatedAt` 倒序）
- 删除文件夹时笔记移至父文件夹（根级文件夹则移回根目录）
- TOC 滚动高亮按视图模式绑定正确容器（预览 / 分屏）
- 备份恢复前清空旧图片资源，恢复后重建搜索索引

### Fixed

- 导入到「当前文件夹 / 新建文件夹」的目标路径误选
- 备份恢复后侧栏展开状态不刷新
- 导入失败回滚时在浏览器环境正确删除 IndexedDB 图片
- 分屏模式下 TOC 滚动监听绑定错误容器

---

## [1.0.1] — 2026-07-03

### Added

- PDF 导出：Typora 路线（HTML + uTools `ubrowser.printToPDF`），支持纸张 / 页边距 / 背景色
- 图片粘贴与 `markflow-asset://` 独立存储，含压缩与孤儿资源 GC
- 图片比例缩放、悬停百分比、双击全屏预览（灯箱）
- 全文搜索：侧边栏支持按标题 + 正文过滤（内存索引）
- 设置面板：主题、源码字号、等宽字体；PDF 选项持久化
- 行内代码插入与 WYSIWYG 反引号自动转换
- 代码块复制按钮、语言标签交互优化
- 下划线（`<u>`）、`==高亮==` 语法
- PDF / 打印 / 设置 / 搜索相关单元测试

### Changed

- 统一 WYSIWYG 与分屏模式无序列表样式
- 代码块复制按钮文案与中文编码修复

### Fixed

- 补全 `updateFenceLanguage` 工具函数
- WYSIWYG 代码块语言标签点击交互

---

## [1.0.0] — 2026-06-25

### Added

- 笔记 CRUD、文件夹管理、侧边栏标题搜索
- 四视图：预览 / 分屏 / 源码 / 专注
- Milkdown WYSIWYG + CodeMirror 6 源码编辑
- 分屏 marked 预览、滚动同步、目录导航
- 导入 / 导出 `.md` 文件
- 明暗主题（含跟随系统 / uTools）
- 大文件策略（>200KB 自动切分屏）
- 复制 HTML、GFM 与代码高亮
- uTools preload 桥接（`window.markflow`）
- 单元 / 集成 / 架构测试与 GitHub CI

---

## [0.0.1] — 内部 MVP

### Added

- 最小闭环：笔记 CRUD、本地持久化、基础编辑
- uTools 插件骨架与开发环境 localStorage 回退

---

[Unreleased]: https://github.com/toBeKodeBoy/markflow/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/toBeKodeBoy/markflow/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/toBeKodeBoy/markflow/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/toBeKodeBoy/markflow/compare/v0.0.1...v1.0.0
