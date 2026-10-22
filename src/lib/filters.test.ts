import { describe, expect, it } from 'vitest'
import { compileFilter } from './filters'
import type { AppData, Task } from '../types'
const now=new Date(2026,9,21,12)
const data:AppData={version:1,tasks:[],projects:[{id:'work',name:'工作 项目',color:'#123',createdAt:''}],labels:[{id:'focus',name:'专注',color:'#123',createdAt:''}]}
const task:Task={id:'a',title:'准备会议',description:'核对方案',priority:2,projectId:'work',labelIds:['focus'],createdAt:'',updatedAt:'',completed:false,dueAt:new Date(2026,9,21,23,59).toISOString()}
const matches=(q:string,t=task)=>compileFilter(q,data,now).matches(t)
describe('saved filter language',()=>{
  it('honors NOT, AND, OR precedence and parentheses',()=>{
    expect(matches('p1 | p2 & @专注')).toBe(true)
    expect(matches('(p1 | p2) & !@专注')).toBe(false)
    expect(matches('!(p1 | completed) & active')).toBe(true)
  })
  it('matches exact project and label names, including quoted spaces',()=>{
    expect(matches('#"工作 项目" & @专注')).toBe(true)
    expect(matches('#收件箱')).toBe(false)
  })
  it('includes completed tasks only according to explicit query conditions',()=>{
    expect(matches('completed',{...task,completed:true})).toBe(true)
    expect(matches('active',{...task,completed:true})).toBe(false)
  })
  it('uses inclusive local day boundaries and seven calendar days',()=>{
    expect(matches('今天')).toBe(true)
    expect(matches('明天',{...task,dueAt:new Date(2026,9,22,0,0).toISOString()})).toBe(true)
    expect(matches('未来7天',{...task,dueAt:new Date(2026,9,27,23,59).toISOString()})).toBe(true)
    expect(matches('未来7天',{...task,dueAt:new Date(2026,9,28,0,0).toISOString()})).toBe(false)
    expect(matches('逾期',{...task,dueAt:new Date(2026,9,20,23,59).toISOString()})).toBe(true)
  })
  it('handles absent metadata, recurring tasks and literal text search',()=>{
    expect(matches('无日期 & 无标签',{...task,dueAt:undefined,labelIds:[]})).toBe(true)
    expect(matches('重复任务',{...task,recurrence:{unit:'day',interval:1}})).toBe(true)
    expect(matches('search:方案')).toBe(true)
    expect(matches('search:"会议 & 方案"')).toBe(false)
  })
  it.each(['','p1 &','(p1 | p2','p1 )','@不存在','#不存在','search:','p1 p2','@"未闭合','!','a'.repeat(501)])('rejects invalid query %s without matching any task',query=>{
    const compiled=compileFilter(query,data,now)
    expect(compiled.error).toBeTruthy()
    expect(compiled.matches(task)).toBe(false)
  })
})

it('searches subtask titles without treating their completion as the parent status',()=>{
 const item={...task,subtasks:[{id:'s',title:'检查附件',completed:true}]}
 expect(matches('active & search:附件',item)).toBe(true)
 expect(matches('completed & search:附件',item)).toBe(false)
})
