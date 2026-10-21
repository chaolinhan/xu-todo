import { describe, expect, it } from 'vitest'
import { addCalendarDays, calendarDays, calendarRangeLabel, localDateKey, moveCalendarDate, startOfWeek, tasksByCalendarDay } from './calendar'
import type { Task } from '../types'
const task=(id:string,override:Partial<Task>={}):Task=>({id,title:id,description:'',completed:false,priority:4,projectId:'inbox',labelIds:[],createdAt:'2026-10-21T00:00:00Z',updatedAt:'2026-10-21T00:00:00Z',...override})
describe('calendar range arithmetic',()=>{
  it('starts weeks on Monday including a Sunday and a year boundary',()=>{
    expect(localDateKey(startOfWeek(new Date(2027,0,3)))).toBe('2026-12-28')
    expect(calendarDays(new Date(2027,0,1),'week').map(localDateKey)).toEqual(['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03'])
    expect(calendarRangeLabel(new Date(2027,0,1),'week')).toContain('2026年12月28日')
    expect(calendarRangeLabel(new Date(2027,0,1),'week')).toContain('2027年1月3日')
  })
  it('renders all leap-February dates in complete Monday-to-Sunday rows',()=>{
    const days=calendarDays(new Date(2024,1,15),'month')
    expect(days.length%7).toBe(0)
    expect(days[0].getDay()).toBe(1)
    expect(days.at(-1)!.getDay()).toBe(0)
    expect(days.filter(d=>d.getMonth()===1)).toHaveLength(29)
    expect(days.map(localDateKey)).toContain('2024-02-29')
  })
  it('allows four and six row months without dropping any dates',()=>{
    expect(calendarDays(new Date(2021,1,1),'month')).toHaveLength(28)
    expect(calendarDays(new Date(2026,2,1),'month')).toHaveLength(42)
  })
  it('moves by calendar day/week and clamps month ends instead of skipping February',()=>{
    expect(localDateKey(moveCalendarDate(new Date(2026,0,31),'month',1))).toBe('2026-02-28')
    expect(localDateKey(moveCalendarDate(new Date(2024,0,31),'month',1))).toBe('2024-02-29')
    expect(localDateKey(moveCalendarDate(new Date(2026,0,31),'week',1))).toBe('2026-02-07')
    expect(localDateKey(moveCalendarDate(new Date(2026,0,1),'day',-1))).toBe('2025-12-31')
    expect(localDateKey(moveCalendarDate(new Date(2026,0,31),'month',-1))).toBe('2025-12-31')
  })
  it('keeps a whole local calendar day when advancing through DST boundaries',()=>{
    const day=new Date(2026,2,8,23,30)
    expect(localDateKey(addCalendarDays(day,1))).toBe('2026-03-09')
    expect(addCalendarDays(day,1).getHours()).toBe(0)
    expect(calendarDays(day,'day')).toHaveLength(1)
  })
})
describe('scheduled task buckets',()=>{
  it('uses local date boundaries and honors completion visibility without mutating input',()=>{
    const tasks=[task('late',{dueAt:new Date(2026,9,21,23,59).toISOString()}),task('early',{dueAt:new Date(2026,9,22,0,0).toISOString()}),task('done',{dueAt:new Date(2026,9,21,9).toISOString(),completed:true}),task('no-date'),task('invalid',{dueAt:'invalid'})]
    expect(tasksByCalendarDay(tasks,false).get('2026-10-21')?.map(t=>t.id)).toEqual(['late'])
    expect(tasksByCalendarDay(tasks,true).get('2026-10-21')?.map(t=>t.id)).toEqual(['late','done'])
    expect(tasksByCalendarDay(tasks,true).get('2026-10-22')?.map(t=>t.id)).toEqual(['early'])
    expect([...tasksByCalendarDay(tasks,true).values()].flat()).toHaveLength(3)
    expect(tasks).toHaveLength(5)
  })
  it('sorts day lists by time or priority using the same visible collection',()=>{
    const tasks=[task('later',{priority:1,dueAt:new Date(2026,9,21,16).toISOString()}),task('earlier',{priority:3,dueAt:new Date(2026,9,21,8).toISOString()})]
    expect(tasksByCalendarDay(tasks,false).get('2026-10-21')?.map(t=>t.id)).toEqual(['earlier','later'])
    expect(tasksByCalendarDay(tasks,false,'priority').get('2026-10-21')?.map(t=>t.id)).toEqual(['later','earlier'])
    expect(tasks[0].id).toBe('later')
  })
})
