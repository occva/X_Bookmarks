import { STORAGE_KEYS, STORAGE_LIMITS } from '../constants/storage'

export interface RecentFile {
  name: string
  url?: string
  timestamp: number
  type: 'file' | 'url'
}

/**
 * 获取最近加载的文件列表
 */
export function getRecentFiles(): RecentFile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RECENT_FILES)
    if (stored) {
      const files = JSON.parse(stored) as RecentFile[]
      return files.sort((a, b) => b.timestamp - a.timestamp)
    }
  } catch (error) {
    console.error('读取最近文件列表失败:', error)
  }
  return []
}

/**
 * 添加文件到最近加载列表
 * 只保存URL类型的文件，最多保留指定数量的记录
 */
export function addRecentFile(name: string, type: 'file' | 'url', url?: string): void {
  if (type !== 'url') {
    return
  }

  try {
    const files = getRecentFiles()
    const urlFiles = files.filter((f) => f.type === 'url')

    const filtered = urlFiles.filter((f) => !(f.name === name && f.url === url))

    const newFile: RecentFile = {
      name,
      url,
      timestamp: Date.now(),
      type: 'url',
    }

    const updated = [newFile, ...filtered].slice(0, STORAGE_LIMITS.MAX_RECENT_FILES)
    localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(updated))
  } catch (error) {
    console.error('保存最近文件列表失败:', error)
  }
}

/**
 * 删除最近加载的文件
 */
export function removeRecentFile(name: string, type: 'file' | 'url', url?: string): void {
  try {
    const files = getRecentFiles()
    const filtered = files.filter(
      (f) => !(f.name === name && f.type === type && (!url || f.url === url))
    )
    localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(filtered))
  } catch (error) {
    console.error('删除最近文件失败:', error)
  }
}

/**
 * 清空最近加载的文件列表
 */
export function clearRecentFiles(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.RECENT_FILES)
  } catch (error) {
    console.error('清空最近文件列表失败:', error)
  }
}

