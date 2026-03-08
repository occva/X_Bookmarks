const RESOLVE_API = '/api/local-files/resolve'
const CACHE_KEY = 'x_bookmarks_short_url_cache_v2'
const MAX_CACHE_ENTRIES = 1000
const SHORT_TCO_REGEX = /^https?:\/\/t\.co\/[A-Za-z0-9]+$/i
const FAILURE_RETRY_MS = 60 * 1000
const SHORT_URL_RESOLVE_ENABLED = import.meta.env.DEV

type ShortUrlCache = Record<string, string>

let memoryCache: ShortUrlCache = {}
let failureCache: Record<string, number> = {}
let cacheLoaded = false

function loadCache(): void {
  if (cacheLoaded) {
    return
  }
  cacheLoaded = true

  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) {
      return
    }
    const parsed = JSON.parse(raw) as ShortUrlCache
    if (parsed && typeof parsed === 'object') {
      memoryCache = Object.fromEntries(
        Object.entries(parsed).filter(([shortUrl, resolvedUrl]) =>
          typeof shortUrl === 'string' &&
          typeof resolvedUrl === 'string' &&
          resolvedUrl.length > 0 &&
          resolvedUrl !== shortUrl
        )
      )
    }
  } catch (error) {
    console.warn('读取短链缓存失败:', error)
  }
}

function saveCache(): void {
  try {
    const entries = Object.entries(memoryCache)
    if (entries.length > MAX_CACHE_ENTRIES) {
      const sliced = entries.slice(entries.length - MAX_CACHE_ENTRIES)
      memoryCache = Object.fromEntries(sliced)
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache))
  } catch (error) {
    console.warn('写入短链缓存失败:', error)
  }
}

function isTcoShortUrl(url: string): boolean {
  return SHORT_TCO_REGEX.test(url.trim())
}

async function resolveSingleShortUrl(shortUrl: string): Promise<string> {
  if (!SHORT_URL_RESOLVE_ENABLED) {
    return shortUrl
  }

  const response = await fetch(`${RESOLVE_API}?url=${encodeURIComponent(shortUrl)}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const payload = (await response.json()) as { resolvedUrl?: string }
  if (!payload.resolvedUrl || typeof payload.resolvedUrl !== 'string') {
    return shortUrl
  }

  return payload.resolvedUrl
}

export async function resolveShortUrls(shortUrls: string[]): Promise<Record<string, string>> {
  if (!SHORT_URL_RESOLVE_ENABLED) {
    return {}
  }

  loadCache()

  const uniqueShortUrls = Array.from(
    new Set(shortUrls.map((url) => url.trim()).filter((url) => isTcoShortUrl(url)))
  )

  if (uniqueShortUrls.length === 0) {
    return {}
  }

  const result: Record<string, string> = {}
  const pending: string[] = []

  uniqueShortUrls.forEach((url) => {
    const cached = memoryCache[url]
    if (cached) {
      result[url] = cached
    } else {
      const lastFailure = failureCache[url] || 0
      if (Date.now() - lastFailure < FAILURE_RETRY_MS) {
        result[url] = url
        return
      }
      pending.push(url)
    }
  })

  if (pending.length === 0) {
    return result
  }

  const maxConcurrency = 6
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < pending.length) {
      const current = pending[nextIndex]
      nextIndex += 1

      try {
        const resolved = await resolveSingleShortUrl(current)
        if (resolved && resolved !== current) {
          result[current] = resolved
          memoryCache[current] = resolved
          delete failureCache[current]
        } else {
          result[current] = current
          failureCache[current] = Date.now()
        }
      } catch (error) {
        console.warn(`解析短链失败: ${current}`, error)
        result[current] = current
        failureCache[current] = Date.now()
      }
    }
  }

  const workerCount = Math.min(maxConcurrency, pending.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  saveCache()

  return result
}

export function extractTcoShortUrls(text: string): string[] {
  if (!text) {
    return []
  }
  const matches = text.match(/https?:\/\/t\.co\/[A-Za-z0-9]+/gi)
  return matches ? Array.from(new Set(matches)) : []
}
