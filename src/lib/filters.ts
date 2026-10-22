import type { AppData, Task } from '../types'
import { endOfLocalDay, startOfLocalDay, taskSearchText } from './task-utils'

type Token = { kind: 'atom' | 'operator'; value: string; raw: string }
type Predicate = (task: Task) => boolean
export type CompiledFilter = { matches: Predicate; error?: undefined } | { matches: Predicate; error: string }

function tokenize(source: string): Token[] {
  if (source.length > 500) throw new Error('查询不能超过 500 个字符')
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    if (/\s/u.test(source[i])) { i++; continue }
    if ('&|!()'.includes(source[i])) { tokens.push({ kind: 'operator', value: source[i], raw: source[i] }); i++; continue }
    const start = i
    let value = ''
    while (i < source.length && !'&|!()'.includes(source[i])) {
      if (source[i] === '"') {
        i++; const end = source.indexOf('"', i)
        if (end < 0) throw new Error('引号未闭合')
        value += source.slice(i, end); i = end + 1
      } else value += source[i++]
    }
    tokens.push({ kind: 'atom', value: value.trim(), raw: source.slice(start, i).trim() })
  }
  return tokens
}

export function compileFilter(source: string, data: Pick<AppData, 'projects' | 'labels'>, now = new Date()): CompiledFilter {
  try {
    const tokens = tokenize(source)
    if (!tokens.length) throw new Error('请输入查询条件')
    let index = 0
    const atom = (value: string): Predicate => {
      const word = value.toLowerCase()
      if (/^p[1-4]$/.test(word)) return t => t.priority === Number(word[1])
      if (['all', '全部'].includes(word)) return () => true
      if (['completed', '已完成'].includes(word)) return t => t.completed
      if (['active', '未完成'].includes(word)) return t => !t.completed
      if (['no date', '无日期'].includes(word)) return t => !t.dueAt
      if (['no labels', '无标签'].includes(word)) return t => t.labelIds.length === 0
      if (['recurring', '重复任务'].includes(word)) return t => Boolean(t.recurrence)
      if (['overdue', '逾期'].includes(word)) return t => Boolean(t.dueAt && new Date(t.dueAt) < startOfLocalDay(now))
      if (['today', '今天', 'tomorrow', '明天', '7 days', '未来7天'].includes(word)) {
        const start = startOfLocalDay(now), end = endOfLocalDay(now)
        if (word === 'tomorrow' || word === '明天') { start.setDate(start.getDate() + 1); end.setDate(end.getDate() + 1) }
        if (word === '7 days' || word === '未来7天') end.setDate(end.getDate() + 6)
        return t => Boolean(t.dueAt && new Date(t.dueAt) >= start && new Date(t.dueAt) <= end)
      }
      if (value.startsWith('#')) {
        const name = value.slice(1)
        const project = data.projects.find(p => p.name === name)
        if (name === '收件箱' || name === 'inbox') return t => t.projectId === 'inbox'
        if (!project) throw new Error(`找不到项目“${name}”`)
        return t => t.projectId === project.id
      }
      if (value.startsWith('@')) {
        const label = data.labels.find(l => l.name === value.slice(1))
        if (!label) throw new Error(`找不到标签“${value.slice(1)}”`)
        return t => t.labelIds.includes(label.id)
      }
      if (/^(search:|搜索:)/i.test(value)) {
        const term = value.replace(/^(search:|搜索:)/i, '').trim().toLocaleLowerCase()
        if (!term) throw new Error('搜索条件不能为空')
        return t => taskSearchText(t).toLocaleLowerCase().includes(term)
      }
      throw new Error(`不支持“${value}”；多个条件之间请使用 & 或 |`)
    }
    const primary = (): Predicate => {
      const token = tokens[index++]
      if (!token) throw new Error('条件不完整')
      if (token.value === '!') { const p = primary(); return t => !p(t) }
      if (token.value === '(') {
        const p = or()
        if (tokens[index++]?.value !== ')') throw new Error('括号未闭合')
        return p
      }
      if (token.kind !== 'atom') throw new Error('此处需要查询条件')
      return atom(token.value)
    }
    const and = (): Predicate => {
      let left = primary()
      while (tokens[index]?.value === '&') { index++; const l = left, right = primary(); left = t => l(t) && right(t) }
      return left
    }
    const or = (): Predicate => {
      let left = and()
      while (tokens[index]?.value === '|') { index++; const l = left, right = and(); left = t => l(t) || right(t) }
      return left
    }
    const matches = or()
    if (index !== tokens.length) throw new Error('查询格式不完整，请检查括号与运算符')
    return { matches }
  } catch (e) { return { matches: () => false, error: e instanceof Error ? e.message : '查询无效' } }
}

export function renameLabelReferences(query: string, before: string, after: string): string {
  try { return tokenize(query).map(t => t.kind === 'atom' && t.value === `@${before}` ? `@"${after}"` : t.raw).join(' ') }
  catch { return query }
}
