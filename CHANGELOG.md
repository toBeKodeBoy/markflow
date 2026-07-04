# Changelog

本文件记录 MarkFlow 各版本的 notable 变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- （M1）搜索防抖、空状态、列表命中摘要
- （M1）标签纳入联合搜索
- （M2）笔记标签 CRUD、Sidebar 标签过滤
- （M2）`TagInput` 组件
- （M3）笔记置顶、拖拽排序（`pinned` / `sortOrder`）
- （M4）全量数据备份导出与导入恢复
- （M4）存储用量与笔记数量展示

### Changed

- （M3）笔记列表排序规则：置顶 > sortOrder > updatedAt

### Fixed

- （待填）发版前修复项

---

## [1.1.0] — TBD

> 目标：组织与检索。详见 [docs/开发计划/v1.1.md](docs/开发计划/v1.1.md)。

<!-- 发版时从 [Unreleased] 移入并填写日期 -->

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

<!-- 链接定义：发版后将 TBD 替换为实际日期，并保留比较链接 -->
[Unreleased]: https://github.com/toBeKodeBoy/markflow/compare/v1.0.1...HEAD
[1.1.0]: https://github.com/toBeKodeBoy/markflow/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/toBeKodeBoy/markflow/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/toBeKodeBoy/markflow/compare/v0.0.1...v1.0.0
