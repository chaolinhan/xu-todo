// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { QuickAdd } from './QuickAdd'
afterEach(cleanup)

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
