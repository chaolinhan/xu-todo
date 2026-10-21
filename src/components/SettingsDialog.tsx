import { Bell, Database, Download, HardDrive, Laptop, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { AppData } from '../types'

interface SettingsDialogProps {
  data: AppData
  canInstall: boolean
  onClose: () => void
  onExport: () => void
  onImport: (file: File) => Promise<void>
  onEnableNotifications: () => Promise<string>
  onInstall: () => void
}

export function SettingsDialog({
  data,
  canInstall,
  onClose,
  onExport,
  onImport,
  onEnableNotifications,
  onInstall,
}: SettingsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')
  const completed = data.tasks.filter((task) => task.completed).length

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      await onImport(file)
      setStatus('备份已导入，本机数据已更新。')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '导入失败')
    } finally {
      event.target.value = ''
    }
  }

  const enableNotifications = async () => {
    setStatus(await onEnableNotifications())
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-dialog dialog-card" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="dialog-header">
          <div>
            <span className="eyebrow">本地空间</span>
            <h2 id="settings-title">设置与数据</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <div className="settings-intro">
          <HardDrive size={22} />
          <div>
            <strong>你的任务没有离开这台设备</strong>
            <p>数据保存在当前浏览器的 IndexedDB 中，不会上传到服务器。</p>
          </div>
        </div>

        <div className="stats-grid">
          <div><strong>{data.tasks.length}</strong><span>全部任务</span></div>
          <div><strong>{completed}</strong><span>已经完成</span></div>
          <div><strong>{data.projects.length}</strong><span>自建项目</span></div>
        </div>

        <section className="settings-section">
          <div className="settings-section-copy">
            <Database size={18} />
            <div><strong>本地备份</strong><span>导出 JSON 文件，或从备份恢复。</span></div>
          </div>
          <div className="settings-buttons">
            <button className="secondary-button" type="button" onClick={onExport}><Download size={15} /> 导出</button>
            <button className="secondary-button" type="button" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> 导入</button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-copy">
            <Bell size={18} />
            <div><strong>浏览器提醒</strong><span>仅在浏览器运行时可靠触发。</span></div>
          </div>
          <button className="secondary-button" type="button" onClick={enableNotifications}>允许通知</button>
        </section>

        {canInstall && (
          <section className="settings-section">
            <div className="settings-section-copy">
              <Laptop size={18} />
              <div><strong>安装到设备</strong><span>作为独立窗口使用，并支持离线启动。</span></div>
            </div>
            <button className="primary-button small" type="button" onClick={onInstall}>安装应用</button>
          </section>
        )}

        {status && <p className="settings-status" role="status">{status}</p>}
        <footer className="settings-footnote">
          网页版不会自动同步。未来桌面与移动客户端将继续使用本机存储。
        </footer>
      </section>
    </div>
  )
}
