import { Plus, GripVertical, Columns3 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { AppData, Task, TaskGroup } from '../types'
import { TaskRow } from './TaskList'
import { Select } from './Select'
interface Props {canAdd?:boolean;data:AppData;groups:TaskGroup[];onAdd:(group:TaskGroup)=>void;onEdit:(task:Task)=>void;onToggle:(task:Task)=>void;onMove:(taskId:string,source:TaskGroup,target:TaskGroup)=>void}
export function TaskBoard({canAdd=true,data,groups,onAdd,onEdit,onToggle,onMove}:Props) {
  const dragging=useRef<{taskId:string;sourceKey:string}|null>(null)
  const [over,setOver]=useState<string|null>(null)
  const canMove=(task:Task,target:TaskGroup)=>Boolean(target.target)&&!(task.completed&&target.target?.kind==='date')&&!(task.recurrence&&target.target?.kind==='date'&&target.target.day==='none')
  const drop=(target:TaskGroup)=>{
    const active=dragging.current,source=groups.find(g=>g.key===active?.sourceKey),task=data.tasks.find(t=>t.id===active?.taskId)
    if(active&&source&&task&&target.key!==source.key&&canMove(task,target))onMove(active.taskId,source,target)
    dragging.current=null;setOver(null)
  }
  return <div className="task-board" role="region" aria-label="分组看板" tabIndex={0}>
    {groups.length===0&&<div className="board-empty"><Columns3 size={24}/><p>还没有匹配的任务，可以调整分组或添加一项任务。</p></div>}
    {groups.map(group=><section key={group.key} className={`board-column ${over===group.key?'is-drop-target':''}`} aria-label={`看板列：${group.title}`} onDragOver={e=>{const active=dragging.current,task=data.tasks.find(t=>t.id===active?.taskId);if(active&&active.sourceKey!==group.key&&task&&canMove(task,group)){e.preventDefault();e.dataTransfer.dropEffect='move';setOver(group.key)}}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOver(null)}} onDrop={e=>{e.preventDefault();drop(group)}}>
      <header className="board-column-heading"><h2>{group.title}</h2><span>{group.tasks.length}</span>{group.target&&canAdd&&<button className="icon-button" type="button" aria-label={`添加任务到${group.title}`} onClick={()=>onAdd(group)}><Plus size={16}/></button>}</header>
      <div className="board-cards">{group.tasks.map(task=>{
        const targets=groups.filter(g=>g.key!==group.key&&canMove(task,g))
        return <div className="board-card" key={task.id} draggable onDragStart={e=>{dragging.current={taskId:task.id,sourceKey:group.key};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',task.id)}} onDragEnd={()=>{dragging.current=null;setOver(null)}}>
          <TaskRow task={task} data={data} onEdit={onEdit} onToggle={onToggle}/>
          {targets.length>0&&<div className="board-card-footer"><GripVertical size={13} aria-hidden="true"/><Select compact variant="quiet" label={`移动任务：${task.title}`} value="" placeholder="移动到分组…" onChange={value=>{const target=groups.find(g=>g.key===value);if(target)onMove(task.id,group,target)}} options={targets.map(g=>({value:g.key,label:g.title}))}/></div>}
        </div>
      })}</div>
      {group.target&&canAdd?<button className="board-add" type="button" onClick={()=>onAdd(group)}><Plus size={15}/>添加任务</button>:group.tasks.length===0?<p className="board-column-empty">暂无任务</p>:null}
    </section>)}
  </div>
}
