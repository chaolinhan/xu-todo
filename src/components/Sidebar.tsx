import { Filter, History, CheckCheck, Archive, CalendarDays, CalendarRange, ChevronDown, HardDrive, Hash, Inbox, Plus, Search, Settings, Tag, X } from 'lucide-react'
import type { AppData, ViewKey } from '../types'
import { compileFilter } from '../lib/filters'
import { countForView } from '../lib/task-utils'
interface SidebarProps {
  data: AppData; currentView: ViewKey; open: boolean; saved: boolean; offlineReady: boolean; offlineError: boolean; onClose: () => void; onViewChange: (view: ViewKey) => void
  onAddTask: () => void; onSearch: () => void; onAddCollection: (type: 'project' | 'label') => void; onOpenSettings: () => void
}
const views: Array<{ key: ViewKey; label: string; icon: typeof Inbox }> = [
  { key: 'inbox', label: '收件箱', icon: Inbox }, { key: 'today', label: '今天', icon: CalendarDays },
  { key: 'upcoming', label: '预览', icon: CalendarRange }, { key: 'all', label: '全部任务', icon: Archive },
  { key: 'organize', label: '过滤器与标签', icon: Filter }, { key: 'completed', label: '已完成', icon: CheckCheck }, { key: 'activity', label: '活动日志', icon: History },
]
export function Sidebar({ data, currentView, open, saved, offlineReady, offlineError, onClose, onViewChange, onAddTask, onSearch, onAddCollection, onOpenSettings }: SidebarProps) {
  const select = (view: ViewKey) => { onViewChange(view); onClose() }
  return <>
    <button className={`sidebar-scrim ${open ? 'is-visible' : ''}`} type="button" aria-label="关闭导航" onClick={onClose} />
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="主导航">
      <button type="button" className="brand-row" onClick={onOpenSettings} aria-label="小序 · 设置与数据"><span className="brand-mark">序</span><span className="brand-name">小序</span><ChevronDown size={14} /><span className="personal-badge">个人空间</span></button>
      <button className="icon-button sidebar-close" type="button" onClick={onClose} aria-label="关闭导航"><X size={18} /></button>
      <button className="new-task-button" type="button" onClick={onAddTask}><span className="new-task-icon"><Plus size={16} /></span>添加任务<kbd>Q</kbd></button>
      <button className="sidebar-search nav-item" type="button" onClick={() => { onSearch(); onClose() }}><Search size={18} /><span>搜索</span><kbd>/</kbd></button>
      <nav className="nav-stack" aria-label="任务视图">{views.map(({ key, label, icon: Icon }) => <button className={`nav-item ${currentView === key ? 'is-active' : ''}`} type="button" key={key} onClick={() => select(key)} aria-current={currentView === key ? 'page' : undefined}><Icon size={19} strokeWidth={1.7} /><span>{label}</span><span className="nav-count">{key === 'upcoming' ? '' : countForView(data, key) || ''}</span></button>)}</nav>
      <div className="sidebar-section"><div className="sidebar-section-title"><span>我的项目</span><button type="button" onClick={() => onAddCollection('project')} aria-label="新建项目"><Plus size={16} /></button></div><div className="nav-stack">{data.projects.map(p => <button key={p.id} type="button" className={`nav-item ${currentView === `project:${p.id}` ? 'is-active' : ''}`} onClick={() => select(`project:${p.id}`)}><Hash size={19} style={{color:p.color}} /><span>{p.name}</span><span className="nav-count">{countForView(data, `project:${p.id}`) || ''}</span></button>)}</div></div>
      {Boolean(data.filters?.length)&&<div className="sidebar-section"><div className="sidebar-section-title"><button type="button" onClick={()=>select('organize')}>我的过滤器</button></div><div className="nav-stack">{data.filters!.map(f=><button key={f.id} type="button" className={`nav-item ${currentView===`filter:${f.id}`?'is-active':''}`} onClick={()=>select(`filter:${f.id}`)}><Filter size={17} style={{color:f.color}}/><span>{f.name}</span><span className="nav-count">{data.tasks.filter(compileFilter(f.query,data).matches).length||''}</span></button>)}</div></div>}
      <div className="sidebar-section"><div className="sidebar-section-title"><span>标签</span><button type="button" onClick={() => onAddCollection('label')} aria-label="新建标签"><Plus size={16} /></button></div><div className="nav-stack">{data.labels.map(l => <button key={l.id} type="button" className={`nav-item ${currentView === `label:${l.id}` ? 'is-active' : ''}`} onClick={() => select(`label:${l.id}`)}><Tag size={17} style={{color:l.color}} /><span>{l.name}</span><span className="nav-count">{countForView(data, `label:${l.id}`) || ''}</span></button>)}</div></div>
      <div className="sidebar-footer"><div className="local-card"><span className="local-card-icon"><HardDrive size={17} /></span><div><strong>{saved ? '已保存在此设备' : '正在保存…'}</strong><span>{offlineReady ? '无需登录，离线也能继续' : offlineError ? '缓存不可用，请保持服务运行' : '正在准备离线资源…'}</span></div></div><button className="nav-item settings-nav" type="button" onClick={onOpenSettings}><Settings size={17} /><span>设置与备份</span></button><div className="sidebar-caption">给重要的事，留一点位置。</div></div>
    </aside>
  </>
}
