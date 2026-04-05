interface PersistedJSONFile {
  name: string
  content: string
}

interface PersistedUploadRecord {
  id: 'latest'
  folderTimestamp: string
  files: PersistedJSONFile[]
  savedAt: number
}

const DB_NAME = 'x-bookmarks'
const STORE_NAME = 'uploads'
const RECORD_KEY: PersistedUploadRecord['id'] = 'latest'
const DB_VERSION = 1

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('当前环境不支持 IndexedDB'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('打开 IndexedDB 失败'))
  })
}

function withDatabase<T>(executor: (db: IDBDatabase) => Promise<T>): Promise<T> {
  return openDatabase().then(async (db) => {
    try {
      return await executor(db)
    } finally {
      db.close()
    }
  })
}

export async function saveLatestUploadedJSONFilesToBrowser(files: File[]): Promise<string | null> {
  if (!isIndexedDBAvailable() || files.length === 0) {
    return null
  }

  const persistedFiles: PersistedJSONFile[] = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      content: await file.text(),
    }))
  )
  const folderTimestamp = Date.now().toString()

  await withDatabase(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const payload: PersistedUploadRecord = {
          id: RECORD_KEY,
          folderTimestamp,
          files: persistedFiles,
          savedAt: Date.now(),
        }
        store.put(payload)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error ?? new Error('写入 IndexedDB 失败'))
        transaction.onabort = () => reject(transaction.error ?? new Error('写入 IndexedDB 被中断'))
      })
  )

  return folderTimestamp
}

export async function getLatestUploadedJSONFilesFromBrowser(): Promise<File[]> {
  if (!isIndexedDBAvailable()) {
    return []
  }

  const record = await withDatabase(
    (db) =>
      new Promise<PersistedUploadRecord | null>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(RECORD_KEY)
        request.onsuccess = () => resolve((request.result as PersistedUploadRecord | undefined) ?? null)
        request.onerror = () => reject(request.error ?? new Error('读取 IndexedDB 失败'))
      })
  )

  if (!record || !Array.isArray(record.files)) {
    return []
  }

  return record.files
    .filter((file) => typeof file?.name === 'string' && typeof file?.content === 'string')
    .map((file) => new File([file.content], file.name, { type: 'application/json' }))
}
