import { useState } from 'react'
import { Bell, Calendar, Check, ChevronDown, Pencil, Plus, Repeat2, Tag as TagIcon } from 'lucide-react'
import { describeRecurrence } from '../lib/recurrence'
import type { AppData, Task, TaskGroup } from '../types'

interface TaskListProps {
  data: AppData
  groups: TaskGroup[]
  query: string
  onAdd: () => void
  hideAdd?: boolean
  onGroupAdd?: (group:TaskGroup) => void
  onEdit: (task: Task) => void
  onToggle: (task: Task) => void
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatTaskDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDelta = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(date)
  if (dayDelta === 0) return `今天 ${time}`
  if (dayDelta === 1) return `明天 ${time}`
  if (dayDelta === -1) return `昨天 ${time}`
  return dateFormatter.format(date)
}

export function TaskRow({ task, data, onEdit, onToggle }: Omit<TaskListProps, 'groups' | 'query' | 'onAdd'> & { task: Task }) {
  const project = task.projectId === 'inbox' ? null : data.projects.find((item) => item.id === task.projectId)
  const labels = data.labels.filter((label) => task.labelIds.includes(label.id))

  return (
    <article className={`task-row priority-${task.priority} ${task.completed ? 'is-completed' : ''}`}>
      <button
        className="task-check"
        type="button"
        onClick={() => onToggle(task)}
        aria-label={task.completed ? `恢复任务：${task.title}` : `完成任务：${task.title}`}
      >
        <Check size={14} />
      </button>
      <button className="task-content" type="button" onClick={() => onEdit(task)}>
        <span className="task-title">{task.title}</span>
        {task.description && <span className="task-description">{task.description}</span>}
        <span className="task-meta">
          {task.completedAt && <span className="completion-date"><Check size={13}/>完成于 {dateFormatter.format(new Date(task.completedAt))}</span>}
          {task.dueAt && (
            <span className={new Date(task.dueAt) < new Date() && !task.completed ? 'is-overdue' : ''}>
              <Calendar size={13} />
              {formatTaskDate(task.dueAt)}
            </span>
          )}
          {task.reminderAt && (
            <span title={`提醒：${dateFormatter.format(new Date(task.reminderAt))}`}>
              <Bell size={13} />
            </span>
          )}
          {task.recurrence && (
            <span title="完成后会自动生成下一次任务">
              <Repeat2 size={13} />
              {describeRecurrence(task.recurrence)}
            </span>
          )}
          {project && (
            <span>
              <i className="project-dot" style={{ backgroundColor: project.color }} />
              {project.name}
            </span>
          )}
          {labels.map((label) => (
            <span className="task-label" key={label.id}>
              <TagIcon size={12} style={{ color: label.color }} />
              {label.name}
            </span>
          ))}
        </span>
      </button>
      <button className="row-edit icon-button" type="button" aria-label={`编辑任务：${task.title}`} onClick={() => onEdit(task)}><Pencil size={15} /></button>
    </article>
  )
}

export function TaskList({ data, groups, query, onAdd, onEdit, onToggle, hideAdd, onGroupAdd }: TaskListProps) {
  const [collapsed, setCollapsed] = useState<string[]>([])
  if (groups.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-orbit" aria-hidden="true"><Check size={31} /></div>
        <h2>{query ? '没有找到相关任务' : hideAdd ? '暂时没有匹配的任务' : '这里很安静'}</h2>
        <p>{query ? '换个关键词，或者清空搜索后再试试。' : hideAdd ? '完成的任务会保留，也可以换一个条件继续查看。' : '把脑海里的下一件事放进来，剩下的交给小序。'}</p>
        {!query && !hideAdd && (
          <button className="secondary-button" type="button" onClick={onAdd}>
            <Plus size={16} /> 创建第一个任务
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="task-groups">
      {groups.map((group) => (
        <section className="task-group" key={group.key}>
          <div className="task-group-title-row"><button className={`task-group-heading ${group.key === 'overdue' ? 'overdue-heading' : ''}`} type="button" aria-expanded={!collapsed.includes(group.key)} onClick={() => setCollapsed(current => current.includes(group.key) ? current.filter(key => key !== group.key) : [...current, group.key])}>
            <ChevronDown size={14} className={collapsed.includes(group.key) ? 'is-collapsed' : ''} /><h2>{group.title}</h2><span>{group.tasks.length}</span>
          </button>{onGroupAdd&&group.target&&<button className="icon-button group-add-button" type="button" aria-label={`添加任务到${group.title}`} onClick={()=>onGroupAdd(group)}><Plus size={15}/></button>}</div>
          {!collapsed.includes(group.key) && <div className="task-list">
            {group.tasks.map((task) => (
              <TaskRow key={task.id} task={task} data={data} onEdit={onEdit} onToggle={onToggle} />
            ))}
          </div>}
        </section>
      ))}
      {!hideAdd && <button className="inline-add" type="button" onClick={onAdd}><Plus size={17} /> 添加任务</button>}
    </div>
  )
}
