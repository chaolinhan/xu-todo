import type { ActivityAction, ActivityEntry, AppData, Label, Task } from '../types'
import { createId } from './id'
import { renameLabelReferences } from './filters'

export const activityLabels: Record<ActivityAction, string> = {
  section_created:'创建了版块', section_updated:'更新了版块', section_deleted:'删除了版块', section_reordered:'调整了版块顺序', task_moved:'移动了任务',
  task_created:'添加了任务', task_updated:'更新了任务', task_completed:'完成了任务', task_reopened:'恢复了任务', task_deleted:'删除了任务', completion_undone:'撤销了完成',
  label_created:'创建了标签', label_updated:'更新了标签', label_deleted:'删除了标签', filter_created:'创建了过滤器', filter_updated:'更新了过滤器', filter_deleted:'删除了过滤器', project_created:'创建了项目', backup_imported:'导入了备份',
}
export function recordActivity(data: AppData, action: ActivityAction, title: string, task?: Task, detail?: string): AppData {
  const entry: ActivityEntry = { id:createId('event'), action, title, at:new Date().toISOString(), detail,
    ...(task ? { taskId:task.id, projectId:task.projectId, projectName:task.projectId === 'inbox' ? '收件箱' : data.projects.find(p => p.id === task.projectId)?.name ?? '已删除的项目' } : {}) }
  return { ...data, activities:[entry,...(data.activities ?? [])] }
}
export function updateLabel(data: AppData, label: Label): AppData {
  const before = data.labels.find(l => l.id === label.id)
  if (!before) return data
  return { ...data, labels:data.labels.map(l => l.id === label.id ? label : l), filters:data.filters?.map(f => ({...f,query:renameLabelReferences(f.query,before.name,label.name)})) }
}
export function removeLabel(data: AppData, id: string): AppData {
  return { ...data, labels:data.labels.filter(l => l.id !== id), tasks:data.tasks.map(t => ({...t,labelIds:t.labelIds.filter(l => l !== id)})) }
}
