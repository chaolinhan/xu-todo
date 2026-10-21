import { describe, expect, it } from 'vitest'
import type { RecurrenceRule, Task } from '../types'
import {
  createNextTaskOccurrence,
  createRecurrenceRule,
  describeRecurrence,
  nextOccurrence,
} from './recurrence'

function iso(local: string): string {
  return new Date(local).toISOString()
}

describe('calendar recurrence', () => {
  it('advances weekdays across weekends', () => {
    const rule: RecurrenceRule = { unit: 'weekday', interval: 1 }
    expect(nextOccurrence(iso('2026-09-11T09:00:00+08:00'), rule, new Date('2026-09-11T10:00:00+08:00')))
      .toBe(iso('2026-09-14T09:00:00+08:00'))
  })

  it('skips missed daily periods and keeps the original time', () => {
    const rule: RecurrenceRule = { unit: 'day', interval: 1 }
    expect(nextOccurrence(iso('2026-09-01T09:00:00+08:00'), rule, new Date('2026-09-11T10:00:00+08:00')))
      .toBe(iso('2026-09-12T09:00:00+08:00'))
  })

  it('supports custom weekly intervals', () => {
    const rule: RecurrenceRule = { unit: 'week', interval: 2 }
    expect(nextOccurrence(iso('2026-09-01T18:00:00+08:00'), rule, new Date('2026-09-12T00:00:00+08:00')))
      .toBe(iso('2026-09-15T18:00:00+08:00'))
  })

  it('retains a month-end anchor through short months', () => {
    const rule = createRecurrenceRule('month', 1, iso('2026-01-31T18:00:00+08:00'))
    const february = nextOccurrence(iso('2026-01-31T18:00:00+08:00'), rule, new Date('2026-02-01T00:00:00+08:00'))
    expect(february).toBe(iso('2026-02-28T18:00:00+08:00'))
    expect(nextOccurrence(february, rule, new Date('2026-03-01T00:00:00+08:00')))
      .toBe(iso('2026-03-31T18:00:00+08:00'))
  })

  it('restores leap day when the calendar permits it', () => {
    const rule = createRecurrenceRule('year', 1, iso('2024-02-29T08:30:00+08:00'))
    expect(nextOccurrence(iso('2027-02-28T08:30:00+08:00'), rule, new Date('2027-03-01T00:00:00+08:00')))
      .toBe(iso('2028-02-29T08:30:00+08:00'))
  })
})

describe('recurring task lifecycle', () => {
  const recurringTask: Task = {
    id: 'task-one',
    title: '提交周报',
    description: '整理本周进展',
    completed: false,
    createdAt: iso('2026-09-01T08:00:00+08:00'),
    updatedAt: iso('2026-09-01T08:00:00+08:00'),
    dueAt: iso('2026-09-11T18:00:00+08:00'),
    reminderAt: iso('2026-09-11T17:30:00+08:00'),
    priority: 2,
    projectId: 'work',
    labelIds: ['focus'],
    recurrence: { unit: 'week', interval: 1 },
  }

  it('creates one future instance and preserves reminder offset', () => {
    const next = createNextTaskOccurrence(recurringTask, new Date('2026-09-12T12:00:00+08:00'), 'task-two')
    expect(next).toMatchObject({
      id: 'task-two',
      seriesId: 'task-one',
      previousOccurrenceId: 'task-one',
      completed: false,
      dueAt: iso('2026-09-18T18:00:00+08:00'),
      reminderAt: iso('2026-09-18T17:30:00+08:00'),
    })
    expect(next?.remindedAt).toBeUndefined()
  })

  it('describes built-in and custom rules', () => {
    expect(describeRecurrence({ unit: 'weekday', interval: 1 })).toBe('每个工作日')
    expect(describeRecurrence({ unit: 'month', interval: 3 })).toBe('每 3 个月')
  })
})
