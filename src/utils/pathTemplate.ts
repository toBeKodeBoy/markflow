const ILLEGAL_FILENAME_CHARS_RE = /[\\/:*?"<>|]/g

export interface PathTemplateVars {
  filename: string
  noteTitle: string
  date: string
  time: string
  index?: string
}

function sanitizeTemplateValue(value: string): string {
  return value.replace(ILLEGAL_FILENAME_CHARS_RE, '_').trim()
}

export function renderPathTemplate(template: string, vars: PathTemplateVars): string {
  return template.replace(/\$\{([^}]+)\}/g, (match, key: string) => {
    if (!(key in vars)) return match
    return sanitizeTemplateValue(vars[key as keyof PathTemplateVars] ?? '')
  })
}
