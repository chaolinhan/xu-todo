import type { PreviewMode, Task } from '../types'
import { compareTasks, startOfLocalDay } from './task-utils'

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function addCalendarDays(date: Date, amount: number): Date {
  const result = startOfLocalDay(date)
  result.setDate(result.getDate() + amount)
  return result
}

export function startOfWeek(date: Date): Date {
  return addCalendarDays(date, -(date.getDay() + 6) % 7)
}

export function moveCalendarDate(date: Date, mode: PreviewMode, amount: number): Date {
  if (mode !== 'month') return addCalendarDays(date, amount * (mode === 'week' ? 7 : 1))
  const result = new Date(date.getFullYear(), date.getMonth() + amount, 1)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(date.getDate(), lastDay))
  return result
}

export function calendarDays(date: Date, mode: PreviewMode): Date[] {
  if (mode === 'day') return [startOfLocalDay(date)]
  const start = mode === 'week' ? startOfWeek(date) : startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1))
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  // Count calendar dates instead of elapsed hours, so DST cannot shorten a grid.
  const last = mode === 'week' ? addCalendarDays(start, 6) : addCalendarDays(startOfWeek(monthEnd), 6)
  const days: Date[] = []
  for (let current = start; current <= last && days.length < 42; current = addCalendarDays(current, 1)) days.push(current)
  return days
}

export function tasksByCalendarDay(tasks: Task[], showCompleted: boolean, sortMode: 'date' | 'priority' = 'date'): Map<string, Task[]> {
  const days = new Map<string, Task[]>()
  for (const task of tasks) {
    if (!task.dueAt || (!showCompleted && task.completed)) continue
    const date = new Date(task.dueAt)
    if (!Number.isFinite(date.getTime())) continue
    const key = localDateKey(date)
    const items = days.get(key) ?? []
    items.push(task)
    days.set(key, items)
  }
  for (const items of days.values()) items.sort((a, b) => sortMode === 'priority' ? Number(a.completed) - Number(b.completed) || a.priority - b.priority || compareTasks(a, b) : compareTasks(a, b))
  return days
}

export function calendarRangeLabel(date: Date, mode: PreviewMode): string {
  if (mode === 'month') return `${date.getFullYear()}年${date.getMonth() + 1}月`
  if (mode === 'day') return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(date)
  const first = startOfWeek(date), last = addCalendarDays(first, 6)
  const short = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`
  return first.getFullYear() === last.getFullYear() ? `${first.getFullYear()}年 ${short(first)} — ${short(last)}` : `${first.getFullYear()}年${short(first)} — ${last.getFullYear()}年${short(last)}`
}
