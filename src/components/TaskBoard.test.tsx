// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { TaskBoard } from './TaskBoard'
import { groupTasksForView } from '../lib/grouping'
import type { AppData } from '../types'
afterEach(cleanup)
const data:AppData={version:1,projects:[],labels:[],tasks:[{id:'t',title:'移动卡片',description:'',completed:false,priority:1,projectId:'inbox',labelIds:[],createdAt:'',updatedAt:''}]}
it('supports drag/drop and the equivalent keyboard/touch move control',()=>{
  const groups=groupTasksForView(data,data.tasks,'priority','inbox',new Date(),true),move=vi.fn()
  const {container}=render(<TaskBoard data={data} groups={groups} onAdd={()=>{}} onEdit={()=>{}} onToggle={()=>{}} onMove={move}/>)
  const transfer={effectAllowed:'',dropEffect:'',setData:vi.fn()}
  const card=container.querySelector('[draggable="true"]')!
  fireEvent.dragStart(card,{dataTransfer:transfer})
  fireEvent.dragOver(screen.getByRole('region',{name:'看板列：优先级 2'}),{dataTransfer:transfer})
  fireEvent.drop(screen.getByRole('region',{name:'看板列：优先级 2'}),{dataTransfer:transfer})
  expect(move).toHaveBeenLastCalledWith('t',groups[0],groups[1])
  fireEvent.click(screen.getByRole('combobox',{name:'移动任务：移动卡片'}))
  fireEvent.keyDown(screen.getByRole('listbox'),{key:'ArrowDown'})
  fireEvent.keyDown(screen.getByRole('listbox'),{key:'Enter'})
  expect(move).toHaveBeenLastCalledWith('t',groups[0],groups[2])
})
it('adds inside the chosen column and keeps task completion accessible',()=>{
  const groups=groupTasksForView(data,data.tasks,'priority','inbox',new Date(),true),add=vi.fn(),toggle=vi.fn()
  render(<TaskBoard data={data} groups={groups} onAdd={add} onEdit={()=>{}} onToggle={toggle} onMove={()=>{}}/>)
  fireEvent.click(screen.getByRole('button',{name:'添加任务到优先级 2'}))
  expect(add).toHaveBeenCalledWith(groups[1])
  fireEvent.click(screen.getByRole('button',{name:'完成任务：移动卡片'}))
  expect(toggle).toHaveBeenCalledWith(data.tasks[0])
  expect(within(screen.getByRole('region',{name:'看板列：优先级 4'})).getByText('0')).toBeInTheDocument()
})
