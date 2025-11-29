import { memo } from 'react'
import type { QuotedTweet as QuotedTweetType, ImageInfo, Tweet } from '../../../types'
import { extractQuotedTweetInfo } from '../../../utils/tweetParser'
import { formatTime, formatTweetText, escapeHtml } from '../../../utils/format'
import { TweetMedia } from '../TweetMedia/TweetMedia'
import styles from './QuotedTweet.module.css'

interface QuotedTweetProps {
  quotedTweet: QuotedTweetType
  originalTweet: Tweet
  onImageClick: (imageInfo: ImageInfo) => void
}

export const QuotedTweet = memo(function QuotedTweet({
  quotedTweet,
  originalTweet,
  onImageClick,
}: QuotedTweetProps) {
  const quotedInfo = extractQuotedTweetInfo(quotedTweet)
  if (!quotedInfo || (!quotedInfo.text && quotedInfo.media.length === 0)) {
    return null
  }

  const tempTweet: Tweet = {
    ...originalTweet,
    full_text: quotedInfo.text,
    metadata: {
      ...originalTweet.metadata,
      legacy: {
        ...originalTweet.metadata?.legacy,
        entities: quotedTweet.legacy?.entities || originalTweet.metadata?.legacy?.entities,
      },
    },
  }

  const quotedTextHtml = quotedInfo.text ? formatTweetText(quotedInfo.text, tempTweet) : ''

  return (
    <div className={styles.quotedTweet} data-quoted-id={quotedInfo.id}>
      <div className={styles.quotedTweetHeader}>
        <a
          href={quotedInfo.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.quotedTweetAvatarLink}
        >
          <img
            src={
              quotedInfo.user.avatar ||
              'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\'%3E%3Crect width=\'20\' height=\'20\' fill=\'%23333\'/%3E%3C/svg%3E'
            }
            alt={quotedInfo.user.name}
            className={styles.quotedTweetAvatar}
            onError={(e) => {
              e.currentTarget.src =
                'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\'%3E%3Crect width=\'20\' height=\'20\' fill=\'%23333\'/%3E%3C/svg%3E'
            }}
          />
        </a>
        <div className={styles.quotedTweetUserInfo}>
          <span className={styles.quotedTweetName}>
            {escapeHtml(quotedInfo.user.name)}
          </span>
          {quotedInfo.user.screenName && (
            <span className={styles.quotedTweetHandle}>
              @{escapeHtml(quotedInfo.user.screenName)}
            </span>
          )}
          {quotedInfo.time && (
            <span className={styles.quotedTweetTime}>
              {formatTime(quotedInfo.time)}
            </span>
          )}
        </div>
      </div>
      {quotedTextHtml && (
        <div
          className={styles.quotedTweetText}
          dangerouslySetInnerHTML={{ __html: quotedTextHtml }}
        />
      )}
      {quotedInfo.media.length > 0 && (
        <TweetMedia
          media={quotedInfo.media}
          tweetId={`quoted-${quotedInfo.id}`}
          onImageClick={onImageClick}
        />
      )}
    </div>
  )
})
