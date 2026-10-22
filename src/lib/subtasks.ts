import type { Subtask } from '../types'

export function validSubtasks(value: unknown): value is Subtask[] {
  if (!Array.isArray(value) || value.length > 200) return false
  const ids = new Set<string>()
  return value.every(item => {
    if (!item || typeof item !== 'object') return false
    const step = item as Record<string, unknown>
    if (typeof step.id !== 'string' || !step.id || ids.has(step.id) || typeof step.title !== 'string' || !step.title.trim() || step.title.length > 240 || typeof step.completed !== 'boolean') return false
    ids.add(step.id)
    return true
  })
}

export function subtaskProgress(steps?: Subtask[]) {
  return { total: steps?.length ?? 0, completed: steps?.filter(step => step.completed).length ?? 0 }
}

export function completeSubtasks(steps?: Subtask[]) {
  return steps?.map(step => ({ ...step, completed: true }))
}
export function resetSubtasks(steps?: Subtask[]) {
  return steps?.map(step => ({ ...step, completed: false }))
}
