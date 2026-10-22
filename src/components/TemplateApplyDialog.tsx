import { CalendarDays, CopyPlus, Folder, ListChecks, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { AppData, LocalTemplate } from '../types'
import { describeRecurrence } from '../lib/recurrence'
import { templateDue } from '../lib/templates'
import { toDateTimeLocal } from '../lib/task-utils'
import { useDialog } from '../hooks/useDialog'
import { DateTimePicker } from './DateTimePicker'
import { Select } from './Select'
export interface TemplateOptions {start:string;projectId:string;newProjectName?:string}
interface Props {data:AppData;template:LocalTemplate;onClose:()=>void;onApply:(options:TemplateOptions)=>void}
export function TemplateApplyDialog({data,template,onClose,onApply}:Props) {
 const [start,setStart]=useState(toDateTimeLocal(new Date().toISOString()).slice(0,10))
 const [project,setProject]=useState(template.kind==='project'?'new':'inbox')
 const [name,setName]=useState(`${template.name} ${start}`.slice(0,80))
 const [error,setError]=useState('')
 const panel=useDialog(onClose)
 const preview=useMemo(()=>{
  try{return {tasks:template.tasks.map(task=>({task,due:templateDue(task,start)})),error:''}}
  catch(e){return {tasks:[],error:e instanceof Error?e.message:'日期无效'}}
 },[template,start])
 const invalidName=project==='new'&&(!name.trim()||name.trim().length>80||data.projects.some(p=>p.name===name.trim()))
 const submit=(event:React.FormEvent)=>{
  event.preventDefault();if(invalidName||preview.error)return
  try{onApply({start,projectId:project==='new'?'inbox':project,newProjectName:project==='new'?name:undefined})}catch(e){setError(e instanceof Error?e.message:'无法生成任务')}
 }
 return <div className="dialog-backdrop editor-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section ref={panel} className="task-drawer template-apply" role="dialog" aria-modal="true" aria-labelledby="template-apply-title"><header className="dialog-header"><div><span className="eyebrow">从熟悉的步骤开始</span><h2 id="template-apply-title">使用模板</h2></div><button className="icon-button" type="button" aria-label="关闭模板预览" onClick={onClose}><X size={20}/></button></header>
 <form onSubmit={submit}><div className="editor-scroll"><div className="template-apply-intro"><div className="template-symbol" style={{color:template.color}}><CopyPlus size={23}/></div><div><h3>{template.name}</h3><p>{template.tasks.length} 项任务 · {template.sections.length} 个版块</p></div></div>{template.description&&<p className="template-description">{template.description}</p>}
 <div className="template-apply-controls"><div className="editor-field"><span><CalendarDays size={15}/>起始日期</span><DateTimePicker label="模板起始日期" value={start?`${start}T09:00`:''} onChange={value=>{setStart(value.slice(0,10));setError('')}}/><small>以此日为第1天，保留模板中的时分。</small></div><div className="editor-field"><span><Folder size={15}/>目标项目</span><Select label="模板目标项目" value={project} onChange={value=>{setProject(value);setError('')}} options={[{value:'new',label:'创建新项目'},{value:'inbox',label:'收件箱'},...data.projects.map(p=>({value:p.id,label:p.name}))]}/></div></div>
 {project==='new'&&<label className="template-project-name">新项目名称<input aria-label="模板新项目名称" value={name} maxLength={80} onChange={e=>{setName(e.target.value);setError('')}}/>{invalidName&&<small role="alert">请输入1–80字且不与现有项目重名的名称。</small>}</label>}
 <div className="template-preview-heading"><h3>生成预览</h3><span>确认后一次创建</span></div><ol className="template-preview-list">{preview.tasks.map(({task,due},index)=><li key={index}><div className="template-preview-number">{index+1}</div><div><strong>{task.title}</strong><div className="template-preview-meta">{task.sectionId&&<span>{template.sections.find(s=>s.id===task.sectionId)?.name}</span>}{due?<span>{new Intl.DateTimeFormat('zh-CN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(due))} · 第{task.schedule!.dayOffset+1}天</span>:<span>无日期</span>}{task.subtasks?.length?<span><ListChecks size={12}/>{task.subtasks.length} 项子任务</span>:null}{task.priority!==4&&<span>P{task.priority}</span>}{task.recurrence&&<span>{describeRecurrence(task.recurrence)}</span>}{task.labels.map(label=><span key={label.name}>@{label.name}</span>)}{task.reminderOffsetMinutes!==undefined&&<span>{task.reminderOffsetMinutes===0?'到期提醒':task.reminderOffsetMinutes>0?`提前${task.reminderOffsetMinutes}分钟提醒`:`到期后${-task.reminderOffsetMinutes}分钟提醒`}</span>}</div>{task.subtasks?.length?<ul className="template-step-preview">{task.subtasks.map(step=><li key={step.id}>{step.title}</li>)}</ul>:null}</div></li>)}</ol>
 <p className="template-apply-note">已有同名版块和标签会复用；任务始终新建，完成记录不会带入。</p>{(error||preview.error)&&<p className="draft-error" role="alert">{error||preview.error}</p>}</div><footer className="dialog-actions"><button className="text-button" type="button" onClick={onClose}>取消</button><button className="primary-button" type="submit" disabled={invalidName||Boolean(preview.error)}>创建 {template.tasks.length} 项任务</button></footer></form></section></div>
}
