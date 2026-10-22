import { useMemo, useRef, useState } from 'react'
import { Hash, Repeat2, Tag, X } from 'lucide-react'
import { DateTimePicker } from './DateTimePicker'
import { PrioritySelect } from './PrioritySelect'
import { Select } from './Select'
import { parseQuickTask } from '../lib/quick-add'
import { createRecurrenceRule, describeRecurrence } from '../lib/recurrence'
import { toDateTimeLocal } from '../lib/task-utils'
import type { AppData, TaskDraft } from '../types'

interface Props { data: AppData; defaultProjectId: string; defaultDate?: string; defaults?: Partial<TaskDraft>; modal?: boolean; onClose: () => void; onSave: (task: TaskDraft) => void }
export function QuickAdd({ data, defaultProjectId, defaultDate, defaults, modal = false, onClose, onSave }: Props) {
  const [text, setText] = useState(''), [description, setDescription] = useState(''), [project, setProject] = useState(defaults?.projectId ?? defaultProjectId)
  const [ignored, setIgnored] = useState<string[]>([]), [manualDate, setManualDate] = useState<string | undefined>(), [manualPriority, setManualPriority] = useState<number | undefined>()
  const input = useRef<HTMLInputElement>(null)
  const parsed = useMemo(() => parseQuickTask(text, data, new Date(), project, defaultDate, ignored), [text, data, project, defaultDate, ignored])
  const draft = { ...parsed.draft, description, sectionId:parsed.draft.projectId===defaults?.projectId?defaults?.sectionId:undefined, labelIds:[...new Set([...parsed.draft.labelIds,...(defaults?.labelIds??[])])], priority:parsed.recognized.some(t=>/^p[1-4]$/i.test(t))?parsed.draft.priority:defaults?.priority??parsed.draft.priority, ...(manualPriority !== undefined ? { priority: manualPriority as TaskDraft['priority'] } : {}), ...(manualDate !== undefined ? { dueAt: manualDate || undefined, reminderAt: manualDate || undefined } : {}) }
  // Removing a date from a repeating entry also removes its calendar rule.
  if (!draft.dueAt) draft.recurrence = undefined
  else if (draft.recurrence && manualDate !== undefined) draft.recurrence = createRecurrenceRule(draft.recurrence.unit, draft.recurrence.interval, draft.dueAt)
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); if (!draft.title.trim()) return
    onSave(draft); if (!modal) { setText(''); setDescription(''); setIgnored([]); setManualDate(undefined); setManualPriority(undefined); input.current?.focus() }
  }
  const content = <form className={`quick-add ${modal ? 'is-modal' : ''}`} onSubmit={submit}>
    {modal && <div className="quick-modal-heading"><span>快速添加</span><button className="icon-button" type="button" aria-label="关闭快速添加" onClick={onClose}><X size={17} /></button></div>}
    <input ref={input} className="quick-title" aria-label="任务名称" autoFocus autoComplete="off" maxLength={240} placeholder="例如：明天下午3点 准备会议 #工作 p1" value={text} onChange={e => { setText(e.target.value); setIgnored([]) }} onKeyDown={e => { if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault() }} />
    <textarea aria-label="任务描述" placeholder="描述" value={description} onChange={e => setDescription(e.target.value)} rows={1} maxLength={1000} />
    <div className="quick-controls">
      <DateTimePicker compact label="快速设置日期" value={toDateTimeLocal(draft.dueAt)} onChange={value => setManualDate(value ? new Date(value).toISOString() : '')} />
      <PrioritySelect compact label="快速设置优先级" value={draft.priority} onChange={setManualPriority} />
      {draft.recurrence && <span className="quick-control"><Repeat2 size={14} />{describeRecurrence(draft.recurrence)}</span>}
      {draft.labelIds.map(id => <span className="quick-control" key={id}><Tag size={13} />{data.labels.find(l => l.id === id)?.name}</span>)}
    </div>
    {parsed.recognized.length > 0 && <div className="recognized-tokens" aria-label="已识别内容"><span>已识别</span>{[...new Set(parsed.recognized)].map(token => <button key={token} type="button" title="点击保留为普通标题文字" onClick={() => setIgnored(current => [...current, token])}>{token}<X size={11} /></button>)}</div>}
    {parsed.warnings.length > 0 && <p className="parse-warning" role="status">{parsed.warnings.join('；')}</p>}
    <footer className="quick-footer"><Select compact variant="quiet" className="quick-project" label="快速设置项目" value={draft.projectId} options={[{value:'inbox',label:'收件箱',icon:<Hash size={15}/>},...data.projects.map(p=>({value:p.id,label:p.name,icon:<Hash size={15}/>}))]} onChange={value => { setProject(value); setText(current => current.split(/\s+/u).filter(token => !parsed.recognized.filter(t => t.startsWith('#')).includes(token)).join(' ')) }} /><div><button className="secondary-button" type="button" onClick={onClose}>取消</button><button className="primary-button" type="submit" disabled={!draft.title.trim()}>添加任务</button></div></footer>
    <p className="quick-hint"><kbd>Enter</kbd> 添加 · <kbd>Esc</kbd> 关闭 · #项目 · @标签 · p1–p4</p>
  </form>
  return modal ? <div className="dialog-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="quick-modal" role="dialog" aria-modal="true" aria-label="快速添加任务">{content}</section></div> : content
}
