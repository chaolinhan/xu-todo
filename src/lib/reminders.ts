import type { AppData, Task } from '../types'

export function getDueReminders(data: AppData, now = new Date()): Task[] {
  return data.tasks.filter((task) => {
    if (task.completed || !task.reminderAt || task.remindedAt) return false
    return new Date(task.reminderAt).getTime() <= now.getTime()
  })
}

export async function requestReminderPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

async function sendSystemNotification(task: Task): Promise<boolean> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  const options: NotificationOptions = {
    body: task.dueAt
      ? `截止时间：${new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(task.dueAt))}`
      : '这是你设置的任务提醒。',
    icon: '/icon.svg',
    tag: `task-${task.id}`,
  }

  const registration = await navigator.serviceWorker?.getRegistration()
  if (registration) {
    await registration.showNotification(task.title, options)
  } else {
    new Notification(task.title, options)
  }
  return true
}

export async function deliverDueReminders(tasks: Task[]): Promise<boolean> {
  if (tasks.length === 0) return false
  const results = await Promise.all(tasks.map((task) => sendSystemNotification(task).catch(() => false)))
  return results.some(Boolean)
}
