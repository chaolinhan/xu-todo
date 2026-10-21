// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DateTimePicker } from './DateTimePicker'
afterEach(cleanup)
const open=(value='2026-10-31T16:45')=>{
  const change=vi.fn()
  render(<DateTimePicker label="任务日期" value={value} onChange={change}/>)
  fireEvent.click(screen.getByRole('button',{name:'任务日期'}))
  return change
}
it('stages a month-end selection and time until explicitly applied',()=>{
  const change=open()
  fireEvent.click(screen.getByRole('button',{name:'下个月'}))
  fireEvent.click(screen.getByRole('gridcell',{name:'2026年11月1日'}))
  fireEvent.change(screen.getByRole('spinbutton',{name:'小时'}),{target:{value:'08'}})
  expect(change).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'应用日期'}))
  expect(change).toHaveBeenCalledWith('2026-11-01T08:45')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('supports arrow keys across month boundaries and prevents invalid times',()=>{
  const change=open()
  fireEvent.keyDown(screen.getByRole('gridcell',{name:'2026年10月31日'}),{key:'ArrowRight'})
  expect(screen.getByRole('gridcell',{name:'2026年11月1日'})).toHaveAttribute('aria-selected','true')
  fireEvent.change(screen.getByRole('spinbutton',{name:'分钟'}),{target:{value:'60'}})
  expect(screen.getByRole('button',{name:'应用日期'})).toBeDisabled()
  expect(change).not.toHaveBeenCalled()
})
it('dismisses Escape without committing or triggering the parent window handler',()=>{
  const change=open(),parent=vi.fn()
  window.addEventListener('keydown',parent)
  fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
  window.removeEventListener('keydown',parent)
  expect(change).not.toHaveBeenCalled()
  expect(parent).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button',{name:'任务日期'})).toHaveFocus()
})
it('allows clearing a reminder without applying a new date',()=>{
  const change=open()
  fireEvent.click(screen.getByRole('button',{name:'清除日期'}))
  expect(change).toHaveBeenCalledWith('')
})
it('selects tomorrow relative to the local calendar',()=>{
  const change=open('')
  fireEvent.click(screen.getByRole('button',{name:'明天'}))
  fireEvent.click(screen.getByRole('button',{name:'应用日期'}))
  const expected=new Date();expected.setDate(expected.getDate()+1)
  const actual=new Date(change.mock.calls[0][0])
  expect([actual.getFullYear(),actual.getMonth(),actual.getDate(),actual.getHours()]).toEqual([expected.getFullYear(),expected.getMonth(),expected.getDate(),9])
})
