import { useState, useCallback, useMemo } from 'react'
import type { Tweet, ImageInfo } from '../types'
import { processTweetMedia, extractUserInfo, extractQuotedTweetInfo } from '../utils/tweetParser'
import { fetchJSONFromURLs } from '../services/apiService'
import { readJSONFromFiles } from '../services/fileService'

export interface UserStats {
  name: string
  screenName: string
  count: number
}

function deduplicateTweets(tweets: Tweet[]): Tweet[] {
  const tweetMap = new Map<string, { tweet: Tweet; count: number; index: number }>()
  const order: string[] = []

  tweets.forEach((tweet) => {
    const id = tweet.id
    if (tweetMap.has(id)) {
      const existing = tweetMap.get(id)!
      existing.count++
    } else {
      tweetMap.set(id, { tweet: { ...tweet, duplicateCount: 1 }, count: 1, index: order.length })
      order.push(id)
    }
  })

  return order.map((id) => {
    const { tweet, count } = tweetMap.get(id)!
    return {
      ...tweet,
      duplicateCount: count,
    }
  })
}

export function useTweets() {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTweetsFromFile = useCallback(async (files: File | File[]) => {
    setLoading(true)
    setError(null)

    const fileArray = Array.isArray(files) ? files : [files]

    if (fileArray.length === 0) {
      setError('请选择至少一个文件')
      setLoading(false)
      return
    }

    try {
      const { data: allTweets, errors } = await readJSONFromFiles(fileArray)

      if (allTweets.length === 0) {
        setError(errors.length > 0 ? errors.join('; ') : '所有文件加载失败')
        setLoading(false)
        return
      }

      if (errors.length > 0) {
        console.warn('部分文件加载失败:', errors)
        // 检测 JSON 格式错误
        errors.forEach((errorMsg) => {
          if (errorMsg.includes('JSON 格式错误') || errorMsg.includes('不是数组格式')) {
            // 标记为 JSON 错误，将在 App.tsx 中处理
            ;(window as any).__lastJSONError = errorMsg
          }
        })
      }

      const deduplicatedTweets = deduplicateTweets(allTweets)
      setTweets(deduplicatedTweets)
      setLoading(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载文件时发生未知错误'
      setError(errorMessage)
      // 检测 JSON 格式错误
      if (err instanceof Error && (err as any).isJSONError) {
        ;(window as any).__lastJSONError = errorMessage
      }
      setLoading(false)
    }
  }, [])

  const loadTweetsFromURL = useCallback(async (urls: string | string[]) => {
    setLoading(true)
    setError(null)

    const urlArray = Array.isArray(urls) 
      ? urls 
      : urls.split('\n').map(u => u.trim()).filter(u => u.length > 0)

    if (urlArray.length === 0) {
      setError('请输入至少一个有效的 URL')
      setLoading(false)
      return false
    }

    try {
      const { data: allTweets, errors } = await fetchJSONFromURLs(urlArray)

      if (allTweets.length === 0) {
        setError(errors.length > 0 ? errors.join('; ') : '所有 URL 加载失败')
        setLoading(false)
        return false
      }

      // 如果有部分 URL 失败，显示警告信息
      if (errors.length > 0) {
        const successCount = urlArray.length - errors.length
        const errorMessage = `成功加载 ${successCount} 个 URL，${errors.length} 个失败: ${errors.join('; ')}`
        setError(errorMessage)
        console.warn('部分 URL 加载失败:', errors)
        // 检测 JSON 格式错误
        errors.forEach((errorMsg) => {
          if (errorMsg.includes('JSON 格式错误') || errorMsg.includes('不是数组格式')) {
            ;(window as any).__lastJSONError = errorMsg
          }
        })
      } else {
        setError(null)
      }

      const deduplicatedTweets = deduplicateTweets(allTweets)
      setTweets(deduplicatedTweets)
      setLoading(false)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载过程中发生错误，请重试'
      setError(errorMessage)
      // 检测 JSON 格式错误
      if (err instanceof Error && (err as any).isJSONError) {
        ;(window as any).__lastJSONError = errorMessage
      }
      setLoading(false)
      console.error('从 URL 加载失败:', err)
      return false
    }
  }, [])

  const getAllImages = useCallback((): ImageInfo[] => {
    const allImages: ImageInfo[] = []
    tweets.forEach((tweet) => {
      const media = processTweetMedia(tweet.media, tweet.id)
      media.forEach((m, index) => {
        allImages.push({
          url: m.original || m.thumbnail || '',
          tweetId: tweet.id,
          index,
        })
      })
    })
    return allImages
  }, [tweets])

  const getUserStats = useCallback((): UserStats[] => {
    const userMap = new Map<string, { name: string; screenName: string; count: number }>()

    tweets.forEach((tweet) => {
      const userInfo = extractUserInfo(tweet)
      if (userInfo.screenName) {
        const key = userInfo.screenName.toLowerCase()
        const existing = userMap.get(key)
        if (existing) {
          existing.count++
        } else {
          userMap.set(key, {
            name: userInfo.name,
            screenName: userInfo.screenName,
            count: 1,
          })
        }
      }

      const quotedTweet =
        tweet.metadata?.quoted_status_result?.result || tweet.quoted_status
      if (quotedTweet) {
        const quotedInfo = extractQuotedTweetInfo(quotedTweet)
        if (quotedInfo && quotedInfo.user.screenName) {
          const key = quotedInfo.user.screenName.toLowerCase()
          const existing = userMap.get(key)
          if (existing) {
            existing.count++
          } else {
            userMap.set(key, {
              name: quotedInfo.user.name,
              screenName: quotedInfo.user.screenName,
              count: 1,
            })
          }
        }
      }
    })

    return Array.from(userMap.values()).sort((a, b) => b.count - a.count)
  }, [tweets])

  const userStats = useMemo(() => getUserStats(), [getUserStats])

  return {
    tweets,
    loading,
    error,
    loadTweetsFromFile,
    loadTweetsFromURL,
    getAllImages,
    userStats,
  }
}
