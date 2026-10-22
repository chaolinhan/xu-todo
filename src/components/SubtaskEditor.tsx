import { ArrowDown, ArrowUp, Check, ListChecks, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { Subtask } from '../types'
import { createId } from '../lib/id'
import { subtaskProgress } from '../lib/subtasks'

interface Props {steps:Subtask[];input:string;onInput:(value:string)=>void;onChange:(steps:Subtask[])=>void}
export function SubtaskEditor({steps,input,onInput,onChange}:Props) {
 const [error,setError]=useState('')
 const progress=subtaskProgress(steps)
 const add=()=>{
  const lines=input.split(/\r?\n/).map(line=>line.trim()).filter(Boolean)
  if(!lines.length)return
  if(steps.length+lines.length>200||lines.some(line=>line.length>240)){setError('最多200项子任务，每项名称不超过240字；请修改后添加。');return}
  onChange([...steps,...lines.map(title=>({id:createId('step'),title,completed:false}))]);onInput('');setError('')
 }
 const move=(index:number,direction:number)=>{const next=[...steps];[next[index],next[index+direction]]=[next[index+direction],next[index]];onChange(next)}
 return <section className="subtask-editor" aria-label="子任务编辑">
  <div className="subtask-heading"><h3><ListChecks size={16}/>子任务</h3><span>{progress.completed}/{progress.total}</span></div>
  {progress.total>0&&<div className="subtask-track" role="progressbar" aria-label="子任务完成进度" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.completed}><i style={{width:`${progress.completed/progress.total*100}%`}}/></div>}
  <div className="subtask-rows">{steps.map((step,index)=><div className={`subtask-row ${step.completed?'is-done':''}`} key={step.id}>
   <button className="subtask-check" type="button" aria-label={`${step.completed?'恢复':'完成'}子任务：${step.title||'未命名'}`} aria-pressed={step.completed} onClick={()=>onChange(steps.map(s=>s.id===step.id?{...s,completed:!s.completed}:s))}><Check size={12}/></button>
   <input aria-label={`子任务名称 ${index+1}`} value={step.title} maxLength={240} placeholder="子任务名称" onChange={event=>onChange(steps.map(s=>s.id===step.id?{...s,title:event.target.value}:s))}/>
   <div className="subtask-row-actions"><button className="icon-button" type="button" disabled={index===0} aria-label={`上移子任务：${step.title}`} onClick={()=>move(index,-1)}><ArrowUp size={13}/></button><button className="icon-button" type="button" disabled={index===steps.length-1} aria-label={`下移子任务：${step.title}`} onClick={()=>move(index,1)}><ArrowDown size={13}/></button><button className="icon-button" type="button" aria-label={`移除子任务：${step.title}`} onClick={()=>onChange(steps.filter(s=>s.id!==step.id))}><X size={13}/></button></div>
  </div>)}</div>
  <div className="subtask-add"><textarea aria-label="添加子任务" rows={1} value={input} placeholder="添加子任务，也可粘贴多行" onChange={e=>{onInput(e.target.value);setError('')}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();add()}}}/><button type="button" onClick={add} disabled={!input.trim()} aria-label="添加这些子任务"><Plus size={16}/></button></div>
  {error&&<p className="draft-error" role="alert">{error}</p>}
  {steps.some(s=>!s.title.trim())&&<p className="draft-error" role="alert">请补全空白子任务名称，或移除这一项。</p>}
  {input.trim()&&<p className="field-hint">按 Enter 或点击 + 将这些内容加入清单，再保存任务。</p>}
  <p className="subtask-help">全部步骤勾选后仍需完成父任务；完成父任务会勾选剩余步骤，重复任务下次重置。</p>
 </section>
}
