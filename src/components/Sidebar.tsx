import { FileStack, Filter, History, CheckCheck, Archive, CalendarDays, CalendarRange, ChevronDown, HardDrive, Hash, Inbox, Plus, Search, Settings, Star, Tag, X } from 'lucide-react'
import { useState } from 'react'
import type { AppData, ViewKey } from '../types'
import { compileFilter } from '../lib/filters'
import { countForView, getViewTitle } from '../lib/task-utils'
import { BrandMark } from './BrandMark'
interface SidebarProps {
  data:AppData; currentView:ViewKey; open:boolean; saved:boolean; offlineReady:boolean; offlineError:boolean; onClose:()=>void; onViewChange:(view:ViewKey)=>void
  onAddTask:()=>void; onSearch:()=>void; onAddCollection:(type:'project'|'label')=>void; onOpenSettings:()=>void; onToggleFavorite:(key:ViewKey)=>void
}
const views:Array<{key:ViewKey;label:string;icon:typeof Inbox}>=[
  {key:'inbox',label:'收件箱',icon:Inbox},{key:'today',label:'今天',icon:CalendarDays},{key:'upcoming',label:'预览',icon:CalendarRange},{key:'all',label:'全部任务',icon:Archive},
  {key:'templates',label:'模板库',icon:FileStack},{key:'organize',label:'过滤器与标签',icon:Filter},{key:'completed',label:'已完成',icon:CheckCheck},{key:'activity',label:'活动日志',icon:History},
]
export function Sidebar({data,currentView,open,saved,offlineReady,offlineError,onClose,onViewChange,onAddTask,onSearch,onAddCollection,onOpenSettings,onToggleFavorite}:SidebarProps) {
  const [collapsed,setCollapsed]=useState<string[]>([])
  const select=(view:ViewKey)=>{onViewChange(view);onClose()}
  const favorites=data.preferences?.favoriteViews??[]
  const validFavorites=favorites.filter(key=>key.startsWith('project:')?data.projects.some(p=>p.id===key.slice(8)):key.startsWith('label:')?data.labels.some(l=>l.id===key.slice(6)):key.startsWith('filter:')?data.filters?.some(f=>f.id===key.slice(7)):false)
  const row=(key:ViewKey,name:string,Icon:typeof Hash,color?:string)=>{
    const count=key.startsWith('filter:')?data.tasks.filter(compileFilter(data.filters?.find(f=>f.id===key.slice(7))?.query??'',data).matches).length:countForView(data,key)
    return <div className="sidebar-link" key={key}><button type="button" className={`nav-item ${currentView===key?'is-active':''}`} aria-current={currentView===key?'page':undefined} onClick={()=>select(key)}><Icon size={17} style={{color}}/><span>{name}</span><span className="nav-count">{count||''}</span></button><button className={`favorite-toggle ${favorites.includes(key)?'is-favorite':''}`} type="button" aria-label={`${favorites.includes(key)?'取消收藏':'收藏'}：${name}`} aria-pressed={favorites.includes(key)} onClick={()=>onToggleFavorite(key)}><Star size={13} fill={favorites.includes(key)?'currentColor':'none'}/></button></div>
  }
  const section=(key:string,name:string,content:React.ReactNode,add?:()=>void)=><section className="sidebar-section" key={key}><div className="sidebar-section-title"><button className="collection-heading" type="button" aria-expanded={!collapsed.includes(key)} onClick={()=>setCollapsed(old=>old.includes(key)?old.filter(item=>item!==key):[...old,key])}><ChevronDown size={12}/><span>{name}</span></button>{add&&<button type="button" onClick={add} aria-label={`新建${key==='projects'?'项目':'标签'}`}><Plus size={15}/></button>}</div>{!collapsed.includes(key)&&<div className="nav-stack">{content}</div>}</section>
  return <>
    <button className={`sidebar-scrim ${open?'is-visible':''}`} type="button" aria-label="关闭导航" onClick={onClose}/>
    <aside className={`sidebar ${open?'is-open':''}`} aria-label="主导航">
      <div className="sidebar-top"><button type="button" className="brand-row" onClick={onOpenSettings} aria-label="小序 · 设置与数据"><BrandMark/><span className="brand-name">小序</span><span className="brand-caption">让事情井然有序</span></button><button className="icon-button sidebar-close" type="button" onClick={onClose} aria-label="关闭导航"><X size={18}/></button><button className="new-task-button" type="button" onClick={onAddTask}><span className="new-task-icon"><Plus size={16}/></span>添加任务<kbd>Q</kbd></button><button className="sidebar-search nav-item" type="button" onClick={()=>{onSearch();onClose()}}><Search size={18}/><span>搜索任务</span><kbd>/</kbd></button></div>
      <div className="sidebar-scroll"><nav className="nav-stack" aria-label="任务视图">{views.map(({key,label,icon:Icon})=><button className={`nav-item ${currentView===key?'is-active':''}`} type="button" key={key} onClick={()=>select(key)} aria-current={currentView===key?'page':undefined}><Icon size={18} strokeWidth={1.7}/><span>{label}</span><span className="nav-count">{key==='upcoming'?'':countForView(data,key)||''}</span></button>)}</nav>
        {validFavorites.length>0&&section('favorites','收藏',validFavorites.map(key=>row(key,getViewTitle(data,key),Star)))}
        {section('projects','我的项目',data.projects.map(p=>row(`project:${p.id}`,p.name,Hash,p.color)),()=>onAddCollection('project'))}
        {Boolean(data.filters?.length)&&section('filters','我的过滤器',data.filters!.map(f=>row(`filter:${f.id}`,f.name,Filter,f.color)))}
        {section('labels','标签',data.labels.map(l=>row(`label:${l.id}`,l.name,Tag,l.color)),()=>onAddCollection('label'))}
      </div>
      <div className="sidebar-footer"><div className="local-card"><span className="local-card-icon"><HardDrive size={16}/></span><div><strong>{saved?'已保存在此设备':'正在保存…'}</strong><span>{offlineReady?'离线资源已就绪':offlineError?'缓存不可用，请保持服务运行':'正在准备离线资源…'}</span></div></div><button className="nav-item settings-nav" type="button" onClick={onOpenSettings}><Settings size={17}/><span>设置与备份</span></button></div>
    </aside>
  </>
}
