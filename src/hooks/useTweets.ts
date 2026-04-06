import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Tweet, ImageInfo } from '../types'
import { processTweetMedia } from '../utils/tweetParser'
import {
  fetchTweetStats,
  fetchTweetsPage,
  importTweetsFromFiles,
  type ImportResult,
} from '../services/databaseApiService'
import { enhanceTweetsText } from '../services/tweetTextEnhancer'

export interface UserStats {
  name: string
  screenName: string
  count: number
}

export interface ImportNotice {
  message: string
  type: 'success' | 'warning'
  key: number
}

const FIRST_PAGE_LIMIT = 60
const NEXT_PAGE_LIMIT = 40

interface FirstPageSnapshot {
  tweets: Tweet[]
  nextCursor: string | null
  totalTweets: number
  userStats: UserStats[]
}

function ensureDisplayFields(tweets: Tweet[]): Tweet[] {
  return tweets.map((tweet) => ({
    ...tweet,
    duplicateCount: tweet.duplicateCount ?? 1,
  }))
}

function normalizeScreenName(screenName?: string | null): string | null {
  if (!screenName) {
    return null
  }
  const trimmed = screenName.trim()
  return trimmed ? trimmed : null
}

function buildImportNotice(result: ImportResult): ImportNotice {
  const timingText =
    typeof result.completedInMs === 'number' ? `，耗时 ${(result.completedInMs / 1000).toFixed(2)}s` : ''
  const summary = `导入完成（按推文ID去重增量）：新增 ${result.inserted}，更新 ${result.updated}，失败 ${result.failed}${timingText}`
  const firstError = result.errors[0]

  if (result.failed > 0) {
    return {
      message: firstError ? `${summary}。示例错误：${firstError}` : summary,
      type: 'warning',
      key: Date.now(),
    }
  }

  return {
    message: summary,
    type: 'success',
    key: Date.now(),
  }
}

export function useTweets() {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importNotice, setImportNotice] = useState<ImportNotice | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [totalTweets, setTotalTweets] = useState(0)
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [activeAuthorScreenName, setActiveAuthorScreenName] = useState<string | null>(null)

  const loadFirstPage = useCallback(async (authorScreenName: string | null): Promise<FirstPageSnapshot> => {
    const [page, stats] = await Promise.all([
      fetchTweetsPage(FIRST_PAGE_LIMIT, null, authorScreenName),
      fetchTweetStats(),
    ])
    const enhanced = await enhanceTweetsText(page.items)

    return {
      tweets: ensureDisplayFields(enhanced),
      nextCursor: page.nextCursor,
      totalTweets: stats.totalTweets,
      userStats: stats.userStats,
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadingMore(false)
    setError(null)

    void (async () => {
      try {
        const firstPage = await loadFirstPage(activeAuthorScreenName)
        if (cancelled) {
          return
        }
        setTweets(firstPage.tweets)
        setNextCursor(firstPage.nextCursor)
        setTotalTweets(firstPage.totalTweets)
        setUserStats(firstPage.userStats)
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : '初始化加载失败'
          setError(errorMessage)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeAuthorScreenName, loadFirstPage])

  const loadTweetsFromFile = useCallback(
    async (files: File | File[]) => {
      setLoading(true)
      setError(null)

      const fileArray = Array.isArray(files) ? files : [files]
      if (fileArray.length === 0) {
        setError('请选择至少一个文件')
        setLoading(false)
        return
      }

      try {
        const importResult = await importTweetsFromFiles(fileArray)
        const firstPage = await loadFirstPage(activeAuthorScreenName)
        setTweets(firstPage.tweets)
        setNextCursor(firstPage.nextCursor)
        setTotalTweets(firstPage.totalTweets)
        setUserStats(firstPage.userStats)
        setImportNotice(buildImportNotice(importResult))

        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
        setError(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '导入文件失败'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [activeAuthorScreenName, loadFirstPage]
  )

  const loadMoreTweets = useCallback(async () => {
    if (!nextCursor || loading || loadingMore) {
      return
    }

    setLoadingMore(true)
    try {
      const page = await fetchTweetsPage(NEXT_PAGE_LIMIT, nextCursor, activeAuthorScreenName)
      const enhanced = await enhanceTweetsText(page.items)
      const normalized = ensureDisplayFields(enhanced)

      setTweets((prevTweets) => {
        const existingIds = new Set(prevTweets.map((tweet) => tweet.id))
        const appended = normalized.filter((tweet) => !existingIds.has(tweet.id))
        return [...prevTweets, ...appended]
      })
      setNextCursor(page.nextCursor)
    } catch (err) {
      console.warn('加载下一页失败:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [activeAuthorScreenName, loading, loadingMore, nextCursor])

  const toggleAuthorFilter = useCallback((screenName: string) => {
    const normalized = normalizeScreenName(screenName)
    if (!normalized) {
      return
    }
    setActiveAuthorScreenName((prev) => (prev === normalized ? null : normalized))
  }, [])

  const clearAuthorFilter = useCallback(() => {
    setActiveAuthorScreenName(null)
  }, [])

  const allImages = useMemo((): ImageInfo[] => {
    const images: ImageInfo[] = []
    tweets.forEach((tweet) => {
      const media = processTweetMedia(tweet.media)
      media.forEach((item, index) => {
        images.push({
          url: item.original || item.thumbnail || '',
          tweetId: tweet.id,
          index,
        })
      })
    })
    return images
  }, [tweets])

  return {
    tweets,
    loading,
    loadingMore,
    error,
    importNotice,
    totalTweets,
    userStats,
    activeAuthorScreenName,
    hasMore: nextCursor !== null,
    loadTweetsFromFile,
    loadMoreTweets,
    toggleAuthorFilter,
    clearAuthorFilter,
    allImages,
  }
}
