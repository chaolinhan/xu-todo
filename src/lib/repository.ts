import type { AppData } from '../types'

export interface AppRepository {
  load(): Promise<AppData | null>
  save(data: AppData): Promise<void>
}

const DATABASE_NAME = 'xiaoxu-local'
const STORE_NAME = 'app-state'
const STATE_KEY = 'current'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法打开本地数据库'))
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('本地数据库操作失败'))
  })
}

export class IndexedDbRepository implements AppRepository {
  async load(): Promise<AppData | null> {
    const database = await openDatabase()
    try {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const result = await requestResult(transaction.objectStore(STORE_NAME).get(STATE_KEY))
      return (result as AppData | undefined) ?? null
    } finally {
      database.close()
    }
  }

  async save(data: AppData): Promise<void> {
    const database = await openDatabase()
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        transaction.objectStore(STORE_NAME).put(data, STATE_KEY)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error ?? new Error('保存本地数据失败'))
        transaction.onabort = () => reject(transaction.error ?? new Error('保存本地数据被中止'))
      })
    } finally {
      database.close()
    }
  }
}

export const appRepository: AppRepository = new IndexedDbRepository()
