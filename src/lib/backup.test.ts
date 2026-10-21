import { describe, expect, it } from 'vitest'
import type { AppData } from '../types'
import { parseBackup, serializeBackup } from './backup'

const data: AppData = { version: 1, tasks: [], projects: [], labels: [] }

const recurringData: AppData = {
  ...data,
  tasks: [{
    id: 'task-one',
    title: '提交周报',
    description: '',
    completed: false,
    createdAt: '2026-09-11T00:00:00.000Z',
    updatedAt: '2026-09-11T00:00:00.000Z',
    dueAt: '2026-09-11T10:00:00.000Z',
    reminderAt: '2026-09-11T10:00:00.000Z',
    recurrence: { unit: 'week', interval: 1 },
    priority: 2,
    projectId: 'inbox',
    labelIds: [],
  }],
}

describe('backup validation', () => {
  it('round trips supported data', () => {
    expect(parseBackup(serializeBackup(data))).toEqual(data)
    expect(parseBackup(serializeBackup(recurringData))).toEqual(recurringData)
  })

  it('rejects malformed or unrelated files', () => {
    expect(() => parseBackup('not-json')).toThrow('JSON')
    expect(() => parseBackup('{"format":"something-else"}')).toThrow('不支持')
  })

  it('rejects invalid recurrence rules', () => {
    const backup = JSON.parse(serializeBackup(recurringData))
    backup.data.tasks[0].recurrence.interval = 0
    expect(() => parseBackup(JSON.stringify(backup))).toThrow('不支持')
  })
})

it('preserves optional preview mode while accepting previous preferences',()=>{
  const preferences={showCompleted:false,compact:false,sortMode:'date' as const}
  expect(parseBackup(serializeBackup({...data,preferences})).preferences).toEqual(preferences)
  expect(parseBackup(serializeBackup({...data,preferences:{...preferences,previewMode:'month'}})).preferences?.previewMode).toBe('month')
  expect(()=>parseBackup(serializeBackup({...data,preferences:{...preferences,previewMode:'year' as never}}))).toThrow('不支持')
})

it('preserves sections, task assignments and per-view layout without accepting malformed additions',()=>{
  const expanded:AppData={...recurringData,sections:[{id:'doing',name:'进行中',projectId:'inbox',createdAt:'2026-10-21'}],preferences:{showCompleted:false,compact:false,sortMode:'date',taskViews:{inbox:{layout:'board',groupBy:'section'}}},tasks:recurringData.tasks.map(t=>({...t,sectionId:'doing'}))}
  expect(parseBackup(serializeBackup(expanded))).toEqual(expanded)
  for(const patch of [{sections:[{id:'x'}]},{preferences:{showCompleted:false,compact:false,sortMode:'date',taskViews:{all:{layout:'table',groupBy:'section'}}}},{tasks:[{...expanded.tasks[0],sectionId:3}]}])expect(()=>parseBackup(serializeBackup({...expanded,...patch} as AppData))).toThrow('不支持')
})
