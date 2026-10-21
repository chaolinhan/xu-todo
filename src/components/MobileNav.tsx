import { CalendarDays, CalendarRange, Inbox, Menu, Plus } from 'lucide-react'
import type { ViewKey } from '../types'

interface MobileNavProps {
  currentView: ViewKey
  onViewChange: (view: ViewKey) => void
  onAdd: () => void
  onMenu: () => void
}

export function MobileNav({ currentView, onViewChange, onAdd, onMenu }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="移动端导航">
      <button className={currentView === 'inbox' ? 'is-active' : ''} type="button" onClick={() => onViewChange('inbox')}>
        <Inbox size={20} /><span>收件箱</span>
      </button>
      <button className={currentView === 'today' ? 'is-active' : ''} type="button" onClick={() => onViewChange('today')}>
        <CalendarDays size={20} /><span>今天</span>
      </button>
      <button className="mobile-add" type="button" onClick={onAdd} aria-label="添加任务"><Plus size={23} /></button>
      <button className={currentView === 'upcoming' ? 'is-active' : ''} type="button" onClick={() => onViewChange('upcoming')}>
        <CalendarRange size={20} /><span>预览</span>
      </button>
      <button type="button" onClick={onMenu}>
        <Menu size={20} /><span>更多</span>
      </button>
    </nav>
  )
}
