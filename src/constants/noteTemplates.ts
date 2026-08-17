export type NoteTemplateId =
  | 'tech-doc'
  | 'study-note'
  | 'journal-plan'
  | 'agent-prompt'

export type NoteTemplateIconName =
  | 'template-doc'
  | 'template-book'
  | 'template-calendar'
  | 'template-sparkle'

export type NoteTemplateTone = 'blue' | 'green' | 'orange' | 'purple'

export interface NoteTemplate {
  id: NoteTemplateId
  title: string
  description: string
  icon: NoteTemplateIconName
  iconTone: NoteTemplateTone
  content: string
}

function formatIsoDate(now: Date): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getNoteTemplate(id: string): NoteTemplate | undefined {
  return NOTE_TEMPLATES.find((item) => item.id === id)
}

export function buildTemplateNoteTitle(template: NoteTemplate, now = new Date()): string {
  if (template.id === 'journal-plan') return `${template.title} · ${formatIsoDate(now)}`
  return template.title
}

export function uniquifyNoteTitle(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base
  let index = 2
  while (existing.includes(`${base} (${index})`)) index += 1
  return `${base} (${index})`
}

export function renderTemplateContent(
  template: NoteTemplate,
  title: string,
  now = new Date(),
): string {
  return template.content
    .replaceAll('{{title}}', title)
    .replaceAll('{{date}}', formatIsoDate(now))
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'tech-doc',
    title: '技术开发文档',
    description: '接口说明、故障排查与协作文档模板',
    icon: 'template-doc',
    iconTone: 'blue',
    content: `# {{title}}

## 背景

- 用途：
- 调用方：
- 相关笔记：

## 接口一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /api/example | 查询 |
| POST | /api/example | 创建 |

## 请求

- Method：
- Path：
- 鉴权：

\`\`\`http
GET /api/example HTTP/1.1
Authorization: Bearer <token>
\`\`\`

## 响应

\`\`\`json
{
  "ok": true,
  "data": {}
}
\`\`\`

## 故障排查

1. 现象
2. 复现步骤
3. 结论与修复
`,
  },
  {
    id: 'study-note',
    title: '学习教程笔记',
    description: '知识点清单、复习提纲，适合每天学完整理',
    icon: 'template-book',
    iconTone: 'green',
    content: `# {{title}}

## 目标

今天要搞懂什么？学完后能独立完成哪一件事？先写一句可验收的结果。

## 知识点清单

- [ ] 概念 A：定义、适用场景、反例
- [ ] 概念 B：和 A 的区别，以及什么时候不该用
- [ ] 概念 C：一个能跑通的最小例子
- [ ] 概念 D：常见坑与排查办法

## 要点

用自己的话写下关键结论，避免只抄原文。可以配一张表、一段代码，或画一个流程。

## 练习

- 做一道能覆盖今天核心概念的题
- 把卡住的地方记下来，下次优先复习
- 试着给别人讲一遍，讲不清楚的就是还没懂的部分

## 复习提纲

- 如果只能记住三句话，会是哪三句？
- 哪些地方还容易混淆？
- 下次练习什么？
`,
  },
  {
    id: 'journal-plan',
    title: '日常随笔计划',
    description: '工作计划、随手记录，晚上再复盘整理',
    icon: 'template-calendar',
    iconTone: 'orange',
    content: `# {{title}}

> 日期：{{date}}

## 要做

- [ ] 事项 1（最重要）
- [ ] 事项 2
- [ ] 事项 3

## 进行中

当前最重要的一件事是什么？卡在哪一步？需要谁协助？

## 随手记录

记下过程中的想法、链接、会议结论与阻塞。不必写得很完整，先留痕迹，晚上再整理。

## 复盘

- 今天完成了什么
- 什么被推迟了，为什么
- 有没有可以复用的结论，值得单独开一篇笔记
- 明天优先做什么
`,
  },
  {
    id: 'agent-prompt',
    title: 'Agent 提示词',
    description: '可复用的 AI 提示模板，保持语气简洁',
    icon: 'template-sparkle',
    iconTone: 'purple',
    content: `# {{title}}

## 角色

你是一名熟悉本地 Markdown 知识库的助手，擅长把含糊需求整理成可执行说明，并保持语气简洁。

## 任务

根据用户目标，输出可直接粘贴使用的结果。先确认目标，再给步骤；如果信息不足，先问最关键的缺口。

## 约束

- 先给结论，再给步骤
- 不要编造不存在的路径或 API
- 不确定时明确写出假设
- 需要用户补充信息时，一次只问最关键的问题
- 避免空话，尽量给出可复制的正文

## 输入

（在这里粘贴上下文、报错、草稿或相关笔记摘录）

## 输出格式

1. 结论
2. 步骤
3. 可复制的正文
4. 仍需确认的问题（如有）
`,
  },
]
