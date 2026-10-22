import { Flag } from 'lucide-react'
import type { Priority } from '../types'
import { Select, type SelectOption } from './Select'

const options: SelectOption[] = [1, 2, 3, 4].map(priority => ({
  value: String(priority),
  label: priority === 4 ? '无优先级' : `优先级 ${priority}`,
  tone: `p${priority}`,
  icon: <Flag size={15} fill={priority < 4 ? 'currentColor' : 'none'} />,
}))

export function PrioritySelect({ value, onChange, label = '优先级', compact = false }: { value?: Priority; onChange: (value: Priority) => void; label?: string; compact?: boolean }) {
  return <Select placeholder="优先级" label={label} value={value === undefined ? '' : String(value)} options={options} compact={compact} onChange={value => onChange(Number(value) as Priority)} />
}
