import { normalizeRawTweet } from './tweet-normalizer.mjs'

const DEFAULT_PAGE_LIMIT = 60
const MAX_PAGE_LIMIT = 200
const MAX_IMPORT_FILES = 20
const MAX_IMPORT_FILE_SIZE = 20 * 1024 * 1024
const D1_BATCH_SIZE = 100

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS tweets (
    id TEXT PRIMARY KEY,
    created_at_ms INTEGER NOT NULL,
    author_screen_name TEXT,
    author_name TEXT,
    tweet_json TEXT NOT NULL,
    inserted_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tweets_created_id
    ON tweets (created_at_ms DESC, id DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_tweets_author_screen_name
    ON tweets (author_screen_name)`,
  `CREATE TABLE IF NOT EXISTS import_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,
    source_label TEXT,
    parsed_count INTEGER NOT NULL,
    inserted_count INTEGER NOT NULL,
    updated_count INTEGER NOT NULL,
    failed_count INTEGER NOT NULL,
    created_at_ms INTEGER NOT NULL
  )`,
]

let schemaReadyPromise = null

function getCorsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type',
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...getCorsHeaders(),
    },
  })
}

function errorResponse(message, status, extra = {}) {
  return jsonResponse({ message, ...extra }, status)
}

function getPageLimit(value, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback
  }
  return Math.min(Math.floor(numeric), MAX_PAGE_LIMIT)
}

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const remainder = normalized.length % 4
  const padded = remainder === 0 ? normalized : `${normalized}${'='.repeat(4 - remainder)}`
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encodeCursor(createdAtMs, id) {
  return encodeBase64Url(JSON.stringify({ createdAtMs, id }))
}

function decodeCursor(cursor) {
  if (!cursor) {
    return null
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(cursor))
    const createdAtMs = Number(parsed.createdAtMs)
    const id = typeof parsed.id === 'string' ? parsed.id : ''
    if (!Number.isFinite(createdAtMs) || !id) {
      return null
    }
    return { createdAtMs, id }
  } catch {
    return null
  }
}

async function ensureSchema(db) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      for (const statement of SCHEMA_STATEMENTS) {
        await db.prepare(statement).run()
      }
    })().catch((error) => {
      schemaReadyPromise = null
      throw error
    })
  }
  await schemaReadyPromise
}

function parseTweetJson(row) {
  try {
    const parsed = JSON.parse(row.tweet_json)
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

async function queryTweetsPage(db, cursor, limit, authorScreenName) {
  const normalizedAuthor =
    typeof authorScreenName === 'string' ? authorScreenName.trim() : ''
  const hasAuthorFilter = normalizedAuthor.length > 0

  let statement
  if (hasAuthorFilter && cursor) {
    statement = db
      .prepare(`
        SELECT id, created_at_ms, tweet_json
        FROM tweets
        WHERE author_screen_name = ?
          AND (created_at_ms < ? OR (created_at_ms = ? AND id < ?))
        ORDER BY created_at_ms DESC, id DESC
        LIMIT ?
      `)
      .bind(normalizedAuthor, cursor.createdAtMs, cursor.createdAtMs, cursor.id, limit)
  } else if (hasAuthorFilter) {
    statement = db
      .prepare(`
        SELECT id, created_at_ms, tweet_json
        FROM tweets
        WHERE author_screen_name = ?
        ORDER BY created_at_ms DESC, id DESC
        LIMIT ?
      `)
      .bind(normalizedAuthor, limit)
  } else if (cursor) {
    statement = db
      .prepare(`
        SELECT id, created_at_ms, tweet_json
        FROM tweets
        WHERE created_at_ms < ? OR (created_at_ms = ? AND id < ?)
        ORDER BY created_at_ms DESC, id DESC
        LIMIT ?
      `)
      .bind(cursor.createdAtMs, cursor.createdAtMs, cursor.id, limit)
  } else {
    statement = db
      .prepare(`
        SELECT id, created_at_ms, tweet_json
        FROM tweets
        ORDER BY created_at_ms DESC, id DESC
        LIMIT ?
      `)
      .bind(limit)
  }

  const queried = await statement.all()
  const rows = Array.isArray(queried.results) ? queried.results : []
  const items = rows.map((row) => parseTweetJson(row)).filter((tweet) => Boolean(tweet))

  const lastRow = rows[rows.length - 1]
  const nextCursor =
    rows.length === limit && lastRow
      ? encodeCursor(Number(lastRow.created_at_ms || 0), String(lastRow.id || ''))
      : null

  return {
    items,
    nextCursor,
  }
}

async function queryStats(db) {
  const totalRow = await db.prepare('SELECT COUNT(*) AS total FROM tweets').first()
  const authors = await db
    .prepare(`
      SELECT
        author_screen_name AS screenName,
        COALESCE(MAX(author_name), author_screen_name) AS name,
        COUNT(*) AS count
      FROM tweets
      WHERE author_screen_name IS NOT NULL AND author_screen_name != ''
      GROUP BY author_screen_name
      ORDER BY count DESC, screenName ASC
      LIMIT 200
    `)
    .all()

  const authorRows = Array.isArray(authors.results) ? authors.results : []

  return {
    totalTweets: Number(totalRow?.total || 0),
    userStats: authorRows.map((row) => ({
      name: row.name || row.screenName || '',
      screenName: row.screenName || '',
      count: Number(row.count || 0),
    })),
  }
}

function decodeTweetArray(text) {
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed)) {
    throw new Error('JSON 内容不是数组')
  }
  return parsed
}

function dedupeById(records) {
  const map = new Map()
  for (const record of records) {
    if (!map.has(record.id)) {
      map.set(record.id, record)
    }
  }
  return Array.from(map.values())
}

function chunkArray(items, size) {
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function parseAndNormalizeFromArray(rawTweets) {
  const errors = []
  const normalized = []
  let parsedCount = 0

  for (let index = 0; index < rawTweets.length; index += 1) {
    parsedCount += 1
    const normalizedTweet = normalizeRawTweet(rawTweets[index])
    if (!normalizedTweet) {
      errors.push(`第 ${index + 1} 条推文缺少有效 id`)
      continue
    }
    normalized.push(normalizedTweet)
  }

  return {
    parsedCount,
    normalized,
    errors,
  }
}

async function upsertTweets(db, records, sourceType, sourceLabel, parsedCount, failedCount) {
  const now = Date.now()
  const ids = records.map((item) => item.id)
  const existingIds = new Set()

  for (const idChunk of chunkArray(ids, D1_BATCH_SIZE)) {
    const placeholders = idChunk.map(() => '?').join(', ')
    const existedRows = await db
      .prepare(`SELECT id FROM tweets WHERE id IN (${placeholders})`)
      .bind(...idChunk)
      .all()

    const resultRows = Array.isArray(existedRows.results) ? existedRows.results : []
    resultRows.forEach((row) => {
      if (row?.id) {
        existingIds.add(String(row.id))
      }
    })
  }

  const upsertSql = `
    INSERT INTO tweets (
      id, created_at_ms, author_screen_name, author_name, tweet_json, inserted_at_ms, updated_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      created_at_ms = excluded.created_at_ms,
      author_screen_name = excluded.author_screen_name,
      author_name = excluded.author_name,
      tweet_json = excluded.tweet_json,
      updated_at_ms = excluded.updated_at_ms
  `

  for (const recordChunk of chunkArray(records, D1_BATCH_SIZE)) {
    const statements = recordChunk.map((item) =>
      db
        .prepare(upsertSql)
        .bind(
          item.id,
          item.createdAtMs,
          item.authorScreenName,
          item.authorName,
          item.tweetJson,
          now,
          now
        )
    )
    await db.batch(statements)
  }

  const updated = records.filter((item) => existingIds.has(item.id)).length
  const inserted = records.length - updated

  const batchResult = await db
    .prepare(`
      INSERT INTO import_batches (
        source_type, source_label, parsed_count, inserted_count, updated_count, failed_count, created_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(sourceType, sourceLabel || null, parsedCount, inserted, updated, failedCount, now)
    .run()

  return {
    batchId: Number(batchResult.meta?.last_row_id || 0) || null,
    inserted,
    updated,
  }
}

async function importFromUploadedFiles(db, files) {
  const errors = []
  const mergedRawTweets = []

  for (const file of files) {
    try {
      const text = await file.text()
      const tweets = decodeTweetArray(text)
      mergedRawTweets.push(...tweets)
    } catch (error) {
      const message = error instanceof Error ? error.message : '解析失败'
      errors.push(`${file.name}: ${message}`)
    }
  }

  const parsed = parseAndNormalizeFromArray(mergedRawTweets)
  errors.push(...parsed.errors)
  const deduped = dedupeById(parsed.normalized)

  if (deduped.length === 0) {
    return {
      batchId: null,
      parsed: parsed.parsedCount,
      inserted: 0,
      updated: 0,
      failed: errors.length,
      errors,
    }
  }

  const persisted = await upsertTweets(
    db,
    deduped,
    'file',
    `${files.length} file(s)`,
    parsed.parsedCount,
    errors.length
  )

  return {
    batchId: persisted.batchId,
    parsed: parsed.parsedCount,
    inserted: persisted.inserted,
    updated: persisted.updated,
    failed: errors.length,
    errors,
  }
}

async function parseUploadedFiles(request) {
  const formData = await request.formData()
  const candidateFiles = formData.getAll('files')
  const files = candidateFiles.filter((item) => item instanceof File)

  if (files.length === 0) {
    return { error: '缺少 files 参数', files: [] }
  }

  if (files.length > MAX_IMPORT_FILES) {
    return { error: `单次最多上传 ${MAX_IMPORT_FILES} 个文件`, files: [] }
  }

  for (const file of files) {
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      return { error: `文件 ${file.name} 超过 20MB 大小限制`, files: [] }
    }
  }

  return { error: null, files }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(),
      })
    }

    if (!env?.DB) {
      return errorResponse('D1 绑定 DB 未配置', 500)
    }

    await ensureSchema(env.DB)

    const url = new URL(request.url)
    const pathname = url.pathname

    if (pathname === '/api/health' && request.method === 'GET') {
      return jsonResponse({ ok: true, message: 'x-bookmarks backend ready (D1)' })
    }

    if (pathname === '/api/tweets' && request.method === 'GET') {
      const cursor = decodeCursor(url.searchParams.get('cursor') || '')
      const limit = getPageLimit(url.searchParams.get('limit'), DEFAULT_PAGE_LIMIT)
      const author = url.searchParams.get('author') || ''
      const page = await queryTweetsPage(env.DB, cursor, limit, author)
      return jsonResponse(page)
    }

    if (pathname === '/api/stats' && request.method === 'GET') {
      const stats = await queryStats(env.DB)
      return jsonResponse(stats)
    }

    if (pathname === '/api/import/files' && request.method === 'POST') {
      const parsedFiles = await parseUploadedFiles(request)
      if (parsedFiles.error) {
        return errorResponse(parsedFiles.error, 400)
      }

      try {
        const startedAt = Date.now()
        const result = await importFromUploadedFiles(env.DB, parsedFiles.files)
        const completedInMs = Date.now() - startedAt
        const payload = {
          ...result,
          completedInMs,
        }
        if (result.inserted === 0 && result.updated === 0 && result.failed > 0) {
          return errorResponse('没有可导入的有效推文', 400, payload)
        }
        return jsonResponse(payload)
      } catch (error) {
        const message = error instanceof Error ? error.message : '文件导入失败'
        return errorResponse(message, 500)
      }
    }

    return errorResponse('Not Found', 404)
  },
}
