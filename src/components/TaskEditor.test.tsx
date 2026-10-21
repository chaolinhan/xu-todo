// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { TaskEditor } from './TaskEditor'
import type { Task } from '../types'
afterEach(cleanup)
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
