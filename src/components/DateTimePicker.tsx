import { Calendar, ChevronLeft, ChevronRight, Clock3, X } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toDateTimeLocal } from '../lib/task-utils'

interface Props { value: string; onChange: (value:string) => void; label: string; compact?: boolean }
const dateKey = (d:Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
export function DateTimePicker({value,onChange,label,compact=false}:Props) {
  const [open,setOpen] = useState(false)
  const [selected,setSelected] = useState(new Date())
  const [month,setMonth] = useState(new Date())
  const [hour,setHour] = useState('09'), [minute,setMinute] = useState('00')
  const [position,setPosition] = useState({top:0,left:0})
  const trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null)
  const id = useId()
  const initial = () => {
    const d = value ? new Date(value) : new Date()
    if (!value) d.setHours(9,0,0,0)
    setSelected(d);setMonth(new Date(d.getFullYear(),d.getMonth(),1));setHour(String(d.getHours()).padStart(2,'0'));setMinute(String(d.getMinutes()).padStart(2,'0'));setOpen(true)
  }
  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return
    const reposition = () => {
      if (!trigger.current || !panel.current) return
      const box=trigger.current.getBoundingClientRect(), height=panel.current.getBoundingClientRect().height
      setPosition({left:Math.max(12,Math.min(box.left,window.innerWidth-332)),top:Math.max(12,Math.min(box.bottom+8,window.innerHeight-height-12))})
    }
    reposition()
    panel.current.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus()
    window.addEventListener('resize',reposition)
    document.addEventListener('scroll',reposition,true)
    return () => {window.removeEventListener('resize',reposition);document.removeEventListener('scroll',reposition,true)}
  },[open])
  useEffect(() => {
    if (!open) return
    const outside = (e:MouseEvent) => { if (!panel.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e:KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault();e.stopImmediatePropagation();setOpen(false);trigger.current?.focus() }
      if (e.key === 'Tab') {
        const nodes=panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')
        if (!nodes?.length) return
        if (e.shiftKey && document.activeElement === nodes[0]) {e.preventDefault();nodes[nodes.length-1].focus()}
        else if (!e.shiftKey && document.activeElement === nodes[nodes.length-1]) {e.preventDefault();nodes[0].focus()}
      }
    }
    document.addEventListener('mousedown',outside);window.addEventListener('keydown',key,true)
    return () => { document.removeEventListener('mousedown',outside);window.removeEventListener('keydown',key,true) }
  },[open])
  const choose = (d:Date,focus=false) => {
    setSelected(d);setMonth(new Date(d.getFullYear(),d.getMonth(),1))
    if (focus) requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>(`[data-date="${dateKey(d)}"]`)?.focus())
  }
  const days:Date[] = []
  const start = new Date(month.getFullYear(),month.getMonth(),1)
  start.setDate(start.getDate()-(start.getDay()+6)%7)
  for(let i=0;i<42;i++){const d=new Date(start);d.setDate(d.getDate()+i);days.push(d)}
  const valid = /^\d{1,2}$/.test(hour) && /^\d{1,2}$/.test(minute) && +hour<24 && +minute<60
  const commit = () => { if(!valid)return;const d=new Date(selected);d.setHours(+hour,+minute,0,0);onChange(toDateTimeLocal(d.toISOString()));setOpen(false);trigger.current?.focus() }
  const shortcut = (offset:number) => {const d=new Date();d.setDate(d.getDate()+offset);choose(d)}
  return <>
    <button ref={trigger} className={`date-picker-trigger ${compact?'is-small':''} ${value?'has-value':''}`} type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?id:undefined} onClick={() => open?setOpen(false):initial()}><Calendar size={compact?14:16}/><span>{value?new Intl.DateTimeFormat('zh-CN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'选择日期与时间'}</span></button>
    {open && createPortal(<div ref={panel} id={id} className="date-popover" role="dialog" aria-modal="true" aria-label={`${label}选择器`} style={position}>
      <div className="picker-title"><span>{label}</span><button type="button" className="icon-button" aria-label="关闭日期选择器" onClick={() => {setOpen(false);trigger.current?.focus()}}><X size={15}/></button></div>
      <div className="date-shortcuts"><button type="button" onClick={() => shortcut(0)}>今天</button><button type="button" onClick={() => shortcut(1)}>明天</button><button type="button" onClick={() => shortcut(7)}>一周后</button><button type="button" onClick={() => {const d=new Date();d.setDate(d.getDate()+7-(d.getDay()+6)%7);choose(d)}}>下周一</button></div>
      <div className="calendar-heading"><strong aria-live="polite">{month.getFullYear()} 年 {month.getMonth()+1} 月</strong><div><button className="icon-button" type="button" aria-label="上个月" onClick={() => setMonth(d=>new Date(d.getFullYear(),d.getMonth()-1,1))}><ChevronLeft size={16}/></button><button className="icon-button" type="button" aria-label="下个月" onClick={() => setMonth(d=>new Date(d.getFullYear(),d.getMonth()+1,1))}><ChevronRight size={16}/></button></div></div>
      <div className="week-header" aria-hidden="true">{'一二三四五六日'.split('').map(d=><span key={d}>{d}</span>)}</div>
      <div className="calendar-grid" role="grid" aria-label="选择日期">{Array.from({length:6},(_,row)=><div role="row" key={row}>{days.slice(row*7,row*7+7).map(d=><button key={dateKey(d)} data-date={dateKey(d)} type="button" role="gridcell" aria-label={`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`} aria-selected={dateKey(d)===dateKey(selected)} tabIndex={dateKey(d)===dateKey(selected)?0:-1} className={`${d.getMonth()!==month.getMonth()?'outside-month':''} ${dateKey(d)===dateKey(new Date())?'is-today':''}`} onClick={()=>choose(d)} onKeyDown={e=>{const offsets:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};if(e.key in offsets){e.preventDefault();const next=new Date(d);next.setDate(next.getDate()+offsets[e.key]);choose(next,true)}}}>{d.getDate()}</button>)}</div>)}</div>
      <div className="picker-time"><Clock3 size={15}/><span>时间</span><label><span className="sr-only">小时</span><input aria-label="小时" type="number" min="0" max="23" value={hour} onChange={e=>setHour(e.target.value)} onBlur={()=>setHour(v=>v.padStart(2,'0'))}/></label><span>:</span><label><span className="sr-only">分钟</span><input aria-label="分钟" type="number" min="0" max="59" value={minute} onChange={e=>setMinute(e.target.value)} onBlur={()=>setMinute(v=>v.padStart(2,'0'))}/></label></div>
      <div className="picker-actions"><button type="button" className="text-button" onClick={()=>{onChange('');setOpen(false);trigger.current?.focus()}}>清除日期</button><button type="button" className="primary-button" disabled={!valid} onClick={commit}>应用日期</button></div>
    </div>,document.body)}
  </>
}
