import { memo, useState } from 'react'
import type { Tweet, ImageInfo } from '../../../types'
import {
  extractUserInfo,
  extractFullText,
  processTweetMedia,
} from '../../../utils/tweetParser'
import { formatTime, formatNumber, formatTweetText, truncateText, escapeHtml } from '../../../utils/format'
import { TweetMedia } from '../TweetMedia/TweetMedia'
import { QuotedTweet } from '../QuotedTweet/QuotedTweet'
import styles from './TweetCard.module.css'

interface TweetCardProps {
  tweet: Tweet
  onImageClick: (imageInfo: ImageInfo) => void
}

export const TweetCard = memo(function TweetCard({
  tweet,
  onImageClick,
}: TweetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const userInfo = extractUserInfo(tweet)
  const fullText = extractFullText(tweet)
  const media = processTweetMedia(tweet.media, tweet.id)
  const timeAgo = formatTime(tweet.created_at)
  const isLongText = fullText.length > 280

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const handleCardClick = () => {
    if (isLongText) {
      setIsExpanded(!isExpanded)
    }
  }

  let textHtml = ''
  if (fullText) {
    if (isLongText) {
      const truncatedText = truncateText(fullText)
      const fullTextHtml = formatTweetText(fullText, tweet)
      const truncatedTextHtml = formatTweetText(truncatedText, tweet)

      textHtml = isExpanded ? fullTextHtml : truncatedTextHtml
    } else {
      textHtml = formatTweetText(fullText, tweet)
    }
  }

  const quotedTweet =
    tweet.metadata?.quoted_status_result?.result || tweet.quoted_status

  return (
    <article className={styles.tweetCard} data-id={tweet.id} onClick={handleCardClick}>
      <div className={styles.tweetHeader}>
        <a
          href={tweet.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.tweetAvatarLink}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={userInfo.avatar}
            alt={userInfo.name}
            className={styles.tweetAvatar}
            onError={(e) => {
              e.currentTarget.src =
                'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3C/svg%3E'
            }}
          />
        </a>
        <div className={styles.tweetContent}>
          <div className={styles.tweetUserInfo}>
            <span className={styles.tweetUserName}>{escapeHtml(userInfo.name)}</span>
            {userInfo.screenName && (
              <span className={styles.tweetUserHandle}>
                @{escapeHtml(userInfo.screenName)}
              </span>
            )}
            <span className={styles.tweetTime}>{timeAgo}</span>
            <span className={styles.duplicateBadge}>×{tweet.duplicateCount || 1}</span>
          </div>
          {textHtml && (
            <div className={styles.tweetTextWrapper}>
              <div
                className={styles.tweetText}
                dangerouslySetInnerHTML={{ __html: textHtml }}
              />
              {isLongText && (
                <button
                  className={styles.tweetExpandBtn}
                  onClick={handleToggleExpand}
                >
                  {isExpanded ? '收起' : '展开'}
                </button>
              )}
            </div>
          )}
          {media.length > 0 && (
            <TweetMedia media={media} tweetId={tweet.id} onImageClick={onImageClick} />
          )}
          {quotedTweet && (
            <QuotedTweet
              quotedTweet={quotedTweet}
              originalTweet={tweet}
              onImageClick={onImageClick}
            />
          )}
          <div className={styles.tweetActions}>
            <button className={styles.tweetAction} title="回复">
              <svg viewBox="0 0 24 24">
                <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.47-4 6.92l-2.619 1.377L11.35 19l-4.005-2.114c-1.66.87-3.594 1.114-5.594.514v-7.4z" />
              </svg>
              <span className={styles.tweetActionCount}>
                {formatNumber(tweet.reply_count || 0)}
              </span>
            </button>
            <button className={styles.tweetAction} title="转推">
              <svg viewBox="0 0 24 24">
                <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.791-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.791 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
              </svg>
              <span className={styles.tweetActionCount}>
                {formatNumber(tweet.retweet_count || 0)}
              </span>
            </button>
            <button
              className={`${styles.tweetAction} ${tweet.favorited ? styles.active : ''}`}
              title="喜欢"
            >
              <svg viewBox="0 0 24 24">
                <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" />
              </svg>
              <span className={styles.tweetActionCount}>
                {formatNumber(tweet.favorite_count || 0)}
              </span>
            </button>
            <button
              className={`${styles.tweetAction} ${tweet.bookmarked ? styles.active : ''}`}
              title="书签"
            >
              <svg viewBox="0 0 24 24">
                <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z" />
              </svg>
              <span className={styles.tweetActionCount}>
                {formatNumber(tweet.bookmark_count || 0)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
})
