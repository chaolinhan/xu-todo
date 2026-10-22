import { Bell, Calendar, ChevronDown, Flag, Folder, Repeat2, Tag, Trash2, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { AppData, Priority, RecurrenceUnit, Task, TaskDraft } from '../types'
import { createRecurrenceRule } from '../lib/recurrence'
import { DateTimePicker } from './DateTimePicker'
import { PrioritySelect } from './PrioritySelect'
import { Select } from './Select'
import { useDraft } from '../hooks/useDraft'
import { useDialog } from '../hooks/useDialog'
import { fromDateTimeLocal, toDateTimeLocal } from '../lib/task-utils'

interface TaskEditorProps {
  data: AppData
  task?: Task
  defaultProjectId: string
  onClose: () => void
  onSave: (draft: TaskDraft) => void
  onDelete?: () => boolean | void
}

type RecurrenceChoice = 'none' | RecurrenceUnit | 'custom'

interface EditorDraft {
  title:string; description:string; dueAt:string; reminderAt:string; priority:Priority; projectId:string; sectionId:string; labelIds:string[]; recurrenceChoice:RecurrenceChoice; customInterval:string; customUnit:RecurrenceUnit; reminderLinked:boolean
}
function validEditorDraft(value:unknown):value is EditorDraft {
  const v=value as EditorDraft|null
  return Boolean(v&&['title','description','dueAt','reminderAt','projectId','sectionId','customInterval'].every(key=>typeof v[key as keyof EditorDraft]==='string')&&[1,2,3,4].includes(v.priority)&&Array.isArray(v.labelIds)&&v.labelIds.every(id=>typeof id==='string')&&['none','day','weekday','week','month','year','custom'].includes(v.recurrenceChoice)&&['day','weekday','week','month','year'].includes(v.customUnit)&&typeof v.reminderLinked==='boolean'&&[v.dueAt,v.reminderAt].every(date=>!date||Number.isFinite(new Date(date).getTime())))
}

function recurrenceChoiceFor(task?: Task): RecurrenceChoice {
  if (!task?.recurrence) return 'none'
  return task.recurrence.interval === 1 ? task.recurrence.unit : 'custom'
}

export function TaskEditor({ data, task, defaultProjectId, onClose, onSave, onDelete }: TaskEditorProps) {
  const initial:EditorDraft={title:task?.title??'',description:task?.description??'',dueAt:toDateTimeLocal(task?.dueAt),reminderAt:toDateTimeLocal(task?.reminderAt),priority:task?.priority??4,projectId:task?.projectId??defaultProjectId,sectionId:task?.sectionId??'',labelIds:task?.labelIds??[],recurrenceChoice:recurrenceChoiceFor(task),customInterval:String(task?.recurrence?.interval??2),customUnit:task?.recurrence?.unit??'week',reminderLinked:!task||task.reminderAt===task.dueAt}
  const saved=useDraft(`task:${task?.id??'new'}`,initial,validEditorDraft,JSON.stringify(initial))
  const {title,description,dueAt,reminderAt,priority,projectId,sectionId,labelIds,recurrenceChoice,customInterval,customUnit}=saved.value
  const field=<K extends keyof EditorDraft>(name:K,value:EditorDraft[K])=>saved.update(current=>({...current,[name]:value}))
  const titleRef=useRef<HTMLInputElement>(null)
  const panel=useDialog(onClose)
  const [advanced,setAdvanced]=useState(recurrenceChoice!=='none')

  const recurrence = useMemo(() => {
    if (recurrenceChoice === 'none') return undefined
    const due = fromDateTimeLocal(dueAt)
    if (!due) return undefined
    const unit = recurrenceChoice === 'custom' ? customUnit : recurrenceChoice
    const interval = recurrenceChoice === 'custom' ? Number(customInterval) : 1
    if (!Number.isInteger(interval) || interval < 1 || interval > 365) return undefined
    return createRecurrenceRule(unit, interval, due)
  }, [customInterval, customUnit, dueAt, recurrenceChoice])
  const canSave = title.trim().length > 0 && title.trim().length <= 240 && (recurrenceChoice === 'none' || Boolean(recurrence))
  const modeTitle = task ? '编辑任务' : '添加任务'
  const submitLabel = task ? '保存更改' : '添加任务'
  const selectedLabels = useMemo(() => new Set(labelIds), [labelIds])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSave) {
      titleRef.current?.focus()
      return
    }
    onSave({
      title: title.trim(),
      description: description.trim(),
      dueAt: fromDateTimeLocal(dueAt),
      reminderAt: fromDateTimeLocal(reminderAt),
      recurrence,
      priority,
      projectId,
      sectionId:data.sections?.some(s=>s.id===sectionId&&s.projectId===projectId)?sectionId:undefined,
      labelIds:labelIds.filter(id=>data.labels.some(label=>label.id===id)),
    })
    saved.clear()
  }

  const toggleLabel=(id:string)=>field('labelIds',labelIds.includes(id)?labelIds.filter(item=>item!==id):[...labelIds,id])
  const changeDueAt=(value:string)=>saved.update(current=>({...current,dueAt:value,...(current.reminderLinked?{reminderAt:value}:{})}))
  const changeReminderAt=(value:string)=>saved.update(current=>({...current,reminderAt:value,reminderLinked:value===current.dueAt}))

  return (
    <div className="dialog-backdrop editor-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={panel} className="task-editor task-drawer" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
        <header className="dialog-header">
          <div>
            <span className="eyebrow">任务详情</span>
            <h2 id="task-editor-title">{modeTitle}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <form onSubmit={submit}>
          <div className="editor-scroll">
          {(saved.restored||saved.conflict)&&<div className="draft-notice"><span>{saved.conflict?'任务已变更，有一份旧草稿':'已恢复上次草稿'}</span>{saved.conflict&&<button type="button" onClick={saved.restore}>恢复旧草稿</button>}<button type="button" onClick={saved.discard}>丢弃草稿</button></div>}
          {saved.error&&<p className="draft-error" role="alert">{saved.error}</p>}
          <div className="editor-main-fields">
            <input
              ref={titleRef}
              aria-label="编辑任务名称"
              className="title-input"
              value={title}
              onChange={(event) => field('title',event.target.value)}
              placeholder="准备做什么？"
              maxLength={240}
            />
            <textarea
              aria-label="编辑任务描述"
              className="description-input"
              value={description}
              onChange={(event) => field('description',event.target.value)}
              placeholder="补充一点细节……"
              rows={2}
              maxLength={1000}
            />
          </div>

          {title.trim().length>240&&<p className="draft-error" role="alert">任务名称不能超过240字，请缩短后保存。</p>}
          <div className="editor-grid">
            <div className="editor-field">
              <span><Calendar size={16} /> 截止时间</span>
              <DateTimePicker label="截止时间" value={dueAt} onChange={changeDueAt} />
            </div>
            <div className="editor-field">
              <span><Bell size={16} /> 提醒时间</span>
              <DateTimePicker label="提醒时间" value={reminderAt} onChange={changeReminderAt} />
              <small className="field-hint">默认与截止时间相同，可修改或清空</small>
            </div>
            <div className="editor-field">
              <span><Folder size={16} /> 所属项目</span>
              <Select label="所属项目" value={projectId} onChange={value => saved.update(current=>({...current,projectId:value,sectionId:''}))} options={[{value:'inbox',label:'收件箱'},...data.projects.map(project=>({value:project.id,label:project.name}))]} />
            </div>
            <div className="editor-field"><span><Folder size={16}/>所属版块</span><Select label="所属版块" value={sectionId} onChange={value=>field('sectionId',value)} options={[{value:'',label:'未分组'},...(data.sections??[]).filter(s=>s.projectId===projectId).map(s=>({value:s.id,label:s.name}))]} /></div>
            <div className="editor-field priority-field">
              <span><Flag size={16} /> 优先级</span>
              <PrioritySelect value={priority} onChange={value=>field('priority',value)} />
            </div>
            </div>
          <button className="advanced-toggle" type="button" aria-expanded={advanced} onClick={()=>setAdvanced(!advanced)}><Repeat2 size={15}/>重复与高级设置<ChevronDown size={15}/></button>
          {advanced&&<fieldset className="editor-field recurrence-field">
              <legend><Repeat2 size={16} /> 重复</legend>
              <div className="recurrence-controls">
                <Select label="重复规则" value={recurrenceChoice} onChange={value=>field('recurrenceChoice',value as RecurrenceChoice)} options={[{value:'none',label:'不重复'},{value:'day',label:'每天'},{value:'weekday',label:'每个工作日'},{value:'week',label:'每周'},{value:'month',label:'每月'},{value:'year',label:'每年'},{value:'custom',label:'自定义间隔'}]} />
                {recurrenceChoice === 'custom' && (
                  <span className="custom-recurrence">
                    <span>每</span>
                    <input
                      aria-label="重复间隔"
                      type="number"
                      min="1"
                      max="365"
                      inputMode="numeric"
                      value={customInterval}
                      onChange={(event) => field('customInterval',event.target.value)}
                    />
                    <Select label="重复单位" value={customUnit} onChange={value=>field('customUnit',value as RecurrenceUnit)} options={[{value:'day',label:'天'},{value:'week',label:'周'},{value:'month',label:'个月'}]} />
                  </span>
                )}
              </div>
              <small className={`field-hint ${recurrenceChoice !== 'none' && !recurrence ? 'is-error' : ''}`}>
                {recurrenceChoice !== 'none' && !recurrence ? (!dueAt?'重复任务需要截止时间':'重复间隔需要为1到365之间的整数') : '完成后生成下一次任务'}
              </small>
            </fieldset>}

          <fieldset className="label-picker">
            <legend><Tag size={16} /> 标签</legend>
            <div>
              {data.labels.length === 0 && <span className="muted-copy">还没有标签，可从侧边栏创建。</span>}
              {data.labels.map((label) => (
                <button
                  type="button"
                  key={label.id}
                  className={selectedLabels.has(label.id) ? 'is-selected' : ''}
                  aria-pressed={selectedLabels.has(label.id)}
                  onClick={() => toggleLabel(label.id)}
                >
                  <i style={{ backgroundColor: label.color }} />
                  {label.name}
                </button>
              ))}
            </div>
          </fieldset>

          </div>
          <footer className="dialog-actions">
            {task && onDelete ? (
              <button className="danger-text-button" type="button" onClick={()=>{if(onDelete?.()===true)saved.clear()}}>
                <Trash2 size={16} /> 删除
              </button>
            ) : <span />}
            <span className="editor-draft-status">{saved.error?'草稿未保留':saved.dirty?'草稿已保留':'更改后点击保存'}</span>
            <div>
              <button className="text-button" type="button" onClick={onClose}>稍后继续</button>
              <button className="primary-button" type="submit" disabled={!canSave}>{submitLabel}</button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  )
}
