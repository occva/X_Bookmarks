import { memo, useMemo } from 'react'
import type { Tweet, ImageInfo } from '../../../types'
import { TweetCard } from '../TweetCard/TweetCard'
import styles from './TweetsContainer.module.css'

interface TweetsContainerProps {
  tweets: Tweet[]
  loading: boolean
  error: string | null
  onImageClick: (imageInfo: ImageInfo) => void
}

export const TweetsContainer = memo(function TweetsContainer({
  tweets,
  loading,
  error,
  onImageClick,
}: TweetsContainerProps) {
  const handleLinkClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement) {
      if (e.target.tagName === 'A' || e.target.closest('a.tweet-link')) {
        e.stopPropagation()
      }
    }
  }

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
        {tweets.map((tweet) => (
          <TweetCard key={tweet.id} tweet={tweet} onImageClick={onImageClick} />
        ))}
      </div>
    )
  }, [tweets, loading, error, onImageClick])

  return <div className={styles.tweetsContainer}>{content}</div>
})
