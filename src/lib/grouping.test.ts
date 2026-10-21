import { describe, expect, it } from 'vitest'
import type { AppData, Task } from '../types'
import { defaultsForGroup, groupTasksForView, moveTaskToGroup, removeSection, reorderSection, validSectionId } from './grouping'
import { createNextTaskOccurrence } from './recurrence'
const now=new Date(2026,9,21,12)
const task:Task={id:'t',title:'设计任务',description:'',completed:false,priority:2,projectId:'work',sectionId:'doing',labelIds:['a','b'],createdAt:now.toISOString(),updatedAt:now.toISOString(),dueAt:new Date(2026,9,20,15).toISOString(),reminderAt:new Date(2026,9,20,14,30).toISOString()}
const data:AppData={version:1,tasks:[task],projects:[{id:'work',name:'工作',color:'#123',createdAt:''},{id:'home',name:'个人',color:'#123',createdAt:''}],sections:[{id:'doing',projectId:'work',name:'进行中',createdAt:''},{id:'waiting',projectId:'work',name:'待处理',createdAt:''},{id:'other',projectId:'home',name:'其他',createdAt:''}],labels:[{id:'a',name:'专注',color:'#123',createdAt:''},{id:'b',name:'等待',color:'#123',createdAt:''}]}
describe('shared list and board grouping',()=>{
  it('keeps empty project sections and places old tasks into ungrouped',()=>{
    const groups=groupTasksForView(data,[task,{...task,id:'old',sectionId:undefined}],'section','project:work',now)
    expect(groups.map(g=>g.title)).toEqual(['未分组','进行中','待处理'])
    expect(groups[0].tasks.map(t=>t.id)).toEqual(['old'])
    expect(groups[1].tasks.map(t=>t.id)).toEqual(['t'])
  })
  it('does not silently lose stale project/section references',()=>{
    const stale={...task,projectId:'deleted',sectionId:'doing'}
    expect(groupTasksForView(data,[stale],'project','all',now).flatMap(g=>g.tasks)).toEqual([stale])
    expect(groupTasksForView(data,[stale],'section','all',now)[0].tasks).toEqual([stale])
    expect(validSectionId(data,'home','doing')).toBeUndefined()
  })
  it('shows multiple labels without duplicating a task inside a group',()=>{
    const groups=groupTasksForView(data,[task],'label','all',now)
    expect(groups.map(g=>g.title)).toEqual(['专注','等待'])
    expect(groups.every(g=>g.tasks.length===1)).toBe(true)
  })
  it('keeps board priority targets even when they have no tasks',()=>{
    expect(groupTasksForView(data,[task],'priority','all',now,true)).toHaveLength(4)
    expect(groupTasksForView(data,[task],'priority','all',now)).toHaveLength(1)
  })
  it('assigns date tasks to exactly one group and exposes safe writable buckets',()=>{
    const tasks=[task,{...task,id:'today',dueAt:now.toISOString()},{...task,id:'done',completed:true},{...task,id:'none',dueAt:undefined},{...task,id:'invalid',dueAt:'invalid'}]
    const groups=groupTasksForView(data,tasks,'date','all',now,true)
    expect(groups.flatMap(g=>g.tasks)).toHaveLength(5)
    expect(groups.find(g=>g.key==='overdue')?.target).toBeUndefined()
    expect(groups.find(g=>g.key==='today')?.target).toEqual({kind:'date',day:'today'})
  })
})
describe('moves and section maintenance',()=>{
  it('moves between project sections and validates the target relationship',()=>{
    expect(moveTaskToGroup(data,task,{kind:'section',projectId:'home',sectionId:'other'},undefined,now)).toMatchObject({projectId:'home',sectionId:'other'})
    expect(()=>moveTaskToGroup(data,task,{kind:'section',projectId:'home',sectionId:'doing'},undefined,now)).toThrow('版块')
    expect(moveTaskToGroup(data,task,{kind:'project',projectId:'home'},undefined,now).sectionId).toBeUndefined()
  })
  it('replaces only the source label and preserves other labels',()=>{
    const withThird={...data,labels:[...data.labels,{id:'c',name:'新标签',color:'#123',createdAt:''}]}
    expect(moveTaskToGroup(withThird,task,{kind:'label',labelId:'c'},{kind:'label',labelId:'a'},now).labelIds).toEqual(['b','c'])
    expect(moveTaskToGroup(data,task,{kind:'label'},undefined,now).labelIds).toEqual([])
    expect(task.labelIds).toEqual(['a','b'])
  })
  it('preserves time and reminder offset when moving a date, while keeping off reminders off',()=>{
    const moved=moveTaskToGroup(data,task,{kind:'date',day:'tomorrow'},undefined,now)
    expect(new Date(moved.dueAt!).getDate()).toBe(22)
    expect(new Date(moved.dueAt!).getHours()).toBe(15)
    expect(new Date(moved.dueAt!).getTime()-new Date(moved.reminderAt!).getTime()).toBe(30*60_000)
    expect(moveTaskToGroup(data,{...task,reminderAt:undefined},{kind:'date',day:'today'},undefined,now).reminderAt).toBeUndefined()
  })
  it('preserves recurrence in a section and updates its date anchor when moved',()=>{
    const recurring={...task,recurrence:{unit:'month' as const,interval:1,anchorDay:20}}
    const moved=moveTaskToGroup(data,recurring,{kind:'date',day:'today'},undefined,now)
    expect(moved.recurrence?.anchorDay).toBe(21)
    expect(createNextTaskOccurrence(moved,now,'next')?.sectionId).toBe('doing')
    expect(()=>moveTaskToGroup(data,recurring,{kind:'date',day:'none'},undefined,now)).toThrow('重复任务需要日期')
  })
  it('removes section references without removing tasks, and reorders only sibling sections',()=>{
    const removed=removeSection(data,'doing')
    expect(removed.tasks).toHaveLength(1)
    expect(removed.tasks[0].sectionId).toBeUndefined()
    expect(reorderSection(data,data.sections![0],1).sections?.map(s=>s.id)).toEqual(['waiting','doing','other'])
    expect(data.sections![0].id).toBe('doing')
  })
  it('creates grouped task defaults without changing completion or unrelated fields',()=>{
    expect(defaultsForGroup(data,{kind:'priority',priority:1},now)).toEqual({priority:1})
    expect(defaultsForGroup(data,{kind:'section',projectId:'work',sectionId:'doing'},now)).toEqual({projectId:'work',sectionId:'doing'})
    expect(new Date(defaultsForGroup(data,{kind:'date',day:'tomorrow'},now).dueAt!).getHours()).toBe(9)
  })
})
