import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'

const LOCAL_FILE_API_PREFIX = '/api/local-files'
const LOCAL_FILE_ROOT = path.resolve(process.cwd(), 'file')
const shortUrlResolveCache = new Map<string, string>()
const shortUrlResolveFailureCache = new Map<string, number>()
const SHORT_URL_RETRY_AFTER_MS = 60 * 1000

interface UploadRequestFile {
  name: string
  content: string
}

function sendJSON(res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (chunk?: unknown) => void }, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function sanitizeFileName(fileName: string): string {
  const normalizedBaseName = path
    .basename(fileName || 'upload.json')
    .replace(/[<>:"/\\|?*]/g, '_')
  const baseName = Array.from(normalizedBaseName)
    .map((char) => (char.charCodeAt(0) < 32 ? '_' : char))
    .join('')
    .trim()
  if (!baseName) {
    return `upload-${Date.now()}.json`
  }
  return baseName.toLowerCase().endsWith('.json') ? baseName : `${baseName}.json`
}

function isSafePathSegment(value: string): boolean {
  if (!value || value !== path.basename(value)) {
    return false
  }
  return !value.includes('..')
}

async function parseJSONBody(req: AsyncIterable<Buffer | string>): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const content = Buffer.concat(chunks).toString('utf-8').trim()
  if (!content) {
    return {}
  }
  return JSON.parse(content)
}

async function getUniqueFileName(dirPath: string, fileName: string): Promise<string> {
  const extension = path.extname(fileName) || '.json'
  const stem = path.basename(fileName, extension)
  let index = 0
  let candidate = fileName

  while (true) {
    try {
      await fs.access(path.join(dirPath, candidate))
      index += 1
      candidate = `${stem}-${index}${extension}`
    } catch {
      return candidate
    }
  }
}

async function getLatestFolderTimestamp(): Promise<string | null> {
  try {
    const entries = await fs.readdir(LOCAL_FILE_ROOT, { withFileTypes: true })
    const folders = entries
      .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => Number(b) - Number(a))

    for (const folder of folders) {
      const folderPath = path.join(LOCAL_FILE_ROOT, folder)
      const files = await fs.readdir(folderPath)
      if (files.some((fileName) => fileName.toLowerCase().endsWith('.json'))) {
        return folder
      }
    }
  } catch {
    return null
  }
  return null
}

function getReadURL(folderTimestamp: string, fileName: string): string {
  return `${LOCAL_FILE_API_PREFIX}/read?folder=${encodeURIComponent(folderTimestamp)}&name=${encodeURIComponent(fileName)}`
}

function isHttpURL(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function escapeForPowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''")
}

async function resolveShortUrlByPowerShell(url: string): Promise<string | null> {
  const escapedUrl = escapeForPowerShellSingleQuoted(url)
  const script =
    `$u = '${escapedUrl}'; ` +
    'try { ' +
    '$r = Invoke-WebRequest -Uri $u -MaximumRedirection 10 -Method Get -TimeoutSec 15 -ErrorAction Stop; ' +
    '$final = $r.BaseResponse.RequestMessage.RequestUri.AbsoluteUri; ' +
    'if (-not $final) { $final = $u }; ' +
    'Write-Output $final ' +
    '} catch { ' +
    'if ($_.Exception.Response -and $_.Exception.Response.ResponseUri) { Write-Output $_.Exception.Response.ResponseUri.AbsoluteUri } else { Write-Output $u } ' +
    '}'

  const powerShellExecutables = [
    'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
    'pwsh',
    'powershell',
  ]

  for (const executable of powerShellExecutables) {
    const resolved = await new Promise<string | null>((resolve) => {
      execFile(
        executable,
        ['-NoProfile', '-Command', script],
        {
          timeout: 20000,
          maxBuffer: 1024 * 1024,
        },
        (error, stdout) => {
          if (error && !stdout) {
            resolve(null)
            return
          }

          const output = stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .pop()

          resolve(output || null)
        }
      )
    })

    if (resolved && isHttpURL(resolved) && resolved !== url) {
      return resolved
    }
  }

  return null
}

async function resolveShortURL(url: string): Promise<string> {
  const cached = shortUrlResolveCache.get(url)
  if (cached) {
    return cached
  }

  const lastFailureAt = shortUrlResolveFailureCache.get(url) || 0
  if (Date.now() - lastFailureAt < SHORT_URL_RETRY_AFTER_MS) {
    return url
  }

  const rememberFailure = (): void => {
    shortUrlResolveFailureCache.set(url, Date.now())
  }

  const rememberSuccess = (resolvedUrl: string): string => {
    shortUrlResolveCache.set(url, resolvedUrl)
    shortUrlResolveFailureCache.delete(url)
    return resolvedUrl
  }

  // Windows 环境优先走 PowerShell：当前环境下对 t.co 的重定向追踪比 Node fetch 稳定。
  if (process.platform === 'win32') {
    const resolvedByPowerShell = await resolveShortUrlByPowerShell(url)
    if (resolvedByPowerShell && resolvedByPowerShell !== url) {
      return rememberSuccess(resolvedByPowerShell)
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 6000)

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; X-Bookmarks-Link-Resolver/1.0)',
      },
    })

    if (response.body) {
      await response.body.cancel()
    }

    const resolved = response.url || url
    if (resolved && resolved !== url && isHttpURL(resolved)) {
      return rememberSuccess(resolved)
    }
  } catch {
    // 忽略并返回原始短链
  } finally {
    clearTimeout(timeoutId)
  }

  rememberFailure()
  return url
}

function localFilePersistencePlugin(): Plugin {
  return {
    name: 'local-file-persistence',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith(LOCAL_FILE_API_PREFIX)) {
          next()
          return
        }

        const requestURL = new URL(req.url, 'http://localhost')
        const { pathname, searchParams } = requestURL

        if (req.method === 'POST' && pathname === `${LOCAL_FILE_API_PREFIX}/upload`) {
          try {
            const body = (await parseJSONBody(req)) as { files?: UploadRequestFile[] }
            const files = Array.isArray(body.files) ? body.files : []
            if (files.length === 0) {
              sendJSON(res, 400, { message: '缺少 files 参数' })
              return
            }

            const folderTimestamp = Date.now().toString()
            const folderPath = path.join(LOCAL_FILE_ROOT, folderTimestamp)
            await fs.mkdir(folderPath, { recursive: true })

            const savedFiles: Array<{ name: string; url: string }> = []
            for (const file of files) {
              if (typeof file?.name !== 'string' || typeof file?.content !== 'string') {
                continue
              }
              const sanitizedName = sanitizeFileName(file.name)
              const uniqueName = await getUniqueFileName(folderPath, sanitizedName)
              const fullFilePath = path.join(folderPath, uniqueName)
              await fs.writeFile(fullFilePath, file.content, 'utf-8')
              savedFiles.push({
                name: uniqueName,
                url: getReadURL(folderTimestamp, uniqueName),
              })
            }

            if (savedFiles.length === 0) {
              sendJSON(res, 400, { message: '没有可保存的文件内容' })
              return
            }

            sendJSON(res, 200, {
              folderTimestamp,
              files: savedFiles,
            })
            return
          } catch (error) {
            const message = error instanceof Error ? error.message : '保存文件失败'
            sendJSON(res, 500, { message })
            return
          }
        }

        if (req.method === 'GET' && pathname === `${LOCAL_FILE_API_PREFIX}/read`) {
          const folder = searchParams.get('folder') || ''
          const name = searchParams.get('name') || ''

          if (!isSafePathSegment(folder) || !isSafePathSegment(name)) {
            sendJSON(res, 400, { message: '非法路径参数' })
            return
          }

          const targetPath = path.resolve(LOCAL_FILE_ROOT, folder, name)
          const relativePath = path.relative(LOCAL_FILE_ROOT, targetPath)
          if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
            sendJSON(res, 400, { message: '非法路径参数' })
            return
          }

          try {
            const content = await fs.readFile(targetPath, 'utf-8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(content)
            return
          } catch {
            sendJSON(res, 404, { message: '文件不存在' })
            return
          }
        }

        if (req.method === 'GET' && pathname === `${LOCAL_FILE_API_PREFIX}/latest`) {
          const folderTimestamp = await getLatestFolderTimestamp()
          if (!folderTimestamp) {
            sendJSON(res, 200, { folderTimestamp: null, files: [] })
            return
          }

          const folderPath = path.join(LOCAL_FILE_ROOT, folderTimestamp)
          const fileNames = (await fs.readdir(folderPath))
            .filter((fileName) => fileName.toLowerCase().endsWith('.json'))
            .sort((a, b) => a.localeCompare(b))

          sendJSON(res, 200, {
            folderTimestamp,
            files: fileNames.map((name) => ({
              name,
              url: getReadURL(folderTimestamp, name),
            })),
          })
          return
        }

        if (req.method === 'GET' && pathname === `${LOCAL_FILE_API_PREFIX}/resolve`) {
          const shortUrl = searchParams.get('url') || ''
          if (!isHttpURL(shortUrl)) {
            sendJSON(res, 400, { message: 'url 参数不是合法链接' })
            return
          }

          const resolvedUrl = await resolveShortURL(shortUrl)
          sendJSON(res, 200, { shortUrl, resolvedUrl })
          return
        }

        next()
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localFilePersistencePlugin()],
  server: {
    port: 3000,
    open: true,
  },
})

