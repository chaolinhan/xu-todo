import type { AppData, LocalTemplate, Task, TaskDraft, TemplateTask } from '../types'
import { createId } from './id'
import { createRecurrenceRule } from './recurrence'
import { resetSubtasks, validSubtasks } from './subtasks'
import { recordActivity } from './activity'

const MAX_TASKS=200
const string=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max
function validRule(value:unknown) {
  if(!value||typeof value!=='object')return false
  const r=value as Record<string,unknown>
  return ['day','weekday','week','month','year'].includes(r.unit as string)&&Number.isInteger(r.interval)&&Number(r.interval)>=1&&Number(r.interval)<=365&&(r.anchorDay===undefined||(Number.isInteger(r.anchorDay)&&Number(r.anchorDay)>=1&&Number(r.anchorDay)<=31))&&(r.anchorMonth===undefined||(Number.isInteger(r.anchorMonth)&&Number(r.anchorMonth)>=0&&Number(r.anchorMonth)<=11))
}
function validTask(value:unknown):value is TemplateTask {
  if(!value||typeof value!=='object')return false
  const t=value as TemplateTask
  return string(t.title,240)&&Boolean(t.title.trim())&&string(t.description,1000)&&[1,2,3,4].includes(t.priority)&&Array.isArray(t.labels)&&t.labels.length<=100&&t.labels.every(l=>l&&string(l.name,80)&&Boolean(l.name.trim())&&string(l.color,50))&&(t.sectionId===undefined||(string(t.sectionId,100)&&Boolean(t.sectionId)))&&(t.subtasks===undefined||validSubtasks(t.subtasks))&&(!t.schedule||(typeof t.schedule==='object'&&Number.isInteger(t.schedule.dayOffset)&&t.schedule.dayOffset>=0&&t.schedule.dayOffset<=36500&&string(t.schedule.time,5)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t.schedule.time)))&&(t.reminderOffsetMinutes===undefined||(Boolean(t.schedule)&&Number.isFinite(t.reminderOffsetMinutes)&&Math.abs(t.reminderOffsetMinutes)<=5256000))&&(t.recurrence===undefined||(Boolean(t.schedule)&&validRule(t.recurrence)))
}
export function isLocalTemplate(value:unknown):value is LocalTemplate {
  if(!value||typeof value!=='object')return false
  const t=value as LocalTemplate
  if(!string(t.id,100)||!t.id||!string(t.name,100)||!t.name.trim()||!string(t.description,1000)||!string(t.color,50)||!string(t.createdAt,100)||!Number.isFinite(new Date(t.createdAt).getTime())||!['task','project'].includes(t.kind)||!Array.isArray(t.sections)||t.sections.length>100||!Array.isArray(t.tasks)||!t.tasks.length||t.tasks.length>MAX_TASKS||!t.tasks.every(validTask))return false
  if(!t.sections.every(s=>s&&string(s.id,100)&&s.id&&string(s.name,80)&&s.name.trim()))return false
  const ids=new Set(t.sections.map(s=>s.id))
  return ids.size===t.sections.length&&new Set(t.sections.map(s=>s.name)).size===t.sections.length&&t.tasks.every(task=>!task.sectionId||ids.has(task.sectionId))&&(t.kind!=='task'||(t.tasks.length===1&&t.sections.length===0&&!t.tasks[0].sectionId))
}
const calendarDay=(d:Date)=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000
export function captureTemplate(data:AppData, source:{task:TaskDraft}|{projectId:string}, now=new Date()):LocalTemplate {
  const project='projectId' in source?data.projects.find(p=>p.id===source.projectId):undefined
  if('projectId' in source&&source.projectId!=='inbox'&&!project)throw new Error('项目不存在')
  const tasks='task' in source?[source.task]:data.tasks.filter(t=>t.projectId===source.projectId&&!t.completed)
  if(!tasks.length)throw new Error('没有可保存的未完成任务')
  if(tasks.length>MAX_TASKS)throw new Error('一个模板最多200项任务，请拆分后保存')
  const dates=tasks.flatMap(t=>t.dueAt?[new Date(t.dueAt)]:[]).filter(d=>Number.isFinite(d.getTime()))
  const base=dates.length?Math.min(...dates.map(calendarDay)):calendarDay(now)
  const sections='projectId' in source?(data.sections??[]).filter(s=>s.projectId===source.projectId).map(({id,name})=>({id,name})):[]
  const template:LocalTemplate={id:createId('template'),name:'task' in source?source.task.title.slice(0,100):project?.name??'收件箱清单',description:'',color:project?.color??'#d64b3a',kind:'task' in source?'task':'project',createdAt:now.toISOString(),sections,tasks:tasks.map(t=>{
    const due=t.dueAt?new Date(t.dueAt):undefined
    return {title:t.title,description:t.description,priority:t.priority,labels:data.labels.filter(l=>t.labelIds.includes(l.id)).map(({name,color})=>({name,color})),sectionId:sections.some(s=>s.id===t.sectionId)?t.sectionId:undefined,subtasks:resetSubtasks(t.subtasks),schedule:due?{dayOffset:calendarDay(due)-base,time:`${String(due.getHours()).padStart(2,'0')}:${String(due.getMinutes()).padStart(2,'0')}`}:undefined,reminderOffsetMinutes:t.reminderAt&&due?(due.getTime()-new Date(t.reminderAt).getTime())/60000:undefined,recurrence:t.recurrence?{...t.recurrence}:undefined}
  })}
  if(!isLocalTemplate(template))throw new Error('任务内容超出模板支持范围，请检查日期、名称或数量')
  return template
}
export function templateDue(task:TemplateTask,start:string):string|undefined {
  if(!task.schedule)return undefined
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start))throw new Error('请选择有效的起始日期')
  const [year,month,day]=start.split('-').map(Number)
  const date=new Date(year,month-1,day,12)
  if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day)throw new Error('起始日期无效')
  date.setDate(date.getDate()+task.schedule.dayOffset)
  const [hour,minute]=task.schedule.time.split(':').map(Number)
  date.setHours(hour,minute,0,0)
  if(!Number.isFinite(date.getTime()))throw new Error('模板日期超出范围')
  return date.toISOString()
}
export function applyTemplate(data:AppData, template:LocalTemplate, options:{start:string;projectId:string;newProjectName?:string}, now=new Date(), id=(kind:string)=>createId(kind)) {
  if(!isLocalTemplate(template))throw new Error('模板内容无效')
  const timestamp=now.toISOString()
  const name=options.newProjectName?.trim()
  if(name&&(name.length>80||data.projects.some(p=>p.name===name)))throw new Error('新项目名称过长或已存在')
  const projectId=name?id('project'):options.projectId
  if(!name&&projectId!=='inbox'&&!data.projects.some(p=>p.id===projectId))throw new Error('目标项目不存在')
  const projects=name?[...data.projects,{id:projectId,name,color:template.color,createdAt:timestamp}]:data.projects
  const sections=[...(data.sections??[])], labels=[...data.labels]
  const sectionMap=new Map(template.sections.map(section=>{
    let target=sections.find(s=>s.projectId===projectId&&s.name===section.name)
    if(!target){target={id:id('section'),name:section.name,projectId,createdAt:timestamp};sections.push(target)}
    return [section.id,target.id]
  }))
  const tasks:Task[]=template.tasks.map(task=>{
    const dueAt=templateDue(task,options.start)
    const labelIds=task.labels.map(label=>{
      let target=labels.find(l=>l.name===label.name)
      if(!target){target={...label,id:id('label'),createdAt:timestamp};labels.push(target)}
      return target.id
    })
    return {id:id('task'),title:task.title,description:task.description,completed:false,createdAt:timestamp,updatedAt:timestamp,priority:task.priority,projectId,sectionId:task.sectionId?sectionMap.get(task.sectionId):undefined,labelIds:[...new Set(labelIds)],subtasks:task.subtasks?.map(step=>({id:id('step'),title:step.title,completed:false})),dueAt,reminderAt:dueAt&&task.reminderOffsetMinutes!==undefined?new Date(new Date(dueAt).getTime()-task.reminderOffsetMinutes*60000).toISOString():undefined,recurrence:task.recurrence&&dueAt?createRecurrenceRule(task.recurrence.unit,task.recurrence.interval,dueAt):undefined}
  })
  let next:AppData={...data,projects,sections,labels,tasks:[...tasks,...data.tasks]}
  for(const label of labels.filter(l=>!data.labels.some(old=>old.id===l.id)))next=recordActivity(next,'label_created',label.name,undefined,'从模板创建')
  for(const section of sections.filter(s=>!data.sections?.some(old=>old.id===s.id)))next=recordActivity(next,'section_created',section.name,undefined,'从模板创建')
  if(name)next=recordActivity(next,'project_created',name,undefined,'从模板创建')
  for(const task of tasks)next=recordActivity(next,'task_created',task.title,task,`使用模板：${template.name}`)
  return {data:next,projectId,count:tasks.length}
}
export function serializeTemplate(template:LocalTemplate) {
  if(!isLocalTemplate(template))throw new Error('模板无效')
  return JSON.stringify({format:'xiaoxu-template',version:1,template},null,2)
}
export function parseTemplate(raw:string):LocalTemplate {
  if(raw.length>5*1024*1024)throw new Error('模板文件不能超过5MB')
  let parsed:unknown
  try{parsed=JSON.parse(raw)}catch{throw new Error('模板文件不是有效的JSON')}
  const value=parsed as {format?:unknown;version?:unknown;template?:unknown}|null
  if(!value||value.format!=='xiaoxu-template'||value.version!==1||!isLocalTemplate(value.template))throw new Error('模板格式无效或内容超出支持范围')
  return {...value.template,id:createId('template'),createdAt:new Date().toISOString()}
}
export function downloadTemplate(template:LocalTemplate) {
  const url=URL.createObjectURL(new Blob([serializeTemplate(template)],{type:'application/json'}))
  const link=document.createElement('a');link.href=url;link.download=`xiaoxu-template-${template.id.replace(/[^a-z0-9_-]/gi,'')}.json`;link.click();URL.revokeObjectURL(url)
}
export const exampleTemplates:LocalTemplate[]=[{
 id:'example-review',name:'每周复盘',description:'留一点时间，看清进展，再安排下一步。',kind:'task',color:'#bd7355',createdAt:'2026-10-23T00:00:00Z',sections:[],tasks:[{title:'每周复盘',description:'记录这一周的进展与下一步。',priority:3,labels:[],subtasks:[{id:'review-1',title:'回顾完成的事情',completed:false},{id:'review-2',title:'记录卡点与收获',completed:false},{id:'review-3',title:'选出下周最重要的三件事',completed:false}],schedule:{dayOffset:0,time:'17:00'},recurrence:{unit:'week',interval:1}}]
},{id:'example-launch',name:'项目发布',description:'从准备、检查到发布，按三天组织一个小项目。',kind:'project',color:'#6d8593',createdAt:'2026-10-23T00:00:00Z',sections:[{id:'prepare',name:'准备'},{id:'launch',name:'发布'}],tasks:[{title:'准备发布内容',description:'',priority:2,labels:[],sectionId:'prepare',schedule:{dayOffset:0,time:'09:00'},subtasks:[{id:'launch-1',title:'确认范围与负责人',completed:false},{id:'launch-2',title:'整理素材和说明',completed:false}]},{title:'完成最终检查',description:'',priority:1,labels:[],sectionId:'prepare',schedule:{dayOffset:1,time:'14:00'}},{title:'发布并记录结果',description:'',priority:2,labels:[],sectionId:'launch',schedule:{dayOffset:2,time:'10:00'}}]}]
