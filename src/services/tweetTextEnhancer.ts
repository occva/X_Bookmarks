import type { Tweet, UrlEntity, Media } from '../types'
import { extractFullText } from '../utils/tweetParser'

const SHORT_URL_REGEX = /https?:\/\/t\.co\/[A-Za-z0-9]+/gi

function isUrlEntity(value: unknown): value is UrlEntity {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Partial<UrlEntity>
  return typeof candidate.url === 'string'
}

function getTweetUrlEntities(tweet: Tweet): UrlEntity[] {
  const extraTweet = tweet as Tweet & {
    entities?: { urls?: unknown[] }
    extended_entities?: { urls?: unknown[] }
  }

  const candidates = [
    ...(tweet.metadata?.legacy?.entities?.urls || []),
    ...(tweet.metadata?.legacy?.extended_entities?.urls || []),
    ...(extraTweet.entities?.urls || []),
    ...(extraTweet.extended_entities?.urls || []),
  ]

  return candidates.filter(isUrlEntity)
}

function getTweetMediaItems(tweet: Tweet): Media[] {
  return [
    ...(tweet.media || []),
    ...(tweet.metadata?.legacy?.entities?.media || []),
    ...(tweet.metadata?.legacy?.extended_entities?.media || []),
  ]
}

function buildLocalShortUrlMap(tweet: Tweet): Record<string, string> {
  const replacements: Record<string, string> = {}

  getTweetUrlEntities(tweet).forEach((entity) => {
    if (!entity.url) {
      return
    }
    replacements[entity.url] = entity.expanded_url || entity.url
  })

  getTweetMediaItems(tweet).forEach((media) => {
    if (!media.url) {
      return
    }
    // 媒体附带的 t.co 链接通常不应在正文展示
    replacements[media.url] = ''
  })

  return replacements
}

function applyShortUrlMap(text: string, shortUrlMap: Record<string, string>): string {
  if (!text) {
    return ''
  }

  return text.replace(SHORT_URL_REGEX, (shortUrl) => {
    if (Object.prototype.hasOwnProperty.call(shortUrlMap, shortUrl)) {
      return shortUrlMap[shortUrl]
    }
    return shortUrl
  })
}

function cleanupBrokenFormattingArtifacts(text: string): string {
  if (!text) {
    return ''
  }

  let cleaned = text
  cleaned = cleaned.replace(/(?:color:\s*)?#1d9bf0;\s*text-decoration:\s*none;?">/gi, '')
  cleaned = cleaned.replace(/\s+\n/g, '\n')
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ')
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  return cleaned.trim()
}

function writeTextToTweet(tweet: Tweet, fullText: string): Tweet {
  return {
    ...tweet,
    full_text: fullText,
    metadata: tweet.metadata
      ? {
          ...tweet.metadata,
          legacy: tweet.metadata.legacy
            ? {
                ...tweet.metadata.legacy,
                full_text: fullText,
              }
            : tweet.metadata.legacy,
        }
      : tweet.metadata,
  }
}

export async function enhanceTweetsText(tweets: Tweet[]): Promise<Tweet[]> {
  if (tweets.length === 0) {
    return tweets
  }

  return tweets.map((tweet) => {
    const originalText = extractFullText(tweet)
    const localMap = buildLocalShortUrlMap(tweet)
    const finalText = cleanupBrokenFormattingArtifacts(applyShortUrlMap(originalText, localMap))
    return writeTextToTweet(tweet, finalText)
  })
}
