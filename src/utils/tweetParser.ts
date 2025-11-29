import type { Tweet, QuotedTweet, Media } from '../types'

/**
 * 从推文数据中提取用户信息
 */
export function extractUserInfo(tweet: Tweet): {
  name: string
  screenName: string
  avatar: string
} {
  const user =
    tweet.metadata?.core?.user_results?.result ||
    null

  return {
    name:
      tweet.name ||
      user?.legacy?.name ||
      user?.core?.name ||
      user?.name ||
      '未知用户',
    screenName:
      tweet.screen_name ||
      user?.legacy?.screen_name ||
      user?.core?.screen_name ||
      user?.screen_name ||
      '',
    avatar:
      tweet.profile_image_url ||
      user?.avatar?.image_url ||
      user?.legacy?.profile_image_url_https ||
      user?.profile_image_url ||
      'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3C/svg%3E',
  }
}

/**
 * 从推文数据中提取完整文本
 */
export function extractFullText(tweet: Tweet): string {
  return (
    tweet.full_text ||
    tweet.metadata?.note_tweet?.note_tweet_results?.result?.text ||
    tweet.metadata?.legacy?.full_text ||
    ''
  )
}

/**
 * 从引用推文中提取信息
 */
export function extractQuotedTweetInfo(quotedTweet: QuotedTweet): {
  text: string
  media: Media[]
  user: { name: string; screenName: string; avatar: string }
  time: string
  id: string
  url: string
} | null {
  if (!quotedTweet) return null

  const quotedText =
    quotedTweet.legacy?.full_text ||
    quotedTweet.note_tweet?.note_tweet_results?.result?.text ||
    ''
  const quotedMedia =
    quotedTweet.legacy?.extended_entities?.media ||
    quotedTweet.legacy?.entities?.media ||
    []
  const quotedUser =
    quotedTweet.core?.user_results?.result || quotedTweet.user
  const quotedName =
    quotedUser?.legacy?.name ||
    quotedUser?.core?.name ||
    quotedUser?.name ||
    '未知用户'
  const quotedScreenName =
    quotedUser?.legacy?.screen_name ||
    quotedUser?.core?.screen_name ||
    quotedUser?.screen_name ||
    ''
  const quotedAvatar =
    quotedUser?.avatar?.image_url ||
    quotedUser?.legacy?.profile_image_url_https ||
    quotedUser?.profile_image_url ||
    ''
  const quotedTime = quotedTweet.legacy?.created_at
    ? new Date(quotedTweet.legacy.created_at).toISOString()
    : ''
  const quotedId = quotedTweet.rest_id || quotedTweet.id || ''
  const quotedUrl =
    quotedScreenName && quotedId
      ? `https://twitter.com/${quotedScreenName}/status/${quotedId}`
      : '#'

  const mediaArray = quotedMedia
    .map((m) => ({
      original: m.url || m.original || '',
      thumbnail: m.url || m.thumbnail || '',
    }))
    .filter((m) => m.original || m.thumbnail)

  return {
    text: quotedText,
    media: mediaArray,
    user: {
      name: quotedName,
      screenName: quotedScreenName,
      avatar: quotedAvatar,
    },
    time: quotedTime,
    id: quotedId,
    url: quotedUrl,
  }
}

/**
 * 处理推文媒体数据
 */
export function processTweetMedia(
  media: Media[] | undefined,
  _tweetId: string
): Media[] {
  if (!media || media.length === 0) return []

  return media
    .map((m) => ({
      original: m.original || m.thumbnail || '',
      thumbnail: m.thumbnail || m.original || '',
    }))
    .filter((m) => m.original && m.original.trim() !== '')
}

