import { describe,expect,it } from 'vitest'
import { applyBulkAction,undoBulkAction } from './bulk-tasks'
import type { AppData,Task } from '../types'
const now=new Date('2026-10-23T00:00:00Z')
const task:Task={id:'a',title:'任务',description:'',priority:4,projectId:'inbox',sectionId:'s',labelIds:['one'],completed:false,createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z',dueAt:'2026-10-24T04:00:00Z'}
const data:AppData={version:1,tasks:[task,{...task,id:'b',reminderAt:'2026-10-24T03:00:00Z'}],projects:[{id:'p',name:'工作',color:'#123',createdAt:''}],labels:[{id:'one',name:'专注',color:'#123',createdAt:''},{id:'two',name:'五分钟',color:'#123',createdAt:''}]}
const ids=new Set(['a','b'])
describe('atomic bulk changes',()=>{
 it('keeps disabled reminders off, preserves offsets and updates the recurrence anchor',()=>{
  const input={...data,tasks:[{...task,recurrence:{unit:'month' as const,interval:1,anchorDay:24}},data.tasks[1]]}
  const result=applyBulkAction(input,ids,{kind:'date',value:'2026-10-31T10:00:00Z'},now)
  expect(result.data.tasks[0]).toMatchObject({reminderAt:undefined,recurrence:{anchorDay:31}})
  expect(result.data.tasks[1].reminderAt).toBe('2026-10-31T09:00:00.000Z')
  expect(input.tasks[0].dueAt).toBe(task.dueAt)
 })
 it('rejects the entire date removal when a recurring task is selected',()=>{
  const input={...data,tasks:[task,{...task,id:'b',recurrence:{unit:'week' as const,interval:1}}]}
  expect(()=>applyBulkAction(input,ids,{kind:'date'},now)).toThrow('重复任务')
  expect(input.tasks[0].dueAt).toBe(task.dueAt)
  expect(input.activities).toBeUndefined()
 })
 it('moves projects without carrying their old sections, and unions labels',()=>{
  const moved=applyBulkAction(data,ids,{kind:'project',value:'p'},now)
  expect(moved.data.tasks.every(t=>t.projectId==='p'&&!t.sectionId)).toBe(true)
  const labelled=applyBulkAction(moved.data,ids,{kind:'label',value:'two'},now)
  expect(labelled.data.tasks[0].labelIds).toEqual(['one','two'])
  expect(applyBulkAction(labelled.data,ids,{kind:'label',value:'two'},now).count).toBe(0)
 })
 it('completes mixed selections once and does not duplicate a recurring successor after restore',()=>{
  const input={...data,tasks:[{...task,recurrence:{unit:'week' as const,interval:1}},{...task,id:'b',completed:true}]}
  const result=applyBulkAction(input,ids,{kind:'completed',value:true},now,()=> 'next')
  expect(result.count).toBe(1)
  expect(result.data.tasks.filter(t=>t.previousOccurrenceId==='a')).toHaveLength(1)
  const restored=applyBulkAction(result.data,new Set(['a']),{kind:'completed',value:false},now)
  const completed=applyBulkAction(restored.data,new Set(['a']),{kind:'completed',value:true},now)
  expect(completed.data.tasks.filter(t=>t.previousOccurrenceId==='a')).toHaveLength(1)
 })
 it('undoes changed tasks and generated successors while preserving unrelated edits',()=>{
  const input={...data,tasks:[{...task,recurrence:{unit:'week' as const,interval:1}},data.tasks[1]]}
  const result=applyBulkAction(input,new Set(['a']),{kind:'completed',value:true},now,()=> 'next')
  const latest={...result.data,tasks:result.data.tasks.map(t=>t.id==='b'?{...t,title:'后来编辑'}:t)}
  const undone=undoBulkAction(latest,result.undo,now)
  expect(undone.tasks.find(t=>t.id==='a')?.completed).toBe(false)
  expect(undone.tasks.find(t=>t.id==='a')?.seriesId).toBeUndefined()
  expect(undone.tasks.find(t=>t.id==='b')?.title).toBe('后来编辑')
  expect(undone.tasks.some(t=>t.id==='next')).toBe(false)
 })
 it('refuses to overwrite subsequent changes to a selected task or successor',()=>{
  const result=applyBulkAction(data,ids,{kind:'priority',value:1},now)
  expect(()=>undoBulkAction({...result.data,tasks:result.data.tasks.map(t=>t.id==='a'?{...t,title:'新内容'}:t)},result.undo,now)).toThrow('新的修改')
  const recurring=applyBulkAction({...data,tasks:[{...task,recurrence:{unit:'day',interval:1}}]},new Set(['a']),{kind:'completed',value:true},now,()=> 'next')
  expect(()=>undoBulkAction({...recurring.data,tasks:recurring.data.tasks.map(t=>t.id==='next'?{...t,description:'新内容'}:t)},recurring.undo,now)).toThrow('新的修改')
 })
 it('does not update a section for an unchanged project, and rejects missing destinations',()=>{
  expect(applyBulkAction(data,ids,{kind:'project',value:'inbox'},now).count).toBe(0)
  expect(()=>applyBulkAction(data,ids,{kind:'project',value:'missing'},now)).toThrow('不存在')
  expect(()=>applyBulkAction(data,ids,{kind:'label',value:'missing'},now)).toThrow('不存在')
 })
})
