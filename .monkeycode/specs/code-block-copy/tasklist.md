# 需求实施计划

- [ ] 1. 预览模式：CSS 样式与渲染标记
  - [ ] 1.1 在 `src/style.css` 添加 `.code-copy-btn` 样式规则
    - 尺寸、定位、颜色、hover 效果、触摸设备可见性
    - 有/无语言标签时的布局处理
    - 暗色主题适配
    - 对应 REQ-COPY-007, REQ-COPY-008
  - [ ] 1.2 修改 `src/utils/markedSetup.ts` 的 `codeBlockRenderer`，在 HTML 中输出复制按钮
    - 在 `.code-block-wrapper` 内添加 `<button class="code-copy-btn">复制</button>`
    - 对应 REQ-COPY-001
  - [ ] 1.3 编写 markedSetup 渲染输出测试
    - 验证有语言标签的代码块输出包含 `.code-copy-btn`
    - 验证无语言标签的代码块输出仍包含 `.code-copy-btn`
    - 验证渲染后的代码块结构正确
    - 对应设计文档 测试策略-单元测试

- [ ] 2. 预览模式：复制交互逻辑
  - [ ] 2.1 在 `src/components/Preview.vue` 添加事件委托处理复制按钮点击
    - 获取 `.code-block-wrapper` 中 `pre > code` 的 `textContent`
    - 调用 `navigator.clipboard.writeText()`
    - 按钮文字切换 "复制" -> "已复制!"，2 秒恢复
    - 失败时调用 `window.markflow.showNotification('复制失败')`
    - 对应 REQ-COPY-002, REQ-COPY-005, REQ-COPY-006
  - [ ] 2.2 编写 Preview.vue 预览模式复制交互集成测试
    - 模拟代码块 DOM，点击复制按钮
    - 验证剪贴板写入调用
    - 验证按钮文字变化和 2 秒恢复
    - 对应设计文档 测试策略-集成测试

- [ ] 3. WYSIWYG 模式：DOM 构建与复制逻辑
  - [ ] 3.1 修改 `src/plugins/codeBlockLabel.ts` 的 `buildCodeBlockDOM()`
    - 创建 `.code-copy-btn` 按钮元素，添加到 wrapper
    - 返回 copyBtn 引用
    - 对应 REQ-COPY-003
  - [ ] 3.2 在 `CodeBlockNodeView` 中添加复制处理逻辑
    - 添加 `copyBtn` 属性，构造函数中绑定 click 事件
    - 实现 `copyCode()` 方法：提取 `node.textContent`，调用剪贴板 API
    - 按钮反馈逻辑同预览模式
    - 对应 REQ-COPY-004, REQ-COPY-005, REQ-COPY-006
  - [ ] 3.3 编写 WYSIWYG 模式代码块复制测试
    - 验证 `buildCodeBlockDOM` 输出包含 copyBtn
    - 验证 `CodeBlockNodeView` 的 copyCode 方法
    - 对应设计文档 测试策略-集成测试

- [ ] 4. 检查点 — 确保所有测试通过、功能完整
  - 运行 `npm test` 确认全部测试通过
  - 检查预览模式与 WYSIWYG 模式按钮样式一致性

- [ ] 5. Code Review
  - 对照代码质量标准审查所有变更
  - 标记中高级问题供修复

- [ ] 6. 修复中高级问题
  - 根据 Code Review 发现修复代码

- [ ] 7. 二次 Code Review
  - 确认问题已修复，无新问题引入
