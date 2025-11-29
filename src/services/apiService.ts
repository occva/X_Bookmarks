import { API_CONFIG } from '../constants/api'
import type { Tweet } from '../types'

interface FetchOptions extends RequestInit {
  timeout?: number
  retryCount?: number
}

/**
 * 带超时和重试的 fetch 封装
 */
async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = API_CONFIG.TIMEOUT, retryCount = API_CONFIG.RETRY_COUNT, ...fetchOptions } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < retryCount) {
        await new Promise((resolve) => setTimeout(resolve, API_CONFIG.RETRY_DELAY * (attempt + 1)))
        continue
      }

      throw lastError
    }
  }

  throw lastError || new Error('Fetch failed')
}

/**
 * 从 URL 加载 JSON 数据
 */
export async function fetchJSONFromURL(url: string): Promise<Tweet[]> {
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    const data = await response.json()

    if (!Array.isArray(data)) {
      throw new Error('返回的数据不是数组格式')
    }

    return data as Tweet[]
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接')
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('网络错误，无法连接到服务器。可能是 CORS 问题，请确保服务器允许跨域请求')
      }
      throw error
    }
    throw new Error('加载数据时发生未知错误')
  }
}

/**
 * 从多个 URL 加载 JSON 数据
 */
export async function fetchJSONFromURLs(urls: string[]): Promise<{ data: Tweet[]; errors: string[] }> {
  const allTweets: Tweet[] = []
  const errors: string[] = []

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    try {
      const tweetsData = await fetchJSONFromURL(url)
      allTweets.push(...tweetsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      errors.push(`URL ${i + 1} (${url}): ${errorMessage}`)
      console.error(`从 URL ${i + 1} 加载失败:`, err)
    }
  }

  return { data: allTweets, errors }
}

