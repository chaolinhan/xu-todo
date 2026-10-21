import type { AppData, GroupBy, GroupTarget, ProjectSection, Task, TaskDraft, TaskGroup, TaskViewOptions, ViewKey } from '../types'
import { addCalendarDays } from './calendar'
import { createRecurrenceRule } from './recurrence'
import { isToday, startOfLocalDay } from './task-utils'

export function defaultTaskView(view:ViewKey): TaskViewOptions {
  return {layout:'list',groupBy:view==='inbox'||view.startsWith('project:')?'section':'date'}
}
export function validSectionId(data:AppData, projectId:string, sectionId?:string):string|undefined {
  return data.sections?.some(s=>s.id===sectionId&&s.projectId===projectId)?sectionId:undefined
}
export function groupTasksForView(data:AppData,tasks:Task[],by:GroupBy,view:ViewKey,now=new Date(),includeEmpty=false):TaskGroup[] {
  const make=(key:string,title:string,match:(t:Task)=>boolean,target?:GroupTarget):TaskGroup=>({key,title,tasks:tasks.filter(match),target})
  let groups:TaskGroup[]=[]
  if(by==='none')return [{key:'all',title:'全部任务',tasks}]
  if(by==='priority')groups=([1,2,3,4] as const).map(priority=>make(`priority:${priority}`,`优先级 ${priority}`,t=>t.priority===priority,{kind:'priority',priority}))
  if(by==='project')groups=[make('project:inbox','收件箱',t=>t.projectId==='inbox',{kind:'project',projectId:'inbox'}),...data.projects.map(p=>make(`project:${p.id}`,p.name,t=>t.projectId===p.id,{kind:'project',projectId:p.id}))]
  if(by==='project'&&tasks.some(t=>t.projectId!=='inbox'&&!data.projects.some(p=>p.id===t.projectId)))groups.push(make('project:missing','项目已移除',t=>t.projectId!=='inbox'&&!data.projects.some(p=>p.id===t.projectId)))
  if(by==='label')groups=[...data.labels.map(l=>make(`label:${l.id}`,l.name,t=>t.labelIds.includes(l.id),{kind:'label',labelId:l.id})),make('label:none','无标签',t=>!t.labelIds.some(id=>data.labels.some(l=>l.id===id)),{kind:'label'})]
  if(by==='section') {
    const projectId=view==='inbox'?'inbox':view.startsWith('project:')?view.slice(8):undefined
    const sections=(data.sections??[]).filter(s=>!projectId||s.projectId===projectId)
    groups=[make('section:none','未分组',t=>!validSectionId(data,t.projectId,t.sectionId),projectId?{kind:'section',projectId}:undefined),...sections.map(s=>make(`section:${s.id}`,projectId?s.name:`${data.projects.find(p=>p.id===s.projectId)?.name??'收件箱'} · ${s.name}`,t=>t.sectionId===s.id&&t.projectId===s.projectId,{kind:'section',projectId:s.projectId,sectionId:s.id}))]
    return groups
  }
  if(by==='date') {
    const today=startOfLocalDay(now),tomorrow=addCalendarDays(now,1)
    groups=[make('overdue','已逾期',t=>!t.completed&&Boolean(t.dueAt&&new Date(t.dueAt)<today)),make('today','今天',t=>!t.completed&&isToday(t.dueAt,now),{kind:'date',day:'today'}),make('tomorrow','明天',t=>!t.completed&&isToday(t.dueAt,tomorrow),{kind:'date',day:'tomorrow'}),make('later','接下来',t=>!t.completed&&Boolean(t.dueAt&&new Date(t.dueAt)>=addCalendarDays(now,2))),make('anytime','无日期',t=>!t.completed&&(!t.dueAt||!Number.isFinite(new Date(t.dueAt).getTime())),{kind:'date',day:'none'}),make('completed','已完成',t=>t.completed)]
  }
  return groups.filter(g=>g.tasks.length>0||(includeEmpty&&g.target))
}

export function moveTaskToGroup(data:AppData,task:Task,target:GroupTarget,source?:GroupTarget,now=new Date()):Task {
  let next={...task,labelIds:[...task.labelIds]}
  if(target.kind==='section') {
    if(target.projectId!=='inbox'&&!data.projects.some(p=>p.id===target.projectId))throw new Error('目标项目已不存在')
    if(target.sectionId&&!validSectionId(data,target.projectId,target.sectionId))throw new Error('目标版块已不存在')
    next={...next,projectId:target.projectId,sectionId:target.sectionId}
  }
  if(target.kind==='project') {
    if(target.projectId!=='inbox'&&!data.projects.some(p=>p.id===target.projectId))throw new Error('目标项目已不存在')
    next={...next,projectId:target.projectId,sectionId:target.projectId===task.projectId?task.sectionId:undefined}
  }
  if(target.kind==='priority')next.priority=target.priority
  if(target.kind==='label') {
    if(target.labelId&&!data.labels.some(l=>l.id===target.labelId))throw new Error('目标标签已不存在')
    next.labelIds=target.labelId?[...new Set([...next.labelIds.filter(id=>!(source?.kind==='label'&&id===source.labelId)),target.labelId])]:[]
  }
  if(target.kind==='date') {
    if(target.day==='none'&&task.recurrence)throw new Error('重复任务需要日期，请先在任务详情中取消重复')
    const due=task.dueAt?new Date(task.dueAt):new Date(now.getFullYear(),now.getMonth(),now.getDate(),9)
    const targetDay=addCalendarDays(now,target.day==='tomorrow'?1:0)
    targetDay.setHours(due.getHours(),due.getMinutes(),due.getSeconds(),due.getMilliseconds())
    next.dueAt=target.day==='none'?undefined:targetDay.toISOString()
    if(task.reminderAt&&task.dueAt) {
      const offset=new Date(task.dueAt).getTime()-new Date(task.reminderAt).getTime()
      next.reminderAt=next.dueAt?new Date(new Date(next.dueAt).getTime()-offset).toISOString():undefined
    }
    // No new reminder is enabled when moving a task whose reminder was off.
    if(next.dueAt&&task.recurrence)next.recurrence=createRecurrenceRule(task.recurrence.unit,task.recurrence.interval,next.dueAt)
    if(next.reminderAt!==task.reminderAt)next.remindedAt=undefined
  }
  return {...next,updatedAt:now.toISOString()}
}

export function defaultsForGroup(data:AppData,target?:GroupTarget,now=new Date()):Partial<TaskDraft> {
  const base:Task={id:'draft',title:'',description:'',completed:false,priority:4,projectId:'inbox',labelIds:[],createdAt:now.toISOString(),updatedAt:now.toISOString()}
  if(!target)return {}
  const moved=moveTaskToGroup(data,base,target,undefined,now)
  if(target.kind==='date')return {dueAt:moved.dueAt,reminderAt:moved.dueAt}
  if(target.kind==='priority')return {priority:moved.priority}
  if(target.kind==='label')return {labelIds:moved.labelIds}
  return {projectId:moved.projectId,sectionId:moved.sectionId}
}
export function removeSection(data:AppData,id:string):AppData {
  return {...data,sections:data.sections?.filter(s=>s.id!==id),tasks:data.tasks.map(t=>t.sectionId===id?{...t,sectionId:undefined}:t)}
}
export function reorderSection(data:AppData,section:ProjectSection,direction:-1|1):AppData {
  const sections=[...(data.sections??[])],same=sections.filter(s=>s.projectId===section.projectId),index=same.findIndex(s=>s.id===section.id),other=same[index+direction]
  if(!other)return data
  const a=sections.findIndex(s=>s.id===section.id),b=sections.findIndex(s=>s.id===other.id)
  ;[sections[a],sections[b]]=[sections[b],sections[a]]
  return {...data,sections}
}
