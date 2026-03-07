import { memo, useMemo, useRef, useState, useEffect } from 'react'
import type { Tweet, ImageInfo } from '../../../types'
import { TweetCard } from '../TweetCard/TweetCard'
import styles from './TweetsContainer.module.css'

interface TweetsContainerProps {
  tweets: Tweet[]
  loading: boolean
  error: string | null
  onImageClick: (imageInfo: ImageInfo) => void
}

const INITIAL_RENDER_COUNT = 60
const LOAD_MORE_COUNT = 40

export const TweetsContainer = memo(function TweetsContainer({
  tweets,
  loading,
  error,
  onImageClick,
}: TweetsContainerProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setVisibleCount(INITIAL_RENDER_COUNT)
  }, [tweets, loading, error])

  const hasMore = tweets.length > visibleCount

  useEffect(() => {
    if (!hasMore || loading || error || !loadMoreRef.current) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, tweets.length))
        }
      },
      {
        root: null,
        rootMargin: '480px 0px',
        threshold: 0,
      }
    )

    observer.observe(loadMoreRef.current)
    return () => {
      observer.disconnect()
    }
  }, [hasMore, loading, error, tweets.length])

  const handleLinkClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement) {
      if (e.target.tagName === 'A' || e.target.closest('a.tweet-link')) {
        e.stopPropagation()
      }
    }
  }

  const visibleTweets = useMemo(
    () => tweets.slice(0, visibleCount),
    [tweets, visibleCount]
  )

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className={styles.emptyState}>
          <p>加载中...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className={styles.emptyState}>
          <p style={{ color: '#f4212e' }}>{error}</p>
        </div>
      )
    }

    if (tweets.length === 0) {
      return (
        <div className={styles.emptyState}>
          <svg viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
          </svg>
          <p>请选择 JSON 文件加载书签</p>
        </div>
      )
    }

    return (
      <div onClick={handleLinkClick}>
        {visibleTweets.map((tweet) => (
          <TweetCard key={tweet.id} tweet={tweet} onImageClick={onImageClick} />
        ))}
        {hasMore && (
          <div className={styles.loadMoreAnchor} ref={loadMoreRef}>
            加载中...
          </div>
        )}
      </div>
    )
  }, [visibleTweets, loading, error, onImageClick, hasMore, tweets.length])

  return <div className={styles.tweetsContainer}>{content}</div>
})
