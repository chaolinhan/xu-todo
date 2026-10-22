import type { ActivityEntry, AppData, Label, Project, RecurrenceRule, SavedFilter, Task } from '../types'

import { activityLabels } from './activity'

interface BackupEnvelope {
  format: 'xiaoxu-backup'
  exportedAt: string
  data: AppData
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isString(value)
}

function isOptionalIntegerInRange(value: unknown, minimum: number, maximum: number): boolean {
  return value === undefined || (Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum)
}

function isRecurrenceRule(value: unknown): value is RecurrenceRule {
  if (!value || typeof value !== 'object') return false
  const rule = value as Record<string, unknown>
  return (
    ['day', 'weekday', 'week', 'month', 'year'].includes(rule.unit as string) &&
    Number.isInteger(rule.interval) &&
    (rule.interval as number) >= 1 &&
    (rule.interval as number) <= 365 &&
    isOptionalIntegerInRange(rule.anchorDay, 1, 31) &&
    isOptionalIntegerInRange(rule.anchorMonth, 0, 11)
  )
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false
  const project = value as Record<string, unknown>
  return isString(project.id) && isString(project.name) && isString(project.color) && isString(project.createdAt)
}

function isLabel(value: unknown): value is Label {
  if (!value || typeof value !== 'object') return false
  const label = value as Record<string, unknown>
  return isString(label.id) && isString(label.name) && isString(label.color) && isString(label.createdAt)
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false
  const task = value as Record<string, unknown>
  return (
    isString(task.id) &&
    isString(task.title) &&
    isString(task.description) &&
    typeof task.completed === 'boolean' &&
    isString(task.createdAt) &&
    isString(task.updatedAt) &&
    isOptionalString(task.completedAt) &&
    isOptionalString(task.dueAt) &&
    isOptionalString(task.reminderAt) &&
    isOptionalString(task.remindedAt) &&
    (task.recurrence === undefined || isRecurrenceRule(task.recurrence)) &&
    isOptionalString(task.seriesId) &&
    isOptionalString(task.previousOccurrenceId) &&
    [1, 2, 3, 4].includes(task.priority as number) &&
    isString(task.projectId) &&
    isOptionalString(task.sectionId) &&
    Array.isArray(task.labelIds) &&
    task.labelIds.every(isString)
  )
}

function isSavedFilter(value:unknown): value is SavedFilter {
  if (!isLabel(value)) return false
  const filter=value as unknown as Record<string,unknown>
  return isString(filter.query) && filter.query.length<=500
}
function isActivity(value:unknown): value is ActivityEntry {
  if (!value || typeof value!=='object') return false
  const entry=value as Record<string,unknown>
  return isString(entry.id) && isString(entry.action) && Object.hasOwn(activityLabels,entry.action) && isString(entry.title) && isString(entry.at) && Number.isFinite(new Date(entry.at).getTime()) && ['taskId','projectId','projectName','detail'].every(key=>isOptionalString(entry[key]))
}
function isSection(value:unknown):boolean {
  if(!value||typeof value!=='object')return false
  const section=value as Record<string,unknown>
  return ['id','name','projectId','createdAt'].every(k=>isString(section[k]))
}
function isTaskViews(value:unknown):boolean {
  if(!value||typeof value!=='object'||Array.isArray(value))return false
  return Object.entries(value).every(([key,option])=>{
    if(!key||!option||typeof option!=='object')return false
    const item=option as Record<string,unknown>
    return ['list','board'].includes(item.layout as string)&&['section','date','priority','project','label','none'].includes(item.groupBy as string)
  })
}
function isPreferences(value:unknown):boolean {
  if (!value || typeof value!=='object') return false
  const preferences=value as Record<string,unknown>
  return (preferences.favoriteViews===undefined||(Array.isArray(preferences.favoriteViews)&&preferences.favoriteViews.every(key=>typeof key==='string'&&/^(project|label|filter):.+$/.test(key))&&new Set(preferences.favoriteViews).size===preferences.favoriteViews.length)) && typeof preferences.showCompleted==='boolean' && typeof preferences.compact==='boolean' && ['date','priority'].includes(preferences.sortMode as string) && (preferences.previewMode === undefined || ['day','week','month'].includes(preferences.previewMode as string)) && (preferences.taskViews===undefined||isTaskViews(preferences.taskViews))
}

export function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (
    data.version === 1 &&
    Array.isArray(data.tasks) &&
    data.tasks.every(isTask) &&
    Array.isArray(data.projects) &&
    data.projects.every(isProject) &&
    Array.isArray(data.labels) &&
    data.labels.every(isLabel) &&
    (data.sections===undefined || (Array.isArray(data.sections) && data.sections.every(isSection))) &&
    (data.filters===undefined || (Array.isArray(data.filters) && data.filters.every(isSavedFilter))) &&
    (data.activities===undefined || (Array.isArray(data.activities) && data.activities.every(isActivity))) &&
    (data.preferences===undefined || isPreferences(data.preferences))
  )
}

export function serializeBackup(data: AppData): string {
  const backup: BackupEnvelope = {
    format: 'xiaoxu-backup',
    exportedAt: new Date().toISOString(),
    data,
  }
  return JSON.stringify(backup, null, 2)
}

export function parseBackup(raw: string): AppData {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('备份文件不是有效的 JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('备份文件内容无效')
  }

  const envelope = parsed as Record<string, unknown>
  if (envelope.format !== 'xiaoxu-backup' || !isAppData(envelope.data)) {
    throw new Error('这是不支持的小序备份文件')
  }

  return envelope.data
}

export function downloadBackup(data: AppData): void {
  const blob = new Blob([serializeBackup(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  anchor.href = url
  anchor.download = `xiaoxu-backup-${date}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
