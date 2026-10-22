import { describe, expect, it } from 'vitest'
import { applyTemplate, captureTemplate, exampleTemplates, isLocalTemplate, parseTemplate, serializeTemplate, templateDue } from './templates'
import { parseBackup, serializeBackup } from './backup'
import type { AppData, Task } from '../types'
const task:Task={id:'t',title:'发布',description:'说明',completed:false,createdAt:'2026-10-01',updatedAt:'2026-10-01',priority:2,projectId:'p',sectionId:'s',labelIds:['focus'],dueAt:new Date(2026,9,23,9).toISOString(),subtasks:[{id:'step',title:'检查',completed:true}]}
const data:AppData={version:1,tasks:[task,{...task,id:'u',title:'复盘',sectionId:undefined,dueAt:new Date(2026,9,25,15).toISOString(),reminderAt:new Date(2026,9,25,14,45).toISOString(),recurrence:{unit:'month',interval:1}}],projects:[{id:'p',name:'工作',color:'#123',createdAt:'2026-10-01'}],sections:[{id:'s',name:'检查',projectId:'p',createdAt:'2026-10-01'}],labels:[{id:'focus',name:'专注',color:'#123',createdAt:'2026-10-01'}]}
let counter=0
const id=(kind:string)=>`${kind}-${++counter}`
describe('local templates',()=>{
 it('captures active project tasks, all sections and relative calendar dates without completed history',()=>{
  const template=captureTemplate({...data,tasks:[...data.tasks,{...task,id:'done',completed:true}]},{projectId:'p'})
  expect(template.tasks).toHaveLength(2)
  expect(template.sections).toEqual([{id:'s',name:'检查'}])
  expect(template.tasks.map(t=>t.schedule?.dayOffset)).toEqual([0,2])
  expect(template.tasks[0].subtasks?.[0].completed).toBe(false)
  expect(template.tasks[0].reminderOffsetMinutes).toBeUndefined()
  expect(template.tasks[1].reminderOffsetMinutes).toBe(15)
 })
 it('creates fresh IDs, preserves reminder semantics and rebuilds monthly anchors with the new start date',()=>{
  const template=captureTemplate(data,{projectId:'p'})
  const result=applyTemplate(data,template,{start:'2026-11-28',projectId:'inbox',newProjectName:'下一次发布'},new Date('2026-10-23'),id)
  const created=result.data.tasks.slice(0,2)
  expect(created[0].id).not.toBe(task.id)
  expect(created[0].projectId).toBe(result.projectId)
  expect(created[0].sectionId).not.toBe('s')
  expect(created[0].labelIds).toEqual(['focus'])
  expect(created[0].subtasks?.[0]).toMatchObject({title:'检查',completed:false})
  expect(created[0].subtasks?.[0].id).not.toBe('step')
  expect(created[0].reminderAt).toBeUndefined()
  expect(new Date(created[1].dueAt!).getDate()).toBe(30)
  expect(created[1].recurrence?.anchorDay).toBe(30)
  expect(new Date(created[1].dueAt!).getTime()-new Date(created[1].reminderAt!).getTime()).toBe(15*60000)
  expect(result.data.tasks.slice(2)).toEqual(data.tasks)
  expect(data.projects).toHaveLength(1)
 })
 it('reuses target sections and label names, and can safely instantiate the same template twice',()=>{
  const template=captureTemplate(data,{projectId:'p'})
  const first=applyTemplate(data,template,{start:'2026-10-30',projectId:'p'},undefined,id)
  const second=applyTemplate(first.data,template,{start:'2026-11-03',projectId:'p'},undefined,id)
  expect(second.data.sections).toHaveLength(1)
  expect(second.data.labels).toHaveLength(1)
  expect(new Set(second.data.tasks.map(t=>t.id)).size).toBe(6)
 })
 it('moves by calendar days across year and leap-month boundaries while retaining local wall time',()=>{
  const schedule={title:'任务',description:'',priority:4 as const,labels:[],schedule:{dayOffset:2,time:'09:30'}}
  const leap=new Date(templateDue(schedule,'2028-02-28')!)
  expect([leap.getMonth(),leap.getDate(),leap.getHours(),leap.getMinutes()]).toEqual([2,1,9,30])
  expect(new Date(templateDue(schedule,'2026-12-31')!).getFullYear()).toBe(2027)
  expect(()=>templateDue(schedule,'2026-02-30')).toThrow('无效')
  const spring=new Date(templateDue(schedule,'2026-03-07')!),fall=new Date(templateDue(schedule,'2026-10-31')!)
  expect([spring.getMonth(),spring.getDate(),spring.getHours()]).toEqual([2,9,9])
  expect([fall.getMonth(),fall.getDate(),fall.getHours()]).toEqual([10,2,9])
 })
 it('imports templates with new local IDs and rejects malformed structures without touching existing data',()=>{
  const template=captureTemplate(data,{task})
  expect(parseTemplate(serializeTemplate(template)).id).not.toBe(template.id)
  for(const patch of [{tasks:[{...template.tasks[0],schedule:{dayOffset:-1,time:'25:90'}}]},{tasks:[{...template.tasks[0],sectionId:'missing'}]},{sections:[{id:'x',name:'同名'},{id:'x',name:'重复'}]},{tasks:[]}])expect(isLocalTemplate({...template,...patch})).toBe(false)
  expect(()=>parseTemplate('{bad')).toThrow('JSON')
  expect(()=>parseTemplate(serializeBackup(data))).toThrow('格式')
  expect(()=>applyTemplate(data,template,{start:'2026-10-23',projectId:'gone'})).toThrow('不存在')
  expect(()=>applyTemplate(data,template,{start:'2026-10-23',projectId:'inbox',newProjectName:'工作'})).toThrow('已存在')
 })
 it('round trips subtasks and templates through full backups while accepting older backups',()=>{
  const enhanced={...data,templates:[captureTemplate(data,{projectId:'p'})]}
  expect(parseBackup(serializeBackup(enhanced))).toEqual(enhanced)
  expect(parseBackup(serializeBackup({version:1,tasks:[],labels:[],projects:[]}))).toMatchObject({version:1})
  expect(()=>parseBackup(serializeBackup({...data,tasks:[{...task,subtasks:[task.subtasks![0],task.subtasks![0]]}]}))).toThrow('不支持')
  expect(()=>parseBackup(serializeBackup({...data,templates:[enhanced.templates[0],enhanced.templates[0]]}))).toThrow('不支持')
 })
 it('provides valid examples without creating tasks or templates until chosen',()=>{
  expect(exampleTemplates.every(isLocalTemplate)).toBe(true)
  expect(data.templates).toBeUndefined()
  expect(()=>captureTemplate({...data,tasks:[]},{projectId:'p'})).toThrow('没有')
 })
})
