import { describe, expect, it } from 'vitest'
import { completeSubtasks, resetSubtasks, subtaskProgress, validSubtasks } from './subtasks'
import { applyBulkAction, undoBulkAction } from './bulk-tasks'
import { createNextTaskOccurrence } from './recurrence'
import type { AppData, Task } from '../types'
const subtasks=[{id:'one',title:'准备资料',completed:true},{id:'two',title:'核对内容',completed:false}]
const task:Task={id:'t',title:'发布',description:'',completed:false,createdAt:'2026-10-01',updatedAt:'2026-10-01',priority:4,projectId:'inbox',labelIds:[],subtasks}
describe('one-level subtasks',()=>{
 it('validates IDs, title bounds and shape, without accepting duplicate steps',()=>{
  expect(validSubtasks(subtasks)).toBe(true)
  for(const value of [[subtasks[0],subtasks[0]],[{...subtasks[0],title:' '}],[{...subtasks[0],completed:'yes'}],Array.from({length:201},(_,i)=>({...subtasks[0],id:String(i)}))])expect(validSubtasks(value)).toBe(false)
 })
 it('counts progress and resets copies without mutating original steps',()=>{
  expect(subtaskProgress(subtasks)).toEqual({completed:1,total:2})
  expect(completeSubtasks(subtasks)?.every(s=>s.completed)).toBe(true)
  expect(resetSubtasks(subtasks)?.some(s=>s.completed)).toBe(false)
  expect(subtasks[1].completed).toBe(false)
 })
 it('completes all steps with the parent and restores exact progress on undo',()=>{
  const data:AppData={version:1,tasks:[task],projects:[],labels:[]}
  const result=applyBulkAction(data,new Set(['t']),{kind:'completed',value:true})
  expect(result.data.tasks[0].subtasks?.every(s=>s.completed)).toBe(true)
  expect(undoBulkAction(result.data,result.undo).tasks[0].subtasks).toEqual(subtasks)
  const reopened=applyBulkAction(result.data,new Set(['t']),{kind:'completed',value:false})
  expect(reopened.data.tasks[0].subtasks?.every(s=>s.completed)).toBe(true)
 })
 it('starts a recurring successor with all steps open',()=>{
  const next=createNextTaskOccurrence({...task,dueAt:'2026-10-23T09:00:00Z',recurrence:{unit:'week',interval:1}},new Date('2026-10-23'),'next')
  expect(next?.subtasks?.every(s=>!s.completed)).toBe(true)
  expect(task.subtasks).toEqual(subtasks)
 })
})
