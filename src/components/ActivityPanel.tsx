import { Check, CirclePlus, History, Pencil, RotateCcw, Search, Tag, Trash2, Filter } from 'lucide-react'
import { useMemo, useState } from 'react'
import { activityLabels } from '../lib/activity'
import { Select } from './Select'
import type { ActivityEntry, AppData } from '../types'
interface Props {data:AppData;onOpenTask:(id:string)=>void}
function iconFor(entry:ActivityEntry) {
  if(entry.action==='task_completed')return Check
  if(entry.action==='task_deleted'||entry.action.endsWith('_deleted'))return Trash2
  if(entry.action==='task_reopened'||entry.action==='completion_undone')return RotateCcw
  if(entry.action.startsWith('label_'))return Tag
  if(entry.action.startsWith('filter_'))return Filter
  return entry.action==='task_updated'?Pencil:CirclePlus
}
const timeFormatter=new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit'})
const dayFormatter=new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'short'})
export function ActivityPanel({data,onOpenTask}:Props) {
  const [action,setAction]=useState('all'),[project,setProject]=useState('all'),[period,setPeriod]=useState('all'),[query,setQuery]=useState(''),[limit,setLimit]=useState(50)
  const entries=useMemo(()=>{
    const after=new Date();after.setHours(0,0,0,0);after.setDate(after.getDate()-(period==='7'?6:29))
    return [...(data.activities??[])].filter(e=>(action==='all'||e.action===action)&&(project==='all'||e.projectId===project)&&(period==='all'||new Date(e.at)>=after)&&`${e.title} ${e.detail??''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime())
  },[data.activities,action,project,period,query])
  const groups=new Map<string,ActivityEntry[]>()
  entries.slice(0,limit).forEach(e=>{const day=dayFormatter.format(new Date(e.at));groups.set(day,[...(groups.get(day)??[]),e])})
  const change=()=>setLimit(50)
  return <div className="activity-panel"><div className="activity-toolbar"><label className="activity-search"><Search size={15}/><input aria-label="搜索日志" placeholder="搜索日志…" value={query} onChange={e=>{setQuery(e.target.value);change()}}/></label><Select compact label="日志操作类型" value={action} onChange={value=>{setAction(value);change()}} options={[{value:'all',label:'全部操作'},...Object.entries(activityLabels).map(([value,label])=>({value,label}))]}/><Select compact label="日志所属项目" value={project} onChange={value=>{setProject(value);change()}} options={[{value:'all',label:'全部项目'},{value:'inbox',label:'收件箱'},...data.projects.map(p=>({value:p.id,label:p.name}))]}/><Select compact label="日志时间范围" value={period} onChange={value=>{setPeriod(value);change()}} options={[{value:'all',label:'全部时间'},{value:'7',label:'最近7天'},{value:'30',label:'最近30天'}]}/></div>
    <div className="activity-note"><History size={14}/><span>从启用本功能后的操作开始记录，日志仅保存在此设备，并随备份导出。</span></div>
    {entries.length===0?<div className="organize-empty">{data.activities?.length?'没有符合条件的记录。':'还没有操作记录，下一次添加或完成任务会留在这里。'}</div>:<div className="activity-days">{[...groups].map(([day,events])=><section key={day}><h2>{day}</h2><div className="activity-events">{events.map(entry=>{const Icon=iconFor(entry),task=data.tasks.find(t=>t.id===entry.taskId);return <article className={`activity-event ${entry.action==='task_completed'?'is-done':''}`} key={entry.id}><span className="activity-symbol"><Icon size={16}/></span><div><p><span>{activityLabels[entry.action]}</span>{task?<button onClick={()=>onOpenTask(task.id)}>{entry.title}</button>:<strong>{entry.title}</strong>}</p>{(entry.projectName||entry.detail)&&<small>{[entry.projectName,entry.detail].filter(Boolean).join(' · ')}</small>}</div><time dateTime={entry.at}>{timeFormatter.format(new Date(entry.at))}</time></article>})}</div></section>)}</div>}
    {entries.length>limit&&<button className="secondary-button load-more" onClick={()=>setLimit(n=>n+50)}>加载更多 · 还有 {entries.length-limit} 条</button>}
  </div>
}
