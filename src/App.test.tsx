// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { appRepository } from './lib/repository'
vi.mock('./lib/repository', () => ({ appRepository: { load: vi.fn(), save: vi.fn() } }))
afterEach(() => { cleanup(); window.localStorage.clear(); vi.clearAllMocks() })
describe('local data read protection', () => {
  it('does not write starter data when the database cannot be read', async () => {
    vi.mocked(appRepository.load).mockRejectedValueOnce(new Error('存储不可用'))
    render(<App />)
    expect(await screen.findByText('暂时无法读取本机任务')).toBeInTheDocument()
    expect(appRepository.save).not.toHaveBeenCalled()
  })
  it('leaves an invalid stored record untouched', async () => {
    vi.mocked(appRepository.load).mockResolvedValueOnce({ version: 0 } as never)
    render(<App />)
    expect(await screen.findByText('暂时无法读取本机任务')).toBeInTheDocument()
    expect(appRepository.save).not.toHaveBeenCalled()
  })
})

import { fireEvent, within, waitFor } from '@testing-library/react'
import type { AppData } from './types'
const stored:AppData={version:1,projects:[],labels:[],tasks:[{id:'t',title:'完成验收',description:'',completed:false,priority:1,projectId:'inbox',labelIds:[],createdAt:'2026-10-21T00:00:00Z',updatedAt:'2026-10-21T00:00:00Z'}]}
it('persists completion, restoration, view preferences and their activity records',async()=>{
  vi.mocked(appRepository.load).mockResolvedValueOnce(structuredClone(stored))
  vi.mocked(appRepository.save).mockResolvedValue(undefined)
  render(<App/>)
  await screen.findByRole('heading',{name:'今天',level:1})
  const nav=within(screen.getByRole('navigation',{name:'任务视图'}))
  fireEvent.click(nav.getByRole('button',{name:/全部任务/}))
  fireEvent.click(screen.getByRole('button',{name:'完成任务：完成验收'}))
  fireEvent.click(nav.getByRole('button',{name:/已完成/}))
  expect(screen.getByRole('button',{name:'恢复任务：完成验收'})).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'恢复任务：完成验收'}))
  fireEvent.click(nav.getByRole('button',{name:/活动日志/}))
  expect(screen.getByText('完成了任务',{selector:'.activity-event span'})).toBeInTheDocument()
  expect(screen.getByText('恢复了任务',{selector:'.activity-event span'})).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'视图'}))
  fireEvent.click(screen.getByLabelText('显示已完成任务'))
  await waitFor(()=>expect(vi.mocked(appRepository.save).mock.calls.at(-1)?.[0]).toMatchObject({preferences:{showCompleted:true},activities:[{action:'task_reopened'},{action:'task_completed'}],tasks:[{completed:false}]}))
})
it('saves filters against all statuses and keeps label deletion non-destructive',async()=>{
  vi.mocked(appRepository.load).mockResolvedValueOnce({...structuredClone(stored),labels:[{id:'l',name:'专注',color:'#123',createdAt:'2026-10-21T00:00:00Z'}],tasks:[{...stored.tasks[0],completed:true,labelIds:['l']}]})
  vi.mocked(appRepository.save).mockResolvedValue(undefined)
  vi.spyOn(window,'confirm').mockReturnValue(true)
  render(<App/>)
  await screen.findByRole('heading',{name:'今天',level:1})
  const nav=within(screen.getByRole('navigation',{name:'任务视图'}))
  fireEvent.click(nav.getByRole('button',{name:'过滤器与标签'}))
  fireEvent.click(screen.getAllByRole('button',{name:'新建过滤器'})[0])
  fireEvent.change(screen.getByLabelText('过滤器名称'),{target:{value:'完成记录'}})
  fireEvent.change(screen.getByLabelText('查询条件'),{target:{value:'completed'}})
  fireEvent.click(screen.getByRole('button',{name:'保存过滤器'}))
  expect(screen.getByRole('button',{name:'恢复任务：完成验收'})).toBeInTheDocument()
  fireEvent.click(nav.getByRole('button',{name:'过滤器与标签'}))
  fireEvent.click(screen.getByRole('button',{name:'删除标签：专注'}))
  await waitFor(()=>expect(vi.mocked(appRepository.save).mock.calls.at(-1)?.[0]).toMatchObject({labels:[],tasks:[{id:'t',labelIds:[]}],filters:[{name:'完成记录',query:'completed'}]}))
  vi.mocked(window.confirm).mockRestore()
})

it('defaults quick entry to the selected calendar day and persists the preview mode',async()=>{
  vi.mocked(appRepository.load).mockResolvedValueOnce(structuredClone(stored))
  vi.mocked(appRepository.save).mockResolvedValue(undefined)
  render(<App/>)
  await screen.findByRole('heading',{name:'今天',level:1})
  fireEvent.click(within(screen.getByRole('navigation',{name:'任务视图'})).getByRole('button',{name:'预览'}))
  fireEvent.click(screen.getByRole('button',{name:'月速览'}))
  fireEvent.click(screen.getByRole('button',{name:'下一月'}))
  const calendar=screen.getByLabelText('月速览日历')
  const dateButton=within(calendar).getAllByRole('button',{name:/查看\d+年\d+月15日，0项安排/})[0]
  fireEvent.click(dateButton)
  fireEvent.click(screen.getByRole('button',{name:'为所选日期添加任务'}))
  const dialog=within(screen.getByRole('dialog',{name:'快速添加任务'}))
  fireEvent.change(dialog.getByRole('textbox',{name:'任务名称'}),{target:{value:'月历上的新任务'}})
  fireEvent.click(dialog.getByRole('button',{name:'添加任务'}))
  await waitFor(()=>{
    const latest=vi.mocked(appRepository.save).mock.calls.at(-1)?.[0]
    expect(latest?.preferences?.previewMode).toBe('month')
    const added=latest?.tasks.find(t=>t.title==='月历上的新任务')
    expect(new Date(added!.dueAt!).getDate()).toBe(15)
    const expected=new Date();expected.setDate(1);expected.setMonth(expected.getMonth()+1)
    expect(new Date(added!.dueAt!).getMonth()).toBe(expected.getMonth())
  })
})

it('creates project sections, adds from a board column, then moves and logs the task',async()=>{
  vi.mocked(appRepository.load).mockResolvedValueOnce(structuredClone(stored))
  vi.mocked(appRepository.save).mockResolvedValue(undefined)
  render(<App/>)
  await screen.findByRole('heading',{name:'今天',level:1})
  fireEvent.click(within(screen.getByRole('navigation',{name:'任务视图'})).getByRole('button',{name:/收件箱/}))
  fireEvent.click(screen.getByRole('button',{name:'管理版块'}))
  fireEvent.change(screen.getByLabelText('新建版块'),{target:{value:'进行中'}})
  fireEvent.click(screen.getByRole('button',{name:'添加版块'}))
  fireEvent.change(screen.getByLabelText('新建版块'),{target:{value:'已排期'}})
  fireEvent.click(screen.getByRole('button',{name:'添加版块'}))
  fireEvent.click(screen.getByRole('button',{name:'关闭版块管理'}))
  fireEvent.click(screen.getByRole('button',{name:'看板布局'}))
  fireEvent.click(screen.getByRole('button',{name:'添加任务到进行中'}))
  fireEvent.change(screen.getByRole('textbox',{name:'任务名称'}),{target:{value:'列内新任务'}})
  fireEvent.click(within(screen.getByRole('dialog',{name:'快速添加任务'})).getByRole('button',{name:'添加任务'}))
  fireEvent.click(screen.getByLabelText('任务操作：列内新任务'))
  fireEvent.click(screen.getByRole('combobox',{name:'移动任务：列内新任务'}))
  fireEvent.click(screen.getByRole('option',{name:'已排期'}))
  await waitFor(()=>{
    const latest=vi.mocked(appRepository.save).mock.calls.at(-1)?.[0]
    const section=latest?.sections?.find(s=>s.name==='已排期')
    expect(latest?.tasks.find(t=>t.title==='列内新任务')?.sectionId).toBe(section?.id)
    expect(latest?.preferences?.taskViews?.inbox).toEqual({layout:'board',groupBy:'section'})
    expect(latest?.activities?.[0]).toMatchObject({action:'task_moved',detail:'进行中 → 已排期'})
  })
})

it('does not carry board defaults into a later calendar quick entry',async()=>{
  const initial:AppData={...structuredClone(stored),sections:[{id:'s',name:'进行中',projectId:'inbox',createdAt:'2026-10-21'}]}
  vi.mocked(appRepository.load).mockResolvedValueOnce(initial)
  vi.mocked(appRepository.save).mockResolvedValue(undefined)
  render(<App/>)
  await screen.findByRole('heading',{name:'今天',level:1})
  const nav=within(screen.getByRole('navigation',{name:'任务视图'}))
  fireEvent.click(nav.getByRole('button',{name:/收件箱/}))
  fireEvent.click(screen.getByRole('button',{name:'看板布局'}))
  fireEvent.click(screen.getByRole('button',{name:'添加任务到进行中'}))
  fireEvent.click(screen.getByRole('button',{name:'关闭快速添加'}))
  fireEvent.click(nav.getByRole('button',{name:'预览'}))
  fireEvent.click(screen.getByRole('button',{name:'日速览'}))
  fireEvent.click(screen.getByRole('button',{name:'下一日'}))
  fireEvent.click(screen.getByRole('button',{name:'为所选日期添加任务'}))
  fireEvent.change(screen.getByRole('textbox',{name:'任务名称'}),{target:{value:'日历独立录入'}})
  fireEvent.click(within(screen.getByRole('dialog',{name:'快速添加任务'})).getByRole('button',{name:'添加任务'}))
  await waitFor(()=>{
    const added=vi.mocked(appRepository.save).mock.calls.at(-1)?.[0].tasks.find(t=>t.title==='日历独立录入')
    expect(added?.sectionId).toBeUndefined()
    const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1)
    expect(new Date(added!.dueAt!).getDate()).toBe(tomorrow.getDate())
  })
})


it('resets navigation scroll but preserves list position when closing the task drawer',async()=>{
  vi.mocked(appRepository.load).mockResolvedValueOnce(structuredClone(stored))
  vi.mocked(appRepository.save).mockResolvedValue(undefined)
  const {container}=render(<App/>)
  await screen.findByRole('heading',{name:'今天',level:1})
  const scroll=container.querySelector('.workspace-scroll')!
  scroll.scrollTop=186
  fireEvent.click(within(screen.getByRole('navigation',{name:'任务视图'})).getByRole('button',{name:'预览'}))
  expect(scroll.scrollTop).toBe(0)
  fireEvent.click(within(screen.getByRole('navigation',{name:'任务视图'})).getByRole('button',{name:/全部任务/}))
  scroll.scrollTop=150
  fireEvent.click(screen.getByRole('button',{name:'编辑任务：完成验收'}))
  fireEvent.click(screen.getByRole('button',{name:'关闭'}))
  expect(scroll.scrollTop).toBe(150)
})

it('deduplicates tasks in multiple label groups and never bulk edits hidden tasks',async()=>{
  const initial:AppData={...structuredClone(stored),labels:[{id:'one',name:'专注',color:'#123',createdAt:''},{id:'two',name:'工作',color:'#456',createdAt:''}],tasks:[{...stored.tasks[0],labelIds:['one','two']},{...stored.tasks[0],id:'hidden',title:'不会被修改',completed:true}]}
  vi.mocked(appRepository.load).mockResolvedValueOnce(initial)
  vi.mocked(appRepository.save).mockResolvedValue(undefined)
  render(<App/>)
  await screen.findByRole('heading',{name:'今天',level:1})
  fireEvent.click(within(screen.getByRole('navigation',{name:'任务视图'})).getByRole('button',{name:/全部任务/}))
  fireEvent.click(screen.getByRole('combobox',{name:'任务分组方式'}))
  fireEvent.click(screen.getByRole('option',{name:'标签'}))
  fireEvent.click(screen.getByRole('button',{name:'选择任务'}))
  expect(screen.getAllByRole('checkbox',{name:'选择任务：完成验收'})).toHaveLength(2)
  fireEvent.click(screen.getByRole('button',{name:'全选当前范围'}))
  expect(screen.getByText('已选 1 项')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('combobox',{name:'批量设置优先级'}))
  fireEvent.click(screen.getByRole('option',{name:'优先级 2'}))
  await waitFor(()=>{
    const latest=vi.mocked(appRepository.save).mock.calls.at(-1)?.[0]
    expect(latest?.tasks.find(t=>t.id==='t')?.priority).toBe(2)
    expect(latest?.tasks.find(t=>t.id==='hidden')?.priority).toBe(1)
    expect(latest?.activities?.filter(e=>e.detail==='批量操作')).toHaveLength(1)
  })
  fireEvent.click(screen.getByRole('button',{name:'撤销'}))
  await waitFor(()=>expect(vi.mocked(appRepository.save).mock.calls.at(-1)?.[0].tasks.find(t=>t.id==='t')?.priority).toBe(1))
})

it('previews multiline entry, saves all rows once and can undo their creation',async()=>{
  vi.mocked(appRepository.load).mockResolvedValueOnce(structuredClone(stored))
  vi.mocked(appRepository.save).mockResolvedValue(undefined)
  render(<App/>)
  await screen.findByRole('heading',{name:'今天',level:1})
  fireEvent.click(screen.getByRole('button',{name:'添加任务 Q'}))
  fireEvent.paste(screen.getByRole('textbox',{name:'任务名称'}),{clipboardData:{getData:()=> '明天 第一项 p1\n第二项'}})
  expect(screen.getByLabelText('批量录入预览')).toBeInTheDocument()
  expect(screen.getByText('第一项')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'添加 2 项任务'}))
  await waitFor(()=>{
    const latest=vi.mocked(appRepository.save).mock.calls.at(-1)?.[0]
    expect(latest?.tasks).toHaveLength(3)
    expect(latest?.tasks.find(t=>t.title==='第一项')?.priority).toBe(1)
  })
  fireEvent.click(screen.getByRole('button',{name:'撤销'}))
  await waitFor(()=>expect(vi.mocked(appRepository.save).mock.calls.at(-1)?.[0].tasks).toHaveLength(1))
})
