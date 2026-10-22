import type { AppData, Priority, Task } from '../types'
import { createId } from './id'
import { recordActivity } from './activity'
import { createNextTaskOccurrence, createRecurrenceRule } from './recurrence'

export type BulkAction =
  | {kind:'priority'; value:Priority}
  | {kind:'project'; value:string}
  | {kind:'label'; value:string}
  | {kind:'date'; value?:string}
  | {kind:'completed'; value:boolean}
export interface BulkUndo { before:Task[]; after:Task[]; added:Task[] }

export function applyBulkAction(data:AppData, ids:ReadonlySet<string>, action:BulkAction, now=new Date(), newId=()=>createId('task')) {
  const selected=data.tasks.filter(task=>ids.has(task.id))
  if (!selected.length) throw new Error('请先选择任务')
  if(action.kind==='project' && action.value!=='inbox' && !data.projects.some(p=>p.id===action.value)) throw new Error('目标项目不存在')
  if(action.kind==='label' && !data.labels.some(l=>l.id===action.value)) throw new Error('标签不存在')
  if(action.kind==='date') {
    if(action.value && !Number.isFinite(new Date(action.value).getTime())) throw new Error('日期无效')
    if(!action.value && selected.some(t=>t.recurrence)) throw new Error('所选任务包含重复任务，请先取消重复再清除日期')
  }
  const stamp=now.toISOString(), before:Task[]=[], after:Task[]=[], added:Task[]=[]
  for(const task of selected) {
    let updated={...task}
    if(action.kind==='priority') updated.priority=action.value
    if(action.kind==='project' && task.projectId!==action.value) {updated.projectId=action.value;updated.sectionId=undefined}
    if(action.kind==='label') updated.labelIds=[...new Set([...task.labelIds,action.value])]
    if(action.kind==='date') {
      updated.dueAt=action.value
      const offset=task.reminderAt&&task.dueAt?new Date(task.dueAt).getTime()-new Date(task.reminderAt).getTime():0
      updated.reminderAt=task.reminderAt&&action.value?new Date(new Date(action.value).getTime()-offset).toISOString():undefined
      updated.remindedAt=updated.reminderAt===task.reminderAt?task.remindedAt:undefined
      if(task.recurrence&&action.value) updated.recurrence=createRecurrenceRule(task.recurrence.unit,task.recurrence.interval,action.value)
    }
    if(action.kind==='completed' && task.completed!==action.value) {
      updated.completed=action.value
      updated.completedAt=action.value?stamp:undefined
      if(action.value && !data.tasks.some(t=>t.previousOccurrenceId===task.id)) {
        const next=createNextTaskOccurrence(task,now,newId())
        if(next) {added.push(next);updated.seriesId=task.seriesId??task.id}
      }
    }
    if(JSON.stringify(updated)===JSON.stringify(task)) continue
    updated.updatedAt=stamp
    before.push(task); after.push(updated)
  }
  const changes=new Map(after.map(task=>[task.id,task]))
  let result={...data,tasks:[...added,...data.tasks.map(task=>changes.get(task.id)??task)]}
  for(const task of after) result=recordActivity(result,action.kind==='completed'?(action.value?'task_completed':'task_reopened'):action.kind==='project'?'task_moved':'task_updated',task.title,task,'批量操作')
  return {data:result,undo:{before,after,added} satisfies BulkUndo,count:after.length}
}

export function undoBulkAction(data:AppData, patch:BulkUndo, now=new Date()):AppData {
  for(const expected of [...patch.after,...patch.added]) {
    const current=data.tasks.find(t=>t.id===expected.id)
    if(JSON.stringify(current)!==JSON.stringify(expected)) throw new Error('这些任务已有新的修改，无法撤销本次批量操作')
  }
  // A newly completed successor may have created another generation. Never orphan it.
  if(data.tasks.some(t=>patch.added.some(added=>t.previousOccurrenceId===added.id))) throw new Error('后续重复任务已有新记录，无法撤销')
  const originals=new Map(patch.before.map(task=>[task.id,task])), addedIds=new Set(patch.added.map(task=>task.id))
  let result={...data,tasks:data.tasks.filter(t=>!addedIds.has(t.id)).map(task=>originals.has(task.id)?{...originals.get(task.id)!,updatedAt:now.toISOString()}:task)}
  if(!patch.before.length)for(const task of patch.added)result=recordActivity(result,'task_deleted',task.title,task,'撤销多行录入')
  for(const task of patch.before) result=recordActivity(result,'task_updated',task.title,task,'撤销批量操作')
  return result
}
