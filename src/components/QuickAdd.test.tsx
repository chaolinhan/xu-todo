// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { QuickAdd } from './QuickAdd'
afterEach(()=>{cleanup();window.localStorage.clear()})

it('manually overrides parsed priority without submitting, and resets after continuous entry',()=>{
  const save=vi.fn()
  render(<QuickAdd data={{version:1,tasks:[],projects:[],labels:[]}} defaultProjectId="inbox" onClose={()=>{}} onSave={save}/>)
  fireEvent.change(screen.getByRole('textbox',{name:'任务名称'}),{target:{value:'核对方案 p1'}})
  expect(screen.getByRole('combobox',{name:'快速设置优先级'})).toHaveTextContent('优先级 1')
  fireEvent.click(screen.getByRole('combobox',{name:'快速设置优先级'}))
  fireEvent.click(screen.getByRole('option',{name:'优先级 2'}))
  expect(save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'添加任务'}))
  expect(save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({title:'核对方案',priority:2}))
  expect(screen.getByRole('combobox',{name:'快速设置优先级'})).toHaveTextContent('无优先级')
})


it('blocks the whole multiline batch when a row has only date tokens or an overlong title',()=>{
  const save=vi.fn()
  render(<QuickAdd data={{version:1,tasks:[],projects:[],labels:[]}} defaultProjectId="inbox" onClose={()=>{}} onSave={()=>{}} onSaveMany={save}/>)
  fireEvent.paste(screen.getByRole('textbox',{name:'任务名称'}),{clipboardData:{getData:()=> '正常任务\n明天 p1'}})
  expect(screen.getByRole('button',{name:'添加 2 项任务'})).toBeDisabled()
  fireEvent.change(screen.getByRole('textbox',{name:'批量任务清单'}),{target:{value:'正常任务\n'+ '长'.repeat(241)}})
  expect(screen.getByRole('button',{name:'添加 2 项任务'})).toBeDisabled()
  expect(save).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('textbox',{name:'批量任务清单'}),{target:{value:'正常任务\n另一个任务'}})
  fireEvent.click(screen.getByRole('button',{name:'添加 2 项任务'}))
  expect(save).toHaveBeenCalledOnce()
  expect(save.mock.calls[0][0]).toHaveLength(2)
})

it('submits an inline batch with the keyboard while respecting text composition',()=>{
  const save=vi.fn()
  render(<QuickAdd data={{version:1,tasks:[],projects:[],labels:[]}} defaultProjectId="inbox" onClose={()=>{}} onSave={()=>{}} onSaveMany={save}/>)
  fireEvent.click(screen.getByRole('button',{name:'多行录入'}))
  const input=screen.getByRole('textbox',{name:'批量任务清单'})
  fireEvent.change(input,{target:{value:'任务一\n任务二'}})
  fireEvent.keyDown(input,{key:'Enter',ctrlKey:true,isComposing:true})
  expect(save).not.toHaveBeenCalled()
  fireEvent.keyDown(input,{key:'Enter',ctrlKey:true})
  expect(save).toHaveBeenCalledOnce()
  expect(save.mock.calls[0][0]).toHaveLength(2)
})
