// Twitter 书签数据类型定义

export interface Media {
  type?: string
  url?: string
  thumbnail?: string
  original?: string
}

export interface QuotedTweet {
  legacy?: {
    full_text?: string
    created_at?: string
    entities?: {
      media?: Media[]
      urls?: UrlEntity[]
    }
    extended_entities?: {
      media?: Media[]
    }
  }
  note_tweet?: {
    note_tweet_results?: {
      result?: {
        text?: string
      }
    }
  }
  core?: {
    user_results?: {
      result?: User
    }
  }
  user?: User
  rest_id?: string
  id?: string
}

export interface User {
  legacy?: {
    name?: string
    screen_name?: string
    profile_image_url_https?: string
  }
  core?: {
    name?: string
    screen_name?: string
  }
  avatar?: {
    image_url?: string
  }
  name?: string
  screen_name?: string
  profile_image_url?: string
}

export interface UrlEntity {
  url: string
  expanded_url: string
  display_url?: string
}

export interface TweetMetadata {
  __typename?: string
  rest_id?: string
  legacy?: {
    full_text?: string
    created_at?: string
    entities?: {
      urls?: UrlEntity[]
      media?: Media[]
    }
    extended_entities?: {
      urls?: UrlEntity[]
      media?: Media[]
    }
  }
  note_tweet?: {
    note_tweet_results?: {
      result?: {
        text?: string
      }
    }
  }
  quoted_status_result?: {
    result?: QuotedTweet
  }
  core?: {
    user_results?: {
      result?: User
    }
  }
}

export interface Tweet {
  id: string
  created_at: string
  full_text?: string
  media?: Media[]
  screen_name?: string
  name?: string
  profile_image_url?: string
  user_id?: string
  in_reply_to?: string | null
  retweeted_status?: Tweet | null
  quoted_status?: QuotedTweet | null
  media_tags?: unknown[]
  favorite_count?: number
  retweet_count?: number
  bookmark_count?: number
  quote_count?: number
  reply_count?: number
  views_count?: number
  favorited?: boolean
  retweeted?: boolean
  bookmarked?: boolean
  url?: string
  metadata?: TweetMetadata
  duplicateCount?: number // 重复次数，默认为1
}

export interface ImageInfo {
  url: string
  tweetId: string
  index: number
}

