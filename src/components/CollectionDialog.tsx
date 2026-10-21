import { Tag, X } from 'lucide-react'
import { useRef, useState } from 'react'

interface CollectionDialogProps {
  initial?: { name:string; color:string }
  existingNames?: string[]
  type: 'project' | 'label'
  onClose: () => void
  onCreate: (name: string, color: string) => void
}

const colors = ['#d56b52', '#d89a45', '#7d8f69', '#4c7186', '#826a98', '#b0677b']

export function CollectionDialog({ type, initial, existingNames=[], onClose, onCreate }: CollectionDialogProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? colors[0])
  const inputRef = useRef<HTMLInputElement>(null)
  const label = type === 'project' ? '项目' : '标签'

  const duplicate = existingNames.includes(name.trim())
  const invalidName = /["&|!()]/.test(name)
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || duplicate || invalidName) {
      inputRef.current?.focus()
      return
    }
    onCreate(name.trim(), color)
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="collection-dialog dialog-card" role="dialog" aria-modal="true" aria-labelledby="collection-title">
        <header className="dialog-header">
          <div>
            <span className="eyebrow">我的清单</span>
            <h2 id="collection-title">{initial?'编辑':'新建'}{label}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>
        <form onSubmit={submit}>
          <label className="collection-name-field">
            <span>{label}名称</span>
            <div>
              {type === 'label' ? <Tag size={17} style={{ color }} /> : <i style={{ backgroundColor: color }} />}
              <input
                ref={inputRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={type === 'project' ? '例如：旅行计划' : '例如：等待中'}
                maxLength={32}
                autoFocus
              />
            </div>
          </label>
          {duplicate && <p className="field-error" role="alert">已经有同名{label}了，请换个名称。</p>}
          {invalidName && <p className="field-error" role="alert">名称请勿包含双引号、括号或 & | ! 等查询符号。</p>}
          <fieldset className="color-picker">
            <legend>选择颜色</legend>
            <div>
              {colors.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={color === option ? 'is-selected' : ''}
                  style={{ '--swatch': option } as React.CSSProperties}
                  onClick={() => setColor(option)}
                  aria-label={`选择颜色 ${option}`}
                />
              ))}
            </div>
          </fieldset>
          <footer className="dialog-actions">
            <span />
            <div>
              <button className="text-button" type="button" onClick={onClose}>取消</button>
              <button className="primary-button" type="submit" disabled={!name.trim() || duplicate || invalidName}>{initial?'保存更改':`创建${label}`}</button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  )
}
