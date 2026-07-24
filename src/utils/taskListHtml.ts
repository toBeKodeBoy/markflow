import { parseTaskLines } from './taskListParse'

export function annotateTaskListHtml(html: string, markdown: string): string {
  if (!html.includes('task-list-item')) return html

  const tasks = parseTaskLines(markdown)
  if (tasks.length === 0) return html

  const doc = new DOMParser().parseFromString(`<div id="task-root">${html}</div>`, 'text/html')
  const root = doc.querySelector('#task-root')
  if (!root) return html

  const items = [...root.querySelectorAll<HTMLLIElement>('li.task-list-item')]

  items.forEach((item, index) => {
    const task = tasks[index]
    if (!task) return

    item.setAttribute('data-task-line', String(task.line))
    item.setAttribute('data-checked', String(task.checked))

    const checkbox = item.querySelector<HTMLInputElement>('input.task-list-item-checkbox')
    if (!checkbox) return

    checkbox.removeAttribute('disabled')
    checkbox.setAttribute('data-task-line', String(task.line))
    checkbox.setAttribute('aria-label', task.text || `任务 ${task.line}`)
  })

  return root.innerHTML
}
