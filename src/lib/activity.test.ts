import { expect, it } from 'vitest'
import { recordActivity, removeLabel, updateLabel } from './activity'
import { parseBackup, serializeBackup } from './backup'
import type { AppData } from '../types'
const data:AppData={version:1,projects:[],labels:[{id:'l',name:'专注',color:'#123',createdAt:''}],tasks:[{id:'t',title:'准备会议',description:'',completed:false,priority:1,projectId:'inbox',labelIds:['l'],createdAt:'',updatedAt:''}],filters:[{id:'f',name:'专注任务',query:'@专注 | @专注中',color:'#123',createdAt:''}]}
it('renames exact label references without changing task ids or prefix names',()=>{
  const changed=updateLabel(data,{...data.labels[0],name:'深度 工作'})
  expect(changed.filters![0].query).toBe('@"深度 工作" | @专注中')
  expect(changed.tasks).toEqual(data.tasks)
  expect(data.labels[0].name).toBe('专注')
})
it('removes label assignments while keeping every task and filter',()=>{
  const changed=removeLabel(data,'l')
  expect(changed.labels).toHaveLength(0)
  expect(changed.tasks).toHaveLength(1)
  expect(changed.tasks[0].labelIds).toEqual([])
  expect(changed.filters).toEqual(data.filters)
})
it('keeps a historical task and project snapshot after task removal and backup',()=>{
  const changed=recordActivity(data,'task_deleted',data.tasks[0].title,data.tasks[0])
  const restored=parseBackup(serializeBackup({...changed,tasks:[]}))
  expect(restored.activities![0]).toMatchObject({title:'准备会议',projectName:'收件箱',action:'task_deleted',taskId:'t'})
  expect(restored.tasks).toEqual([])
})
it('round trips optional new fields and rejects malformed fields',()=>{
  const changed=recordActivity({...data,preferences:{showCompleted:true,compact:true,sortMode:'priority'}},'filter_created','专注任务')
  expect(parseBackup(serializeBackup(changed))).toEqual(changed)
  for(const patch of [{filters:[{query:42}]},{activities:[{id:'e',title:'x',action:'bogus',at:'2026-10-21'}]},{activities:[{id:'e',title:'x',action:'task_created',at:'invalid'}]},{preferences:{showCompleted:'true',compact:false,sortMode:'date'}}]) {
    expect(()=>parseBackup(serializeBackup({...data,...patch} as AppData))).toThrow('不支持')
  }
})
