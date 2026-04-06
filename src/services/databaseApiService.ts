import type { Tweet } from '../types'

export interface UserStatsItem {
  name: string
  screenName: string
  count: number
}

export interface TweetsPage {
  items: Tweet[]
  nextCursor: string | null
}

export interface ImportResult {
  batchId: number | null
  parsed: number
  inserted: number
  updated: number
  failed: number
  errors: string[]
  completedInMs?: number
}

const API_ENDPOINTS = {
  IMPORT_FILES: '/api/import/files',
  TWEETS: '/api/tweets',
  STATS: '/api/stats',
} as const

const REQUEST_TIMEOUT = 20000
const IMPORT_REQUEST_TIMEOUT = 180000

function normalizeBaseURL(baseURL: string): string {
  return baseURL.replace(/\/+$/, '')
}

function resolveApiBaseURL(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL || '').trim()
  if (configured) {
    return normalizeBaseURL(configured)
  }

  return ''
}

const API_BASE_URL = resolveApiBaseURL()

function buildApiURL(pathname: string): string {
  if (!API_BASE_URL) {
    return pathname
  }
  return `${API_BASE_URL}${pathname}`
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timer)
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const json = await response.json()
    if (json && typeof json.message === 'string' && json.message.trim()) {
      return json.message
    }
  } catch {
    // ignore
  }

  try {
    const text = await response.text()
    if (text.trim()) {
      return text
    }
  } catch {
    // ignore
  }

  return `请求失败（HTTP ${response.status}）`
}

export async function importTweetsFromFiles(files: File[]): Promise<ImportResult> {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file, file.name)
  })

  let response: Response
  try {
    response = await fetchWithTimeout(
      buildApiURL(API_ENDPOINTS.IMPORT_FILES),
      {
        method: 'POST',
        body: formData,
      },
      IMPORT_REQUEST_TIMEOUT
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('导入超时（超过 180 秒）。通常是数据量较大，已优化后请重试。')
    }
    throw error
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return (await response.json()) as ImportResult
}

export async function fetchTweetsPage(
  limit: number,
  cursor?: string | null,
  authorScreenName?: string | null
): Promise<TweetsPage> {
  const requestURL = new URL(buildApiURL(API_ENDPOINTS.TWEETS), window.location.origin)
  requestURL.searchParams.set('limit', String(limit))
  if (cursor) {
    requestURL.searchParams.set('cursor', cursor)
  }
  if (authorScreenName) {
    requestURL.searchParams.set('author', authorScreenName)
  }

  const response = await fetchWithTimeout(requestURL.toString(), { method: 'GET' })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  const payload = (await response.json()) as Partial<TweetsPage>
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    nextCursor: typeof payload.nextCursor === 'string' ? payload.nextCursor : null,
  }
}

export async function fetchTweetStats(): Promise<{ totalTweets: number; userStats: UserStatsItem[] }> {
  const response = await fetchWithTimeout(buildApiURL(API_ENDPOINTS.STATS), { method: 'GET' })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  const payload = (await response.json()) as {
    totalTweets?: unknown
    userStats?: unknown
  }

  const totalTweets = typeof payload.totalTweets === 'number' ? payload.totalTweets : 0
  const userStats = Array.isArray(payload.userStats)
    ? payload.userStats.filter((item): item is UserStatsItem => {
        return (
          item &&
          typeof item === 'object' &&
          typeof (item as UserStatsItem).name === 'string' &&
          typeof (item as UserStatsItem).screenName === 'string' &&
          typeof (item as UserStatsItem).count === 'number'
        )
      })
    : []

  return {
    totalTweets,
    userStats,
  }
}
