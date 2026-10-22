import { CheckCheck, Flag, FolderInput, Tag, X } from 'lucide-react'
import type { AppData, Priority, Task } from '../types'
import type { BulkAction } from '../lib/bulk-tasks'
import { DateTimePicker } from './DateTimePicker'
import { Select } from './Select'

interface Props {data:AppData; tasks:Task[]; selected:ReadonlySet<string>; onSelectAll:()=>void; onClose:()=>void; onApply:(action:BulkAction)=>void}
export function BulkToolbar({data,tasks,selected,onSelectAll,onClose,onApply}:Props) {
  const chosen=tasks.filter(task=>selected.has(task.id))
  const allCompleted=chosen.length>0&&chosen.every(task=>task.completed)
  return <section className="bulk-toolbar" role="region" aria-label="批量操作">
    <div className="bulk-summary"><strong>已选 {chosen.length} 项</strong><button type="button" onClick={onSelectAll}>{chosen.length===tasks.length&&tasks.length?'取消全选':'全选当前范围'}</button><button className="icon-button" type="button" aria-label="退出选择" onClick={onClose}><X size={18}/></button></div>
    <div className={`bulk-actions ${chosen.length?'':'is-disabled'}`} inert={!chosen.length}>
      <DateTimePicker compact label="批量设置日期" value="" onChange={value=>onApply({kind:'date',value:value?new Date(value).toISOString():undefined})}/>
      <Select compact label="批量设置优先级" value="" placeholder="优先级" options={[1,2,3,4].map(p=>({value:String(p),label:p===4?'无优先级':`优先级 ${p}`,tone:`p${p}`,icon:<Flag size={14}/>}))} onChange={value=>onApply({kind:'priority',value:Number(value) as Priority})}/>
      <Select compact label="批量移动项目" value="" placeholder="移动到…" options={[{value:'inbox',label:'收件箱',icon:<FolderInput size={14}/>},...data.projects.map(p=>({value:p.id,label:p.name,icon:<FolderInput size={14}/>}))]} onChange={value=>onApply({kind:'project',value})}/>
      {data.labels.length>0&&<Select compact label="批量添加标签" value="" placeholder="添加标签" options={data.labels.map(l=>({value:l.id,label:l.name,icon:<Tag size={14} style={{color:l.color}}/>}))} onChange={value=>onApply({kind:'label',value})}/>}
      <button className="bulk-complete" type="button" onClick={()=>onApply({kind:'completed',value:!allCompleted})}><CheckCheck size={16}/>{allCompleted?'恢复任务':'完成任务'}</button>
    </div>
    {!chosen.length&&<p>点选任务；全选仅作用于当前页面或日历选中日期。</p>}
  </section>
}
