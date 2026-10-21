import { describe, expect, it } from 'vitest'
import { parseQuickTask } from './quick-add'
const data = { projects: [{ id: 'work', name: '工作', color: '#fff', createdAt: '' }], labels: [{ id: 'focus', name: '专注', color: '#fff', createdAt: '' }] }
const now = new Date(2026, 9, 21, 12)
describe('local quick entry', () => {
  it('parses the whole entry without a network or changing ordinary title words', () => {
    const { draft } = parseQuickTask('明天下午3点 准备方案 #工作 @专注 p1', data, now)
    expect(draft.title).toBe('准备方案'); expect(draft.priority).toBe(1); expect(draft.projectId).toBe('work'); expect(draft.labelIds).toEqual(['focus'])
    expect(new Date(draft.dueAt!).getDate()).toBe(22); expect(new Date(draft.dueAt!).getHours()).toBe(15); expect(draft.reminderAt).toBe(draft.dueAt)
  })
  it('retains ambiguous and invalid input rather than silently moving it', () => {
    const { draft, warnings } = parseQuickTask('方案P1 25:99 #未知 @未知 2026-02-30', data, now)
    expect(draft.title).toBe('方案P1 25:99 #未知 @未知 2026-02-30'); expect(draft.dueAt).toBeUndefined(); expect(warnings).toHaveLength(4)
  })
  it('uses next calendar week, including Sunday', () => {
    expect(new Date(parseQuickTask('下周日 看电影', data, now).draft.dueAt!).getDate()).toBe(1)
    expect(new Date(parseQuickTask('下周一 09:30 开会', data, now).draft.dueAt!).getDate()).toBe(26)
  })
  it('anchors a repeated monthly task and links its reminder', () => {
    const { draft } = parseQuickTask('2026-01-31 每月 对账', data, now)
    expect(draft.recurrence).toEqual({ unit: 'month', interval: 1, anchorDay: 31 }); expect(draft.reminderAt).toBe(draft.dueAt)
  })
  it('allows literal override and deduplicates labels', () => {
    const { draft } = parseQuickTask('明天 读书 @专注 @专注', data, now, 'inbox', undefined, ['明天'])
    expect(draft.title).toBe('明天 读书'); expect(draft.dueAt).toBeUndefined(); expect(draft.labelIds).toEqual(['focus'])
  })
  it('shifts working-day recurrence off a weekend and handles noon/midnight', () => {
    const { draft } = parseQuickTask('每个工作日 准备', data, new Date(2026, 9, 24))
    expect(new Date(draft.dueAt!).getDay()).toBe(1)
    expect(new Date(parseQuickTask('明天上午12点 准备', data, now).draft.dueAt!).getHours()).toBe(0)
  })
})
