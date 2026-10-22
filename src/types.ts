export type Priority = 1 | 2 | 3 | 4

export type RecurrenceUnit = 'day' | 'weekday' | 'week' | 'month' | 'year'

export interface RecurrenceRule {
  unit: RecurrenceUnit
  interval: number
  anchorDay?: number
  anchorMonth?: number
}

export interface Task {
  id: string
  title: string
  description: string
  completed: boolean
  createdAt: string
  updatedAt: string
  completedAt?: string
  dueAt?: string
  reminderAt?: string
  remindedAt?: string
  recurrence?: RecurrenceRule
  seriesId?: string
  previousOccurrenceId?: string
  priority: Priority
  projectId: string
  sectionId?: string
  labelIds: string[]
}

export interface Project {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface ProjectSection {
  id: string
  name: string
  projectId: string
  createdAt: string
}

export interface Label {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface SavedFilter {
  id: string
  name: string
  query: string
  color: string
  createdAt: string
}

export type ActivityAction = 'task_created' | 'task_updated' | 'task_completed' | 'task_reopened' | 'task_deleted' | 'completion_undone' | 'label_created' | 'label_updated' | 'label_deleted' | 'filter_created' | 'filter_updated' | 'filter_deleted' | 'project_created' | 'backup_imported' | 'section_created' | 'section_updated' | 'section_deleted' | 'section_reordered' | 'task_moved'
export interface ActivityEntry {
  id: string
  action: ActivityAction
  title: string
  at: string
  taskId?: string
  projectId?: string
  projectName?: string
  detail?: string
}
export type PreviewMode = 'day' | 'week' | 'month'
export type GroupBy = 'section' | 'date' | 'priority' | 'project' | 'label' | 'none'
export interface TaskViewOptions { layout:'list' | 'board'; groupBy:GroupBy }
export interface ViewPreferences { showCompleted: boolean; compact: boolean; sortMode: 'date' | 'priority'; previewMode?: PreviewMode; favoriteViews?: ViewKey[]; taskViews?: Record<string,TaskViewOptions> }

export interface AppData {
  version: 1
  tasks: Task[]
  projects: Project[]
  labels: Label[]
  sections?: ProjectSection[]
  filters?: SavedFilter[]
  activities?: ActivityEntry[]
  preferences?: ViewPreferences
}

export type ViewKey =
  | 'inbox'
  | 'today'
  | 'upcoming'
  | 'all'
  | 'organize'
  | 'activity'
  | 'completed'
  | `filter:${string}`
  | `project:${string}`
  | `label:${string}`

export interface TaskDraft {
  title: string
  description: string
  dueAt?: string
  reminderAt?: string
  recurrence?: RecurrenceRule
  priority: Priority
  projectId: string
  sectionId?: string
  labelIds: string[]
}

export type GroupTarget =
  | {kind:'section';projectId:string;sectionId?:string}
  | {kind:'project';projectId:string}
  | {kind:'priority';priority:Priority}
  | {kind:'label';labelId?:string}
  | {kind:'date';day:'today'|'tomorrow'|'none'}

export interface TaskGroup {
  key: string
  title: string
  tasks: Task[]
  target?: GroupTarget
}
