// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import type { AppData, PreviewMode } from '../types'
import { CalendarPreview } from './CalendarPreview'
afterEach(cleanup)
const now=new Date(2026,9,21,12)
const data:AppData={version:1,projects:[],labels:[],tasks:[{id:'a',title:'周末计划',description:'',completed:false,priority:1,projectId:'inbox',labelIds:[],createdAt:now.toISOString(),updatedAt:now.toISOString(),dueAt:new Date(2026,9,24,9).toISOString()}]}
function Harness({showCompleted=false,initialMode='week' as PreviewMode,onAdd=vi.fn(),onEdit=vi.fn(),onToggle=vi.fn()}) {
  const [date,setDate]=useState(now),[mode,setMode]=useState<PreviewMode>(initialMode)
  return <CalendarPreview data={data} date={date} now={now} mode={mode} onDateChange={setDate} onModeChange={setMode} showCompleted={showCompleted} sortMode="date" onAdd={onAdd} onEdit={onEdit} onToggle={onToggle} onShowAll={()=>{}}/>
}
it('switches day/week/month while retaining selected date and adding to that day',()=>{
  const add=vi.fn()
  render(<Harness onAdd={add}/>)
  fireEvent.click(screen.getByRole('button',{name:'查看2026年10月24日，1项安排'}))
  const detail=within(screen.getByRole('region',{name:'所选日期的任务'}))
  expect(detail.getByText('周末计划')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'日速览'}))
  expect(screen.queryByLabelText('周速览日历')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'为所选日期添加任务'}))
  expect(add.mock.calls[0][0].getDate()).toBe(24)
  fireEvent.click(screen.getByRole('button',{name:'月速览'}))
  expect(screen.getByRole('button',{name:'查看2026年10月24日，1项安排'})).toHaveAttribute('aria-pressed','true')
})
it('opens tasks from calendar chips and keeps completion controls in the day list',()=>{
  const edit=vi.fn(),toggle=vi.fn()
  render(<Harness onEdit={edit} onToggle={toggle}/>)
  fireEvent.click(screen.getByRole('button',{name:'查看任务：周末计划'}))
  expect(edit).toHaveBeenCalledWith(data.tasks[0])
  fireEvent.click(screen.getByRole('button',{name:'查看2026年10月24日，1项安排'}))
  fireEvent.click(screen.getByRole('button',{name:'完成任务：周末计划'}))
  expect(toggle).toHaveBeenCalledWith(data.tasks[0])
})
it('moves across months and returns to local today',()=>{
  render(<Harness initialMode="month"/>)
  fireEvent.click(screen.getByRole('button',{name:'下一月'}))
  expect(screen.getByRole('heading',{name:'2026年11月'})).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'今天'}))
  expect(screen.getByRole('heading',{name:'2026年10月'})).toBeInTheDocument()
  fireEvent.keyDown(screen.getByRole('button',{name:'查看2026年10月21日，0项安排'}),{key:'ArrowRight'})
  expect(screen.getByRole('button',{name:'查看2026年10月22日，0项安排'})).toHaveAttribute('aria-pressed','true')
})
