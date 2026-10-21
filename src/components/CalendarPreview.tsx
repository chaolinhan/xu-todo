import { CalendarDays, ChevronLeft, ChevronRight, Plus, ArrowUpRight } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { addCalendarDays, calendarDays, calendarRangeLabel, localDateKey, moveCalendarDate, tasksByCalendarDay } from '../lib/calendar'
import type { AppData, PreviewMode, Task } from '../types'
import { TaskList } from './TaskList'

interface Props {
  data: AppData
  date: Date
  now: Date
  mode: PreviewMode
  showCompleted: boolean
  sortMode: 'date' | 'priority'
  onDateChange: (date: Date) => void
  onModeChange: (mode: PreviewMode) => void
  onAdd: (date: Date) => void
  onEdit: (task: Task) => void
  onToggle: (task: Task) => void
  onShowAll: () => void
}
const modes: Array<{key: PreviewMode; label: string}> = [{key:'day',label:'日'},{key:'week',label:'周'},{key:'month',label:'月'}]
const dateName = new Intl.DateTimeFormat('zh-CN', {year:'numeric',month:'long',day:'numeric'})
const dayName = new Intl.DateTimeFormat('zh-CN', {month:'long',day:'numeric',weekday:'long'})
const timeName = new Intl.DateTimeFormat('zh-CN', {hour:'2-digit',minute:'2-digit'})
const weekdays = ['周一','周二','周三','周四','周五','周六','周日']

export function CalendarPreview({data,date,now,mode,showCompleted,sortMode,onDateChange,onModeChange,onAdd,onEdit,onToggle,onShowAll}: Props) {
  const grid = useRef<HTMLDivElement>(null)
  const days = useMemo(() => calendarDays(date,mode), [date,mode])
  const byDay = useMemo(() => tasksByCalendarDay(data.tasks,showCompleted,sortMode), [data.tasks,showCompleted,sortMode])
  const selectedKey = localDateKey(date), todayKey = localDateKey(now)
  const selectedTasks = byDay.get(selectedKey) ?? []
  const rangeDays = mode === 'month' ? days.filter(d => d.getMonth() === date.getMonth()) : days
  const rangeCount = rangeDays.reduce((count,d) => count + (byDay.get(localDateKey(d))?.length ?? 0),0)
  const undatedCount = data.tasks.filter(t => !t.dueAt && (showCompleted || !t.completed)).length
  const selectDate = (next: Date, focus = false) => {
    onDateChange(next)
    if (focus) requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>(`[data-calendar-date="${localDateKey(next)}"]`)?.focus())
  }
  const keyNavigate = (event: React.KeyboardEvent, day: Date) => {
    const offsets: Record<string,number> = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}
    if (event.key in offsets) { event.preventDefault(); selectDate(addCalendarDays(day,offsets[event.key]),true) }
    else if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); selectDate(moveCalendarDate(day,mode,event.key === 'PageUp' ? -1 : 1),true) }
  }
  return <section className={`calendar-preview calendar-mode-${mode}`} aria-label="日周月速览">
    <div className="preview-toolbar">
      <div className="preview-period"><div className="period-navigation"><button className="icon-button" type="button" aria-label={`上一${mode==='day'?'日':mode==='week'?'周':'月'}`} onClick={() => selectDate(moveCalendarDate(date,mode,-1))}><ChevronLeft size={17}/></button><button className="icon-button" type="button" aria-label={`下一${mode==='day'?'日':mode==='week'?'周':'月'}`} onClick={() => selectDate(moveCalendarDate(date,mode,1))}><ChevronRight size={17}/></button></div><h2 aria-live="polite">{calendarRangeLabel(date,mode)}</h2><button className="preview-today" type="button" onClick={() => selectDate(new Date(now))}>今天</button></div>
      <div className="preview-modes" role="group" aria-label="预览时间范围">{modes.map(item => <button key={item.key} type="button" aria-label={`${item.label}速览`} aria-pressed={mode===item.key} onClick={() => onModeChange(item.key)}>{item.label}</button>)}</div>
    </div>
    <div className="preview-range-summary"><span>{mode==='day'?'当天':mode==='week'?'整周':'整月'} <strong>{rangeCount}</strong> 项安排</span><span>{mode==='day'?'按截止时间安排，从容开始一天':'选择日期，查看完整清单'}</span></div>

    {mode !== 'day' && <div ref={grid} className={`preview-calendar ${mode}-calendar`} aria-label={mode==='week'?'周速览日历':'月速览日历'}>
      {mode === 'month' && <div className="preview-weekdays" aria-hidden="true">{weekdays.map(label=><span key={label}>{label}</span>)}</div>}
      <div className="preview-days">{days.map(day => {
        const key=localDateKey(day), tasks=byDay.get(key)??[], selected=key===selectedKey
        const outside=mode==='month' && day.getMonth()!==date.getMonth()
        return <div key={key} className={`preview-day ${selected?'is-selected':''} ${outside?'is-outside':''} ${key===todayKey?'is-today':''}`}>
          <button type="button" className="preview-date" data-calendar-date={key} aria-label={`查看${dateName.format(day)}，${tasks.length}项安排`} aria-pressed={selected} aria-current={key===todayKey?'date':undefined} tabIndex={selected?0:-1} onClick={() => selectDate(day)} onKeyDown={e => keyNavigate(e,day)}>
            {mode==='week'&&<span className="preview-weekday">{weekdays[(day.getDay()+6)%7]}</span>}<span className="preview-date-number">{day.getDate()}</span><span className="preview-day-count">{tasks.length ? `${tasks.length}项` : mode==='week' ? '留白' : ''}</span>
          </button>
          <div className="calendar-task-previews">{tasks.slice(0,mode==='week'?3:2).map(task=><button className={`calendar-task-chip priority-${task.priority} ${task.completed?'is-completed':''}`} type="button" key={task.id} aria-label={`查看任务：${task.title}`} title={`${timeName.format(new Date(task.dueAt!))} ${task.title}`} onClick={() => onEdit(task)}><i/><span>{task.title}</span></button>)}{tasks.length>(mode==='week'?3:2)&&<button type="button" className="calendar-more" onClick={() => selectDate(day)}>还有 {tasks.length-(mode==='week'?3:2)} 项</button>}</div>
        </div>
      })}</div>
    </div>}

    <section className="preview-day-detail" aria-label="所选日期的任务">
      <header className="preview-detail-heading"><div><span className="preview-detail-icon"><CalendarDays size={18}/></span><div><h3>{dayName.format(date)}{selectedKey===todayKey&&<span>今天</span>}</h3><p>{selectedTasks.filter(t=>!t.completed).length} 个待办{selectedTasks.some(t=>t.completed)?` · ${selectedTasks.filter(t=>t.completed).length} 个已完成`:''}</p></div></div><button type="button" className="preview-add" onClick={() => onAdd(date)} aria-label="为所选日期添加任务"><Plus size={15}/><span>添加任务</span></button></header>
      {selectedTasks.length ? <TaskList data={data} groups={[{key:'calendar-day',title:sortMode==='priority'?'优先级安排':'时间安排',tasks:selectedTasks}]} query="" onAdd={() => onAdd(date)} onEdit={onEdit} onToggle={onToggle} hideAdd/> : <div className="preview-day-empty"><span className="empty-calendar-line"/><p>这一天还没有安排</p><span>留一点余地，也可以放进一件想做的事。</span><button type="button" onClick={() => onAdd(date)}>添加一个任务<ArrowUpRight size={14}/></button></div>}
    </section>
    {undatedCount>0 && <button type="button" className="preview-undated" onClick={onShowAll}><span>还有 {undatedCount} 个未安排日期的任务</span><span>到全部任务查看 <ArrowUpRight size={13}/></span></button>}
  </section>
}
