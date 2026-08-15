export const EXAMPLE_LIBRARY_FOLDER_NAMES = [
  '技术学习笔记',
  'AI Agent教程',
  '随笔归档',
] as const

export const EXAMPLE_LIBRARY_OPEN_NOTE_TITLE = '提示词模板示例'

export interface ExampleLibraryNoteSeed {
  title: string
  content: string
}

export interface ExampleLibraryFolderSeed {
  name: string
  notes: ExampleLibraryNoteSeed[]
}

export const EXAMPLE_LIBRARY: ExampleLibraryFolderSeed[] = [
  {
    name: '技术学习笔记',
    notes: [
      {
        title: '接口文档示例',
        content: `# 接口文档示例

用这篇笔记观察「技术学习笔记」文件夹如何归类接口说明。
`,
      },
      {
        title: '故障排查记录',
        content: `# 故障排查记录

记录现象、复现与结论，方便以后检索。
`,
      },
    ],
  },
  {
    name: 'AI Agent教程',
    notes: [
      {
        title: '提示词模板示例',
        content: `# Agent 提示词模板

## 角色

你是一名熟悉本地 Markdown 知识库的助手。

## 任务

根据用户目标输出可直接使用的结果。
`,
      },
      {
        title: '如何管理本地笔记',
        content: `# 如何管理本地笔记

左侧「我的文件夹」用于分类；删除的内容会进入回收站。
`,
      },
      {
        title: '欢迎使用 MarkFlow',
        content: `# 欢迎使用 MarkFlow

这是示例知识库中的导读笔记，可随时删除。
`,
      },
    ],
  },
  {
    name: '随笔归档',
    notes: [
      {
        title: '今日计划示例',
        content: `# 今日计划示例

- [ ] 整理一则技术笔记
- [ ] 回顾昨天的待办
`,
      },
    ],
  },
]
