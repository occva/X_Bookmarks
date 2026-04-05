interface LocalFileItem {
  name: string
  url: string
}

interface UploadResponse {
  folderTimestamp: string
  files: LocalFileItem[]
}

interface LatestResponse {
  folderTimestamp: string | null
  files: LocalFileItem[]
}

const LOCAL_FILE_API = {
  UPLOAD: '/api/local-files/upload',
  LATEST: '/api/local-files/latest',
} as const

const REQUEST_TIMEOUT = 8000
let localFileAPIAvailable: boolean | null = null

function isJSONResponse(response: Response): boolean {
  const contentType = response.headers.get('Content-Type') || response.headers.get('content-type') || ''
  return contentType.toLowerCase().includes('application/json')
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timer)
  }
}

async function isLocalFileAPIAvailable(): Promise<boolean> {
  if (localFileAPIAvailable !== null) {
    return localFileAPIAvailable
  }

  try {
    const response = await fetchWithTimeout(LOCAL_FILE_API.LATEST, { method: 'GET' })
    if (!response.ok || !isJSONResponse(response)) {
      localFileAPIAvailable = false
      return false
    }

    const data = (await response.json().catch(() => null)) as LatestResponse | null
    localFileAPIAvailable = Boolean(data && Array.isArray(data.files))
  } catch {
    localFileAPIAvailable = false
  }

  return localFileAPIAvailable
}

export async function saveUploadedJSONFiles(files: File[]): Promise<{ folderTimestamp: string; urls: string[] }> {
  if (!(await isLocalFileAPIAvailable())) {
    return { folderTimestamp: '', urls: [] }
  }

  if (files.length === 0) {
    throw new Error('没有可保存的文件')
  }

  const payloadFiles = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      content: await file.text(),
    }))
  )

  const response = await fetchWithTimeout(LOCAL_FILE_API.UPLOAD, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files: payloadFiles }),
  })

  if (!response.ok) {
    if (response.status === 404 || response.status === 405) {
      localFileAPIAvailable = false
      return { folderTimestamp: '', urls: [] }
    }
    const message = await response.text()
    throw new Error(message || `本地保存失败（HTTP ${response.status}）`)
  }

  if (!isJSONResponse(response)) {
    localFileAPIAvailable = false
    return { folderTimestamp: '', urls: [] }
  }

  const data = (await response.json().catch(() => null)) as UploadResponse | null
  if (!data || !data.folderTimestamp || !Array.isArray(data.files)) {
    localFileAPIAvailable = false
    return { folderTimestamp: '', urls: [] }
  }

  const urls = data.files.map((item) => item.url).filter((url) => typeof url === 'string' && url.length > 0)
  if (urls.length === 0) {
    throw new Error('本地保存后未返回可用文件 URL')
  }

  return {
    folderTimestamp: data.folderTimestamp,
    urls,
  }
}

export async function getLatestSavedJSONFileURLs(): Promise<string[]> {
  if (!(await isLocalFileAPIAvailable())) {
    return []
  }

  const response = await fetchWithTimeout(LOCAL_FILE_API.LATEST, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 404 || response.status === 405) {
      localFileAPIAvailable = false
    }
    return []
  }

  if (!isJSONResponse(response)) {
    localFileAPIAvailable = false
    return []
  }

  const data = (await response.json().catch(() => null)) as LatestResponse | null
  if (!data || !Array.isArray(data.files)) {
    localFileAPIAvailable = false
    return []
  }

  return data.files.map((item) => item.url).filter((url) => typeof url === 'string' && url.length > 0)
}
