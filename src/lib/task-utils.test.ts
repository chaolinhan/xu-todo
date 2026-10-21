import { describe, expect, it } from 'vitest'
import type { Task } from '../types'
import { filterTasks, groupTasks, isToday, isUpcoming, taskMatchesView } from './task-utils'

const now = new Date('2026-09-11T10:00:00+08:00')

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 'task',
    title: overrides.title ?? '测试任务',
    description: overrides.description ?? '',
    completed: overrides.completed ?? false,
    createdAt: '2026-09-10T10:00:00+08:00',
    updatedAt: '2026-09-10T10:00:00+08:00',
    priority: overrides.priority ?? 4,
    projectId: overrides.projectId ?? 'inbox',
    labelIds: overrides.labelIds ?? [],
    dueAt: overrides.dueAt,
  }
}

describe('date helpers', () => {
  it('recognizes local today and the next seven days', () => {
    expect(isToday('2026-09-11T22:00:00+08:00', now)).toBe(true)
    expect(isToday('2026-09-12T00:00:00+08:00', now)).toBe(false)
    expect(isUpcoming('2026-09-17T18:00:00+08:00', now)).toBe(true)
    expect(isUpcoming('2026-09-19T18:00:00+08:00', now)).toBe(false)
  })
})

describe('view filters', () => {
  it('includes overdue tasks in today', () => {
    const overdue = task({ dueAt: '2026-09-10T09:00:00+08:00' })
    expect(taskMatchesView(overdue, 'today', now)).toBe(true)
  })

  it('matches project, label and text search', () => {
    const tasks = [
      task({ id: 'one', title: '完成设计稿', projectId: 'work', labelIds: ['focus'] }),
      task({ id: 'two', title: '购买咖啡', projectId: 'personal' }),
    ]
    expect(filterTasks(tasks, 'project:work', '设计', now).map((item) => item.id)).toEqual(['one'])
    expect(filterTasks(tasks, 'label:focus', '', now).map((item) => item.id)).toEqual(['one'])
  })
})

describe('grouping', () => {
  it('places each task into only one group', () => {
    const tasks = [
      task({ id: 'late', dueAt: '2026-09-10T09:00:00+08:00' }),
      task({ id: 'today', dueAt: '2026-09-11T18:00:00+08:00' }),
      task({ id: 'anytime' }),
      task({ id: 'done', completed: true }),
    ]
    const groups = groupTasks(tasks, now)
    expect(groups.map((group) => group.key)).toEqual(['overdue', 'today', 'anytime', 'completed'])
    expect(groups.flatMap((group) => group.tasks)).toHaveLength(4)
  })
})
