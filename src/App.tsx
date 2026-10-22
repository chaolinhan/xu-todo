import { Pencil, CheckCheck, CloudOff, Menu, Plus, Search, SlidersHorizontal, SquareCheck, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react'
import { CollectionDialog } from './components/CollectionDialog'
import { MobileNav } from './components/MobileNav'
import { SettingsDialog } from './components/SettingsDialog'
import { Sidebar } from './components/Sidebar'
import { TaskEditor } from './components/TaskEditor'
import { TaskList } from './components/TaskList'
import { QuickAdd } from './components/QuickAdd'
import { OrganizationHub } from './components/OrganizationHub'
import { FilterEditor } from './components/FilterEditor'
import { ActivityPanel } from './components/ActivityPanel'
import { CalendarPreview } from './components/CalendarPreview'
import { TaskBoard } from './components/TaskBoard'
import { SectionManager } from './components/SectionManager'
import { TaskViewToolbar } from './components/TaskViewToolbar'
import { Select } from './components/Select'
import { BrandMark } from './components/BrandMark'
import { BulkToolbar } from './components/BulkToolbar'
import { applyBulkAction, undoBulkAction, type BulkAction, type BulkUndo } from './lib/bulk-tasks'
import { localDateKey } from './lib/calendar'
import { defaultTaskView, defaultsForGroup, groupTasksForView, moveTaskToGroup, removeSection, reorderSection, validSectionId } from './lib/grouping'
import { recordActivity, removeLabel, updateLabel } from './lib/activity'
import { compileFilter } from './lib/filters'
import { downloadBackup, isAppData, parseBackup } from './lib/backup'
import { createId } from './lib/id'
import { createNextTaskOccurrence } from './lib/recurrence'
import { deliverDueReminders, getDueReminders, requestReminderPermission } from './lib/reminders'
import { appRepository } from './lib/repository'
import { createInitialData } from './lib/seed'
import { filterTasks, getViewTitle } from './lib/task-utils'
import type { AppData, Label, Project, Task, TaskDraft, ViewKey, SavedFilter, ViewPreferences, ProjectSection, TaskGroup, TaskViewOptions } from './types'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type CollectionType = 'project' | 'label'

const currentDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'long',
})

export default function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [view, setView] = useState<ViewKey>('today')
  const [previewDate, setPreviewDate] = useState(() => new Date())
  const [query, setQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [creatingTask, setCreatingTask] = useState(new URLSearchParams(location.search).get('action') === 'add')
  const [inlineAdding, setInlineAdding] = useState(false)
  const [quickDefaults,setQuickDefaults] = useState<Partial<TaskDraft>>()
  const [sectionManagerOpen,setSectionManagerOpen] = useState(false)
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [offlineReady, setOfflineReady] = useState(Boolean(navigator.serviceWorker?.controller))
  const [offlineError, setOfflineError] = useState(false)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const saveRevision = useRef(0)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [collectionDialog, setCollectionDialog] = useState<CollectionType | null>(null)
  const [editingLabel, setEditingLabel] = useState<Label | null>(null)
  const [filterDialog, setFilterDialog] = useState<{filter?:SavedFilter;query?:string} | null>(null)
  const [clock, setClock] = useState(() => new Date())
  const preferences = data?.preferences ?? {showCompleted:false,compact:false,sortMode:'date' as const}
  const {showCompleted,compact,sortMode} = preferences
  const changePreferences = (patch:Partial<ViewPreferences>) => setData(current => current ? {...current,preferences:{...(current.preferences??preferences),...patch}} : current)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    undoTaskId?: string
    generatedTaskId?: string
    undoBatch?: BulkUndo
  } | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const dataRef = useRef<AppData | null>(null)
  const reminderDeliveryRef = useRef(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const workspaceRef=useRef<HTMLDivElement>(null)
  const [selectionMode,setSelectionMode]=useState(false)
  const [selectedIds,setSelectedIds]=useState<Set<string>>(new Set())
  useLayoutEffect(()=>{
    if(workspaceRef.current)workspaceRef.current.scrollTop=0
    setSelectionMode(false);setSelectedIds(new Set())
  },[view,query,Boolean(data)])
  useEffect(()=>{setSelectionMode(false);setSelectedIds(new Set())},[localDateKey(previewDate)])

  useEffect(() => {
    let active = true
    appRepository
      .load()
      .then((stored) => {
        if (stored !== null && !isAppData(stored)) throw new Error('本机数据格式异常，请先保留浏览器数据并从备份恢复。')
        if (active) setData(stored ?? createInitialData())
      })
      .catch((error) => {
        if (!active) return
        setLoadError(error instanceof Error ? error.message : '无法读取本机数据')
        // Keep existing storage intact when a read fails; never save starter data over it.
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    dataRef.current = data
    if (!data) return
    setSaved(false)
    const revision = ++saveRevision.current
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => appRepository.save(data))
    void saveQueue.current.then(() => {
      if (revision === saveRevision.current) { setSaveError(''); setSaved(true) }
    }).catch(() => { setSaveError('本地保存失败，请立即导出备份'); setSaved(false) })
  }, [data])

  useEffect(() => {
    const showDueReminders = async () => {
      const current = dataRef.current
      if (!current || reminderDeliveryRef.current) return
      const due = getDueReminders(current)
      if (due.length === 0) return
      reminderDeliveryRef.current = true
      const deliveredBySystem = await deliverDueReminders(due)
      const deliveredAt = new Date().toISOString()
      const dueIds = new Set(due.map((task) => task.id))
      setData((latest) => latest ? {
        ...latest,
        tasks: latest.tasks.map((task) => dueIds.has(task.id) ? { ...task, remindedAt: deliveredAt } : task),
      } : latest)
      if (!deliveredBySystem) {
        const title = due.length === 1 ? due[0].title : `${due.length} 个任务提醒已到期`
        setToast(current=>current?.undoBatch||current?.undoTaskId?current:{message:`提醒：${title}`})
      }
      reminderDeliveryRef.current = false
    }

    void showDueReminders()
    const timer = window.setInterval(showDueReminders, 15_000)
    return () => window.clearInterval(timer)
  }, [data !== null])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), toast.undoBatch || toast.undoTaskId ? 12_000 : 5_000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const cacheReady = () => { setOfflineReady(true); setOfflineError(false) }
    const cacheFailed = () => setOfflineError(true)
    window.addEventListener('xiaoxu:offline-ready', cacheReady)
    window.addEventListener('xiaoxu:offline-error', cacheFailed)
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('beforeinstallprompt', onInstallPrompt)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('xiaoxu:offline-ready', cacheReady)
      window.removeEventListener('xiaoxu:offline-error', cacheFailed)
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if (event.key === '/' && !typing) {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key.toLocaleLowerCase() === 'q' && !typing) {
        event.preventDefault()
        setQuickDefaults(undefined)
        setCreatingTask(true)
      }
      if (event.key === 'Escape') {
        if(document.querySelector('.task-drawer,.quick-modal'))return
        setSelectionMode(false);setSelectedIds(new Set())
        setCreatingTask(false)
        setInlineAdding(false)
        setViewOptionsOpen(false)
        setEditingTaskId(null)
        setCollectionDialog(null)
        setEditingLabel(null)
        setFilterDialog(null)
        setSectionManagerOpen(false)
        setSettingsOpen(false)
        setSidebarOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const tick = () => setClock(new Date())
    const timer = window.setInterval(tick,60_000)
    window.addEventListener('focus',tick)
    return () => {window.clearInterval(timer);window.removeEventListener('focus',tick)}
  },[])
  const selectedFilter = view.startsWith('filter:') ? data?.filters?.find(f=>f.id===view.slice(7)) : undefined
  const compiledFilter = useMemo(() => selectedFilter && data ? compileFilter(selectedFilter.query,data,clock) : undefined,[selectedFilter,data,clock])
  const tasks = useMemo(() => {
    if (!data) return []
    const filtered = !query && view.startsWith('filter:')
      ? data.tasks.filter(compiledFilter?.matches ?? (()=>false))
      : filterTasks(data.tasks, query ? 'all' : view, query,clock).filter(task => view === 'completed' && !query || showCompleted || !task.completed)
    if (view === 'completed' && !query) return filtered.sort((a,b)=>new Date(b.completedAt??b.updatedAt).getTime()-new Date(a.completedAt??a.updatedAt).getTime())
    return sortMode === 'priority' ? filtered.sort((a, b) => Number(a.completed) - Number(b.completed) || a.priority - b.priority) : filtered
  }, [data, query, view, showCompleted, sortMode, compiledFilter, clock])
  const taskViewKey = query ? 'search' : view
  const taskViewOptions = data?.preferences?.taskViews?.[taskViewKey] ?? defaultTaskView(query?'all':view)
  const changeTaskView = (patch:Partial<TaskViewOptions>) => setData(current=>current?{...current,preferences:{...(current.preferences??preferences),taskViews:{...current.preferences?.taskViews,[taskViewKey]:{...taskViewOptions,...patch}}}}:current)
  const groups = useMemo(() => data?groupTasksForView(data,tasks,taskViewOptions.groupBy,query?'all':view,clock,taskViewOptions.layout==='board'):[], [data,tasks,taskViewOptions.groupBy,taskViewOptions.layout,view,query,clock])
  const editingTask = data?.tasks.find((task) => task.id === editingTaskId)

  const visibleTasks=!query&&view==='upcoming'&&data?data.tasks.filter(task=>task.dueAt&&localDateKey(new Date(task.dueAt))===localDateKey(previewDate)&&(showCompleted||!task.completed)):tasks
  const visibleIds=new Set(visibleTasks.map(task=>task.id))
  const selectedVisible=new Set([...selectedIds].filter(id=>visibleIds.has(id)))
  const selection={active:selectionMode,selected:selectedVisible,onSelect:(id:string)=>setSelectedIds(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next})}
  const selectAll=()=>setSelectedIds(selectedVisible.size===visibleIds.size?new Set():visibleIds)
  const applyBatch=(action:BulkAction)=>{
    if(!data)return
    try {
      const result=applyBulkAction(data,selectedVisible,action)
      if(!result.count){setToast({message:'所选任务已是这个状态'});return}
      setData(result.data);setToast({message:`已更新 ${result.count} 项任务`,undoBatch:result.undo})
    }catch(error){setToast({message:error instanceof Error?error.message:'无法完成批量操作'})}
  }
  const undoBatch=()=>{
    if(!data||!toast?.undoBatch)return
    try {setData(undoBulkAction(data,toast.undoBatch));setToast({message:'已撤销批量操作'})}
    catch(error){setToast({message:error instanceof Error?error.message:'无法撤销'})}
  }
  const saveMany=(drafts:TaskDraft[])=>{
    if(!data||!drafts.length)return
    const timestamp=new Date().toISOString()
    const added:Task[]=drafts.map(draft=>({...draft,id:createId('task'),sectionId:validSectionId(data,draft.projectId,draft.sectionId),completed:false,createdAt:timestamp,updatedAt:timestamp}))
    let next={...data,tasks:[...added,...data.tasks]}
    for(const task of added)next=recordActivity(next,'task_created',task.title,task,'多行录入')
    setData(next);setCreatingTask(false);setToast({message:`已添加 ${added.length} 项任务`,undoBatch:{before:[],after:[],added}})
  }

  const defaultProjectId = view.startsWith('project:') ? view.slice('project:'.length) : 'inbox'
  const defaultQuickDate = view === 'upcoming' ? new Date(previewDate.getFullYear(),previewDate.getMonth(),previewDate.getDate(),9).toISOString() : view === 'today' ? new Date().toISOString() : undefined

  const saveTask = useCallback((input: TaskDraft) => {
    const draft={...input,sectionId:data?validSectionId(data,input.projectId,input.sectionId):undefined}
    const now = new Date().toISOString()
    setData((current) => {
      if (!current) return current
      if (editingTaskId) {
        const updated = {
          ...current,
          tasks: current.tasks.map((task) => task.id === editingTaskId ? {
            ...task,
            ...draft,
            updatedAt: now,
            remindedAt: draft.reminderAt === task.reminderAt ? task.remindedAt : undefined,
          } : task),
        }
        return recordActivity(updated,'task_updated',draft.title,updated.tasks.find(t=>t.id===editingTaskId))
      }
      const newTask: Task = {
        id: createId('task'),
        ...draft,
        completed: false,
        createdAt: now,
        updatedAt: now,
      }
      return recordActivity({ ...current, tasks: [newTask, ...current.tasks] },'task_created',newTask.title,newTask)
    })
    setToast({ message: editingTaskId ? '任务已更新' : '任务已添加' })
    setEditingTaskId(null)
    setCreatingTask(false)
  }, [editingTaskId,data])

  const toggleTask = (task: Task) => {
    const completed = !task.completed
    const completedAt = new Date()
    const timestamp = completedAt.toISOString()
    const alreadyHasSuccessor = data?.tasks.some((item) => item.previousOccurrenceId === task.id) ?? false
    const nextTask = completed && !alreadyHasSuccessor
      ? createNextTaskOccurrence(task, completedAt, createId('task'))
      : null
    setData((current) => {
      if (!current) return current
      const updatedTasks = current.tasks.map((item) => item.id === task.id ? {
        ...item,
        completed,
        completedAt: completed ? timestamp : undefined,
        updatedAt: timestamp,
        seriesId: nextTask ? item.seriesId ?? item.id : item.seriesId,
      } : item)
      return recordActivity({...current,tasks:nextTask ? [nextTask,...updatedTasks] : updatedTasks},completed?'task_completed':'task_reopened',task.title,task,nextTask?'已安排下一次重复任务':undefined)
    })
    setToast(completed ? {
      message: nextTask ? '任务已完成，下一次已安排' : '任务已完成',
      undoTaskId: task.id,
      generatedTaskId: nextTask?.id,
    } : { message: '任务已恢复' })
  }

  const undoCompletion = () => {
    const taskId = toast?.undoTaskId
    const generatedTaskId = toast?.generatedTaskId
    if (!taskId) return
    const timestamp = new Date().toISOString()
    setData(current => {
      if(!current)return current
      const task=current.tasks.find(t=>t.id===taskId)
      return recordActivity({...current,tasks:current.tasks.filter(t=>t.id!==generatedTaskId).map(t=>t.id===taskId?{...t,completed:false,completedAt:undefined,updatedAt:timestamp}:t)},'completion_undone',task?.title??'任务',task)
    })
    setToast({ message: '已撤销完成' })
  }

  const deleteTask = () => {
    if (!editingTaskId || !window.confirm('确定要删除这个任务吗？此操作无法撤销。')) return
    setData(current => {
      if(!current)return current
      const task=current.tasks.find(t=>t.id===editingTaskId)
      return recordActivity({...current,tasks:current.tasks.filter(t=>t.id!==editingTaskId)},'task_deleted',task?.title??'任务',task)
    })
    setEditingTaskId(null)
    setToast({ message: '任务已删除' })
    return true
  }

  const createCollection = (name: string, color: string) => {
    const createdAt = new Date().toISOString()
    setData((current) => {
      if (!current || !collectionDialog) return current
      if (collectionDialog === 'project') {
        const project: Project = { id: createId('project'), name, color, createdAt }
        return recordActivity({ ...current, projects: [...current.projects, project] },'project_created',name)
      }
      if(editingLabel) return recordActivity(updateLabel(current,{...editingLabel,name,color}),'label_updated',name,undefined,editingLabel.name!==name?`原名称：${editingLabel.name}`:undefined)
      const label: Label = { id: createId('label'), name, color, createdAt }
      return recordActivity({ ...current, labels: [...current.labels, label] },'label_created',name)
    })
    setToast({ message: `${collectionDialog === 'project' ? '项目' : '标签'}已${editingLabel?'更新':'创建'}` })
    setCollectionDialog(null)
    setEditingLabel(null)
  }

  const saveFilter = (name:string,query:string,color:string) => {
    const previous=filterDialog?.filter
    const filter:SavedFilter=previous?{...previous,name,query,color}:{id:createId('filter'),name,query,color,createdAt:new Date().toISOString()}
    setData(current=>current?recordActivity({...current,filters:previous?(current.filters??[]).map(f=>f.id===filter.id?filter:f):[...(current.filters??[]),filter]},previous?'filter_updated':'filter_created',name):current)
    setFilterDialog(null);setView(`filter:${filter.id}`);setQuery('')
    setToast({message:'过滤器已保存'})
  }
  const deleteFilter = (filter:SavedFilter) => {
    if(!window.confirm(`删除过滤器“${filter.name}”？任务会保留。`))return
    setData(current=>current?recordActivity({...current,filters:current.filters?.filter(f=>f.id!==filter.id)},'filter_deleted',filter.name):current)
    if(view===`filter:${filter.id}`)setView('organize')
  }
  const deleteLabel = (label:Label) => {
    if(!window.confirm(`删除标签“${label.name}”？仅移除任务上的标签，所有任务会保留；引用此标签的过滤器需要重新编辑。`))return
    setData(current=>current?recordActivity(removeLabel(current,label.id),'label_deleted',label.name):current)
    if(view===`label:${label.id}`)setView('organize')
    setToast({message:'标签已删除，任务已保留'})
  }
  const openLabel = (label?:Label) => {setEditingLabel(label??null);setCollectionDialog('label')}

  const sectionProjectId = view==='inbox'?'inbox':view.startsWith('project:')?view.slice(8):null
  const startGroupAdd = (group?:TaskGroup) => {
    if(!data)return
    const defaults=defaultsForGroup(data,group?.target)
    setQuickDefaults({...defaults,projectId:defaults.projectId??defaultProjectId})
    setCreatingTask(true)
  }
  const saveSection = (name:string,section?:ProjectSection) => {
    if(!sectionProjectId)return
    const next:ProjectSection=section?{...section,name}:{id:createId('section'),projectId:sectionProjectId,name,createdAt:new Date().toISOString()}
    setData(current=>current?recordActivity({...current,sections:section?(current.sections??[]).map(s=>s.id===section.id?next:s):[...(current.sections??[]),next]},section?'section_updated':'section_created',name):current)
    setToast({message:section?'版块已更新':'版块已添加'})
  }
  const deleteSection = (section:ProjectSection) => {
    if(!window.confirm(`删除版块“${section.name}”？所有任务将保留并回到“未分组”。`))return
    setData(current=>current?recordActivity(removeSection(current,section.id),'section_deleted',section.name):current)
    setToast({message:'版块已删除，任务已保留'})
  }
  const moveBoardTask = (taskId:string,source:TaskGroup,target:TaskGroup) => {
    if(!target.target||!data)return
    const task=data.tasks.find(t=>t.id===taskId)
    if(!task)return
    try {
      // Validate before enqueueing state so invalid moves never escape through render.
      moveTaskToGroup(data,task,target.target,source.target)
      setData(current=>{
        if(!current)return current
        const latest=current.tasks.find(t=>t.id===taskId)
        if(!latest)return current
        const moved=moveTaskToGroup(current,latest,target.target!,source.target)
        return recordActivity({...current,tasks:current.tasks.map(t=>t.id===taskId?moved:t)},'task_moved',latest.title,moved,`${source.title} → ${target.title}`)
      })
      setToast({message:`已移到${target.title}`})
    }catch(error){setToast({message:error instanceof Error?error.message:'暂时无法移动任务'})}
  }

  const importBackup = async (file: File) => {
    const imported = recordActivity(parseBackup(await file.text()),'backup_imported','恢复本地备份')
    if (!window.confirm('导入将替换此浏览器中的所有任务、项目、版块、标签、过滤器和日志。请确认已有备份，是否继续？')) throw new Error('已取消导入，当前数据未更改')
    await saveQueue.current.catch(() => {})
    await appRepository.save(imported)
    setData(imported)
    setView('today')
    setQuery('')
  }

  const enableNotifications = async (): Promise<string> => {
    const result = await requestReminderPermission()
    if (result === 'granted') return '系统通知已允许。网页运行时，到期提醒会显示在通知中心。'
    if (result === 'denied') return '通知权限已被拒绝，请在浏览器的网站设置中重新开启。'
    return '当前浏览器不支持系统通知，将继续使用应用内提醒。'
  }

  const installApp = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

  if (loadError) return <main className="loading-screen"><BrandMark large/><h1>暂时无法读取本机任务</h1><p>{loadError}</p><p>现有数据未被替换。请关闭隐私模式，或检查浏览器的存储权限。</p><button className="primary-button" onClick={() => location.reload()}>重新读取</button></main>

  if (!data) {
    return (
      <main className="loading-screen">
        <BrandMark large/>
        <p>正在打开你的本地清单…</p>
      </main>
    )
  }

  const title = getViewTitle(data, view)
  const openTasks = tasks.filter((task) => !task.completed).length
  const organizePage = !query && view==='organize'
  const activityPage = !query && view==='activity'
  const completedPage = !query && view==='completed'
  const previewPage = !query && view==='upcoming'
  const pageSubtitle = previewPage ? '从一天到整个月，给接下来的事留好位置。' : organizePage ? `${data.filters?.length??0} 个过滤器 · ${data.labels.length} 个标签` : activityPage ? `${data.activities?.length??0} 条本地记录` : completedPage ? `${tasks.length} 个已完成任务，可随时恢复` : `${openTasks} 个待办${tasks.length>openTasks?` · ${tasks.length-openTasks} 个已完成`:''}`

  return (
    <div className={`app-shell ${compact ? 'is-compact' : ''} ${selectionMode?'has-selection':''} ${!organizePage&&!activityPage&&!previewPage&&taskViewOptions.layout==='board'?'has-board':''}`}>
      <Sidebar
        data={data}
        currentView={view}
        open={sidebarOpen}
        saved={saved}
        offlineReady={offlineReady}
        offlineError={offlineError}
        onClose={() => setSidebarOpen(false)}
        onViewChange={next => { setView(next); setQuery(''); setInlineAdding(false) }}
        onAddTask={() => {setQuickDefaults(undefined);setCreatingTask(true)}}
        onSearch={() => searchRef.current?.focus()}
        onAddCollection={type=>{setEditingLabel(null);setCollectionDialog(type)}}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleFavorite={key=>changePreferences({favoriteViews:preferences.favoriteViews?.includes(key)?preferences.favoriteViews.filter(view=>view!==key):[...(preferences.favoriteViews??[]),key]})}
      />

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button desktop-menu" type="button" onClick={() => setSidebarOpen(true)} aria-label="打开导航">
            <Menu size={20} />
          </button>
          <div className="search-box">
            <Search size={17} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索任务…"
              aria-label="搜索任务"
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} aria-label="清空搜索"><X size={15} /></button>
            ) : <kbd>/</kbd>}
          </div>
          <div className="topbar-actions">
            {!online && <span className="offline-badge"><CloudOff size={14} /> 离线</span>}
            <button className="view-options-trigger" type="button" aria-expanded={viewOptionsOpen} onClick={() => setViewOptionsOpen(!viewOptionsOpen)}><SlidersHorizontal size={15} /> 视图</button>
            {viewOptionsOpen && <div className="view-options" role="group" aria-label="视图选项"><strong>显示与排序</strong><label><input type="checkbox" checked={showCompleted} onChange={e => changePreferences({showCompleted:e.target.checked})} /> 显示已完成任务</label><label><input type="checkbox" checked={compact} onChange={e => changePreferences({compact:e.target.checked})} /> 紧凑列表</label><div className="view-sort-control"><span>排序</span><Select compact label="任务排序" value={sortMode} onChange={value=>changePreferences({sortMode:value as 'date' | 'priority'})} options={[{value:'date',label:'日期优先'},{value:'priority',label:'优先级优先'}]}/></div><button type="button" className="text-button" onClick={() => setViewOptionsOpen(false)}>完成</button></div>}
          </div>
        </header>

        <div className="workspace-scroll" ref={workspaceRef}>
          <section className="view-header">
            <div>
              <div className="date-kicker">{currentDateFormatter.format(new Date())}</div>
              <h1>{query ? '搜索结果' : title}</h1>
              <p><CheckCheck size={14} />{query ? `全部任务中找到 ${tasks.length} 项` : pageSubtitle}{!query && !organizePage && !activityPage && !completedPage && !previewPage && <span className="header-note">把注意力留给当下。</span>}</p>
            </div>
            {!organizePage&&!activityPage&&visibleTasks.length>0&&<button type="button" className={`selection-trigger ${selectionMode?'is-active':''}`} aria-pressed={selectionMode} onClick={()=>{setSelectionMode(!selectionMode);setSelectedIds(new Set())}}><SquareCheck size={16}/>{selectionMode?'退出选择':'选择任务'}</button>}
            {organizePage ? <button className="header-add" onClick={()=>setFilterDialog({})}><Plus size={16}/>新建过滤器</button> : activityPage || completedPage ? null : <div className="header-buttons">{selectedFilter&&!query&&<button className="header-add" onClick={()=>setFilterDialog({filter:selectedFilter})}><Pencil size={15}/>编辑过滤器</button>}<button className="header-add" type="button" onClick={() => { if(previewPage){setQuickDefaults(undefined);setCreatingTask(true)}else if(taskViewOptions.layout==='board')startGroupAdd();else setInlineAdding(true); setQuery('') }}><Plus size={16} />添加任务</button></div>}
          </section>

          {(loadError || saveError) && (
            <div className="storage-warning" role="alert">
              <CloudOff size={18} /> {loadError || saveError}。建议先导出备份。
            </div>
          )}

          {organizePage ? <OrganizationHub data={data} onView={setView} onFilter={(filter,query)=>setFilterDialog({filter,query})} onDeleteFilter={deleteFilter} onLabel={openLabel} onDeleteLabel={deleteLabel}/> : activityPage ? <ActivityPanel data={data} onOpenTask={setEditingTaskId}/> : previewPage ? <CalendarPreview data={data} date={previewDate} now={clock} mode={preferences.previewMode??'week'} showCompleted={showCompleted} sortMode={sortMode} onDateChange={setPreviewDate} onModeChange={previewMode=>changePreferences({previewMode})} onAdd={date=>{setQuickDefaults(undefined);setPreviewDate(date);setCreatingTask(true)}} onEdit={task=>setEditingTaskId(task.id)} onToggle={toggleTask} onShowAll={()=>setView('all')} selection={selection}/> : <>
          <TaskViewToolbar options={taskViewOptions} onChange={changeTaskView} canManageSections={Boolean(sectionProjectId&&!query)} onManageSections={()=>setSectionManagerOpen(true)}/>
          {selectedFilter && !query && <div className={`filter-view-query ${compiledFilter?.error?'has-error':''}`}><code>{selectedFilter.query}</code><span>{compiledFilter?.error??'此视图按查询条件匹配，也可包含已完成任务'}</span></div>}
          {taskViewOptions.layout==='board'?<TaskBoard canAdd={!completedPage} data={data} groups={groups} onAdd={startGroupAdd} onEdit={task=>setEditingTaskId(task.id)} onToggle={toggleTask} onMove={moveBoardTask} selection={selection}/>:<TaskList
            data={data}
            groups={groups}
            query={query}
            onAdd={() => setInlineAdding(true)}
            onEdit={(task) => setEditingTaskId(task.id)}
            onToggle={toggleTask}
            selection={selection}
            hideAdd={inlineAdding || completedPage || Boolean(selectedFilter&&!query)}
            onGroupAdd={completedPage?undefined:startGroupAdd}
          />}
          {inlineAdding && taskViewOptions.layout==='list' && <QuickAdd key={view} data={data} defaultProjectId={defaultProjectId} defaultDate={defaultQuickDate} onClose={() => setInlineAdding(false)} onSave={saveTask} onSaveMany={saveMany} />}
          <div className="list-footnote"><span>一件一件，慢慢完成。</span><span><kbd>Q</kbd> 快速添加</span></div></>}
        </div>
      </main>

      {selectionMode&&!organizePage&&!activityPage&&<BulkToolbar data={data} tasks={visibleTasks} selected={selectedVisible} onSelectAll={selectAll} onClose={()=>{setSelectionMode(false);setSelectedIds(new Set())}} onApply={applyBatch}/>}

      <MobileNav currentView={view} onViewChange={setView} onAdd={() => {setQuickDefaults(undefined);setCreatingTask(true)}} onMenu={() => setSidebarOpen(true)} />

      {creatingTask && <QuickAdd modal data={data} defaults={quickDefaults} defaultProjectId={quickDefaults?.projectId??defaultProjectId} defaultDate={quickDefaults&&Object.hasOwn(quickDefaults,'dueAt')?quickDefaults.dueAt:defaultQuickDate} onClose={() => setCreatingTask(false)} onSave={saveTask} onSaveMany={saveMany} />}

      {editingTask && (
        <TaskEditor
          key={editingTask?.id ?? 'new'}
          data={data}
          task={editingTask}
          defaultProjectId={defaultProjectId}
          onClose={() => { setCreatingTask(false); setEditingTaskId(null) }}
          onSave={saveTask}
          onDelete={editingTask ? deleteTask : undefined}
        />
      )}

      {collectionDialog && (
        <CollectionDialog type={collectionDialog} initial={editingLabel??undefined} existingNames={(collectionDialog==='label'?data.labels.filter(l=>l.id!==editingLabel?.id):data.projects).map(c=>c.name)} onClose={() => {setCollectionDialog(null);setEditingLabel(null)}} onCreate={createCollection} />
      )}

      {filterDialog && <FilterEditor data={data} filter={filterDialog.filter} initialQuery={filterDialog.query} onClose={()=>setFilterDialog(null)} onSave={saveFilter}/>}

      {sectionManagerOpen&&sectionProjectId&&<SectionManager sections={(data.sections??[]).filter(s=>s.projectId===sectionProjectId)} onClose={()=>setSectionManagerOpen(false)} onSave={saveSection} onDelete={deleteSection} onReorder={(section,direction)=>setData(current=>current?recordActivity(reorderSection(current,section,direction),'section_reordered',section.name):current)}/>}
      {settingsOpen && (
        <SettingsDialog
          data={data}
          canInstall={Boolean(installPrompt)}
          onClose={() => setSettingsOpen(false)}
          onExport={() => downloadBackup(data)}
          onImport={importBackup}
          onEnableNotifications={enableNotifications}
          onInstall={installApp}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.undoBatch&&<button type="button" onClick={undoBatch}>撤销</button>}
          {toast.undoTaskId && <button type="button" onClick={undoCompletion}>撤销</button>}
          <button className="toast-close" type="button" onClick={() => setToast(null)} aria-label="关闭提示"><X size={15} /></button>
        </div>
      )}
    </div>
  )
}
