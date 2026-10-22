import { Columns3, List, Settings2 } from 'lucide-react'
import { Select } from './Select'
import type { GroupBy, TaskViewOptions } from '../types'
interface Props {options:TaskViewOptions;onChange:(patch:Partial<TaskViewOptions>)=>void;canManageSections:boolean;onManageSections:()=>void}
const grouping:Array<{key:GroupBy;name:string}>=[{key:'section',name:'版块'},{key:'date',name:'日期'},{key:'priority',name:'优先级'},{key:'project',name:'项目'},{key:'label',name:'标签'},{key:'none',name:'不分组'}]
export function TaskViewToolbar({options,onChange,canManageSections,onManageSections}:Props) {
  return <div className="task-view-toolbar"><div className="task-layout-options" role="group" aria-label="任务布局"><button type="button" aria-label="列表布局" aria-pressed={options.layout==='list'} onClick={()=>onChange({layout:'list'})}><List size={15}/><span>列表</span></button><button type="button" aria-label="看板布局" aria-pressed={options.layout==='board'} onClick={()=>onChange({layout:'board'})}><Columns3 size={15}/><span>看板</span></button></div><div className="grouping-control"><span>分组</span><Select compact label="任务分组方式" value={options.groupBy} onChange={value=>onChange({groupBy:value as GroupBy})} options={grouping.map(g=>({value:g.key,label:g.name}))}/></div>{canManageSections&&<button type="button" className="manage-sections" onClick={onManageSections}><Settings2 size={14}/>管理版块</button>}{options.groupBy==='label'&&<span className="grouping-hint">多标签任务会出现在多个组</span>}</div>
}
