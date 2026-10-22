// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { TaskEditor } from './TaskEditor'
import type { Task } from '../types'
afterEach(()=>{cleanup();window.localStorage.clear()})
it('keeps an explicitly disabled reminder off when the due date is changed', () => {
  const task: Task = { id:'a', title:'复核方案', description:'', completed:false, createdAt:'2026-10-21T00:00:00Z', updatedAt:'2026-10-21T00:00:00Z', dueAt:'2026-10-22T07:00:00Z', reminderAt:'2026-10-22T07:00:00Z', priority:4, projectId:'inbox', labelIds:[] }
  const save = vi.fn()
  render(<TaskEditor data={{version:1,tasks:[task],projects:[],labels:[]}} task={task} defaultProjectId="inbox" onClose={() => {}} onSave={save} />)
  fireEvent.click(screen.getByRole('button',{name:'提醒时间'}))
  fireEvent.click(screen.getByRole('button',{name:'清除日期'}))
  fireEvent.click(screen.getByRole('button',{name:'截止时间'}))
  fireEvent.click(screen.getByRole('gridcell',{name:'2026年10月23日'}))
  fireEvent.click(screen.getByRole('button',{name:'应用日期'}))
  fireEvent.click(screen.getByRole('button',{name:'保存更改'}))
  expect(save).toHaveBeenCalledOnce()
  expect(save.mock.calls[0][0].reminderAt).toBeUndefined()
  expect(new Date(save.mock.calls[0][0].dueAt).getDate()).toBe(23)
})

it('saves selected priority and clears a section when switching project',()=>{
  const save=vi.fn()
  render(<TaskEditor data={{version:1,tasks:[],projects:[{id:'p',name:'工作',color:'#123',createdAt:''}],labels:[],sections:[{id:'s',name:'进行中',projectId:'inbox',createdAt:''}]}} defaultProjectId="inbox" onClose={()=>{}} onSave={save}/>)
  fireEvent.change(screen.getByRole('textbox',{name:'编辑任务名称'}),{target:{value:'统一组件验收'}})
  fireEvent.click(screen.getByRole('combobox',{name:'所属版块'}))
  fireEvent.click(screen.getByRole('option',{name:'进行中'}))
  fireEvent.click(screen.getByRole('combobox',{name:'所属项目'}))
  fireEvent.click(screen.getByRole('option',{name:'工作'}))
  expect(screen.getByRole('combobox',{name:'所属版块'})).toHaveTextContent('未分组')
  fireEvent.click(screen.getByRole('combobox',{name:'优先级'}))
  fireEvent.click(screen.getByRole('option',{name:'优先级 3'}))
  expect(save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'添加任务'}))
  expect(save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({priority:3,projectId:'p',sectionId:undefined}))
})


it('keeps a drawer draft on Escape and restores it on reopening without saving the task',()=>{
  const save=vi.fn(),close=vi.fn()
  const props={data:{version:1 as const,tasks:[],projects:[],labels:[]},defaultProjectId:'inbox',onClose:close,onSave:save}
  const first=render(<TaskEditor {...props}/>)
  fireEvent.change(screen.getByRole('textbox',{name:'编辑任务名称'}),{target:{value:'未保存的任务草稿'}})
  fireEvent.keyDown(screen.getByRole('textbox',{name:'编辑任务名称'}),{key:'Escape'})
  expect(close).toHaveBeenCalledOnce()
  expect(save).not.toHaveBeenCalled()
  first.unmount();render(<TaskEditor {...props}/>)
  expect(screen.getByRole('textbox',{name:'编辑任务名称'})).toHaveValue('未保存的任务草稿')
  expect(screen.getByText('已恢复上次草稿')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'丢弃草稿'}))
  expect(screen.getByRole('textbox',{name:'编辑任务名称'})).toHaveValue('')
})
