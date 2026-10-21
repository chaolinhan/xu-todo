import type { AppData, Priority, RecurrenceUnit, TaskDraft } from '../types'
import { createRecurrenceRule } from './recurrence'

export interface ParsedQuickTask { draft: TaskDraft; recognized: string[]; warnings: string[] }
const weekdays = '日一二三四五六'

/** Deliberately bounded, local grammar. Unrecognized text always stays in the title. */
export function parseQuickTask(raw: string, data: Pick<AppData, 'projects' | 'labels'>, now = new Date(), defaultProjectId = 'inbox', defaultDate?: string, ignored: string[] = []): ParsedQuickTask {
  let priority: Priority = 4
  let projectId = defaultProjectId
  const labelIds: string[] = [], recognized: string[] = [], warnings: string[] = [], title: string[] = []
  let day: Date | undefined = defaultDate ? new Date(defaultDate) : undefined
  let hours: number | undefined, minutes = 0, recurrenceUnit: RecurrenceUnit | undefined
  for (const token of raw.trim().split(/\s+/u).filter(Boolean)) {
    if (ignored.includes(token)) { title.push(token); continue }
    if (/^p[1-4]$/i.test(token)) { priority = Number(token[1]) as Priority; recognized.push(token); continue }
    if (token.startsWith('#')) {
      const project = data.projects.find(p => p.name === token.slice(1))
      if (project) { projectId = project.id; recognized.push(token); continue }
      warnings.push(`未找到项目 ${token}，保留在标题中`)
    }
    if (token.startsWith('@')) {
      const label = data.labels.find(l => l.name === token.slice(1))
      if (label) { if (!labelIds.includes(label.id)) labelIds.push(label.id); recognized.push(token); continue }
      warnings.push(`未找到标签 ${token}，保留在标题中`)
    }
    const repeat = /^(每天|每个工作日|每周|每月|每年|每周[一二三四五六日天])$/.exec(token)
    if (repeat) {
      recurrenceUnit = token === '每天' ? 'day' : token === '每个工作日' ? 'weekday' : token === '每月' ? 'month' : token === '每年' ? 'year' : 'week'
      if (token.length === 3 && token.startsWith('每周')) {
        day = new Date(now); const weekday = weekdays.indexOf(token[2] === '天' ? '日' : token[2]); day.setDate(day.getDate() + (weekday - day.getDay() + 7) % 7)
      }
      recognized.push(token); continue
    }
    const dateOnly = /^(今天|明天|后天|大后天|下周[一二三四五六日天]|周[一二三四五六日天])$/.exec(token)
    const combined = /^(今天|明天|后天|大后天|下周[一二三四五六日天]|周[一二三四五六日天])?(上午|中午|下午|晚上)?(\d{1,2})(?:[:：](\d{2})|点(?:(半)|(\d{1,2})分?)?)$/.exec(token)
    if (dateOnly || combined) {
      const word = dateOnly?.[1] ?? combined?.[1]
      let nextHours = hours, nextMinutes = minutes
      if (combined) {
        nextHours = Number(combined[3]); nextMinutes = combined[5] ? 30 : Number(combined[4] ?? combined[6] ?? 0)
        const period = combined[2]
        if (nextHours > 23 || nextMinutes > 59 || (period && (nextHours < 1 || nextHours > 12))) { warnings.push(`${token} 不是有效时间，保留在标题中`); title.push(token); continue }
        if ((period === '下午' || period === '晚上') && nextHours < 12) nextHours += 12
        if (period === '中午' && nextHours < 11) nextHours += 12
        if (period === '上午' && nextHours === 12) nextHours = 0
      }
      if (word) {
        day = new Date(now)
        if (word.startsWith('下周')) {
          const target = weekdays.indexOf(word.at(-1) === '天' ? '日' : word.at(-1)!)
          const mondayOffset = (day.getDay() + 6) % 7
          day.setDate(day.getDate() - mondayOffset + 7 + (target + 6) % 7)
        } else if (word.startsWith('周')) {
          const target = weekdays.indexOf(word.at(-1) === '天' ? '日' : word.at(-1)!)
          day.setDate(day.getDate() + (target - day.getDay() + 7) % 7)
        } else day.setDate(day.getDate() + ['今天', '明天', '后天', '大后天'].indexOf(word))
      }
      hours = nextHours; minutes = nextMinutes; recognized.push(token); continue
    }
    const explicit = /^(?:(\d{4})-)?(\d{1,2})[-月](\d{1,2})日?$/.exec(token)
    if (explicit) {
      const year = Number(explicit[1] ?? now.getFullYear()), month = Number(explicit[2]) - 1, date = Number(explicit[3])
      const candidate = new Date(year, month, date, 9)
      if (candidate.getFullYear() === year && candidate.getMonth() === month && candidate.getDate() === date) { day = candidate; recognized.push(token); continue }
      warnings.push(`${token} 不是有效日期，保留在标题中`)
    }
    title.push(token)
  }
  if (hours !== undefined || recurrenceUnit) day ??= new Date(now)
  if (day) { day.setHours(hours ?? 9, minutes, 0, 0); if (recurrenceUnit === 'weekday' && [0, 6].includes(day.getDay())) day.setDate(day.getDate() + (day.getDay() === 6 ? 2 : 1)) }
  const dueAt = day?.toISOString()
  return { draft: { title: title.join(' '), description: '', priority, projectId, labelIds, dueAt, reminderAt: dueAt, recurrence: recurrenceUnit && dueAt ? createRecurrenceRule(recurrenceUnit, 1, dueAt) : undefined }, recognized, warnings }
}
