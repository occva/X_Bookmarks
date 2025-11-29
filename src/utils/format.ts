import type { Tweet, UrlEntity } from '../types'

/**
 * 格式化时间显示
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}天前`
  } else if (hours > 0) {
    return `${hours}小时前`
  } else if (minutes > 0) {
    return `${minutes}分钟前`
  } else {
    return '刚刚'
  }
}

/**
 * 格式化数字显示（K、M）
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

/**
 * HTML 转义
 */
export function escapeHtml(text: string): string {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 格式化推文文本（处理链接、@用户名、#话题）
 */
export function formatTweetText(text: string, tweet: Tweet): string {
  if (!text) return ''

  // 获取推文中的 URL 映射
  const urlMap: Record<string, string> = {}
  const displayUrlMap: Record<string, string> = {}
  const urls =
    tweet?.metadata?.legacy?.entities?.urls ||
    tweet?.metadata?.legacy?.extended_entities?.urls ||
    []

  if (urls && urls.length > 0) {
    urls.forEach((urlEntity: UrlEntity) => {
      if (urlEntity.url && urlEntity.expanded_url) {
        urlMap[urlEntity.url] = urlEntity.expanded_url
        displayUrlMap[urlEntity.url] =
          urlEntity.display_url || urlEntity.expanded_url
      }
    })
  }

  // 先转义 HTML，避免 XSS
  let formatted = escapeHtml(text)

  // 使用临时标记来避免在已处理的链接内再次处理
  const PLACEHOLDER_PREFIX = '___LINK_PLACEHOLDER_'
  const placeholders: string[] = []
  let placeholderIndex = 0

  // 第一步：处理 URL，用占位符替换，并使用展开的 URL
  const urlRegex = /(https?:\/\/[^\s]+)/g
  formatted = formatted.replace(urlRegex, (shortUrl) => {
    const placeholder = PLACEHOLDER_PREFIX + placeholderIndex
    const expandedUrl = urlMap[shortUrl] || shortUrl
    const isTcoLink = /t\.co/.test(shortUrl)

    let displayUrl: string
    if (isTcoLink && displayUrlMap[shortUrl]) {
      displayUrl = displayUrlMap[shortUrl]
    } else if (isTcoLink && expandedUrl && expandedUrl !== shortUrl) {
      displayUrl = expandedUrl
    } else {
      displayUrl = shortUrl
    }

    placeholders[placeholderIndex] = `<a href="${expandedUrl.replace(
      /"/g,
      '&quot;'
    )}" target="_blank" rel="noopener noreferrer" class="tweet-link" style="color: #1d9bf0; text-decoration: none;">${displayUrl}</a>`
    placeholderIndex++
    return placeholder
  })

  // 第二步：处理 @用户名
  const mentionRegex = /@([a-zA-Z0-9_]+)/g
  formatted = formatted.replace(
    mentionRegex,
    (match, username) =>
      `<a href="https://twitter.com/${username}" target="_blank" rel="noopener noreferrer" class="tweet-link" style="color: #1d9bf0; text-decoration: none;">@${username}</a>`
  )

  // 第三步：处理 #话题
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g
  formatted = formatted.replace(
    hashtagRegex,
    (match, hashtag) =>
      `<a href="https://twitter.com/hashtag/${hashtag}" target="_blank" rel="noopener noreferrer" class="tweet-link" style="color: #1d9bf0; text-decoration: none;">#${hashtag}</a>`
  )

  // 第四步：恢复 URL 占位符
  for (let i = 0; i < placeholderIndex; i++) {
    const placeholder = PLACEHOLDER_PREFIX + i
    formatted = formatted.replace(placeholder, placeholders[i])
  }

  return formatted
}

/**
 * 智能截断文本
 */
export function truncateText(text: string, maxLength: number = 280): string {
  if (text.length <= maxLength) return text

  let truncatedText = text.substring(0, maxLength)
  const urlMatch = truncatedText.match(/https?:\/\/[^\s]*$/)

  if (urlMatch) {
    truncatedText = truncatedText
      .substring(0, truncatedText.length - urlMatch[0].length)
      .trim()
  } else {
    const lastSpace = truncatedText.lastIndexOf(' ')
    if (lastSpace > 200) {
      truncatedText = truncatedText.substring(0, lastSpace)
    }
  }

  return truncatedText + '...'
}

