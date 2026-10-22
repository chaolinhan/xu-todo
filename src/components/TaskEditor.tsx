import { Bell, Calendar, Flag, Folder, Repeat2, Tag, Trash2, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { AppData, Priority, RecurrenceUnit, Task, TaskDraft } from '../types'
import { createRecurrenceRule } from '../lib/recurrence'
import { DateTimePicker } from './DateTimePicker'
import { PrioritySelect } from './PrioritySelect'
import { Select } from './Select'
import { fromDateTimeLocal, toDateTimeLocal } from '../lib/task-utils'

interface TaskEditorProps {
  data: AppData
  task?: Task
  defaultProjectId: string
  onClose: () => void
  onSave: (draft: TaskDraft) => void
  onDelete?: () => void
}

type RecurrenceChoice = 'none' | RecurrenceUnit | 'custom'

function recurrenceChoiceFor(task?: Task): RecurrenceChoice {
  if (!task?.recurrence) return 'none'
  return task.recurrence.interval === 1 ? task.recurrence.unit : 'custom'
}

export function TaskEditor({ data, task, defaultProjectId, onClose, onSave, onDelete }: TaskEditorProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [dueAt, setDueAt] = useState(toDateTimeLocal(task?.dueAt))
  const [reminderAt, setReminderAt] = useState(toDateTimeLocal(task?.reminderAt))
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 4)
  const [projectId, setProjectId] = useState(task?.projectId ?? defaultProjectId)
  const [sectionId,setSectionId] = useState(task?.sectionId ?? '')
  const [labelIds, setLabelIds] = useState<string[]>(task?.labelIds ?? [])
  const [recurrenceChoice, setRecurrenceChoice] = useState<RecurrenceChoice>(recurrenceChoiceFor(task))
  const [customInterval, setCustomInterval] = useState(String(task?.recurrence?.interval ?? 2))
  const [customUnit, setCustomUnit] = useState<RecurrenceUnit>(task?.recurrence?.unit ?? 'week')
  const titleRef = useRef<HTMLInputElement>(null)
  const reminderLinkedRef = useRef(!task || task.reminderAt === task.dueAt)

  const recurrence = useMemo(() => {
    if (recurrenceChoice === 'none') return undefined
    const due = fromDateTimeLocal(dueAt)
    if (!due) return undefined
    const unit = recurrenceChoice === 'custom' ? customUnit : recurrenceChoice
    const interval = recurrenceChoice === 'custom' ? Number(customInterval) : 1
    if (!Number.isInteger(interval) || interval < 1 || interval > 365) return undefined
    return createRecurrenceRule(unit, interval, due)
  }, [customInterval, customUnit, dueAt, recurrenceChoice])
  const canSave = title.trim().length > 0 && (recurrenceChoice === 'none' || Boolean(recurrence))
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
      labelIds,
    })
  }

  const toggleLabel = (labelId: string) => {
    setLabelIds((current) =>
      current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId],
    )
  }

  const changeDueAt = (value: string) => {
    setDueAt(value)
    if (reminderLinkedRef.current) {
      setReminderAt(value)
      reminderLinkedRef.current = true
    }
  }

  const changeReminderAt = (value: string) => {
    setReminderAt(value)
    reminderLinkedRef.current = value === dueAt
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="task-editor dialog-card" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
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
          <div className="editor-main-fields">
            <input
              ref={titleRef}
              aria-label="编辑任务名称"
              className="title-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="准备做什么？"
              autoFocus
              maxLength={180}
            />
            <textarea
              aria-label="编辑任务描述"
              className="description-input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="补充一点细节……"
              rows={3}
              maxLength={1000}
            />
          </div>

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
              <Select label="所属项目" value={projectId} onChange={value => {setProjectId(value);setSectionId('')}} options={[{value:'inbox',label:'收件箱'},...data.projects.map(project=>({value:project.id,label:project.name}))]} />
            </div>
            <div className="editor-field"><span><Folder size={16}/>所属版块</span><Select label="所属版块" value={sectionId} onChange={setSectionId} options={[{value:'',label:'未分组'},...(data.sections??[]).filter(s=>s.projectId===projectId).map(s=>({value:s.id,label:s.name}))]} /></div>
            <div className="editor-field priority-field">
              <span><Flag size={16} /> 优先级</span>
              <PrioritySelect value={priority} onChange={setPriority} />
            </div>
            <fieldset className="editor-field recurrence-field">
              <legend><Repeat2 size={16} /> 重复</legend>
              <div className="recurrence-controls">
                <Select label="重复规则" value={recurrenceChoice} onChange={value=>setRecurrenceChoice(value as RecurrenceChoice)} options={[{value:'none',label:'不重复'},{value:'day',label:'每天'},{value:'weekday',label:'每个工作日'},{value:'week',label:'每周'},{value:'month',label:'每月'},{value:'year',label:'每年'},{value:'custom',label:'自定义间隔'}]} />
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
                      onChange={(event) => setCustomInterval(event.target.value)}
                    />
                    <Select label="重复单位" value={customUnit} onChange={value=>setCustomUnit(value as RecurrenceUnit)} options={[{value:'day',label:'天'},{value:'week',label:'周'},{value:'month',label:'个月'}]} />
                  </span>
                )}
              </div>
              <small className={`field-hint ${recurrenceChoice !== 'none' && !dueAt ? 'is-error' : ''}`}>
                {recurrenceChoice !== 'none' && !dueAt ? '重复任务需要截止时间' : '完成后生成下一次任务'}
              </small>
            </fieldset>
          </div>

          <fieldset className="label-picker">
            <legend><Tag size={16} /> 标签</legend>
            <div>
              {data.labels.length === 0 && <span className="muted-copy">还没有标签，可从侧边栏创建。</span>}
              {data.labels.map((label) => (
                <button
                  type="button"
                  key={label.id}
                  className={selectedLabels.has(label.id) ? 'is-selected' : ''}
                  onClick={() => toggleLabel(label.id)}
                >
                  <i style={{ backgroundColor: label.color }} />
                  {label.name}
                </button>
              ))}
            </div>
          </fieldset>

          <footer className="dialog-actions">
            {task && onDelete ? (
              <button className="danger-text-button" type="button" onClick={onDelete}>
                <Trash2 size={16} /> 删除
              </button>
            ) : <span />}
            <div>
              <button className="text-button" type="button" onClick={onClose}>取消</button>
              <button className="primary-button" type="submit" disabled={!canSave}>{submitLabel}</button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  )
}
