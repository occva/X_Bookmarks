import { API_CONFIG } from '../constants/api'
import type { Tweet } from '../types'

interface FetchOptions extends RequestInit {
  timeout?: number
  retryCount?: number
}

/**
 * 检测是否是 GitHub URL（Raw 或网页格式）
 */
function isGitHubURL(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname === 'raw.githubusercontent.com' || 
           urlObj.hostname === 'github.com'
  } catch {
    return false
  }
}

/**
 * 将 GitHub 网页 URL (blob 格式) 转换为 Raw URL
 */
function convertGitHubBlobToRawURL(url: string): string | null {
  try {
    const urlObj = new URL(url)
    if (urlObj.hostname === 'github.com' && urlObj.pathname.includes('/blob/')) {
      // 格式: https://github.com/owner/repo/blob/branch/path
      const pathname = urlObj.pathname.replace('/blob/', '/')
      return `https://raw.githubusercontent.com${pathname}`
    }
  } catch {
    // 解析失败
  }
  return null
}

/**
 * 从 GitHub Raw URL 提取仓库信息，转换为 GitHub API URL
 */
function convertToGitHubAPIURL(url: string): string | null {
  try {
    const urlObj = new URL(url)
    if (urlObj.hostname === 'raw.githubusercontent.com') {
      // 格式: https://raw.githubusercontent.com/owner/repo/refs/heads/branch/path
      // 或: https://raw.githubusercontent.com/owner/repo/branch/path
      const parts = urlObj.pathname.split('/').filter(p => p)
      if (parts.length >= 3) {
        const owner = parts[0]
        const repo = parts[1]
        
        let ref: string
        let path: string
        
        // 检测是否是 refs/heads/branch 格式
        if (parts[2] === 'refs' && parts.length >= 5) {
          // refs/heads/branch 格式
          ref = `${parts[2]}/${parts[3]}/${parts[4]}` // refs/heads/master
          path = parts.slice(5).join('/')
        } else {
          // 直接 branch 格式
          ref = parts[2]
          path = parts.slice(3).join('/')
        }
        
        if (path) {
          return `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`
        }
      }
    } else if (urlObj.hostname === 'github.com' && urlObj.pathname.includes('/blob/')) {
      // 格式: https://github.com/owner/repo/blob/branch/path
      const parts = urlObj.pathname.split('/').filter(p => p)
      if (parts.length >= 4 && parts[2] === 'blob') {
        const owner = parts[0]
        const repo = parts[1]
        const ref = parts[3]
        const path = parts.slice(4).join('/')
        
        if (path) {
          return `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`
        }
      }
    }
  } catch {
    // 解析失败
  }
  return null
}

/**
 * 获取所有可用的代理 URL（包括 GitHub API 备选）
 * 按优先级排序：最可能成功的放在前面
 */
function getAllProxyURLs(url: string): string[] {
  const urls: string[] = []
  
  // CORS 代理列表（按可靠性排序）
  const proxies = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
  ]
  
  // 如果是 GitHub 网页 URL (blob 格式)，先转换为 Raw URL
  let actualURL = url
  if (url.includes('/blob/')) {
    const rawURL = convertGitHubBlobToRawURL(url)
    if (rawURL) {
      actualURL = rawURL
    }
  }
  
  if (isGitHubURL(actualURL)) {
    // 对于 GitHub URL，优先尝试 GitHub API（通常更可靠）
    const apiURL = convertToGitHubAPIURL(actualURL)
    if (apiURL) {
      urls.push(apiURL)
    }
    
    // 然后尝试 CORS 代理（使用转换后的 Raw URL）
    proxies.forEach(proxy => {
      urls.push(proxy + encodeURIComponent(actualURL))
    })
  } else {
    // 非 GitHub URL，尝试代理
    proxies.forEach(proxy => {
      urls.push(proxy + encodeURIComponent(url))
    })
  }
  
  // 最后添加原始 URL（某些情况下可能直接支持 CORS）
  urls.push(actualURL)
  
  return urls
}

/**
 * 尝试使用单个 URL 进行请求
 */
async function tryFetchURL(
  targetURL: string,
  options: FetchOptions,
  timeout: number
): Promise<Response | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // 构建请求头
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    }
    
    // GitHub API 需要特殊头部
    if (targetURL.includes('api.github.com')) {
      headers['Accept'] = 'application/vnd.github.v3.raw'
    }
    
    // 只对非 GET 请求设置 Content-Type
    if (options.method && options.method !== 'GET') {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(targetURL, {
      ...options,
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
      headers,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response
  } catch (error) {
    // 返回 null 表示失败，让调用者尝试下一个 URL
    return null
  }
}

/**
 * 带超时和重试的 fetch 封装，支持多个代理 URL
 * 总超时时间为 5 秒，快速失败策略
 */
async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = API_CONFIG.TIMEOUT, retryCount = API_CONFIG.RETRY_COUNT, ...fetchOptions } = options
  const singleRequestTimeout = API_CONFIG.SINGLE_REQUEST_TIMEOUT

  // 获取所有可用的代理 URL
  const allURLs = getAllProxyURLs(url)
  const startTime = Date.now()
  let lastError: Error | null = null

  // 对每个 URL 尝试（快速失败策略）
  for (const targetURL of allURLs) {
    // 检查总时间是否超过限制
    const elapsed = Date.now() - startTime
    if (elapsed >= timeout) {
      throw new Error(`请求超时（${timeout}ms），已尝试多个代理服务`)
    }

    // 计算剩余时间
    const remainingTime = timeout - elapsed
    const requestTimeout = Math.min(singleRequestTimeout, remainingTime)

    // 尝试请求（最多重试 retryCount 次）
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      // 再次检查时间
      const currentElapsed = Date.now() - startTime
      if (currentElapsed >= timeout) {
        throw new Error(`请求超时（${timeout}ms），已尝试多个代理服务`)
      }

      const response = await tryFetchURL(targetURL, fetchOptions, requestTimeout)
      
      if (response) {
        return response
      }

      // 如果不是最后一次尝试，短暂等待后重试
      if (attempt < retryCount) {
        const waitTime = Math.min(API_CONFIG.RETRY_DELAY, timeout - (Date.now() - startTime))
        if (waitTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitTime))
        }
      }
    }
  }

  // 所有 URL 都失败了
  throw lastError || new Error('所有请求方式都失败了，请检查网络连接或 URL 是否有效')
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

    // 统一先读取文本，然后解析 JSON（避免响应体被多次读取）
    const text = await response.text()
    
    let data: any
    try {
      data = JSON.parse(text)
    } catch (parseError) {
      // 检测 JSON 格式错误
      const errorMessage = parseError instanceof Error ? parseError.message : '未知错误'
      const error = new Error(`JSON 格式错误: ${errorMessage}`)
      ;(error as any).isJSONError = true
      ;(error as any).jsonContent = text.substring(0, 200) // 保存前200个字符用于调试
      throw error
    }

    if (!Array.isArray(data)) {
      const error = new Error('返回的数据不是数组格式，期望数组格式的推文数据')
      ;(error as any).isJSONError = true
      throw error
    }

    return data as Tweet[]
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('超时')) {
        throw new Error('请求超时（5秒），请检查网络连接或 URL 是否有效')
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('网络错误，无法连接到服务器。已尝试多个代理服务，请检查网络连接或稍后重试')
      }
      if (error.message.includes('JSON') || error.message.includes('parse')) {
        throw new Error('返回的数据格式不正确，无法解析为 JSON')
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

  console.log(`开始加载 ${urls.length} 个 URL`)
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    console.log(`正在加载 URL ${i + 1}/${urls.length}: ${url}`)
    try {
      const tweetsData = await fetchJSONFromURL(url)
      console.log(`URL ${i + 1} 加载成功，获得 ${tweetsData.length} 条推文`)
      allTweets.push(...tweetsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      errors.push(`URL ${i + 1} (${url}): ${errorMessage}`)
      console.error(`从 URL ${i + 1} 加载失败:`, err)
    }
  }

  console.log(`加载完成: 成功 ${allTweets.length} 条推文，失败 ${errors.length} 个 URL`)
  return { data: allTweets, errors }
}

