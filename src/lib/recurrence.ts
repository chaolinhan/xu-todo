import type { RecurrenceRule, RecurrenceUnit, Task } from '../types'

const MAX_ADVANCES = 10_000

function assertRule(rule: RecurrenceRule): void {
  if (!Number.isInteger(rule.interval) || rule.interval < 1 || rule.interval > 365) {
    throw new Error('重复间隔必须是 1 到 365 之间的整数')
  }
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function withCalendarDate(source: Date, year: number, month: number, day: number): Date {
  return new Date(
    year,
    month,
    day,
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    source.getMilliseconds(),
  )
}

function addWeekdays(source: Date, interval: number): Date {
  const result = new Date(source)
  let remaining = interval
  while (remaining > 0) {
    result.setDate(result.getDate() + 1)
    const weekday = result.getDay()
    if (weekday !== 0 && weekday !== 6) remaining -= 1
  }
  return result
}

function advanceOnce(source: Date, rule: RecurrenceRule): Date {
  if (rule.unit === 'weekday') return addWeekdays(source, rule.interval)

  if (rule.unit === 'day' || rule.unit === 'week') {
    const result = new Date(source)
    result.setDate(result.getDate() + rule.interval * (rule.unit === 'week' ? 7 : 1))
    return result
  }

  if (rule.unit === 'month') {
    const targetMonthStart = new Date(source.getFullYear(), source.getMonth() + rule.interval, 1)
    const targetYear = targetMonthStart.getFullYear()
    const targetMonth = targetMonthStart.getMonth()
    const anchorDay = rule.anchorDay ?? source.getDate()
    return withCalendarDate(source, targetYear, targetMonth, Math.min(anchorDay, daysInMonth(targetYear, targetMonth)))
  }

  const targetYear = source.getFullYear() + rule.interval
  const targetMonth = rule.anchorMonth ?? source.getMonth()
  const anchorDay = rule.anchorDay ?? source.getDate()
  return withCalendarDate(source, targetYear, targetMonth, Math.min(anchorDay, daysInMonth(targetYear, targetMonth)))
}

export function createRecurrenceRule(unit: RecurrenceUnit, interval: number, dueAt: string): RecurrenceRule {
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) throw new Error('截止时间无效')
  const rule: RecurrenceRule = { unit, interval }
  assertRule(rule)
  if (unit === 'month' || unit === 'year') rule.anchorDay = due.getDate()
  if (unit === 'year') rule.anchorMonth = due.getMonth()
  return rule
}

export function nextOccurrence(dueAt: string, rule: RecurrenceRule, after = new Date()): string {
  assertRule(rule)
  let candidate = new Date(dueAt)
  if (Number.isNaN(candidate.getTime())) throw new Error('截止时间无效')

  for (let index = 0; index < MAX_ADVANCES; index += 1) {
    candidate = advanceOnce(candidate, rule)
    if (candidate.getTime() > after.getTime()) return candidate.toISOString()
  }

  throw new Error('无法在合理范围内计算下一次任务')
}

export function createNextTaskOccurrence(
  task: Task,
  completedAt = new Date(),
  id = `${task.id}-next`,
): Task | null {
  if (!task.recurrence || !task.dueAt) return null
  const nextDueAt = nextOccurrence(task.dueAt, task.recurrence, completedAt)
  const reminderOffset = task.reminderAt
    ? new Date(task.dueAt).getTime() - new Date(task.reminderAt).getTime()
    : null
  const timestamp = completedAt.toISOString()

  return {
    ...task,
    id,
    completed: false,
    completedAt: undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
    dueAt: nextDueAt,
    reminderAt: reminderOffset === null
      ? undefined
      : new Date(new Date(nextDueAt).getTime() - reminderOffset).toISOString(),
    remindedAt: undefined,
    recurrence: { ...task.recurrence },
    seriesId: task.seriesId ?? task.id,
    previousOccurrenceId: task.id,
  }
}

export function describeRecurrence(rule: RecurrenceRule): string {
  if (rule.interval === 1) {
    const builtIn: Record<RecurrenceUnit, string> = {
      day: '每天',
      weekday: '每个工作日',
      week: '每周',
      month: '每月',
      year: '每年',
    }
    return builtIn[rule.unit]
  }

  const units: Record<RecurrenceUnit, string> = {
    day: '天',
    weekday: '个工作日',
    week: '周',
    month: '个月',
    year: '年',
  }
  return `每 ${rule.interval} ${units[rule.unit]}`
}
