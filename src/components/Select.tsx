import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
  icon?: ReactNode
  tone?: string
  disabled?: boolean
}

interface Props {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  compact?: boolean
  variant?: 'field' | 'quiet'
  className?: string
  disabled?: boolean
}

/** Shared single-choice control. The portal keeps menus clear of scroll containers. */
export function Select({ label, value, options, onChange, placeholder = '请选择', compact = false, variant = 'field', className = '', disabled = false }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 216, maxHeight: 320 })
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const search = useRef({ text: '', at: 0 })
  const id = useId()
  const selected = options.find(option => option.value === value)

  const close = (restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) trigger.current?.focus()
  }
  const show = (edge?: 'first' | 'last') => {
    const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0)
    const selectedIndex = options.findIndex(option => option.value === value && !option.disabled)
    setActive(edge === 'last' ? enabled.at(-1) ?? -1 : edge === 'first' ? enabled[0] ?? -1 : selectedIndex >= 0 ? selectedIndex : enabled[0] ?? -1)
    search.current = { text: '', at: 0 }
    setOpen(true)
  }
  const choose = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    close(true)
    onChange(option.value)
  }

  useLayoutEffect(() => {
    if (!open) return
    const reposition = () => {
      if (!trigger.current || !panel.current) return
      const box = trigger.current.getBoundingClientRect()
      const below = window.innerHeight - box.bottom - 18
      const above = box.top - 18
      const height = panel.current.getBoundingClientRect().height
      const useAbove = below < height && above > below
      setPosition({
        width: Math.min(Math.max(box.width, 216), window.innerWidth - 24),
        left: Math.max(12, Math.min(box.left, window.innerWidth - Math.max(216, box.width) - 12)),
        top: Math.max(12, useAbove ? box.top - Math.min(height, above) - 6 : box.bottom + 6),
        maxHeight: Math.min(320, Math.max(60, useAbove ? above : below)),
      })
    }
    reposition()
    panel.current?.focus()
    window.addEventListener('resize', reposition)
    document.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      document.removeEventListener('scroll', reposition, true)
    }
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    panel.current?.querySelector<HTMLElement>(`[data-option-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [active, open])

  useEffect(() => {
    if (!open) return
    const outside = (event: MouseEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      close(true)
    }
    document.addEventListener('mousedown', outside)
    window.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('mousedown', outside)
      window.removeEventListener('keydown', escape, true)
    }
  }, [open])

  return <>
    <button ref={trigger} type="button" role="combobox" aria-label={label} aria-expanded={open} aria-haspopup="listbox" aria-controls={open ? id : undefined} disabled={disabled}
      className={`app-select ${compact ? 'is-small' : ''} is-${variant} ${selected?.tone ?? ''} ${className}`}
      onClick={() => open ? close() : show()}
      onKeyDown={event => {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault()
          show(event.key === 'Home' ? 'first' : event.key === 'End' || event.key === 'ArrowUp' ? 'last' : undefined)
        }
      }}>
      {selected?.icon && <span className="select-leading" aria-hidden="true">{selected.icon}</span>}
      <span className={`select-value ${selected ? '' : 'is-placeholder'}`}>{selected?.label ?? placeholder}</span>
      <ChevronDown size={13} className="select-chevron" aria-hidden="true" />
    </button>
    {open && createPortal(<div ref={panel} id={id} role="listbox" aria-label={label} tabIndex={-1} aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
      className="select-popover" style={position}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) close() }}
      onKeyDown={event => {
        if (event.key === 'Tab') { close(true); return }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault(); event.stopPropagation()
          const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0)
          const current = enabled.indexOf(active)
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length
          setActive(enabled[next] ?? -1)
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); event.stopPropagation(); choose(active)
        } else if (event.key.length === 1 && !event.nativeEvent.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault(); event.stopPropagation()
          const now = Date.now()
          search.current = { text: now - search.current.at > 700 ? event.key : search.current.text + event.key, at: now }
          const match = options.findIndex(option => !option.disabled && option.label.toLocaleLowerCase().startsWith(search.current.text.toLocaleLowerCase()))
          if (match >= 0) setActive(match)
        }
      }}>
      {options.map((option, index) => <div key={option.value} id={`${id}-${index}`} role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined} data-option-index={index}
        className={`select-option ${index === active ? 'is-active' : ''} ${option.tone ?? ''}`}
        onMouseDown={event => event.preventDefault()}
        onMouseMove={() => !option.disabled && setActive(index)}
        onClick={() => choose(index)}>
        {option.icon && <span className="select-leading" aria-hidden="true">{option.icon}</span>}
        <span>{option.label}</span>
        {option.value === value && <Check size={14} className="select-check" aria-hidden="true" />}
      </div>)}
      {options.length === 0 && <div className="select-empty">暂无选项</div>}
    </div>, document.body)}
  </>
}
