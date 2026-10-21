import { describe, expect, it } from 'vitest'
import type { AppData, Task } from '../types'
import { getDueReminders } from './reminders'

const baseTask: Task = {
  id: 'one',
  title: '提醒测试',
  description: '',
  completed: false,
  createdAt: '2026-09-11T08:00:00Z',
  updatedAt: '2026-09-11T08:00:00Z',
  reminderAt: '2026-09-11T09:00:00Z',
  priority: 4,
  projectId: 'inbox',
  labelIds: [],
}

function data(tasks: Task[]): AppData {
  return { version: 1, tasks, projects: [], labels: [] }
}

describe('due reminders', () => {
  it('returns uncompleted reminders after their scheduled time', () => {
    expect(getDueReminders(data([baseTask]), new Date('2026-09-11T09:01:00Z'))).toHaveLength(1)
  })

  it('ignores completed and already delivered reminders', () => {
    expect(
      getDueReminders(
        data([
          { ...baseTask, id: 'done', completed: true },
          { ...baseTask, id: 'sent', remindedAt: '2026-09-11T09:00:01Z' },
        ]),
        new Date('2026-09-11T09:01:00Z'),
      ),
    ).toHaveLength(0)
  })
})
