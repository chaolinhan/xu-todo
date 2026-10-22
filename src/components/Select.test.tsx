// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Select } from './Select'

afterEach(cleanup)
const options = [{value:'first',label:'第一项'},{value:'disabled',label:'暂不可用',disabled:true},{value:'last',label:'最后一项'}]

it('navigates enabled options and commits without submitting its parent form',()=>{
  const change=vi.fn(),submit=vi.fn(event=>event.preventDefault())
  render(<form onSubmit={submit}><Select label="项目" value="first" options={options} onChange={change}/></form>)
  const trigger=screen.getByRole('combobox',{name:'项目'})
  fireEvent.keyDown(trigger,{key:'ArrowDown'})
  expect(screen.getByRole('listbox')).toHaveFocus()
  expect(screen.getByRole('option',{name:'第一项'})).toHaveAttribute('aria-selected','true')
  fireEvent.keyDown(screen.getByRole('listbox'),{key:'ArrowDown'})
  fireEvent.keyDown(screen.getByRole('listbox'),{key:'Enter'})
  expect(change).toHaveBeenCalledExactlyOnceWith('last')
  expect(submit).not.toHaveBeenCalled()
  expect(trigger).toHaveFocus()
  expect(trigger).toHaveAttribute('aria-expanded','false')
})

it('cancels with Escape and keeps the parent dialog open',()=>{
  const change=vi.fn(),parentEscape=vi.fn()
  window.addEventListener('keydown',parentEscape)
  try {
    render(<Select label="项目" value="first" options={options} onChange={change}/>)
    const trigger=screen.getByRole('combobox')
    fireEvent.click(trigger)
    fireEvent.keyDown(screen.getByRole('listbox'),{key:'End'})
    parentEscape.mockClear()
    fireEvent.keyDown(screen.getByRole('listbox'),{key:'Escape'})
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(change).not.toHaveBeenCalled()
    expect(parentEscape).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
  } finally { window.removeEventListener('keydown',parentEscape) }
})

it('dismisses on outside click without changing the value',()=>{
  const change=vi.fn()
  render(<><Select label="项目" value="first" options={options} onChange={change}/><button>外部操作</button></>)
  fireEvent.click(screen.getByRole('combobox'))
  fireEvent.mouseDown(screen.getByRole('button',{name:'外部操作'}))
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(change).not.toHaveBeenCalled()
})

it('ignores disabled options and lets an action select the same target again',()=>{
  const change=vi.fn()
  render(<Select label="移动" value="" placeholder="移动到…" options={options} onChange={change}/>)
  for(let i=0;i<2;i++){
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('option',{name:'暂不可用'}))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('option',{name:'最后一项'}))
  }
  expect(change.mock.calls).toEqual([['last'],['last']])
})

it('supports Home, End and typeahead, and closes on Tab without trapping focus',()=>{
  const change=vi.fn()
  render(<Select label="项目" value="last" options={options} onChange={change}/>)
  fireEvent.keyDown(screen.getByRole('combobox'),{key:'Home'})
  const list=screen.getByRole('listbox')
  expect(list).toHaveAttribute('aria-activedescendant',screen.getByRole('option',{name:'第一项'}).id)
  fireEvent.keyDown(list,{key:'End'})
  expect(list).toHaveAttribute('aria-activedescendant',screen.getByRole('option',{name:'最后一项'}).id)
  fireEvent.keyDown(list,{key:'第'})
  expect(list).toHaveAttribute('aria-activedescendant',screen.getByRole('option',{name:'第一项'}).id)
  fireEvent.keyDown(list,{key:'Tab'})
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(change).not.toHaveBeenCalled()
})
