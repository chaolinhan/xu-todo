import type { AppData, Priority, Task } from '../types'
import { createId } from './id'

function atLocalTime(dayOffset: number, hour: number, minute = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

function starterTask(
  title: string,
  options: Partial<Pick<Task, 'description' | 'dueAt' | 'reminderAt' | 'recurrence' | 'priority' | 'projectId' | 'labelIds'>>,
): Task {
  const now = new Date().toISOString()
  return {
    id: createId('task'),
    title,
    description: options.description ?? '',
    completed: false,
    createdAt: now,
    updatedAt: now,
    priority: (options.priority ?? 4) as Priority,
    projectId: options.projectId ?? 'inbox',
    labelIds: options.labelIds ?? [],
    dueAt: options.dueAt,
    reminderAt: options.reminderAt,
    recurrence: options.recurrence,
  }
}

export function createInitialData(): AppData {
  const createdAt = new Date().toISOString()
  const projects = [
    { id: 'personal', name: '个人', color: '#d56b52', createdAt },
    { id: 'work', name: '工作', color: '#4c7186', createdAt },
  ]
  const labels = [
    { id: 'focus', name: '专注', color: '#7d8f69', createdAt },
    { id: 'quick', name: '五分钟', color: '#d89a45', createdAt },
  ]

  return {
    version: 1,
    projects,
    labels,
    tasks: [
      starterTask('写下今天最重要的一件事', {
        description: '点击任务可以修改日期、项目、标签和提醒。',
        dueAt: atLocalTime(0, 20),
        reminderAt: atLocalTime(0, 20),
        priority: 1,
        projectId: 'personal',
        labelIds: ['focus'],
      }),
      starterTask('试试给任务添加一个本地提醒', {
        description: '网页版本会在应用打开时检查提醒；桌面版将由操作系统负责。',
        dueAt: atLocalTime(1, 10),
        reminderAt: atLocalTime(1, 9, 45),
        priority: 2,
        projectId: 'inbox',
        labelIds: ['quick'],
      }),
      starterTask('整理下周计划', {
        dueAt: atLocalTime(3, 18),
        reminderAt: atLocalTime(3, 18),
        recurrence: { unit: 'week', interval: 1 },
        priority: 3,
        projectId: 'work',
        labelIds: ['focus'],
      }),
    ],
  }
}
