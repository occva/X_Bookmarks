function getString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function getNestedString(source, path) {
  let current = source
  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return ''
    }
    current = current[key]
  }
  return getString(current)
}

function parseCreatedAtMs(createdAt) {
  if (!createdAt) {
    return 0
  }
  const timestamp = new Date(createdAt).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function pickTweetId(rawTweet) {
  return (
    getString(rawTweet.id) ||
    getString(rawTweet.rest_id) ||
    getNestedString(rawTweet, ['metadata', 'rest_id']) ||
    getNestedString(rawTweet, ['metadata', 'legacy', 'id_str'])
  )
}

function pickCreatedAt(rawTweet) {
  return (
    getString(rawTweet.created_at) ||
    getNestedString(rawTweet, ['metadata', 'legacy', 'created_at'])
  )
}

function pickAuthor(rawTweet) {
  const screenName =
    getString(rawTweet.screen_name) ||
    getNestedString(rawTweet, ['metadata', 'core', 'user_results', 'result', 'legacy', 'screen_name']) ||
    getNestedString(rawTweet, ['metadata', 'core', 'user_results', 'result', 'screen_name'])

  const name =
    getString(rawTweet.name) ||
    getNestedString(rawTweet, ['metadata', 'core', 'user_results', 'result', 'legacy', 'name']) ||
    getNestedString(rawTweet, ['metadata', 'core', 'user_results', 'result', 'name'])

  return {
    screenName,
    name,
  }
}

export function normalizeRawTweet(rawTweet) {
  if (!rawTweet || typeof rawTweet !== 'object') {
    return null
  }

  const id = pickTweetId(rawTweet)
  if (!id) {
    return null
  }

  const createdAt = pickCreatedAt(rawTweet)
  const { screenName, name } = pickAuthor(rawTweet)
  const normalizedTweet = {
    ...rawTweet,
    id,
    created_at: createdAt || rawTweet.created_at || '',
  }

  return {
    id,
    createdAtMs: parseCreatedAtMs(createdAt),
    authorScreenName: screenName || null,
    authorName: name || null,
    tweetJson: JSON.stringify(normalizedTweet),
  }
}
