import type { AppData, Task, TaskGroup, ViewKey } from '../types'

export function startOfLocalDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

export function endOfLocalDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

export function isToday(iso: string | undefined, now = new Date()): boolean {
  if (!iso) return false
  const value = new Date(iso)
  return value >= startOfLocalDay(now) && value <= endOfLocalDay(now)
}

export function isOverdue(task: Task, now = new Date()): boolean {
  return Boolean(!task.completed && task.dueAt && new Date(task.dueAt) < startOfLocalDay(now))
}

export function isUpcoming(iso: string | undefined, now = new Date(), days = 7): boolean {
  if (!iso) return false
  const value = new Date(iso)
  const afterToday = endOfLocalDay(now)
  const limit = endOfLocalDay(now)
  limit.setDate(limit.getDate() + days)
  return value > afterToday && value <= limit
}

export function taskMatchesView(task: Task, view: ViewKey, now = new Date()): boolean {
  if (view === 'all') return true
  if (view === 'completed') return task.completed
  if (view === 'inbox') return task.projectId === 'inbox'
  if (view === 'today') return isToday(task.dueAt, now) || isOverdue(task, now)
  if (view === 'upcoming') return isUpcoming(task.dueAt, now)
  if (view.startsWith('project:')) return task.projectId === view.slice('project:'.length)
  if (view.startsWith('label:')) return task.labelIds.includes(view.slice('label:'.length))
  return false
}

export function taskSearchText(task:Task):string {
  return `${task.title} ${task.description} ${(task.subtasks??[]).map(step=>step.title).join(' ')}`
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN')
}

export function filterTasks(tasks: Task[], view: ViewKey, query: string, now = new Date()): Task[] {
  const normalizedQuery = normalizeSearch(query)
  return tasks
    .filter((task) => taskMatchesView(task, view, now))
    .filter((task) => {
      if (!normalizedQuery) return true
      return taskSearchText(task).toLocaleLowerCase('zh-CN').includes(normalizedQuery)
    })
    .sort(compareTasks)
}

export function compareTasks(left: Task, right: Task): number {
  if (left.completed !== right.completed) return left.completed ? 1 : -1
  if (left.dueAt && right.dueAt) {
    const dateDelta = new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
    if (dateDelta !== 0) return dateDelta
  }
  if (left.dueAt !== right.dueAt) return left.dueAt ? -1 : 1
  if (left.priority !== right.priority) return left.priority - right.priority
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
}

export function groupTasks(tasks: Task[], now = new Date()): TaskGroup[] {
  const definitions: Array<{ key: string; title: string; matches: (task: Task) => boolean }> = [
    { key: 'overdue', title: '已逾期', matches: (task) => isOverdue(task, now) },
    { key: 'today', title: '今天', matches: (task) => !task.completed && isToday(task.dueAt, now) },
    { key: 'upcoming', title: '接下来', matches: (task) => !task.completed && Boolean(task.dueAt) },
    { key: 'anytime', title: '随时', matches: (task) => !task.completed && !task.dueAt },
    { key: 'completed', title: '已完成', matches: (task) => task.completed },
  ]

  const assigned = new Set<string>()
  return definitions
    .map(({ key, title, matches }) => {
      const grouped = tasks.filter((task) => !assigned.has(task.id) && matches(task))
      grouped.forEach((task) => assigned.add(task.id))
      return { key, title, tasks: grouped }
    })
    .filter((group) => group.tasks.length > 0)
}

export function countForView(data: AppData, view: ViewKey, now = new Date()): number {
  return data.tasks.filter((task) => (view === 'completed' || !task.completed) && taskMatchesView(task, view, now)).length
}

export function getViewTitle(data: AppData, view: ViewKey): string {
  if (view === 'inbox') return '收件箱'
  if (view === 'today') return '今天'
  if (view === 'upcoming') return '预览'
  if (view === 'all') return '全部任务'
  if (view === 'templates') return '模板库'
  if (view === 'organize') return '过滤器与标签'
  if (view === 'activity') return '活动日志'
  if (view === 'completed') return '已完成'
  if (view.startsWith('filter:')) return data.filters?.find(f => f.id === view.slice(7))?.name ?? '过滤器'
  if (view.startsWith('project:')) {
    return data.projects.find((project) => project.id === view.slice('project:'.length))?.name ?? '项目'
  }
  return data.labels.find((label) => label.id === view.slice('label:'.length))?.name ?? '标签'
}

export function toDateTimeLocal(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDateTimeLocal(value: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}
