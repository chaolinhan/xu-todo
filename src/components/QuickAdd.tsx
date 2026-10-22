import { useEffect, useMemo, useRef } from 'react'
import { Hash, ListPlus, Repeat2, Tag, X } from 'lucide-react'
import { DateTimePicker } from './DateTimePicker'
import { PrioritySelect } from './PrioritySelect'
import { Select } from './Select'
import { parseQuickTask } from '../lib/quick-add'
import { createRecurrenceRule, describeRecurrence } from '../lib/recurrence'
import { toDateTimeLocal } from '../lib/task-utils'
import { useDraft } from '../hooks/useDraft'
import { useDialog } from '../hooks/useDialog'
import type { AppData, TaskDraft } from '../types'

interface Props { data:AppData; defaultProjectId:string; defaultDate?:string; defaults?:Partial<TaskDraft>; modal?:boolean; onClose:()=>void; onSave:(task:TaskDraft)=>void; onSaveMany?:(tasks:TaskDraft[])=>void }
interface QuickDraft { text:string; description:string; project:string; ignored:string[]; manualDate?:string; manualPriority?:number; bulkText:string; batch:boolean }
function valid(value:unknown):value is QuickDraft {
  const v=value as QuickDraft|null
  return Boolean(v&&typeof v.text==='string'&&typeof v.description==='string'&&typeof v.project==='string'&&typeof v.bulkText==='string'&&typeof v.batch==='boolean'&&Array.isArray(v.ignored)&&v.ignored.every(t=>typeof t==='string')&&(v.manualPriority===undefined||[1,2,3,4].includes(v.manualPriority))&&(v.manualDate===undefined||v.manualDate===''||Number.isFinite(new Date(v.manualDate).getTime())))
}
export function QuickAdd({data,defaultProjectId,defaultDate,defaults,modal=false,onClose,onSave,onSaveMany}:Props) {
  const initial:QuickDraft={text:'',description:'',project:defaults?.projectId??defaultProjectId,ignored:[],bulkText:'',batch:false}
  const context=[initial.project,defaults?.sectionId??'',defaults?.priority??'',defaults?.labelIds?.join(',')??'',toDateTimeLocal(defaultDate).slice(0,10)].join(':')
  const saved=useDraft(`quick:${context}`,initial,valid)
  const {text,description,project,ignored,manualDate,manualPriority,bulkText,batch}=saved.value
  const input=useRef<HTMLInputElement>(null), bulkInput=useRef<HTMLTextAreaElement>(null)
  useEffect(()=>{if(batch)bulkInput.current?.focus({preventScroll:true})},[batch])
  const panel=useDialog(onClose,modal)
  const change=(patch:Partial<QuickDraft>)=>saved.update(current=>({...current,...patch}))
  const parsed=useMemo(()=>parseQuickTask(text,data,new Date(),project,defaultDate,ignored),[text,data,project,defaultDate,ignored])
  const makeDraft=(raw:string)=>{
    const result=parseQuickTask(raw,data,new Date(),project,defaultDate,ignored)
    const draft:TaskDraft={...result.draft,description,sectionId:result.draft.projectId===defaults?.projectId?defaults?.sectionId:undefined,labelIds:[...new Set([...result.draft.labelIds,...(defaults?.labelIds??[])])],priority:result.recognized.some(t=>/^p[1-4]$/i.test(t))?result.draft.priority:defaults?.priority??result.draft.priority,...(manualPriority!==undefined?{priority:manualPriority as TaskDraft['priority']}:{}) ,...(manualDate!==undefined?{dueAt:manualDate||undefined,reminderAt:manualDate||undefined}:{})}
    if(!data.projects.some(p=>p.id===draft.projectId)&&draft.projectId!=='inbox')draft.projectId='inbox'
    if(!draft.dueAt)draft.recurrence=undefined
    else if(draft.recurrence&&manualDate!==undefined)draft.recurrence=createRecurrenceRule(draft.recurrence.unit,draft.recurrence.interval,draft.dueAt)
    return {draft,warnings:result.warnings}
  }
  const single=makeDraft(text)
  const lines=bulkText.split(/\r?\n/).map(line=>line.trim()).filter(Boolean)
  const batchValid=lines.length>0&&lines.length<=200&&bulkText.length<=100000
  const preview=batch&&batchValid?lines.map(makeDraft):[]
  const invalid=preview.some(({draft})=>!draft.title.trim()||draft.title.length>240)
  const canSave=batch?batchValid&&!invalid&&Boolean(onSaveMany):Boolean(single.draft.title.trim())&&single.draft.title.length<=240
  const submit=(event:React.FormEvent)=>{
    event.preventDefault();if(!canSave)return
    if(batch)onSaveMany?.(preview.map(item=>item.draft));else onSave(single.draft)
    saved.discard()
    if(!modal)input.current?.focus()
  }
  const content=<form className={`quick-add ${modal?'is-modal':''}`} onSubmit={submit} onKeyDown={e=>{if(batch&&e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!e.nativeEvent.isComposing){e.preventDefault();submit(e)}}}>
    <div className="quick-modal-heading"><span>{batch?'批量录入':'快速添加'}</span><button className="icon-button" type="button" aria-label="关闭快速添加" onClick={onClose}><X size={18}/></button></div>
    {(saved.restored||saved.dirty)&&<div className="draft-notice"><span>{saved.restored?'已恢复上次草稿':'草稿自动保留在此浏览器'}</span><button type="button" onClick={saved.discard}>丢弃草稿</button></div>}
    {saved.error&&<p className="draft-error" role="alert">{saved.error}</p>}
    {batch?<div className="batch-input"><textarea ref={bulkInput} aria-label="批量任务清单" autoFocus={!modal} rows={5} value={bulkText} onChange={e=>change({bulkText:e.target.value})}/><p>每行一项任务，支持日期、#项目、@标签和 p1–p4。手动设置日期或优先级会应用到整批。<button type="button" onClick={()=>change({batch:false})}>返回单条录入</button></p></div>:<input ref={input} className="quick-title" aria-label="任务名称" autoFocus={!modal} autoComplete="off" placeholder="例如：明天下午3点 准备会议 #工作 p1" value={text} onChange={e=>change({text:e.target.value,ignored:[]})} onPaste={e=>{const pasted=e.clipboardData.getData('text');if(pasted.split(/\r?\n/).filter(line=>line.trim()).length>1&&onSaveMany){e.preventDefault();change({bulkText:pasted,batch:true,ignored:[]})}}} onKeyDown={e=>{if(e.key==='Enter'&&(e.nativeEvent.isComposing||e.keyCode===229))e.preventDefault()}}/>}
    <textarea aria-label="任务描述" placeholder={batch?'为这些任务添加共同描述（可选）':'描述（可选）'} value={description} onChange={e=>change({description:e.target.value})} rows={1} maxLength={1000}/>
    <div className="quick-controls">
      <DateTimePicker compact label="快速设置日期" value={toDateTimeLocal(batch?(manualDate??makeDraft('').draft.dueAt):single.draft.dueAt)} onChange={value=>change({manualDate:value?new Date(value).toISOString():''})}/>
      <PrioritySelect compact label="快速设置优先级" value={batch?(manualPriority as TaskDraft['priority']|undefined):single.draft.priority} onChange={value=>change({manualPriority:value})}/>
      {!batch&&single.draft.recurrence&&<span className="quick-control"><Repeat2 size={14}/>{describeRecurrence(single.draft.recurrence)}</span>}
      {!batch&&single.draft.labelIds.map(id=><span className="quick-control" key={id}><Tag size={13}/>{data.labels.find(l=>l.id===id)?.name}</span>)}
      {!batch&&onSaveMany&&<button type="button" className="quick-batch-toggle" onClick={()=>change({batch:true,bulkText:bulkText||text})}><ListPlus size={15}/>多行录入</button>}
    </div>
    {batch?<div className="batch-preview" aria-label="批量录入预览"><div className="batch-preview-heading"><strong>{lines.length} 项任务</strong><span>确认后一次添加</span></div>{!batchValid?<p className="parse-warning" role="alert">{!lines.length?'请输入任务，每行一项。':'每批最多200项、10万字符，请分批录入；内容尚未添加。'}</p>:preview.map(({draft,warnings},index)=><div className="batch-preview-row" key={index}><span>{index+1}</span><div><strong>{draft.title||'缺少任务名称'}</strong><small>{draft.projectId==='inbox'?'收件箱':data.projects.find(p=>p.id===draft.projectId)?.name} · {draft.priority===4?'无优先级':`P${draft.priority}`}{draft.dueAt?` · ${toDateTimeLocal(draft.dueAt).replace('T',' ')}`:''}{draft.labelIds.length?` · ${draft.labelIds.map(id=>data.labels.find(label=>label.id===id)?.name).filter(Boolean).join('、')}`:''}{draft.recurrence?` · ${describeRecurrence(draft.recurrence)}`:''}</small>{(!draft.title||draft.title.length>240)&&<p role="alert">任务名称不能为空或超过240字，请修改该行。</p>}{warnings.length>0&&<p>{warnings.join('；')}</p>}</div></div>)}</div>:<>{parsed.recognized.length>0&&<div className="recognized-tokens" aria-label="已识别内容"><span>已识别</span>{[...new Set(parsed.recognized)].map(token=><button key={token} type="button" title="点击保留为普通标题文字" onClick={()=>change({ignored:[...ignored,token]})}>{token}<X size={11}/></button>)}</div>}{parsed.warnings.length>0&&<p className="parse-warning" role="status">{parsed.warnings.join('；')}</p>}{single.draft.title.length>240&&<p className="parse-warning" role="alert">任务名称不能超过240字，内容尚未添加。</p>}</>}
    <footer className="quick-footer"><Select compact variant="quiet" className="quick-project" label="快速设置项目" value={batch?project:single.draft.projectId} options={[{value:'inbox',label:'收件箱',icon:<Hash size={15}/>},...data.projects.map(p=>({value:p.id,label:p.name,icon:<Hash size={15}/>}))]} onChange={value=>change({project:value,text:text.split(/\s+/u).filter(token=>!parsed.recognized.filter(t=>t.startsWith('#')).includes(token)).join(' ')})}/><div><button className="secondary-button" type="button" onClick={onClose}>稍后继续</button><button className="primary-button" type="submit" disabled={!canSave}>{batch?`添加 ${lines.length} 项任务`:'添加任务'}</button></div></footer>
    <p className="quick-hint"><kbd>{batch?'Ctrl / ⌘ + Enter':'Enter'}</kbd> 添加 · <kbd>Esc</kbd> 保留草稿并关闭</p>
  </form>
  return modal?<div className="dialog-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section ref={panel} className="quick-modal" role="dialog" aria-modal="true" aria-label="快速添加任务">{content}</section></div>:<section ref={panel} aria-label="快速添加">{content}</section>
}
